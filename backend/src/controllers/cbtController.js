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
      totalMarks = 100,
      marksPerQuestion = 4,
      negativeMarks = 1,
      scheduleTime,
      startTime,
      windowEndTime,
      questionsText,
      questions: providedQuestions,
    } = req.body;

    const examCode = `CBT-${examType}-${Date.now().toString().slice(-6)}`;

    // Parse questions from raw text if provided, or use sample questions if empty
    let questions = [];
    if (providedQuestions && Array.isArray(providedQuestions) && providedQuestions.length > 0) {
      questions = providedQuestions;
    } else if (questionsText && typeof questionsText === 'string' && questionsText.trim()) {
      questions = parseMcqText(questionsText, 'Physics', Number(marksPerQuestion), Number(negativeMarks));
    }

    if (questions.length === 0) {
      // Auto-load high quality sample question bank matching exam type and stream
      questions = getSampleQuestionsForExam(examType, streamGroup);
    }

    // Determine subjects from questions
    const subjectSet = new Set(questions.map(q => q.subject));
    const subjects = Array.from(subjectSet);

    // Default dates if not provided
    const now = new Date();
    const schedDate = scheduleTime ? new Date(scheduleTime) : now;
    const startDate = startTime ? new Date(startTime) : new Date(now.getTime() + 10 * 60000); // 10 mins from now
    const endDate = windowEndTime ? new Date(windowEndTime) : new Date(now.getTime() + 7 * 24 * 3600000); // 7 days

    const calculatedTotalMarks = Number(totalMarks) || (questions.length * Number(marksPerQuestion));

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
      marksPerQuestion: Number(marksPerQuestion),
      negativeMarks: Number(negativeMarks),
      scheduleTime: schedDate,
      startTime: startDate,
      windowEndTime: endDate,
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
    const { studentRollNo, action = 'Forbidden action detected' } = req.body;

    const attempt = await CbtAttempt.findOne({ examId: id, studentRollNo: Number(studentRollNo) });
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.status === 'SUBMITTED' || attempt.status === 'DISQUALIFIED') {
      return res.json({ success: true, isDisqualified: attempt.status === 'DISQUALIFIED' });
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

    // Grade each student attempt
    const scoredAttempts = [];
    const posMarks = exam.marksPerQuestion || 4;
    const negMarks = exam.negativeMarks !== undefined ? exam.negativeMarks : 1;
    const totalPossibleMarks = exam.totalMarks || (exam.questions.length * posMarks);

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
          if (selected.toUpperCase() === correctOpt.toUpperCase()) {
            correct++;
            if (stat) stat.rightCount++;
          } else {
            wrong++;
            if (stat) stat.wrongCount++;
          }
        }
      });

      // Calculate score with negative marking
      let score = (correct * posMarks) - (wrong * negMarks);
      if (score < 0) score = 0; // standard non-negative floor if desired

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
      // Percentile formula: (count of students scoring less than student / total) * 100
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
        questionsCount: exam.questions ? exam.questions.length : 0,
        isResultPublished: exam.isResultPublished,
        status: exam.status,
      },
      analytics: exam.analytics || {},
      students: attempts.map(a => ({
        _id: a._id,
        rank: a.rank || '-',
        rollNo: a.studentRollNo,
        name: a.studentName,
        email: a.studentEmail,
        standard: a.standard,
        division: a.division,
        streamGroup: a.streamGroup,
        score: a.score,
        totalMarks: a.totalMarks,
        percentage: a.percentage,
        percentile: a.percentile,
        correctCount: a.correctCount,
        wrongCount: a.wrongCount,
        unansweredCount: a.unansweredCount,
        timeSpentSeconds: a.timeSpentSeconds,
        status: a.status,
        violationsCount: a.violationsCount,
        disqualificationReason: a.disqualificationReason,
        violationLogs: a.violationLogs,
      })),
      questions: (exam.analytics && exam.analytics.questionAnalysis) || [],
    });
  } catch (err) {
    console.error('Error fetching exam analysis:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 13. Assistant Faculty Live Monitoring Endpoint
exports.getLiveMonitor = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await CbtExam.findById(id).lean();
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const attempts = await CbtAttempt.find({ examId: id }).sort({ studentRollNo: 1 }).lean();

    // Map attempts by rollNo
    const attemptMap = {};
    attempts.forEach(a => {
      attemptMap[a.studentRollNo] = a;
    });

    // Fetch registered students in same standard & division
    const studentQuery = {};
    if (exam.standard && exam.standard !== 'ALL') studentQuery.standard = exam.standard;
    if (exam.division && exam.division !== 'ALL') studentQuery.division = exam.division;

    const students = await Student.find(studentQuery).sort({ rollNo: 1 }).lean();

    const liveData = students.map(s => {
      const att = attemptMap[s.rollNo];
      const answeredCount = att && att.answers
        ? att.answers.filter(a => a.status === 'ANSWERED').length
        : 0;
      return {
        studentId: s._id,
        rollNo: s.rollNo,
        name: s.fullName || `${s.firstName} ${s.lastName}`,
        standard: s.standard,
        division: s.division,
        streamGroup: s.streamGroup,
        status: att ? att.status : 'NOT_STARTED',
        startedAt: att ? att.startedAt : null,
        submittedAt: att ? att.submittedAt : null,
        answeredCount,
        totalQuestions: exam.questions.length,
        violationsCount: att ? att.violationsCount : 0,
        violationLogs: att ? att.violationLogs : [],
        disqualificationReason: att ? att.disqualificationReason : '',
        retryAllowed: att ? att.retryAllowed : false,
      };
    });

    res.json({
      success: true,
      exam: {
        _id: exam._id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        questionsCount: exam.questions.length,
        status: exam.status,
      },
      students: liveData,
    });
  } catch (err) {
    console.error('Error fetching live monitor:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

