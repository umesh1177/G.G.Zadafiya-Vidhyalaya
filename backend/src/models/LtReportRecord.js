const mongoose = require('mongoose');

const ltReportRecordSchema = new mongoose.Schema(
  {
    reportNo: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    reportType: {
      type: String,
      enum: ['WEEKLY', 'MONTHLY', 'STUDENT'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    weekNo: {
      type: Number,
      default: null,
    },
    weekLabel: {
      type: String,
      trim: true,
      default: '',
    },
    monthLabel: {
      type: String,
      trim: true,
      default: '',
    },
    standard: {
      type: String,
      trim: true,
      default: 'ALL',
    },
    division: {
      type: String,
      trim: true,
      default: 'ALL',
    },
    subject: {
      type: String,
      trim: true,
      default: 'All Subjects',
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    studentName: {
      type: String,
      trim: true,
      default: '',
    },
    rollNo: {
      type: Number,
      default: null,
    },
    classAveragePercent: {
      type: mongoose.Schema.Types.Mixed,
      default: 'Better',
    },
    classAverageGrade: {
      type: String,
      default: '',
    },
    previousAveragePercent: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    growthRate: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    downfallRate: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    growthDownfallText: {
      type: String,
      default: '',
    },
    weakQuestionsCount: {
      type: Number,
      default: 0,
    },
    topPerformersCount: {
      type: Number,
      default: 0,
    },
    poorPerformersCount: {
      type: Number,
      default: 0,
    },
    printedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    printedBy: {
      type: String,
      trim: true,
      default: 'Principal',
    },
    summaryNote: {
      type: String,
      trim: true,
      default: '',
    },
    dataSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
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

ltReportRecordSchema.index({ reportType: 1, createdAt: -1 });

module.exports = mongoose.model('LtReportRecord', ltReportRecordSchema);

