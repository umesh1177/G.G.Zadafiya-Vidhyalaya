const mongoose = require('mongoose');
const CbtExam = require('../models/CbtExam');
const CbtAttempt = require('../models/CbtAttempt');
const Student = require('../models/Student');
const { parseMcqText } = require('../utils/cbtMcqParser');
const { getSampleQuestionsForExam } = require('../data/cbtSampleQuestions');

/**
 * Seeded / Deterministic Fisher-Yates Shuffle
 * Ensures each student gets a unique, randomized question order based on student rollNo & examId
 */
function shuffleQuestionsForStudent(questions, seedNum) {
  const arr = [...questions];
  let seed = Math.abs(seedNum || 42);

  // Simple LCG pseudo-random generator
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(pseudoRandom() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 1. List all CBT Exams (Filtered for Faculty vs Student)
exports.listExams = async (req, res) => {
  try {
    const { role, standard, division, streamGroup, rollNo } = req.query;
    const now = new Date();

    let query = {};

    if (role === 'student') {
      // Filter for student's standard, division, stream group
      if (standard && standard !== 'ALL') {
        query.standard = { $in: [standard, 'ALL'] };
      }
      if (division && division !== 'ALL') {
        query.division = { $in: [division, 'ALL'] };
      }
      if (streamGroup && streamGroup !== 'ALL') {
        query.streamGroup = { $in: [streamGroup, 'ALL'] };
      }
      // Visible only after scheduleTime
      query.scheduleTime = { $lte: now };
    }

    const exams = await CbtExam.find(query).sort({ startTime: -1 }).lean();

    // Attach student attempt status if student rollNo is provided
    if (rollNo) {
      const studentRoll = Number(rollNo);
      const examIds = exams.map(e => e._id);
      const attempts = await CbtAttempt.find({
        examId: { $in: examIds },
        studentRollNo: studentRoll,
      }).lean();

      const attemptMap = {};
      attempts.forEach(att => {
        attemptMap[att.examId.toString()] = att;
      });

      const enriched = exams.map(exam => {
        const att = attemptMap[exam._id.toString()];
        return {
          ...exam,
          attemptStatus: att ? att.status : 'NOT_STARTED',
          myAttempt: att
            ? {
                status: att.status,
                score: att.score,
                percentage: att.percentage,
                rank: att.rank,
                percentile: att.percentile,
                submittedAt: att.submittedAt,
                violationsCount: att.violationsCount,
                disqualificationReason: att.disqualificationReason,
                retryAllowed: att.retryAllowed,
              }
            : null,
        };
      });

      return res.json({ success: true, exams: enriched });
    }

    return res.json({ success: true, exams });
  } catch (err) {
    console.error('Error listing CBT exams:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Get Single Exam Details
exports.getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await CbtExam.findById(id).lean();
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    res.json({ success: true, exam });
  } catch (err) {
    console.error('Error fetching exam:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Create CBT Exam (Assistant Faculty)
exports.createExam = async (req, res) => {
  try {
    const {
      title,
      examType = 'GUJCET',
      standard = 'STD_11',
      division = 'ALL',
      streamGroup = 'ALL',
      durationMinutes = 60,
      totalMarks,
      marksPerQuestion,
      negativeMarks,
      scheduleTime,
      startTime,
      windowEndTime,
      questionsText,
      questions: providedQuestions,
      subjectPapers = [],
    } = req.body;

    const examCode = `CBT-${examType}-${Date.now().toString().slice(-6)}`;

    // Default marking scheme according to requirement:
    // JEE / NEET: Correct +4, Wrong -1
    // GUJCET: Correct +1, Wrong -0.25
    const defaultPosMarks = examType === 'GUJCET' ? 1 : 4;
    const defaultNegMarks = examType === 'GUJCET' ? 0.25 : 1;

    const finalMarksPerQuestion = marksPerQuestion !== undefined && marksPerQuestion !== null && marksPerQuestion !== ''
      ? Number(marksPerQuestion)
      : defaultPosMarks;

    const finalNegativeMarks = negativeMarks !== undefined && negativeMarks !== null && negativeMarks !== ''
      ? Number(negativeMarks)
      : defaultNegMarks;

    // Parse questions from raw text if provided, or use sample questions if empty
    let questions = [];
    if (providedQuestions && Array.isArray(providedQuestions) && providedQuestions.length > 0) {
      questions = providedQuestions;
    } else if (questionsText && typeof questionsText === 'string' && questionsText.trim()) {
      questions = parseMcqText(questionsText, 'Physics', finalMarksPerQuestion, finalNegativeMarks);
    }

    if (questions.length === 0) {
      // Auto-load high quality sample question bank matching exam type and stream
      questions = getSampleQuestionsForExam(examType, streamGroup);
      // Ensure marking scheme matches
      questions = questions.map(q => ({
        ...q,
        marks: finalMarksPerQuestion,
        negativeMarks: finalNegativeMarks,
      }));
    }

    // Determine subjects from questions
    const subjectSet = new Set(questions.map(q => q.subject));
    const subjects = Array.from(subjectSet);

    // Default dates if not provided
    const now = new Date();
    const schedDate = scheduleTime ? new Date(scheduleTime) : now;
    const startDate = startTime ? new Date(startTime) : new Date(now.getTime() + 10 * 60000); // 10 mins from now
    const endDate = windowEndTime ? new Date(windowEndTime) : new Date(now.getTime() + 7 * 24 * 3600000); // 7 days

    const calculatedTotalMarks = Number(totalMarks) || (questions.length * finalMarksPerQuestion);

    const newExam = new CbtExam({
      examCode,
      title: title || `${examType} Mock Test - ${standard.replace('_', ' ')}`,
      instituteName: 'G.G. Zadafiya Vidhyalaya',
      examType,
      standard,
      division,
      streamGroup,
      subjects,
      durationMinutes: Number(durationMinutes) || 60,
      totalMarks: calculatedTotalMarks,
      marksPerQuestion: finalMarksPerQuestion,
      negativeMarks: finalNegativeMarks,
      scheduleTime: schedDate,
      startTime: startDate,
      windowEndTime: endDate,
      subjectPapers,
      questions,
      status: 'SCHEDULED',
      createdBy: req.body.createdBy || 'Assistant Faculty',
    });

    await newExam.save();

    res.status(201).json({
      success: true,
      message: 'CBT Exam created successfully!',
      exam: newExam,
    });
  } catch (err) {
    console.error('Error creating CBT exam:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Update CBT Exam (Assistant Faculty)
exports.updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If new questions text provided, parse it
    if (updates.questionsText) {
      const parsed = parseMcqText(
        updates.questionsText,
        'Physics',
        Number(updates.marksPerQuestion || 4),
        Number(updates.negativeMarks || 1)
      );
      if (parsed.length > 0) {
        updates.questions = parsed;
        updates.subjects = Array.from(new Set(parsed.map(q => q.subject)));
      }
      delete updates.questionsText;
    }

    const exam = await CbtExam.findByIdAndUpdate(id, updates, { new: true });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, message: 'Exam updated successfully', exam });
  } catch (err) {
    console.error('Error updating CBT exam:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Delete CBT Exam
exports.deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    await CbtExam.findByIdAndDelete(id);
    await CbtAttempt.deleteMany({ examId: id });
    res.json({ success: true, message: 'Exam and all associated attempts deleted' });
  } catch (err) {
    console.error('Error deleting CBT exam:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. Student Starts or Resumes Exam (Enters Fullscreen Kiosk Mode)
exports.startExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentRollNo, studentName, studentEmail, standard, division, streamGroup } = req.body;

    const exam = await CbtExam.findById(id).lean();
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const now = new Date();
    // Verify window is active
    if (now > new Date(exam.windowEndTime)) {
      return res.status(400).json({ success: false, message: 'Exam window has ended.' });
    }

    const roll = Number(studentRollNo || 1);
    let attempt = await CbtAttempt.findOne({ examId: id, studentRollNo: roll });

    // Check if disqualified and retry not granted
    if (attempt && attempt.status === 'DISQUALIFIED' && !attempt.retryAllowed) {
      return res.status(403).json({
        success: false,
        isDisqualified: true,
        message: 'You have been disqualified from this exam due to rule violations.',
        reason: attempt.disqualificationReason,
      });
    }

    // If new attempt or starting first time
    if (!attempt) {
      // Generate randomized / unique question sequence for this student
      // So no two adjacent students have the same question number!
      const shuffled = shuffleQuestionsForStudent(exam.questions, roll * 31 + 7);
      const questionOrder = shuffled.map(q => q.id);

      attempt = new CbtAttempt({
        examId: id,
        studentRollNo: roll,
        studentName: studentName || 'Student',
        studentEmail: studentEmail || `student${roll}@ggzv.edu.in`,
        standard: standard || exam.standard,
        division: division || 'A',
        streamGroup: streamGroup || 'GROUP_A',
        questionOrder,
        answers: questionOrder.map(qId => ({
          questionId: qId,
          selectedOption: null,
          status: 'NOT_VISITED',
          timeSpentSeconds: 0,
        })),
        startedAt: now,
        status: 'IN_PROGRESS',
        violationsCount: 0,
      });

      await attempt.save();

      // Increment takers count
      await CbtExam.findByIdAndUpdate(id, { $inc: { takersCount: 1 } });
    } else if (attempt.status === 'DISQUALIFIED' && attempt.retryAllowed) {
      // Resume after Assistant Faculty granted retry
      attempt.status = 'IN_PROGRESS';
      attempt.retryAllowed = false;
      attempt.violationsCount = 0;
      await attempt.save();
    }

    // Build the questions array ordered by this student's specific questionOrder
    // Strip `correctAnswer` for security during test taking!
    const questionMap = {};
    exam.questions.forEach(q => {
      questionMap[q.id] = {
        id: q.id,
        subject: q.subject,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        questionText: q.questionText,
        questionTextGujarati: q.questionTextGujarati,
        options: q.options,
        // correctAnswer is withheld!
      };
    });

    const orderedQuestions = attempt.questionOrder
      .map((qId, idx) => {
        const q = questionMap[qId];
        return q ? { ...q, displayQuestionNo: idx + 1 } : null;
      })
      .filter(Boolean);

    // Calculate remaining seconds
    const totalExamSeconds = exam.durationMinutes * 60;
    const elapsedSeconds = attempt.timeSpentSeconds || Math.floor((now - new Date(attempt.startedAt)) / 1000);
    const remainingSeconds = Math.max(0, totalExamSeconds - elapsedSeconds);

    res.json({
      success: true,
      exam: {
        _id: exam._id,
        title: exam.title,
        examType: exam.examType,
        instituteName: exam.instituteName,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        subjects: exam.subjects,
        marksPerQuestion: exam.marksPerQuestion,
        negativeMarks: exam.negativeMarks,
      },
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        answers: attempt.answers,
        violationsCount: attempt.violationsCount,
        timeSpentSeconds: elapsedSeconds,
        remainingSeconds,
      },
      questions: orderedQuestions,
    });
  } catch (err) {
    console.error('Error starting exam:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 7. Save Intermediate Progress while taking exam
exports.saveProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentRollNo, answers, timeSpentSeconds } = req.body;

    const attempt = await CbtAttempt.findOne({ examId: id, studentRollNo: Number(studentRollNo) });
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.status === 'SUBMITTED' || attempt.status === 'DISQUALIFIED') {
      return res.json({ success: true, message: 'Attempt already closed', status: attempt.status });
    }

    if (answers && Array.isArray(answers)) {
      attempt.answers = answers;
    }
    if (timeSpentSeconds !== undefined) {
      attempt.timeSpentSeconds = Number(timeSpentSeconds);
    }

    await attempt.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving progress:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 8. Record Anti-Cheating Violation (Kiosk Mode Enforcement)
exports.recordViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const { attemptId, studentRollNo, studentEmail, studentName, action = 'Forbidden action detected' } = req.body;

    let attempt;
    if (attemptId && mongoose.isValidObjectId(attemptId)) {
      attempt = await CbtAttempt.findById(attemptId);
    }
    if (!attempt && studentRollNo !== undefined && studentRollNo !== null) {
      attempt = await CbtAttempt.findOne({ examId: id, studentRollNo: Number(studentRollNo) });
    }
    if (!attempt && studentEmail) {
      attempt = await CbtAttempt.findOne({
        examId: id,
        studentEmail: { $regex: new RegExp(`^${studentEmail.trim()}$`, 'i') },
      });
    }

    // Safety fallback: if attempt record didn't exist yet, create it so violation is never lost
    if (!attempt) {
      const exam = await CbtExam.findById(id).lean();
      if (!exam) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }
      attempt = new CbtAttempt({
        examId: id,
        studentRollNo: Number(studentRollNo || 1),
        studentName: studentName || 'Student',
        studentEmail: studentEmail || `student${studentRollNo || 1}@ggzv.edu.in`,
        standard: exam.standard,
        division: exam.division,
        streamGroup: exam.streamGroup,
        status: 'IN_PROGRESS',
        violationsCount: 0,
        violationLogs: [],
      });
    }

    if (attempt.status === 'SUBMITTED' || attempt.status === 'DISQUALIFIED') {
      return res.json({
        success: true,
        violationsCount: attempt.violationsCount,
        remainingWarnings: 0,
        disqualified: attempt.status === 'DISQUALIFIED',
        message: attempt.disqualificationReason || 'Exam already concluded',
      });
    }

    attempt.violationsCount = (attempt.violationsCount || 0) + 1;
    attempt.violationLogs.push({
      timestamp: new Date(),
      action,
      warningNumber: attempt.violationsCount,
    });

    let disqualified = false;
    let message = `Warning ${attempt.violationsCount}/3: ${action}`;

    if (attempt.violationsCount >= 3) {
      disqualified = true;
      attempt.status = 'DISQUALIFIED';
      attempt.submittedAt = new Date();
      attempt.disqualificationReason = `Disqualified due to 3 cheating/kiosk violations: ${action}`;
      message = 'Disqualified: You have reached the maximum allowed warnings (3). Your exam has been auto-submitted.';
    }

    await attempt.save();

    res.json({
      success: true,
      violationsCount: attempt.violationsCount,
      remainingWarnings: Math.max(0, 3 - attempt.violationsCount),
      disqualified,
      message,
    });
  } catch (err) {
    console.error('Error recording violation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 9. Submit CBT Exam
exports.submitExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentRollNo, answers, timeSpentSeconds, reason } = req.body;

    const attempt = await CbtAttempt.findOne({ examId: id, studentRollNo: Number(studentRollNo) });
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (answers && Array.isArray(answers)) {
      attempt.answers = answers;
    }
    if (timeSpentSeconds !== undefined) {
      attempt.timeSpentSeconds = Number(timeSpentSeconds);
    }

    attempt.submittedAt = new Date();
    if (attempt.status !== 'DISQUALIFIED') {
      attempt.status = 'SUBMITTED';
    }

    await attempt.save();

    res.json({
      success: true,
      message: 'Exam submitted successfully!',
      attemptId: attempt._id,
      status: attempt.status,
    });
  } catch (err) {
    console.error('Error submitting exam:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 10. Assistant Faculty Grants Retry to Disqualified or Interrupted Student
exports.grantRetry = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentRollNo, grantedBy = 'Assistant Faculty' } = req.body;

    const attempt = await CbtAttempt.findOne({ examId: id, studentRollNo: Number(studentRollNo) });
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Student attempt not found' });
    }

    attempt.retryAllowed = true;
    attempt.violationsCount = 0;
    attempt.status = 'IN_PROGRESS';
    attempt.retryGrantedBy = grantedBy;
    attempt.retryGrantedAt = new Date();
    attempt.disqualificationReason = '';

    await attempt.save();

    res.json({
      success: true,
      message: `Retry granted to ${attempt.studentName} (Roll #${attempt.studentRollNo})! They can now re-enter the exam.`,
      attempt,
    });
  } catch (err) {
    console.error('Error granting retry:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 11. Assistant Faculty Evaluates Exam & Calculates Analytics
exports.evaluateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await CbtExam.findById(id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Map correct answers
    const keyMap = {};
    const qDetailsMap = {};
    exam.questions.forEach(q => {
      keyMap[q.id] = q.correctAnswer;
      qDetailsMap[q.id] = q;
    });

    const attempts = await CbtAttempt.find({ examId: id });
    if (attempts.length === 0) {
      return res.status(400).json({ success: false, message: 'No student attempts found to evaluate.' });
    }

    // Question-wise statistics tracker
    const qStats = {};
    exam.questions.forEach(q => {
      qStats[q.id] = {
        questionNo: q.questionNo,
        subject: q.subject,
        questionText: q.questionText,
        attendedCount: 0,
        skippedCount: 0,
        rightCount: 0,
        wrongCount: 0,
      };
    });

    // Grade each student attempt dynamically based on exam type marking scheme:
    // JEE / NEET: +4, -1
    // GUJCET: +1, -0.25
    const defaultPosMarks = exam.examType === 'GUJCET' ? 1 : 4;
    const defaultNegMarks = exam.examType === 'GUJCET' ? 0.25 : 1;
    const posMarks = exam.marksPerQuestion !== undefined && exam.marksPerQuestion !== null ? Number(exam.marksPerQuestion) : defaultPosMarks;
    const negMarks = exam.negativeMarks !== undefined && exam.negativeMarks !== null ? Number(exam.negativeMarks) : defaultNegMarks;
    const totalPossibleMarks = exam.totalMarks || (exam.questions.length * posMarks);

    const scoredAttempts = [];

    for (const att of attempts) {
      let correct = 0;
      let wrong = 0;
      let unanswered = 0;
      const ansMap = {};

      (att.answers || []).forEach(a => {
        ansMap[a.questionId] = a.selectedOption;
      });

      exam.questions.forEach(q => {
        const selected = ansMap[q.id];
        const correctOpt = keyMap[q.id];
        const stat = qStats[q.id];

        if (!selected) {
          unanswered++;
          if (stat) stat.skippedCount++;
        } else {
          if (stat) stat.attendedCount++;
          if (selected.toUpperCase() === (correctOpt || '').toUpperCase()) {
            correct++;
            if (stat) stat.rightCount++;
          } else {
            wrong++;
            if (stat) stat.wrongCount++;
          }
        }
      });

      // Calculate score with negative marking dynamically
      let score = (correct * posMarks) - (wrong * negMarks);
      if (score < 0) score = 0;

      const percentage = Math.round((score / totalPossibleMarks) * 100 * 10) / 10;

      att.score = score;
      att.totalMarks = totalPossibleMarks;
      att.percentage = percentage;
      att.correctCount = correct;
      att.wrongCount = wrong;
      att.unansweredCount = unanswered;

      scoredAttempts.push(att);
    }

    // Sort descending by score for Rank and Percentile
    scoredAttempts.sort((a, b) => b.score - a.score);
    const totalStudents = scoredAttempts.length;

    scoredAttempts.forEach((att, index) => {
      att.rank = index + 1;
      const strictlyLower = scoredAttempts.filter(s => s.score < att.score).length;
      att.percentile = totalStudents > 1
        ? Math.round(((strictlyLower / (totalStudents - 1)) * 100) * 10) / 10
        : 100;
    });

    // Save all evaluated attempts
    for (const att of scoredAttempts) {
      await att.save();
    }

    // Calculate Overall Analytics matching Photo 1:
    const percentages = scoredAttempts.map(a => a.percentage);
    const averageScore = Math.round((percentages.reduce((acc, p) => acc + p, 0) / totalStudents) * 100) / 100;
    
    // Median Score
    const sortedPct = [...percentages].sort((a, b) => a - b);
    const mid = Math.floor(sortedPct.length / 2);
    const medianScore = sortedPct.length % 2 !== 0
      ? sortedPct[mid]
      : Math.round(((sortedPct[mid - 1] + sortedPct[mid]) / 2) * 10) / 10;

    const lowestScore = Math.min(...percentages);
    const highestScore = Math.max(...percentages);

    // Time Statistics
    const times = scoredAttempts.map(a => a.timeSpentSeconds || 0);
    const avgTimeSec = Math.round(times.reduce((acc, t) => acc + t, 0) / totalStudents);
    const sortedTimes = [...times].sort((a, b) => a - b);
    const medianTimeSec = sortedTimes[Math.floor(sortedTimes.length / 2)] || 0;
    const allottedSeconds = (exam.durationMinutes || 60) * 60;
    const timeUtilization = Math.round((avgTimeSec / allottedSeconds) * 10000) / 100;

    // Question Attempt Statistics
    const attemptedCounts = scoredAttempts.map(a => a.correctCount + a.wrongCount);
    const avgAttempted = Math.round((attemptedCounts.reduce((acc, c) => acc + c, 0) / totalStudents) * 10) / 10;
    const fullCompletions = scoredAttempts.filter(a => a.unansweredCount === 0).length;
    const fullCompletionRate = Math.round((fullCompletions / totalStudents) * 10000) / 100;
    const totalQuestions = exam.questions.length;
    const totalPossibleAnswers = totalStudents * totalQuestions;
    const totalSkipped = scoredAttempts.reduce((acc, a) => acc + a.unansweredCount, 0);
    const skippedQuestionRate = totalPossibleAnswers > 0
      ? Math.round((totalSkipped / totalPossibleAnswers) * 10000) / 100
      : 0;

    // Score Distribution Histogram in 10 buckets: 0-10%, 10-20% ... 90-100%
    const scoreDistribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    percentages.forEach(p => {
      let bucket = Math.floor(p / 10);
      if (bucket >= 10) bucket = 9;
      if (bucket < 0) bucket = 0;
      scoreDistribution[bucket]++;
    });

    // Status counts for Donut Chart (Submitted, Disqualified, Started, Absent)
    const submittedCount = scoredAttempts.filter(a => a.status === 'SUBMITTED').length;
    const disqualifiedCount = scoredAttempts.filter(a => a.status === 'DISQUALIFIED').length;
    const startedCount = scoredAttempts.filter(a => a.status === 'IN_PROGRESS').length;
    const absentCount = 0;

    // Question analysis array
    const questionAnalysis = Object.values(qStats).map(s => {
      const accuracy = s.attendedCount > 0 ? Math.round((s.rightCount / s.attendedCount) * 100) : 0;
      return {
        ...s,
        accuracy,
      };
    });

    exam.analytics = {
      averageScore,
      medianScore,
      lowestScore,
      highestScore,
      averageTimeSeconds: avgTimeSec,
      medianTimeSeconds: medianTimeSec,
      timeUtilization,
      avgQuestionsAttempted: avgAttempted,
      fullCompletionRate,
      skippedQuestionRate,
      scoreDistribution,
      statusCounts: {
        submitted: submittedCount,
        disqualified: disqualifiedCount,
        started: startedCount,
        absent: absentCount,
      },
      questionAnalysis,
    };

    exam.status = 'EVALUATED';
    exam.isResultPublished = true;
    await exam.save();

    res.json({
      success: true,
      message: 'Exam evaluated successfully! Results and analytics published.',
      analytics: exam.analytics,
    });
  } catch (err) {
    console.error('Error evaluating exam:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 12. Get Complete Analysis for Exam (Matches Photo 1)
exports.getExamAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await CbtExam.findById(id).lean();
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const attempts = await CbtAttempt.find({ examId: id })
      .sort({ rank: 1, score: -1 })
      .lean();

    const totalStudents = attempts.length;
    const defaultPosMarks = exam.examType === 'GUJCET' ? 1 : 4;
    const posMarks = exam.marksPerQuestion !== undefined && exam.marksPerQuestion !== null ? Number(exam.marksPerQuestion) : defaultPosMarks;
    const totalPossibleMarks = exam.totalMarks || ((exam.questions ? exam.questions.length : 0) * posMarks);

    // Compute dynamic analytics from actual attempts so there is ZERO static/mock data
    let analytics = exam.analytics || {};
    
    if (totalStudents > 0) {
      const percentages = attempts.map(a => Number(a.percentage || 0));
      const avgScore = Math.round((percentages.reduce((acc, p) => acc + p, 0) / totalStudents) * 100) / 100;
      
      const sortedPct = [...percentages].sort((a, b) => a - b);
      const mid = Math.floor(sortedPct.length / 2);
      const medScore = sortedPct.length % 2 !== 0
        ? sortedPct[mid]
        : Math.round(((sortedPct[mid - 1] + sortedPct[mid]) / 2) * 10) / 10;

      const lowScore = Math.min(...percentages);
      const highScore = Math.max(...percentages);

      const times = attempts.map(a => a.timeSpentSeconds || 0);
      const avgTimeSec = Math.round(times.reduce((acc, t) => acc + t, 0) / totalStudents);
      const sortedTimes = [...times].sort((a, b) => a - b);
      const medTimeSec = sortedTimes[Math.floor(sortedTimes.length / 2)] || 0;
      const allottedSec = (exam.durationMinutes || 60) * 60;
      const timeUtil = Math.round((avgTimeSec / allottedSec) * 10000) / 100;

      const attemptedCounts = attempts.map(a => (a.correctCount || 0) + (a.wrongCount || 0));
      const avgAttempted = Math.round((attemptedCounts.reduce((acc, c) => acc + c, 0) / totalStudents) * 10) / 10;
      const fullCompletions = attempts.filter(a => (a.unansweredCount || 0) === 0).length;
      const fullCompRate = Math.round((fullCompletions / totalStudents) * 10000) / 100;

      const totalQ = exam.questions ? exam.questions.length : 0;
      const totalPossibleAns = totalStudents * totalQ;
      const totalSkipped = attempts.reduce((acc, a) => acc + (a.unansweredCount || 0), 0);
      const skippedRate = totalPossibleAns > 0
        ? Math.round((totalSkipped / totalPossibleAns) * 10000) / 100
        : 0;

      const scoreDist = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      percentages.forEach(p => {
        let b = Math.floor(p / 10);
        if (b >= 10) b = 9;
        if (b < 0) b = 0;
        scoreDist[b]++;
      });

      const subCount = attempts.filter(a => a.status === 'SUBMITTED').length;
      const disqCount = attempts.filter(a => a.status === 'DISQUALIFIED').length;
      const inProgCount = attempts.filter(a => a.status === 'IN_PROGRESS').length;

      // Dynamic question analysis if not already pre-stored
      let qAnalysis = (exam.analytics && exam.analytics.questionAnalysis) || [];
      if (qAnalysis.length === 0 && exam.questions && exam.questions.length > 0) {
        const keyMap = {};
        exam.questions.forEach(q => { keyMap[q.id] = q.correctAnswer; });
        qAnalysis = exam.questions.map(q => {
          let attCount = 0;
          let rCount = 0;
          let wCount = 0;
          let sCount = 0;

          attempts.forEach(att => {
            const studentAns = (att.answers || []).find(ans => ans.questionId === q.id);
            if (!studentAns || !studentAns.selectedOption) {
              sCount++;
            } else {
              attCount++;
              if (studentAns.selectedOption.toUpperCase() === (keyMap[q.id] || '').toUpperCase()) {
                rCount++;
              } else {
                wCount++;
              }
            }
          });

          return {
            questionNo: q.questionNo,
            subject: q.subject,
            questionText: q.questionText,
            attendedCount: attCount,
            skippedCount: sCount,
            rightCount: rCount,
            wrongCount: wCount,
            accuracy: attCount > 0 ? Math.round((rCount / attCount) * 100) : 0,
          };
        });
      }

      analytics = {
        averageScore: avgScore,
        medianScore: medScore,
        lowestScore: lowScore,
        highestScore: highScore,
        averageTimeSeconds: avgTimeSec,
        medianTimeSeconds: medTimeSec,
        timeUtilization: timeUtil,
        avgQuestionsAttempted: avgAttempted,
        fullCompletionRate: fullCompRate,
        skippedQuestionRate: skippedRate,
        scoreDistribution: scoreDist,
        statusCounts: {
          submitted: subCount,
          disqualified: disqCount,
          started: inProgCount,
          absent: 0,
        },
        questionAnalysis: qAnalysis,
      };
    }

    res.json({
      success: true,
      exam: {
        _id: exam._id,
        examCode: exam.examCode,
        title: exam.title,
        examType: exam.examType,
        standard: exam.standard,
        division: exam.division,
        streamGroup: exam.streamGroup,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        marksPerQuestion: exam.marksPerQuestion,
        negativeMarks: exam.negativeMarks,
        questionsCount: exam.questions ? exam.questions.length : 0,
        isResultPublished: exam.isResultPublished,
        status: exam.status,
      },
      analytics,
      students: attempts.map((a, idx) => ({
        _id: a._id,
        rank: a.rank || idx + 1,
        rollNo: a.studentRollNo,
        name: a.studentName,
        email: a.studentEmail,
        standard: a.standard,
        division: a.division,
        streamGroup: a.streamGroup,
        score: a.score || 0,
        totalMarks: a.totalMarks || totalPossibleMarks,
        percentage: a.percentage || 0,
        percentile: a.percentile || 0,
        correctCount: a.correctCount || 0,
        wrongCount: a.wrongCount || 0,
        unansweredCount: a.unansweredCount || 0,
        timeSpentSeconds: a.timeSpentSeconds || 0,
        status: a.status,
        violationsCount: a.violationsCount || 0,
        disqualificationReason: a.disqualificationReason || '',
        violationLogs: a.violationLogs || [],
      })),
      questions: analytics.questionAnalysis || [],
    });
  } catch (err) {
    console.error('Error fetching exam analysis:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 13. Assistant Faculty Live Monitoring Endpoint (Flags all violations)
exports.getLiveMonitor = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await CbtExam.findById(id).lean();
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // 1. Fetch ALL student attempts for this exam
    const attempts = await CbtAttempt.find({ examId: id }).sort({ studentRollNo: 1 }).lean();

    const liveData = [];
    const seenRollNos = new Set();

    // 2. Put every active / submitted / disqualified attempt into liveData
    attempts.forEach(att => {
      const roll = Number(att.studentRollNo);
      seenRollNos.add(roll);

      const answeredCount = att.answers
        ? att.answers.filter(a => a.status === 'ANSWERED').length
        : 0;

      liveData.push({
        attemptId: att._id,
        studentId: att._id,
        rollNo: att.studentRollNo,
        name: att.studentName || `Student ${att.studentRollNo}`,
        email: att.studentEmail,
        standard: att.standard || exam.standard,
        division: att.division || exam.division,
        streamGroup: att.streamGroup || exam.streamGroup,
        status: att.status,
        startedAt: att.startedAt,
        submittedAt: att.submittedAt,
        answeredCount,
        totalQuestions: exam.questions ? exam.questions.length : 0,
        violationsCount: att.violationsCount || 0,
        violationLogs: att.violationLogs || [],
        disqualificationReason: att.disqualificationReason || '',
        retryAllowed: att.retryAllowed || false,
      });
    });

    // 3. Supplement with registered students in the standard/division who haven't started yet
    const studentQuery = {};
    if (exam.standard && exam.standard !== 'ALL') studentQuery.standard = exam.standard;
    if (exam.division && exam.division !== 'ALL') studentQuery.division = exam.division;

    const students = await Student.find(studentQuery).sort({ rollNo: 1 }).lean();

    students.forEach(s => {
      const roll = Number(s.rollNo);
      if (!seenRollNos.has(roll)) {
        seenRollNos.add(roll);
        liveData.push({
          studentId: s._id,
          rollNo: s.rollNo,
          name: s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || `Student ${s.rollNo}`,
          email: s.email,
          standard: s.standard,
          division: s.division,
          streamGroup: s.streamGroup,
          status: 'NOT_STARTED',
          startedAt: null,
          submittedAt: null,
          answeredCount: 0,
          totalQuestions: exam.questions ? exam.questions.length : 0,
          violationsCount: 0,
          violationLogs: [],
          disqualificationReason: '',
          retryAllowed: false,
        });
      }
    });

    // Sort: Disqualified or students with violations first, then in-progress, then rollNo
    liveData.sort((a, b) => {
      const aScore = (a.status === 'DISQUALIFIED' ? 20 : 0) + (a.violationsCount || 0) * 2 + (a.status === 'IN_PROGRESS' ? 5 : 0);
      const bScore = (b.status === 'DISQUALIFIED' ? 20 : 0) + (b.violationsCount || 0) * 2 + (b.status === 'IN_PROGRESS' ? 5 : 0);
      if (aScore !== bScore) return bScore - aScore;
      return (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0);
    });

    res.json({
      success: true,
      exam: {
        _id: exam._id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        questionsCount: exam.questions ? exam.questions.length : 0,
        status: exam.status,
      },
      students: liveData,
    });
  } catch (err) {
    console.error('Error fetching live monitor:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

