const mongoose = require('mongoose');

const selectedUnitItemSchema = new mongoose.Schema(
  {
    chapterNo: { type: Number },
    chapterName: { type: String, trim: true, default: '' },
    chapterNameGujarati: { type: String, trim: true, default: '' },
    itemType: {
      type: String,
      enum: ['CHAPTER', 'TOPIC', 'SUBTOPIC', 'SUBSUBTOPIC', 'EXAMPLE', 'SWADHYAY', 'CUSTOM'],
      default: 'TOPIC',
    },
    code: { type: String, trim: true, default: '' },
    upToCode: { type: String, trim: true, default: '' },
    label: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const examUnitSchema = new mongoose.Schema(
  {
    examNo: { type: Number, index: true },
    title: { type: String, required: true, trim: true },
    examType: {
      type: String,
      required: true,
      enum: ['BOARD', 'JEE', 'NEET', 'GUJCET', 'ANNUAL', 'WEEKLY', 'OTHER'],
      default: 'BOARD',
    },
    subject: { type: String, required: true, trim: true },
    standard: { type: String, required: true, enum: ['STD_11', 'STD_12'], default: 'STD_11' },
    division: { type: String, enum: ['A', 'B', 'C', 'D', 'ALL'], default: 'ALL' },
    streamGroup: { type: String, enum: ['GROUP_A', 'GROUP_B', 'GROUP_AB', 'ALL'], default: 'ALL' },
    examDate: { type: Date, required: true },
    examTime: { type: String, trim: true, default: '10:00 AM' },
    durationMinutes: { type: Number, default: 60 },
    marksPerSubject: { type: Number, required: true, default: 100 },
    totalMarks: { type: Number, required: true, default: 100 },

    // Question paper PDF metadata (uploadable at creation or later from Exam History)
    questionPaperStatus: {
      type: String,
      enum: ['PENDING', 'UPLOADED'],
      default: 'PENDING',
    },
    questionPaperPdfUrl: { type: String, default: null },
    questionPaperFileName: { type: String, default: null },
    questionPaperPath: { type: String, default: null },
    questionPaperSize: { type: Number, default: 0 },
    questionPaperUploadedAt: { type: Date, default: null },

    // Ownership metadata
    createdByFacultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: false },
    facultyCode: { type: String, trim: true, default: '' },
    facultyName: { type: String, trim: true, default: '' },
    createdByRole: {
      type: String,
      enum: ['faculty', 'assistant', 'principal'],
      default: 'faculty',
    },

    // CBT Exam Linkage for JEE / NEET / GUJCET
    cbtExamId: { type: mongoose.Schema.Types.ObjectId, ref: 'CbtExam', default: null },
    cbtExamCode: { type: String, trim: true, default: '' },

    // Syllabus coverage units (structured + editable summary string)
    unitSummary: { type: String, trim: true, default: '' },
    selectedUnits: [selectedUnitItemSchema],
    chapters: [
      {
        chapterNo: Number,
        chapterName: String,
        topics: [String],
      },
    ],

    status: {
      type: String,
      enum: ['SCHEDULED', 'CONDUCTED', 'MARKS_ENTERED', 'RESULT_PUBLISHED'],
      default: 'SCHEDULED',
    },
    marksEnteredAt: { type: Date, default: null },
    marksEnteredByName: { type: String, trim: true, default: '' },
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

module.exports = mongoose.model('ExamUnit', examUnitSchema);
