const mongoose = require('mongoose');

const ltMarksSchema = new mongoose.Schema(
  {
    ltId: { type: mongoose.Schema.Types.ObjectId, ref: 'LT', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    rollNo: { type: Number },
    studentName: { type: String, trim: true },
    assistantFacultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: false },
    grade: {
      type: String,
      enum: ['Excellent', 'Better', 'Good', 'AB', 'EXCELLENT', 'BETTER', 'GOOD', 'POOR', 'ABSENT'],
      required: true,
    },
    marksObtained: { type: Number },
    totalMarks: { type: Number },
    remarks: { type: String, trim: true },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One mark per student per LT
ltMarksSchema.index({ ltId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('LTMarks', ltMarksSchema);
