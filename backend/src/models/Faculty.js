const mongoose = require('mongoose');

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
      default: 'faculty123',
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

facultySchema.pre('save', function () {
  if (!this.fullName) {
    this.fullName = [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }
});

module.exports = mongoose.model('Faculty', facultySchema);
