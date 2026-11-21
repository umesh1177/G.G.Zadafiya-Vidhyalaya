const mongoose = require('mongoose');

const accessHistorySchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
      index: true,
    },
    facultyName: {
      type: String,
      required: true,
      trim: true,
    },
    facultyEmpCode: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    facultyRole: {
      type: String,
      trim: true,
      default: 'Subject Faculty',
    },
    changedBy: {
      type: String,
      default: 'Principal',
      trim: true,
    },
    action: {
      type: String,
      default: 'Updated Permissions',
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: [String],
      default: [],
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    previousAccess: {
      accessibleTabs: { type: [String], default: [] },
      allowedExamSubjects: { type: [String], default: [] },
      allowedLtSubjects: { type: [String], default: [] },
    },
    newAccess: {
      accessibleTabs: { type: [String], default: [] },
      allowedExamSubjects: { type: [String], default: [] },
      allowedLtSubjects: { type: [String], default: [] },
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

module.exports = mongoose.model('AccessHistory', accessHistorySchema);
