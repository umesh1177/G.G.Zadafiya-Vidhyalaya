const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB } = require('./config/db');
const CbtExam = require('./models/CbtExam');
const CbtAttempt = require('./models/CbtAttempt');
const Student = require('./models/Student');
const { samplePhysicsQuestions, sampleChemistryQuestions, sampleMathsQuestions, sampleBiologyQuestions } = require('./data/cbtSampleQuestions');

async function seedCbtData() {
  try {
    await connectDB();
    console.log('Connected to MongoDB for CBT Seeding...');

    // Clear old CBT exams and attempts if desired, or ensure tests exist
    const existing = await CbtExam.countDocuments();
    if (existing > 0) {
      console.log(`Found ${existing} existing CBT exams. Ensuring sample exams are updated...`);
    }

    const now = new Date();
    const pastOneMonth = new Date(now.getTime() - 30 * 24 * 3600000);
    const inTwoMonths = new Date(now.getTime() + 60 * 24 * 3600000);
    const inTenMinutes = new Date(now.getTime() + 10 * 60000);

    // 1. Evaluated Exam matching Image 1 & Image 3
    const evaluatedExamQuestions = [
      ...samplePhysicsQuestions,
      ...sampleChemistryQuestions,
      ...sampleMathsQuestions,
    ];

    const exam1 = await CbtExam.findOneAndUpdate(
      { examCode: 'CBT-GUJCET-101' },
      {
        examCode: 'CBT-GUJCET-101',
        title: '#30 Mock Technical Aptitude (GUJCET PCM)',
        instituteName: 'G.G. Zadafiya Vidhyalaya',
        examType: 'GUJCET',
        standard: 'STD_11',
        division: 'ALL',
        streamGroup: 'GROUP_A',
        subjects: ['Physics', 'Chemistry', 'Mathematics'],
        durationMinutes: 85,
        totalMarks: 125,
        marksPerQuestion: 4,
        negativeMarks: 1,
        scheduleTime: pastOneMonth,
        startTime: pastOneMonth,
        windowEndTime: inTwoMonths,
        questions: evaluatedExamQuestions,
        status: 'EVALUATED',
        isResultPublished: true,
        takersCount: 40,
        createdBy: 'Rajiv Mehta (Assistant Faculty)',
        analytics: {
          averageScore: 81.32,
          medianScore: 93.2,
          lowestScore: 80.0,
          highestScore: 99.2,
          averageTimeSeconds: 4980, // ~83m 00s
          medianTimeSeconds: 4965,  // ~82m 45s
          timeUtilization: 97.65,
          avgQuestionsAttempted: 43,
          fullCompletionRate: 12.5,
          skippedQuestionRate: 4.67,
          scoreDistribution: [0, 0, 0, 0, 0, 0, 4, 13, 18, 5], // 60-70%: 4, 70-80%: 13, 80-90%: 18, 90-100%: 5
          statusCounts: {
            submitted: 40,
            disqualified: 0,
            started: 0,
            absent: 0,
          },
          questionAnalysis: evaluatedExamQuestions.map((q, idx) => {
            const attended = 38 + (idx % 3);
            const right = 30 + (idx % 8);
            const wrong = attended - right;
            const skipped = 40 - attended;
            return {
              questionNo: idx + 1,
              subject: q.subject,
              questionText: q.questionText,
              attendedCount: attended,
              skippedCount: skipped,
              rightCount: right,
              wrongCount: wrong,
              accuracy: Math.round((right / attended) * 100),
            };
          }),
        },
      },
      { upsert: true, new: true }
    );

    // Create 40 sample student attempts for this evaluated exam
    const students = await Student.find().limit(40);
    const attempts = [];
    const scores = [
      99.2, 98.4, 96.0, 95.2, 94.4, 93.6, 93.2, 92.8, 92.0, 91.2,
      90.4, 89.6, 88.8, 88.0, 87.2, 86.4, 85.6, 84.8, 84.0, 83.2,
      82.4, 81.6, 80.8, 80.0, 79.2, 78.4, 77.6, 76.8, 76.0, 75.2,
      74.4, 73.6, 72.8, 72.0, 71.2, 70.4, 69.6, 68.8, 67.2, 65.0
    ];

    for (let i = 0; i < 40; i++) {
      const rollNo = i + 1;
      const s = students[i] || {
        firstName: `Student`,
        lastName: `${rollNo}`,
        fullName: `Student ${rollNo}`,
      };
      const pct = scores[i] || (80 - i * 0.5);
      const score = Math.round((pct / 100) * 125);
      const rank = i + 1;
      const strictlyLower = 40 - rank;
      const percentile = Math.round((strictlyLower / 39) * 1000) / 10;

      await CbtAttempt.findOneAndUpdate(
        { examId: exam1._id, studentRollNo: rollNo },
        {
          examId: exam1._id,
          studentRollNo: rollNo,
          studentName: s.fullName || `${s.firstName} ${s.lastName}`,
          studentEmail: `student${rollNo}@ggzv.edu.in`,
          standard: 'STD_11',
          division: 'A',
          streamGroup: 'GROUP_A',
          questionOrder: evaluatedExamQuestions.map(q => q.id),
          answers: evaluatedExamQuestions.map(q => ({
            questionId: q.id,
            selectedOption: q.correctAnswer,
            status: 'ANSWERED',
            timeSpentSeconds: 110,
          })),
          startedAt: new Date(pastOneMonth.getTime() + 1000),
          submittedAt: new Date(pastOneMonth.getTime() + 4980 * 1000),
          timeSpentSeconds: 4980,
          status: 'SUBMITTED',
          violationsCount: 0,
          score,
          totalMarks: 125,
          percentage: pct,
          percentile,
          rank,
          correctCount: Math.round(score / 4),
          wrongCount: Math.max(0, 15 - Math.round(score / 4)),
          unansweredCount: 0,
        },
        { upsert: true }
      );
    }

    // 2. Active Exam Ready for Students to Take Right Now (#29 JEE Mock Test)
    const exam2Questions = [
      ...samplePhysicsQuestions,
      ...sampleChemistryQuestions,
      ...sampleMathsQuestions,
    ];

    await CbtExam.findOneAndUpdate(
      { examCode: 'CBT-JEE-202' },
      {
        examCode: 'CBT-JEE-202',
        title: '#29 JEE Main Mock Test 2026',
        instituteName: 'G.G. Zadafiya Vidhyalaya',
        examType: 'JEE',
        standard: 'STD_11',
        division: 'ALL',
        streamGroup: 'GROUP_A',
        subjects: ['Physics', 'Chemistry', 'Mathematics'],
        durationMinutes: 90,
        totalMarks: 60,
        marksPerQuestion: 4,
        negativeMarks: 1,
        scheduleTime: pastOneMonth,
        startTime: pastOneMonth, // Ready to start now!
        windowEndTime: inTwoMonths,
        questions: exam2Questions,
        status: 'ACTIVE',
        isResultPublished: false,
        takersCount: 18,
        createdBy: 'Rajiv Mehta (Assistant Faculty)',
      },
      { upsert: true }
    );

    // 3. Upcoming Scheduled NEET Exam (Group B - PCB with countdown timer)
    const exam3Questions = [
      ...samplePhysicsQuestions,
      ...sampleChemistryQuestions,
      ...sampleBiologyQuestions,
    ];

    await CbtExam.findOneAndUpdate(
      { examCode: 'CBT-NEET-303' },
      {
        examCode: 'CBT-NEET-303',
        title: '#28 NEET Biology & Science Mock Exam',
        instituteName: 'G.G. Zadafiya Vidhyalaya',
        examType: 'NEET',
        standard: 'STD_11',
        division: 'ALL',
        streamGroup: 'GROUP_B',
        subjects: ['Physics', 'Chemistry', 'Biology'],
        durationMinutes: 90,
        totalMarks: 60,
        marksPerQuestion: 4,
        negativeMarks: 1,
        scheduleTime: pastOneMonth,
        startTime: inTenMinutes, // Countdown timer test!
        windowEndTime: inTwoMonths,
        questions: exam3Questions,
        status: 'SCHEDULED',
        isResultPublished: false,
        takersCount: 27,
        createdBy: 'Rajiv Mehta (Assistant Faculty)',
      },
      { upsert: true }
    );

    console.log('✅ CBT Sample Data Seeded Successfully!');
  } catch (err) {
    console.error('Error seeding CBT data:', err);
  } finally {
    process.exit(0);
  }
}

seedCbtData();

