const mongoose = require('mongoose');

const disciplineRemarkSchema = new mongoose.Schema(
  {
    srNo: {
      type: Number,
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    rollNo: {
      type: Number,
      required: [true, 'Roll number is required'],
      min: 1,
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    standard: {
      type: String,
      required: true,
      enum: ['STD_11', 'STD_12'],
      default: 'STD_11',
    },
    division: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D'],
      default: 'A',
    },
    streamGroup: {
      type: String,
      default: '',
      trim: true,
    },
    contactNo: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      required: [true, 'Remark type is required'],
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    message: {
      type: String,
      default: '',
      trim: true,
    },
    notedBy: {
      type: String,
      required: true,
      trim: true,
      default: 'Assistant Faculty',
    },
    notedByRole: {
      type: String,
      enum: ['ASSISTANT_FACULTY', 'PRINCIPAL', 'SUBJECT_FACULTY'],
      default: 'ASSISTANT_FACULTY',
    },
    notedById: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'REVIEWED', 'RESOLVED'],
      default: 'OPEN',
    },
    principalNote: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.name = ret.studentName;
        ret.description = ret.message;
        delete ret.__v;
        return ret;
      },
    },
  }
);

disciplineRemarkSchema.index({ standard: 1, division: 1, rollNo: 1, date: -1 });
disciplineRemarkSchema.index({ type: 1 });
disciplineRemarkSchema.index({ date: -1, createdAt: -1 });

module.exports = mongoose.model('DisciplineRemark', disciplineRemarkSchema);

