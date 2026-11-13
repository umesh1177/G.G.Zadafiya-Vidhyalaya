const mongoose = require('mongoose');

const ltQuestionSchema = new mongoose.Schema({
  questionNo: { type: Number, required: true },
  questionText: { type: String, required: true, trim: true },
  sourceTopicCode: { type: String, trim: true, default: '' },
  sourceTopicTitle: { type: String, trim: true, default: '' },
  marks: { type: Number, default: 2 },
});

const ltSchema = new mongoose.Schema(
  {
    ltNo: { type: Number },
    title: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    standard: {
      type: String,
      required: true,
      enum: ['STD_11', 'STD_12', 'Standard 11', 'Standard 12'],
      default: 'STD_12',
    },
    division: {
      type: String,
      enum: ['A', 'B', 'ALL', 'Division A', 'Division B'],
      default: 'ALL',
    },
    streamGroup: { type: String, enum: ['GROUP_A', 'GROUP_B', 'GROUP_AB', 'ALL'], default: 'ALL' },
    examDate: { type: Date, required: true },
    takenDate: { type: Date },
    marksEnteredAt: { type: Date, default: null },
    marksEnteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: false },
    marksEnteredByName: { type: String, trim: true, default: '' },
    time: { type: String },
    duration: { type: Number, default: 15 },
    durationSeconds: { type: Number, default: 0 },
    note: { type: String, trim: true, default: '' },
    facultyName: { type: String, trim: true, default: '' },
    topicsCovered: [{ type: String }],
    questions: [ltQuestionSchema],
    subjectFacultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: false },
    status: {
      type: String,
      enum: ['SCHEDULED', 'CONDUCTED', 'EVALUATED'],
      default: 'SCHEDULED',
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

module.exports = mongoose.model('LT', ltSchema);
