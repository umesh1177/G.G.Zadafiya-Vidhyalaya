const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    rollNo: {
      type: Number,
      required: [true, 'Roll number is required'],
      min: 1,
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
    standard: {
      type: String,
      required: true,
      enum: ['STD_11', 'STD_12'],
      default: 'STD_11',
    },
    division: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D'],
      default: 'A',
    },
    streamGroup: {
      type: String,
      required: true,
      enum: ['GROUP_A', 'GROUP_B', 'GROUP_AB'],
      default: 'GROUP_A',
    },
    admissionDate: {
      type: Date,
      default: Date.now,
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
    status: {
      type: String,
      enum: ['ACTIVE', 'ALUMNI'],
      default: 'ACTIVE',
    },
    schoolName: {
      type: String,
      default: 'G.G. Zadafiya Vidhyalaya',
    },
    attendancePercent: {
      type: Number,
      default: 95.0,
      min: 0,
      max: 100,
    },
    graduationYear: {
      type: Number,
      default: null,
    },
    currentPursuit: {
      type: String,
      default: null,
    },
    endingDate: {
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

// Auto-compute fullName before saving if not provided
studentSchema.pre('save', function () {
  if (!this.fullName) {
    this.fullName = [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }
});

// Ensure rollNo is unique per (standard, division)
studentSchema.index({ standard: 1, division: 1, rollNo: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
