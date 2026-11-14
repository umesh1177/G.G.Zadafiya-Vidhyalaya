const mongoose = require('mongoose');

const cbtQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    subject: { type: String, required: true, trim: true },
    questionNo: { type: Number, required: true },
    marks: { type: Number, default: 4 },
    negativeMarks: { type: Number, default: 1 },
    questionText: { type: String, required: true, trim: true },
    questionTextGujarati: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    options: {
      type: [String],
      validate: [val => val.length === 4, 'Must provide exactly 4 options (A, B, C, D)'],
      required: true,
    },
    correctAnswer: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D'],
    },
    explanation: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const cbtExamSchema = new mongoose.Schema(
  {
    examCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    instituteName: { type: String, default: 'G.G. Zadafiya Vidhyalaya', trim: true },
    examType: {
      type: String,
      required: true,
      enum: ['JEE', 'NEET', 'GUJCET'],
      default: 'GUJCET',
    },
    standard: {
      type: String,
      required: true,
      enum: ['STD_11', 'STD_12', 'ALL'],
      default: 'STD_11',
    },
    division: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D', 'ALL'],
      default: 'ALL',
    },
    streamGroup: {
      type: String,
      required: true,
      enum: ['GROUP_A', 'GROUP_B', 'GROUP_AB', 'ALL'],
      default: 'ALL',
    },
    subjects: {
      type: [String],
      default: ['Physics', 'Chemistry', 'Mathematics'],
    },
    durationMinutes: { type: Number, required: true, default: 60 },
    totalMarks: { type: Number, required: true, default: 100 },
    passingMarks: { type: Number, default: 35 },
    marksPerQuestion: { type: Number, default: 4 },
    negativeMarks: { type: Number, default: 1 },

    // Subject Total Marks Configuration (e.g. Physics: 100, Chemistry: 100, Maths: 100)
    subjectMarksConfig: [
      {
        subject: { type: String, required: true },
        totalMarks: { type: Number, required: true, default: 100 },
      },
    ],

    // Visibility and Scheduling Timings
    scheduleTime: {
      type: Date,
      required: true,
      comment: 'When the exam card becomes visible to students on their dashboard',
    },
    startTime: {
      type: Date,
      required: true,
      comment: 'Countdown timer target; student can enter the exam environment only after this time',
    },
    windowEndTime: {
      type: Date,
      required: true,
      comment: 'Exam window closes; card disappears or exam cannot be started',
    },

    // Subject Question Papers (PDFs uploaded for Physics, Chemistry, Maths/Biology)
    subjectPapers: [
      {
        subject: { type: String, required: true },
        fileName: { type: String, default: '' },
        fileSize: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Questions list
    questions: [cbtQuestionSchema],

    // Lifecycle Status
    status: {
      type: String,
      enum: ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'EVALUATED'],
      default: 'SCHEDULED',
    },
    isResultPublished: { type: Boolean, default: false },
    takersCount: { type: Number, default: 0 },
    createdBy: { type: String, default: 'Assistant Faculty' },

    // Cached Evaluated Analytics matching Photo 1
    analytics: {
      averageScore: { type: Number, default: 0 },
      medianScore: { type: Number, default: 0 },
      lowestScore: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      passedCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      passPercentage: { type: Number, default: 0 },
      averageTimeSeconds: { type: Number, default: 0 },
      medianTimeSeconds: { type: Number, default: 0 },
      timeUtilization: { type: Number, default: 0 },
      avgQuestionsAttempted: { type: Number, default: 0 },
      fullCompletionRate: { type: Number, default: 0 },
      skippedQuestionRate: { type: Number, default: 0 },
      scoreDistribution: {
        type: [Number],
        default: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0-10%, 10-20%... 90-100%
      },
      statusCounts: {
        submitted: { type: Number, default: 0 },
        disqualified: { type: Number, default: 0 },
        started: { type: Number, default: 0 },
        absent: { type: Number, default: 0 },
      },
      questionAnalysis: [
        {
          questionNo: Number,
          subject: String,
          questionText: String,
          imageUrl: { type: String, default: '' },
          attendedCount: Number,
          skippedCount: Number,
          rightCount: Number,
          wrongCount: Number,
          accuracy: Number,
        },
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CbtExam', cbtExamSchema);

