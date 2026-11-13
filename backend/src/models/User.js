const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      default: '$2b$10$default_password_hash',
    },
    role: {
      type: String,
      required: true,
      enum: ['STUDENT', 'ASSISTANT_FACULTY', 'SUBJECT_FACULTY', 'PRINCIPAL'],
      default: 'STUDENT',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactNo: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

