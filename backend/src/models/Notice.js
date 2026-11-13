const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema(
  {
    facultyId: { type: String, default: '' },
    empCode: { type: String, default: '', uppercase: true, trim: true },
    email: { type: String, default: '', lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, default: 'Subject Faculty', trim: true },
    subject: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    attachmentId: { type: String, required: true },
    fileName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileType: { type: String, enum: ['IMAGE', 'PDF'], required: true },
    size: { type: Number, default: 0 },
    url: { type: String, default: '' },
  },
  { _id: false }
);

const noticeSchema = new mongoose.Schema(
  {
    srNo: {
      type: Number,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      default: 'General',
      trim: true,
    },
    targetScope: {
      type: String,
      required: true,
      enum: [
        'ALL',
        'ALL_STUDENTS',
        'ALL_FACULTY',
        'ALL_SUBJECT_FACULTY',
        'ALL_ASSISTANT_FACULTY',
        'SPECIFIC_FACULTY',
        'PRINCIPAL',
      ],
      default: 'ALL_FACULTY',
    },
    audienceLabel: {
      type: String,
      default: '',
      trim: true,
    },
    recipients: {
      type: [recipientSchema],
      default: [],
    },
    message: {
      type: String,
      required: [true, 'Notice message is required'],
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    senderId: {
      type: String,
      default: '',
      trim: true,
    },
    senderEmpCode: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    senderEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderRole: {
      type: String,
      required: true,
      enum: ['PRINCIPAL', 'SUBJECT_FACULTY', 'ASSISTANT_FACULTY'],
      default: 'PRINCIPAL',
    },
    senderSubject: {
      type: String,
      default: '',
      trim: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.audience = ret.audienceLabel;
        delete ret.__v;
        return ret;
      },
    },
  }
);

noticeSchema.index({ date: -1, createdAt: -1 });
noticeSchema.index({ targetScope: 1 });
noticeSchema.index({ senderRole: 1 });
noticeSchema.index({ 'recipients.empCode': 1 });
noticeSchema.index({ 'recipients.facultyId': 1 });

module.exports = mongoose.model('Notice', noticeSchema);

