const mongoose = require('mongoose');

/**
 * Per-Faculty Isolated Syllabus Completion Progress
 * Stores completed leaf nodes (topics without subtopics, subtopics without sub-subtopics,
 * sub-subtopics, examples, and swadhyay exercises) scoped per facultyId.
 *
 * - Subject Faculty only see/modify records matching their own facultyId.
 * - Principal can query across ALL faculty (combined/union completion) or filter by a specific facultyId.
 */
const syllabusProgressSchema = new mongoose.Schema(
  {
    facultyId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    facultyName: {
      type: String,
      trim: true,
      default: '',
    },
    facultyEmpCode: {
      type: String,
      trim: true,
      default: '',
    },
    facultySubject: {
      type: String,
      trim: true,
      default: '',
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Syllabus',
      required: true,
      index: true,
    },
    chapterNo: {
      type: Number,
      required: true,
    },
    chapterName: {
      type: String,
      trim: true,
      default: '',
    },
    chapterNameGujarati: {
      type: String,
      trim: true,
      default: '',
    },
    standard: {
      type: String,
      required: true,
    },
    division: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    itemType: {
      type: String,
      required: true,
      enum: ['TOPIC', 'SUBTOPIC', 'SUBSUBTOPIC', 'EXAMPLE', 'SWADHYAY'],
    },
    itemKey: {
      type: String,
      required: true,
      trim: true,
    },
    itemCode: {
      type: String,
      required: true,
      trim: true,
    },
    itemTitle: {
      type: String,
      required: true,
      trim: true,
    },
    itemTitleGujarati: {
      type: String,
      trim: true,
      default: '',
    },
    parentTopicNo: {
      type: String,
      trim: true,
      default: '',
    },
    parentTopicTitle: {
      type: String,
      trim: true,
      default: '',
    },
    completedAt: {
      type: Date,
      default: Date.now,
      index: true,
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

syllabusProgressSchema.index(
  { facultyId: 1, chapterId: 1, itemType: 1, itemKey: 1 },
  { unique: true }
);
syllabusProgressSchema.index({ facultyId: 1, subject: 1, completedAt: -1 });
syllabusProgressSchema.index({ subject: 1, standard: 1, division: 1 });

module.exports = mongoose.model('SyllabusProgress', syllabusProgressSchema);

