const mongoose = require('mongoose');

const facultyReportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: ['LT', 'EXAM'],
      default: 'LT',
      index: true,
    },
    ltId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LT',
      required: false,
    },
    ltNo: { type: Number },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamUnit',
      required: false,
    },
    examNo: { type: Number },
    examType: { type: String, trim: true, default: '' },
    targetSubject: { type: String, trim: true, default: '' },
    subject: { type: String, required: true, trim: true },
    standard: { type: String, trim: true, default: 'STD_12' },
    division: { type: String, trim: true, default: 'ALL' },
    subjectFacultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: false },
    facultyName: { type: String, trim: true, default: '' },
    ltDate: { type: Date },
    examDate: { type: Date },
    markEntryDate: { type: Date },
    marksEnteredByName: { type: String, trim: true, default: '' },
    unitSummary: { type: String, trim: true, default: '' },
    topicsCovered: [{ type: String }],
    questions: [
      {
        questionNo: { type: Number },
        questionText: { type: String, trim: true },
        sourceTopicCode: { type: String, trim: true, default: '' },
        sourceTopicTitle: { type: String, trim: true, default: '' },
        marks: { type: Number, default: 2 },
      },
    ],
    classAverageLabel: {
      type: String,
      enum: ['Excellent', 'Better', 'Good', 'Strong', 'Moderate', 'Needs Attention'],
      default: 'Good',
    },
    classAveragePercent: { type: Number, default: 0 },
    classAverageScore: { type: Number, default: 0 },
    // Exam-specific diagnostic fields
    averageMarks: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 100 },
    highestMarks: { type: Number, default: 0 },
    lowestMarks: { type: Number, default: 0 },
    passCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 },
    growthRate: { type: Number, default: null },
    downfallRate: { type: Number, default: null },
    previousExamNo: { type: Number, default: null },
    previousExamAveragePercent: { type: Number, default: null },

    counts: {
      excellent: { type: Number, default: 0 },
      better: { type: Number, default: 0 },
      good: { type: Number, default: 0 },
      ab: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    alertStatus: {
      type: String,
      enum: ['WEAK_TOPIC_UNDERSTANDING', 'GOOD_UNDERSTANDING'],
      required: true,
    },
    alertTitle: { type: String, trim: true, required: true },
    alertMessage: { type: String, trim: true, default: '' },
    principalMessage: { type: String, trim: true, default: '' },
    sentByName: { type: String, trim: true, default: 'Principal' },
    acknowledgedByFaculty: { type: Boolean, default: false },
    acknowledgedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('FacultyReport', facultyReportSchema);
