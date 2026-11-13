/**
 * =========================================================================
 * MONGODB DATABASE SCHEMA FOR SCHOOL MANAGEMENT SYSTEM (SMS)
 * Engine: MongoDB (localhost:27017 / sms_db)
 * ODM: Mongoose
 * Roles: Student, Assistant Faculty, Subject Faculty, Principal
 * Streams: Group A (PCM - Physics, Chemistry, Maths), Group B (PCB - Physics, Chemistry, Biology), Group AB (PCMB)
 * Exams: Board, JEE, NEET, GUJCET, Weekly, Monthly, Annual
 * =========================================================================
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* -------------------------------------------------------------------------
   1. USER & AUTHENTICATION
   ------------------------------------------------------------------------- */
const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['STUDENT', 'ASSISTANT_FACULTY', 'SUBJECT_FACULTY', 'PRINCIPAL'],
      default: 'STUDENT',
    },
    email: { type: String, trim: true, lowercase: true },
    contactNo: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------
   2. STUDENT PROFILE
   ------------------------------------------------------------------------- */
const StudentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    rollNo: { type: Number, required: true, min: 1 },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true, default: '' },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true },
    standard: { type: String, required: true, enum: ['STD_11', 'STD_12'] },
    division: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
    streamGroup: {
      type: String,
      required: true,
      enum: ['GROUP_A', 'GROUP_B', 'GROUP_AB'], // A: PCM, B: PCB, AB: PCMB
    },
    admissionDate: { type: Date, default: Date.now },
    contactNo: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    status: { type: String, enum: ['ACTIVE', 'ALUMNI'], default: 'ACTIVE' },
    schoolName: { type: String, default: 'Shree Vidya Vihar Science School' },
    attendancePercent: { type: Number, default: 95.0, min: 0, max: 100 },
    graduationYear: { type: Number, default: null },
    currentPursuit: { type: String, default: null },
    endingDate: { type: Date, default: null },
  },
  { timestamps: true }
);

// Enforce unique roll number per standard and division
StudentSchema.index({ standard: 1, division: 1, rollNo: 1 }, { unique: true });

/* -------------------------------------------------------------------------
   3. FACULTY PROFILE (Subject Faculty & Assistant Faculty)
   ------------------------------------------------------------------------- */
const FacultySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    empCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true, default: '' },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true },
    role: {
      type: String,
      required: true,
      enum: ['Subject Faculty', 'Assistant Faculty', 'Principal'],
    },
    subject: { type: String, required: true, trim: true },
    qualification: { type: String, default: 'M.Sc., B.Ed.' },
    contactNo: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['ACTIVE', 'DEACTIVATED'], default: 'ACTIVE' },
    experience: { type: String, default: '3 Years' },
    resignationDate: { type: Date, default: null },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------
   4. SYLLABUS & CHAPTER TRACKING
   ------------------------------------------------------------------------- */
const ChapterSchema = new Schema(
  {
    standard: { type: String, required: true, enum: ['STD_11', 'STD_12'] },
    subject: { type: String, required: true },
    chapterNo: { type: Number, required: true },
    chapterTitle: { type: String, required: true },
    topics: [
      {
        topicNo: String,
        topicTitle: String,
        isCompleted: { type: Boolean, default: false },
        completedAt: Date,
        completedByFacultyId: { type: Schema.Types.ObjectId, ref: 'Faculty' },
      },
    ],
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------
   5. LT (LEARNING TEST) MODULE
   ------------------------------------------------------------------------- */
const LTSchema = new Schema(
  {
    title: { type: String, trim: true },
    subject: { type: String, required: true },
    standard: { type: String, required: true, enum: ['STD_11', 'STD_12'] },
    division: { type: String, required: true, enum: ['A', 'B', 'ALL'] },
    streamGroup: { type: String, enum: ['GROUP_A', 'GROUP_B', 'GROUP_AB', 'ALL'], default: 'ALL' },
    examDate: { type: Date, required: true },
    time: { type: String },
    topicsCovered: [{ type: String }],
    questions: [
      {
        questionNo: Number,
        questionText: String,
        marks: Number,
      },
    ],
    subjectFacultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    status: {
      type: String,
      enum: ['SCHEDULED', 'CONDUCTED', 'EVALUATED'],
      default: 'SCHEDULED',
    },
  },
  { timestamps: true }
);

const LTMarksSchema = new Schema(
  {
    ltId: { type: Schema.Types.ObjectId, ref: 'LT', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    assistantFacultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    grade: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'POOR'],
      required: true,
    },
    marksObtained: { type: Number },
    totalMarks: { type: Number },
    remarks: { type: String, trim: true },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
LTMarksSchema.index({ ltId: 1, studentId: 1 }, { unique: true });

/* -------------------------------------------------------------------------
   6. EXAM MODULE (Board, JEE, NEET, GUJCET, Weekly, Annual)
   ------------------------------------------------------------------------- */
const ExamUnitSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    examType: {
      type: String,
      required: true,
      enum: ['BOARD', 'JEE', 'NEET', 'GUJCET', 'ANNUAL', 'WEEKLY', 'OTHER'],
    },
    subject: { type: String, required: true },
    standard: { type: String, required: true, enum: ['STD_11', 'STD_12'] },
    division: { type: String, enum: ['A', 'B', 'ALL'], default: 'ALL' },
    streamGroup: { type: String, enum: ['GROUP_A', 'GROUP_B', 'GROUP_AB', 'ALL'], default: 'ALL' },
    examDate: { type: Date, required: true },
    totalMarks: { type: Number, required: true },
    questionPaperPdfUrl: { type: String, default: null },
    createdByFacultyId: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    chapters: [
      {
        chapterNo: Number,
        chapterName: String,
        topics: [String],
      },
    ],
    status: {
      type: String,
      enum: ['SCHEDULED', 'CONDUCTED', 'MARKS_ENTERED', 'RESULT_PUBLISHED'],
      default: 'SCHEDULED',
    },
  },
  { timestamps: true }
);

const ExamMarksSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'ExamUnit', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    enteredByAssistantFacultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    subjectMarks: [
      {
        subject: { type: String, required: true },
        marksObtained: { type: Number, required: true },
        totalMarks: { type: Number, required: true },
      },
    ],
    totalObtained: { type: Number, required: true },
    totalMaxMarks: { type: Number, required: true },
    percentage: { type: Number },
    enteredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
ExamMarksSchema.index({ examId: 1, studentId: 1 }, { unique: true });

/* -------------------------------------------------------------------------
   7. NOTICE & DISCIPLINE
   ------------------------------------------------------------------------- */
const NoticeSchema = new Schema(
  {
    type: { type: String, default: 'General' },
    date: { type: Date, default: Date.now },
    audience: { type: String, default: 'All' },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const DisciplineRemarkSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    date: { type: Date, default: Date.now },
    type: { type: String, required: true },
    notedBy: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = {
  UserSchema,
  StudentSchema,
  FacultySchema,
  ChapterSchema,
  LTSchema,
  LTMarksSchema,
  ExamUnitSchema,
  ExamMarksSchema,
  NoticeSchema,
  DisciplineRemarkSchema,
};

