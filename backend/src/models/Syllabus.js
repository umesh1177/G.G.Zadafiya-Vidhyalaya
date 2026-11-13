const mongoose = require('mongoose');

// Sub-subtopic schema (Level 4: e.g. 1.1.1.a or specific concept/theory)
const subSubTopicSchema = new mongoose.Schema({
  subSubtopicNo: { type: String, trim: true }, // e.g. "1.1.1.a"
  title: { type: String, required: true, trim: true },
  titleGujarati: { type: String, trim: true, default: '' },
  imageUrl: { type: String, default: null },
  figureNote: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  completedAt: { type: Date, default: null },
});

// Subtopic schema (Level 3: e.g. 1.1.1, 1.1.2)
const subTopicSchema = new mongoose.Schema({
  subtopicNo: { type: String, required: true, trim: true }, // e.g. "1.1.1"
  title: { type: String, required: true, trim: true },
  titleGujarati: { type: String, trim: true, default: '' },
  type: {
    type: String,
    enum: ['SUBTOPIC', 'EXAMPLE', 'SWADHYAY', 'THEORY'],
    default: 'SUBTOPIC',
  },
  imageUrl: { type: String, default: null },
  figureNote: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  completedAt: { type: Date, default: null },
  subSubtopics: [subSubTopicSchema],
});

// Example item schema (e.g. "ઉદા. 1.1")
const exampleItemSchema = new mongoose.Schema({
  exampleNo: { type: String, required: true, trim: true }, // e.g. "ઉદા. 1.1"
  title: { type: String, required: true, trim: true },
  titleGujarati: { type: String, trim: true, default: '' },
  imageUrl: { type: String, default: null },
  figureNote: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  completedAt: { type: Date, default: null },
});

// Swadhyay exercise item schema (e.g. "1", "2", "3")
const swadhyayItemSchema = new mongoose.Schema({
  exerciseNo: { type: String, required: true, trim: true }, // e.g. "1", "2"
  title: { type: String, required: true, trim: true },
  titleGujarati: { type: String, trim: true, default: '' },
  imageUrl: { type: String, default: null },
  figureNote: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  completedAt: { type: Date, default: null },
});

// Topic schema (Level 2: e.g. 1.1, 1.2)
const topicSchema = new mongoose.Schema({
  topicNo: { type: String, required: true, trim: true }, // e.g. "1.1"
  title: { type: String, required: true, trim: true },
  titleGujarati: { type: String, trim: true, default: '' },
  imageUrl: { type: String, default: null },
  figureNote: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  completedAt: { type: Date, default: null },
  subtopics: [subTopicSchema],
  examples: [exampleItemSchema],
  swadhyay: [swadhyayItemSchema],
});

// Chapter schema (Level 1: Chapter 1, 2, 3...)
const chapterSchema = new mongoose.Schema(
  {
    standard: {
      type: String,
      required: true,
      enum: ['STD_11', 'STD_12', 'Standard 11', 'Standard 12'],
      default: 'Standard 12',
    },
    division: {
      type: String,
      required: true,
      default: 'Division A',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      default: 'Physics',
    },
    chapterNo: {
      type: Number,
      required: true,
    },
    chapterName: {
      type: String,
      required: true,
      trim: true,
    },
    chapterNameGujarati: {
      type: String,
      trim: true,
      default: '',
    },
    topics: [topicSchema],
    examples: [exampleItemSchema],
    swadhyay: [swadhyayItemSchema],
    order: {
      type: Number,
      default: 1,
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

chapterSchema.index({ standard: 1, division: 1, subject: 1, chapterNo: 1 });

module.exports = mongoose.model('Syllabus', chapterSchema);

