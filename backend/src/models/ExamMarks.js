const mongoose = require('mongoose');

const examMarksSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamUnit', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    rollNo: { type: Number },
    studentName: { type: String, trim: true, default: '' },
    streamGroup: { type: String, enum: ['GROUP_A', 'GROUP_B', 'GROUP_AB', 'ALL'], default: 'ALL' },
    examGroup: { type: String, enum: ['A', 'B', 'ALL'], default: 'ALL' },
    enteredByAssistantFacultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: false,
    },
    enteredByName: { type: String, trim: true, default: 'Assistant Faculty' },
    ab: { type: Boolean, default: false },
    // If Board/Weekly: 1 subject mark. If JEE/NEET/GUJCET: Group A = PCM, Group B = PCB
    subjectMarks: [
      {
        subject: { type: String, required: true },
        marksObtained: { type: Number, required: true, default: 0 },
        totalMarks: { type: Number, required: true, default: 100 },
      },
    ],
    totalObtained: { type: Number, required: true, default: 0 },
    totalMaxMarks: { type: Number, required: true, default: 100 },
    percentage: { type: Number, default: 0 },
    enteredAt: { type: Date, default: Date.now },
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

examMarksSchema.index({ examId: 1, studentId: 1, examGroup: 1 }, { unique: true });

module.exports = mongoose.model('ExamMarks', examMarksSchema);
