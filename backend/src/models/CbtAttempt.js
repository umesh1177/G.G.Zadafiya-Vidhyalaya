const mongoose = require('mongoose');

const answerItemSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    selectedOption: { type: String, enum: ['A', 'B', 'C', 'D', null, ''], default: null },
    status: {
      type: String,
      enum: ['ANSWERED', 'NOT_ANSWERED', 'MARKED_FOR_REVIEW', 'NOT_VISITED'],
      default: 'NOT_VISITED',
    },
    timeSpentSeconds: { type: Number, default: 0 },
  },
  { _id: false }
);

const violationLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    warningNumber: { type: Number, required: true },
  },
  { _id: false }
);

const cbtAttemptSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CbtExam',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: false,
    },
    studentRollNo: { type: Number, required: true },
    studentName: { type: String, required: true, trim: true },
    studentEmail: { type: String, trim: true, default: '' },
    standard: { type: String, default: 'STD_11' },
    division: { type: String, default: 'A' },
    streamGroup: { type: String, default: 'GROUP_A' },

    // Unique shuffled question order for this specific student
    questionOrder: [{ type: String }],

    // Saved answers and status per question
    answers: [answerItemSchema],

    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    timeSpentSeconds: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'DISQUALIFIED'],
      default: 'IN_PROGRESS',
    },

    // Kiosk Mode & Anti-Cheating Tracking
    violationsCount: { type: Number, default: 0 },
    violationLogs: [violationLogSchema],
    disqualificationReason: { type: String, default: '' },

    // Retry functionality for assistant faculty
    retryAllowed: { type: Boolean, default: false },
    retryGrantedBy: { type: String, default: '' },
    retryGrantedAt: { type: Date },

    // Evaluated Marks and Performance
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    percentile: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound index so a student has one attempt per exam
cbtAttemptSchema.index({ examId: 1, studentRollNo: 1 }, { unique: true });

module.exports = mongoose.model('CbtAttempt', cbtAttemptSchema);

