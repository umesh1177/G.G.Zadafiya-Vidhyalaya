const mongoose = require('mongoose');

const disciplineTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Discipline remark type is required'],
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: String,
      default: 'System',
      trim: true,
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

disciplineTypeSchema.pre('validate', function () {
  if (this.name) {
    this.name = String(this.name).trim();
    this.normalizedName = this.name.toLowerCase();
  }
});

module.exports = mongoose.model('DisciplineType', disciplineTypeSchema);

