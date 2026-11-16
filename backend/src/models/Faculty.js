const mongoose = require('mongoose');
const { hashPassword } = require('../utils/security');

const facultySchema = new mongoose.Schema(
  {
    empCode: {
      type: String,
      required: [true, 'Employee code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['Subject Faculty', 'Assistant Faculty', 'Principal'],
      default: 'Subject Faculty',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    qualification: {
      type: String,
      default: 'M.Sc., B.Ed.',
      trim: true,
    },
    contactNo: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: true, // Need to read for auth comparison, stripped in toJSON
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DEACTIVATED'],
      default: 'ACTIVE',
    },
    experience: {
      type: String,
      default: '3 Years',
    },
    resignationDate: {
      type: Date,
      default: null,
    },
    sessionVersion: {
      type: Number,
      default: 1,
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        delete ret.password; // Never leak password in API JSON responses
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

facultySchema.pre('save', function () {
  if (!this.fullName) {
    this.fullName = [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }
  // Automatically hash password on save if modified and not already hashed
  if (this.isModified('password') && this.password && typeof this.password === 'string') {
    if (!this.password.startsWith('scrypt$')) {
      this.password = hashPassword(this.password);
    }
  }
});

module.exports = mongoose.model('Faculty', facultySchema);
