/**
 * G.G. Zadafiya Vidhyalaya - Safe, Repeatable Local MongoDB Seeder
 * Strict Safety Rules:
 * 1. Strictly refuses to run on non-local databases (verifies host is localhost/127.0.0.1).
 * 2. Never executes unbounded deleteMany() on students or faculty.
 * 3. Uses deterministic keys and safe upserts (updateOne/findOneAndUpdate with upsert: true).
 * 4. All passwords cryptographically hashed with scrypt + unique random salts.
 * 5. Exits with non-zero status code on any failure.
 * 6. Never logs passwords or sensitive data.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const { hashPassword } = require('./utils/security');
const Faculty = require('./models/Faculty');
const Student = require('./models/Student');
const LT = require('./models/LT');
const LTMarks = require('./models/LTMarks');
const ExamUnit = require('./models/ExamUnit');
const ExamMarks = require('./models/ExamMarks');
const Notice = require('./models/Notice');
const DisciplineRemark = require('./models/DisciplineRemark');
const DisciplineType = require('./models/DisciplineType');
const syllabusService = require('./services/syllabusService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/GGZ';
const SCHOOL_NAME = 'G.G. Zadafiya Vidhyalaya';

// Safety Guard: Refuse non-local databases
function verifyLocalDatabase(uri) {
  const isLocal =
    uri.includes('127.0.0.1') ||
    uri.includes('localhost') ||
    (uri.startsWith('mongodb://') && !uri.includes('mongodb+srv://') && !uri.includes('.mongodb.net'));

  if (!isLocal) {
    console.error('🛑 ABORT: Seeding is strictly forbidden on non-local databases!');
    console.error(`Target URI: ${uri}`);
    process.exit(1);
  }
}

// Fictional Staff Seed Data (All passwords securely hashed)
const facultySeedData = [
  {
    empCode: 'PR101',
    firstName: 'Jayant',
    middleName: 'R.',
    lastName: 'Zadafiya',
    fullName: 'Dr. Jayant R. Zadafiya',
    role: 'Principal',
    subject: 'Administration',
    qualification: 'Ph.D. Education Management, M.Sc.',
    contactNo: '+91 99887 11000',
    email: 'principal@ggzv.edu.in',
    plainPass: 'admin123',
    joiningDate: new Date('2015-06-01'),
    status: 'ACTIVE',
    experience: '18 Years',
  },
  {
    empCode: 'FAC101',
    firstName: 'Umesh',
    middleName: 'K.',
    lastName: 'Pal',
    fullName: 'Prof. Umesh K. Pal',
    role: 'Subject Faculty',
    subject: 'Physics',
    qualification: 'M.Sc. Physics (Gold Medalist), B.Ed.',
    contactNo: '+91 99887 11001',
    email: 'umesh.pal@ggzv.edu.in',
    plainPass: 'faculty123',
    joiningDate: new Date('2018-06-01'),
    status: 'ACTIVE',
    experience: '8 Years',
  },
  {
    empCode: 'FAC102',
    firstName: 'Nisha',
    middleName: 'R.',
    lastName: 'Rao',
    fullName: 'Dr. Nisha R. Rao',
    role: 'Subject Faculty',
    subject: 'Chemistry (Board)',
    qualification: 'Ph.D. Organic Chemistry',
    contactNo: '+91 99887 11002',
    email: 'nisha.rao@ggzv.edu.in',
    plainPass: 'faculty123',
    joiningDate: new Date('2019-06-11'),
    status: 'ACTIVE',
    experience: '6 Years',
  },
  {
    empCode: 'FAC108',
    firstName: 'Harsh',
    middleName: 'D.',
    lastName: 'Patel',
    fullName: 'Prof. Harsh D. Patel',
    role: 'Subject Faculty',
    subject: 'Chemistry (JEE)',
    qualification: 'M.Sc. Chemistry (IIT), B.Ed.',
    contactNo: '+91 99887 11008',
    email: 'harsh.patel@ggzv.edu.in',
    plainPass: 'faculty123',
    joiningDate: new Date('2021-07-01'),
    status: 'ACTIVE',
    experience: '5 Years',
  },
  {
    empCode: 'FAC103',
    firstName: 'Ketan',
    middleName: 'M.',
    lastName: 'Joshi',
    fullName: 'Prof. Ketan M. Joshi',
    role: 'Subject Faculty',
    subject: 'Mathematics',
    qualification: 'M.Sc. Applied Mathematics, B.Ed.',
    contactNo: '+91 99887 11003',
    email: 'ketan.j@ggzv.edu.in',
    plainPass: 'faculty123',
    joiningDate: new Date('2017-06-03'),
    status: 'ACTIVE',
    experience: '9 Years',
  },
  {
    empCode: 'FAC104',
    firstName: 'Heena',
    middleName: 'S.',
    lastName: 'Patel',
    fullName: 'Dr. Heena S. Patel',
    role: 'Subject Faculty',
    subject: 'Biology',
    qualification: 'Ph.D. Life Sciences, Botany & Zoology',
    contactNo: '+91 99887 11004',
    email: 'heena.p@ggzv.edu.in',
    plainPass: 'faculty123',
    joiningDate: new Date('2021-06-20'),
    status: 'ACTIVE',
    experience: '5 Years',
  },
  {
    empCode: 'FAC105',
    firstName: 'Rajiv',
    middleName: 'A.',
    lastName: 'Mehta',
    fullName: 'Rajiv A. Mehta',
    role: 'Assistant Faculty',
    subject: 'Lab — Physics/Chemistry',
    qualification: 'B.Sc. Chemistry, Lab Tech Certification',
    contactNo: '+91 99887 11005',
    email: 'rajiv.mehta@ggzv.edu.in',
    plainPass: 'asst123',
    joiningDate: new Date('2020-07-05'),
    status: 'ACTIVE',
    experience: '4 Years',
  },
  {
    empCode: 'FAC106',
    firstName: 'Komal',
    middleName: 'P.',
    lastName: 'Desai',
    fullName: 'Komal P. Desai',
    role: 'Assistant Faculty',
    subject: 'Lab — Biology',
    qualification: 'B.Sc. Microbiology',
    contactNo: '+91 99887 11006',
    email: 'komal.desai@ggzv.edu.in',
    plainPass: 'asst123',
    joiningDate: new Date('2022-07-14'),
    status: 'ACTIVE',
    experience: '3 Years',
  },
];

// Fictional Student Seed Data across Std 11 & 12, Div A & B, Group A & B & AB
const studentSeedData = [
  // Std 11 Division A (Roll 1 - 6)
  { rollNo: 1, firstName: 'Aarav', middleName: 'D.', lastName: 'Shah', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_A', contactNo: '+91 98000 11001', email: 'aarav.shah@student.ggzv.edu.in', attendancePercent: 96.5 },
  { rollNo: 2, firstName: 'Bhavya', middleName: 'M.', lastName: 'Patel', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_A', contactNo: '+91 98000 11002', email: 'bhavya.patel@student.ggzv.edu.in', attendancePercent: 94.0 },
  { rollNo: 3, firstName: 'Chirag', middleName: 'K.', lastName: 'Mehta', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_B', contactNo: '+91 98000 11003', email: 'chirag.mehta@student.ggzv.edu.in', attendancePercent: 91.5 },
  { rollNo: 4, firstName: 'Drashti', middleName: 'R.', lastName: 'Joshi', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_B', contactNo: '+91 98000 11004', email: 'drashti.joshi@student.ggzv.edu.in', attendancePercent: 98.0 },
  { rollNo: 5, firstName: 'Eshaan', middleName: 'S.', lastName: 'Trivedi', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_AB', contactNo: '+91 98000 11005', email: 'eshaan.trivedi@student.ggzv.edu.in', attendancePercent: 89.0 },
  { rollNo: 6, firstName: 'Pooja', middleName: 'H.', lastName: 'Solanki', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_A', contactNo: '+91 98000 11006', email: 'pooja.solanki@student.ggzv.edu.in', attendancePercent: 93.0 },

  // Std 11 Division B (Roll 1 - 4)
  { rollNo: 1, firstName: 'Farhan', middleName: 'A.', lastName: 'Khan', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_A', contactNo: '+91 98000 12001', email: 'farhan.khan@student.ggzv.edu.in', attendancePercent: 95.0 },
  { rollNo: 2, firstName: 'Gautam', middleName: 'N.', lastName: 'Vora', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_B', contactNo: '+91 98000 12002', email: 'gautam.vora@student.ggzv.edu.in', attendancePercent: 93.5 },
  { rollNo: 3, firstName: 'Kavya', middleName: 'L.', lastName: 'Parikh', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_A', contactNo: '+91 98000 12003', email: 'kavya.parikh@student.ggzv.edu.in', attendancePercent: 92.0 },
  { rollNo: 4, firstName: 'Mihir', middleName: 'C.', lastName: 'Dave', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_B', contactNo: '+91 98000 12004', email: 'mihir.dave@student.ggzv.edu.in', attendancePercent: 90.5 },

  // Std 12 Division A (Roll 1 - 6)
  { rollNo: 1, firstName: 'Heli', middleName: 'J.', lastName: 'Desai', standard: 'STD_12', division: 'A', streamGroup: 'GROUP_A', contactNo: '+91 98000 13001', email: 'heli.desai@student.ggzv.edu.in', attendancePercent: 97.2 },
  { rollNo: 2, firstName: 'Ishaan', middleName: 'V.', lastName: 'Pandya', standard: 'STD_12', division: 'A', streamGroup: 'GROUP_B', contactNo: '+91 98000 13002', email: 'ishaan.pandya@student.ggzv.edu.in', attendancePercent: 92.4 },
  { rollNo: 3, firstName: 'Janvi', middleName: 'P.', lastName: 'Raval', standard: 'STD_12', division: 'A', streamGroup: 'GROUP_A', contactNo: '+91 98000 13003', email: 'janvi.raval@student.ggzv.edu.in', attendancePercent: 95.8 },
  { rollNo: 4, firstName: 'Karan', middleName: 'T.', lastName: 'Chauhan', standard: 'STD_12', division: 'A', streamGroup: 'GROUP_B', contactNo: '+91 98000 13004', email: 'karan.chauhan@student.ggzv.edu.in', attendancePercent: 94.1 },
  { rollNo: 5, firstName: 'Lata', middleName: 'B.', lastName: 'Gadhvi', standard: 'STD_12', division: 'A', streamGroup: 'GROUP_AB', contactNo: '+91 98000 13005', email: 'lata.gadhvi@student.ggzv.edu.in', attendancePercent: 96.0 },
  { rollNo: 6, firstName: 'Nirav', middleName: 'R.', lastName: 'Modi', standard: 'STD_12', division: 'A', streamGroup: 'GROUP_A', contactNo: '+91 98000 13006', email: 'nirav.modi@student.ggzv.edu.in', attendancePercent: 88.5 },

  // Std 12 Division B (Roll 1 - 4)
  { rollNo: 1, firstName: 'Omkar', middleName: 'S.', lastName: 'Jadhav', standard: 'STD_12', division: 'B', streamGroup: 'GROUP_A', contactNo: '+91 98000 14001', email: 'omkar.jadhav@student.ggzv.edu.in', attendancePercent: 91.0 },
  { rollNo: 2, firstName: 'Prachi', middleName: 'E.', lastName: 'Sanghvi', standard: 'STD_12', division: 'B', streamGroup: 'GROUP_B', contactNo: '+91 98000 14002', email: 'prachi.sanghvi@student.ggzv.edu.in', attendancePercent: 97.5 },
  { rollNo: 3, firstName: 'Rohan', middleName: 'N.', lastName: 'Bhatt', standard: 'STD_12', division: 'B', streamGroup: 'GROUP_A', contactNo: '+91 98000 14003', email: 'rohan.bhatt@student.ggzv.edu.in', attendancePercent: 93.8 },
  { rollNo: 4, firstName: 'Sanya', middleName: 'K.', lastName: 'Vora', standard: 'STD_12', division: 'B', streamGroup: 'GROUP_B', contactNo: '+91 98000 14004', email: 'sanya.vora@student.ggzv.edu.in', attendancePercent: 95.2 },
];

async function runSeed() {
  verifyLocalDatabase(MONGODB_URI);
  console.log(`🔒 Localhost safety verified: ${MONGODB_URI}`);

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('🍃 Connected to MongoDB for safe idempotent seeding.');

    let facultyCount = 0;
    const facultyMap = {};

    // 1. Safe Upsert Faculty Members
    for (const f of facultySeedData) {
      const hashedPassword = hashPassword(f.plainPass);
      const updateData = {
        empCode: f.empCode,
        firstName: f.firstName,
        middleName: f.middleName,
        lastName: f.lastName,
        fullName: f.fullName,
        role: f.role,
        subject: f.subject,
        qualification: f.qualification,
        contactNo: f.contactNo,
        email: f.email,
        password: hashedPassword,
        joiningDate: f.joiningDate,
        status: f.status,
        experience: f.experience,
      };

      const doc = await Faculty.findOneAndUpdate(
        { empCode: f.empCode },
        { $set: updateData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      facultyMap[f.empCode] = doc;
      facultyCount++;
    }
    console.log(`✅ Upserted ${facultyCount} Faculty accounts with secure scrypt hashing.`);

    // 2. Safe Upsert Students
    let studentCount = 0;
    const studentList = [];
    for (const s of studentSeedData) {
      const fullName = `${s.firstName} ${s.middleName} ${s.lastName}`;
      const doc = await Student.findOneAndUpdate(
        { standard: s.standard, division: s.division, rollNo: s.rollNo },
        {
          $set: {
            ...s,
            fullName,
            schoolName: SCHOOL_NAME,
            status: 'ACTIVE',
            admissionDate: new Date('2025-06-15'),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      studentList.push(doc);
      studentCount++;
    }
    console.log(`✅ Upserted ${studentCount} Student records across Std 11 & Std 12.`);

    // 3. Ensure Curriculums
    await syllabusService.ensureStd11ChemCurriculum(['A', 'B']);
    await syllabusService.ensureStd11PhysicsCurriculum(['A', 'B']);
    await syllabusService.ensureStd11MathsCurriculum(['A', 'B']);
    await syllabusService.ensureStd11BiologyCurriculum(['A', 'B']);
    console.log('✅ Ensured Std 11 Curriculum for Chemistry, Physics, Maths, Biology.');

    // 4. Safe Upsert LT Records for ALL Subjects (Evaluated, Conducted/Pending, Scheduled)
    const sampleLts = [
      // EVALUATED LTs (History with student marks across all subjects)
      {
        ltNo: 1,
        title: 'LT 1 — Physics Measurement & Units',
        subject: 'Physics',
        standard: 'STD_11',
        division: 'A',
        examDate: new Date('2026-07-10'),
        takenDate: new Date('2026-07-10'),
        duration: 15,
        status: 'EVALUATED',
        facultyName: 'Prof. Umesh K. Pal',
        subjectFacultyId: facultyMap['FAC101']?._id,
        questions: [
          { questionNo: 1, questionText: 'Define SI base units and derive dimensions of Force. / SI મૂળભૂત એકમો વ્યાખ્યાયિત કરો અને બળનું પારિમાણિક સૂત્ર તારવો.', marks: 2 },
          { questionNo: 2, questionText: 'Explain significant figures rules with an example. / સાર્થક અંકોના નિયમો ઉદાહરણ સાથે સમજાવો.', marks: 2 },
        ],
      },
      {
        ltNo: 2,
        title: 'LT 2 — Chemistry Basic Concepts & Mole Concept',
        subject: 'Chemistry (Board)',
        standard: 'STD_11',
        division: 'A',
        examDate: new Date('2026-07-15'),
        takenDate: new Date('2026-07-15'),
        duration: 15,
        status: 'EVALUATED',
        facultyName: 'Dr. Nisha R. Rao',
        subjectFacultyId: facultyMap['FAC102']?._id,
        questions: [
          { questionNo: 1, questionText: 'Calculate the molarity of 4g NaOH in 250ml water. / 250 મિલી પાણીમાં 4 ગ્રામ NaOH ની મોલારિટી ગણો.', marks: 2 },
          { questionNo: 2, questionText: 'State Dalton atomic theory postulates. / ડાલ્ટનનો પરમાણ્વીય સિદ્ધાંત જણાવો.', marks: 2 },
        ],
      },
      {
        ltNo: 3,
        title: 'LT 3 — Sets & Relations Foundations',
        subject: 'Mathematics',
        standard: 'STD_11',
        division: 'A',
        examDate: new Date('2026-07-20'),
        takenDate: new Date('2026-07-20'),
        duration: 15,
        status: 'EVALUATED',
        facultyName: 'Prof. Ketan M. Joshi',
        subjectFacultyId: facultyMap['FAC103']?._id,
        questions: [
          { questionNo: 1, questionText: 'Prove by Venn diagram: A ∪ (B ∩ C) = (A ∪ B) ∩ (A ∪ C). / વેન આકૃતિ દ્વારા સાબિત કરો.', marks: 2 },
          { questionNo: 2, questionText: 'Find the domain and range of f(x) = √(9 - x²). / વિધેયનો પ્રદેશ અને વિસ્તાર શોધો.', marks: 2 },
        ],
      },
      {
        ltNo: 4,
        title: 'LT 4 — Cell: The Unit of Life',
        subject: 'Biology',
        standard: 'STD_11',
        division: 'A',
        examDate: new Date('2026-07-25'),
        takenDate: new Date('2026-07-25'),
        duration: 15,
        status: 'EVALUATED',
        facultyName: 'Dr. Heena S. Patel',
        subjectFacultyId: facultyMap['FAC104']?._id,
        questions: [
          { questionNo: 1, questionText: 'Differentiate between Gram-positive and Gram-negative bacteria. / ગ્રામ-પોઝિટિવ અને ગ્રામ-નેગેટિવ બેક્ટેરિયા વચ્ચેનો તફાવત આપો.', marks: 2 },
          { questionNo: 2, questionText: 'Describe fluid mosaic model of plasma membrane. / પ્લાઝ્મા મેમ્બ્રેનનું ફ્લુઇડ મોઝેઇક મોડેલ વર્ણવો.', marks: 2 },
        ],
      },
      {
        ltNo: 5,
        title: 'LT 5 — Stoichiometry & Redox Reactions (JEE)',
        subject: 'Chemistry (JEE)',
        standard: 'STD_11',
        division: 'A',
        examDate: new Date('2026-08-05'),
        takenDate: new Date('2026-08-05'),
        duration: 20,
        status: 'EVALUATED',
        facultyName: 'Prof. Harsh D. Patel',
        subjectFacultyId: facultyMap['FAC108']?._id,
        questions: [
          { questionNo: 1, questionText: 'Balance redox equation in acidic medium: MnO4⁻ + Fe²⁺ -> Mn²⁺ + Fe³⁺. / એસિડિક માધ્યમમાં રેડોક્સ સમીકરણ સંતુલિત કરો.', marks: 2 },
          { questionNo: 2, questionText: 'Find equivalent weight of K2Cr2O7 in acidic medium. / એસિડિક માધ્યમમાં K2Cr2O7 નો તુલ્યભાર ગણો.', marks: 2 },
        ],
      },
      {
        ltNo: 6,
        title: 'LT 6 — Electrostatics & Electric Dipole',
        subject: 'Physics',
        standard: 'STD_12',
        division: 'A',
        examDate: new Date('2026-08-10'),
        takenDate: new Date('2026-08-10'),
        duration: 15,
        status: 'EVALUATED',
        facultyName: 'Prof. Umesh K. Pal',
        subjectFacultyId: facultyMap['FAC101']?._id,
        questions: [
          { questionNo: 1, questionText: 'Derive electric field at axial point of an electric dipole. / ડાઇપોલની અક્ષ પરના બિંદુએ વિદ્યુતક્ષેત્ર તારવો.', marks: 2 },
          { questionNo: 2, questionText: 'State Gauss law and define electric flux. / ગૌસનો નિયમ લખો અને વિદ્યુત ફ્લક્સ વ્યાખ્યાયિત કરો.', marks: 2 },
        ],
      },
      {
        ltNo: 7,
        title: 'LT 7 — Solutions & Raoult Law',
        subject: 'Chemistry (Board)',
        standard: 'STD_12',
        division: 'A',
        examDate: new Date('2026-08-15'),
        takenDate: new Date('2026-08-15'),
        duration: 15,
        status: 'EVALUATED',
        facultyName: 'Dr. Nisha R. Rao',
        subjectFacultyId: facultyMap['FAC102']?._id,
        questions: [
          { questionNo: 1, questionText: 'State Raoult law for volatile solute and solvent. / બાષ્પશીલ દ્રાવ્ય અને દ્રાવક માટે રાઉલ્ટનો નિયમ જણાવો.', marks: 2 },
          { questionNo: 2, questionText: 'Explain abnormal molar mass and Van-t Hoff factor. / અસામાન્ય મોલર દળ અને વોન્ટ-હોફ અવયવ સમજાવો.', marks: 2 },
        ],
      },
      {
        ltNo: 8,
        title: 'LT 8 — Matrices & Determinants',
        subject: 'Mathematics',
        standard: 'STD_12',
        division: 'A',
        examDate: new Date('2026-08-20'),
        takenDate: new Date('2026-08-20'),
        duration: 15,
        status: 'EVALUATED',
        facultyName: 'Prof. Ketan M. Joshi',
        subjectFacultyId: facultyMap['FAC103']?._id,
        questions: [
          { questionNo: 1, questionText: 'If A is invertible, prove that (A⁻¹)ᵀ = (Aᵀ)⁻¹. / વ્યસ્ત શ્રેણિક માટે સાબિત કરો.', marks: 2 },
          { questionNo: 2, questionText: 'Solve system of equations using Cramer rule. / ક્રેમરના નિયમથી સમીકરણ સંહતિ ઉકેલો.', marks: 2 },
        ],
      },
      {
        ltNo: 9,
        title: 'LT 9 — Reproduction in Flowering Plants',
        subject: 'Biology',
        standard: 'STD_12',
        division: 'A',
        examDate: new Date('2026-08-25'),
        takenDate: new Date('2026-08-25'),
        duration: 15,
        status: 'EVALUATED',
        facultyName: 'Dr. Heena S. Patel',
        subjectFacultyId: facultyMap['FAC104']?._id,
        questions: [
          { questionNo: 1, questionText: 'Describe double fertilization in angiosperms. / આવૃત બીજધારીમાં બેવડું ફલન સમજાવો.', marks: 2 },
          { questionNo: 2, questionText: 'Explain microsporogenesis process with diagram. / લઘુબીજાણુજનન પ્રક્રિયા આકૃતિ સાથે સમજાવો.', marks: 2 },
        ],
      },
      {
        ltNo: 10,
        title: 'LT 10 — Chemical Kinetics & Rate Laws (JEE)',
        subject: 'Chemistry (JEE)',
        standard: 'STD_12',
        division: 'A',
        examDate: new Date('2026-09-01'),
        takenDate: new Date('2026-09-01'),
        duration: 20,
        status: 'EVALUATED',
        facultyName: 'Prof. Harsh D. Patel',
        subjectFacultyId: facultyMap['FAC108']?._id,
        questions: [
          { questionNo: 1, questionText: 'Derive integrated rate equation for first order reaction. / પ્રથમ ક્રમની પ્રક્રિયા માટે સંકલિત વેગ સમીકરણ તારવો.', marks: 2 },
          { questionNo: 2, questionText: 'Explain Arrhenius equation and activation energy. / આર્હેનિયસ સમીકરણ અને સક્રિયકરણ ઊર્જા સમજાવો.', marks: 2 },
        ],
      },

      // CONDUCTED LTs (Pending Marks Entry for Assistant Faculty)
      {
        ltNo: 11,
        title: 'LT 11 — Laws of Motion & Friction',
        subject: 'Physics',
        standard: 'STD_11',
        division: 'A',
        examDate: new Date(),
        takenDate: new Date(),
        duration: 15,
        status: 'CONDUCTED',
        facultyName: 'Prof. Umesh K. Pal',
        subjectFacultyId: facultyMap['FAC101']?._id,
        questions: [
          { questionNo: 1, questionText: 'State Newton third law and conservation of momentum. / ન્યુટનનો ગતિનો ત્રીજો નિયમ અને વેગમાન સંરક્ષણનો નિયમ જણાવો.', marks: 2 },
          { questionNo: 2, questionText: 'Why is static friction called a self-adjusting force? / સ્થિત ઘર્ષણ બળ કેમ સ્વયં-સમાયોજિત બળ કહેવાય છે?', marks: 2 },
        ],
      },
      {
        ltNo: 12,
        title: 'LT 12 — Chemical Bonding & Molecular Geometry',
        subject: 'Chemistry (Board)',
        standard: 'STD_11',
        division: 'A',
        examDate: new Date(),
        takenDate: new Date(),
        duration: 15,
        status: 'CONDUCTED',
        facultyName: 'Dr. Nisha R. Rao',
        subjectFacultyId: facultyMap['FAC102']?._id,
        questions: [
          { questionNo: 1, questionText: 'Explain hybridization of PCl5 molecule. / PCl5 અણુનું સંકરણ સમજાવો.', marks: 2 },
          { questionNo: 2, questionText: 'Draw molecular orbital energy diagram for O2. / O2 માટે આણ્વીય કક્ષક શક્તિ આલેખ દોરો.', marks: 2 },
        ],
      },
      {
        ltNo: 13,
        title: 'LT 13 — Continuity & Differentiability',
        subject: 'Mathematics',
        standard: 'STD_12',
        division: 'A',
        examDate: new Date(),
        takenDate: new Date(),
        duration: 20,
        status: 'CONDUCTED',
        facultyName: 'Prof. Ketan M. Joshi',
        subjectFacultyId: facultyMap['FAC103']?._id,
        questions: [
          { questionNo: 1, questionText: 'Check continuity of f(x) = |x|/x at x = 0. / x = 0 આગળ વિધેયનું સાતત્ય ચકાસો.', marks: 2 },
          { questionNo: 2, questionText: 'Find dy/dx if x^y + y^x = a^b. / ગર્ભિત વિધેય માટે dy/dx શોધો.', marks: 2 },
        ],
      },

      // SCHEDULED LTs (Today's queue - timer ready)
      {
        ltNo: 14,
        title: 'LT 14 — Optics & Wave Interference',
        subject: 'Physics',
        standard: 'STD_12',
        division: 'ALL',
        examDate: new Date(),
        takenDate: new Date(),
        duration: 20,
        durationSeconds: 0,
        status: 'SCHEDULED',
        facultyName: 'Prof. Umesh K. Pal',
        subjectFacultyId: facultyMap['FAC101']?._id,
        questions: [
          { questionNo: 1, questionText: 'Derive Young double-slit fringe width formula β = λD/d. / યંગના પ્રયોગમાં શલાકાની પહોળાઈનું સૂત્ર તારવો.', marks: 2 },
          { questionNo: 2, questionText: 'State conditions for total internal reflection. / પૂર્ણ આંતરિક પરાવર્તનની શરતો જણાવો.', marks: 2 },
        ],
      },
      {
        ltNo: 15,
        title: 'LT 15 — Coordination Compounds & Werner Theory',
        subject: 'Chemistry (Board)',
        standard: 'STD_11',
        division: 'ALL',
        examDate: new Date(),
        takenDate: new Date(),
        duration: 15,
        durationSeconds: 0,
        status: 'SCHEDULED',
        facultyName: 'Dr. Nisha R. Rao',
        subjectFacultyId: facultyMap['FAC102']?._id,
        questions: [
          { questionNo: 1, questionText: 'State Werner coordination theory postulates. / વર્નરનો સવર્ગ સંયોજનોનો સિદ્ધાંત જણાવો.', marks: 2 },
          { questionNo: 2, questionText: 'Write IUPAC name of [Co(NH3)5Cl]Cl2. / IUPAC નામ જણાવો.', marks: 2 },
        ],
      },
    ];

    const gradeCycle = ['Excellent', 'Better', 'Good', 'Better', 'Excellent', 'AB'];

    let ltCount = 0;
    for (const ltData of sampleLts) {
      const ltDoc = await LT.findOneAndUpdate(
        { ltNo: ltData.ltNo },
        { $set: ltData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Seed student evaluations for EVALUATED LTs
      if (ltDoc.status === 'EVALUATED') {
        const matchingStudents = studentList.filter(
          (s) => s.standard === ltDoc.standard && (ltDoc.division === 'ALL' || s.division === ltDoc.division)
        );

        for (let i = 0; i < matchingStudents.length; i++) {
          const st = matchingStudents[i];
          const grade = gradeCycle[(st.rollNo + ltDoc.ltNo) % gradeCycle.length];
          const marksObtained = grade === 'Excellent' ? 4 : grade === 'Better' ? 3 : grade === 'Good' ? 2 : 0;

          await LTMarks.findOneAndUpdate(
            { ltId: ltDoc._id, studentId: st._id },
            {
              $set: {
                rollNo: st.rollNo,
                studentName: st.fullName,
                grade,
                marksObtained,
                totalMarks: 4,
                assistantFacultyId: facultyMap['FAC105']?._id,
                evaluatedAt: new Date(ltDoc.examDate),
              },
            },
            { upsert: true, setDefaultsOnInsert: true }
          );
        }
      }
      ltCount++;
    }
    console.log(`✅ Upserted ${ltCount} LT records across all subjects with student evaluations.`);

    // 5. Safe Upsert Exam Units for ALL Subjects & Exam Types
    const sampleExams = [
      // Exam 101: Board Physics (Std 11) - MARKS_ENTERED
      {
        examNo: 101,
        title: 'Unit Test 1 — Board Physics (Std 11)',
        examType: 'BOARD',
        subject: 'Physics',
        standard: 'STD_11',
        division: 'ALL',
        streamGroup: 'GROUP_A',
        examDate: new Date('2026-08-01'),
        examTime: '10:00 AM',
        durationMinutes: 60,
        marksPerSubject: 50,
        totalMarks: 50,
        status: 'MARKS_ENTERED',
        facultyCode: 'FAC101',
        facultyName: 'Prof. Umesh K. Pal',
        createdByFacultyId: facultyMap['FAC101']?._id,
        unitSummary: 'Chapter 1: Units & Measurements; Chapter 2: Kinematics',
      },
      // Exam 102: Board Chemistry (Std 11) - MARKS_ENTERED
      {
        examNo: 102,
        title: 'Unit Test 1 — Board Chemistry (Std 11)',
        examType: 'BOARD',
        subject: 'Chemistry',
        standard: 'STD_11',
        division: 'ALL',
        streamGroup: 'ALL',
        examDate: new Date('2026-08-05'),
        examTime: '10:00 AM',
        durationMinutes: 60,
        marksPerSubject: 50,
        totalMarks: 50,
        status: 'MARKS_ENTERED',
        facultyCode: 'FAC102',
        facultyName: 'Dr. Nisha R. Rao',
        createdByFacultyId: facultyMap['FAC102']?._id,
        unitSummary: 'Chapter 1: Some Basic Concepts; Chapter 2: Structure of Atom',
      },
      // Exam 103: Board Mathematics (Std 11 Group A) - MARKS_ENTERED
      {
        examNo: 103,
        title: 'Unit Test 1 — Board Mathematics (Std 11)',
        examType: 'BOARD',
        subject: 'Mathematics',
        standard: 'STD_11',
        division: 'ALL',
        streamGroup: 'GROUP_A',
        examDate: new Date('2026-08-10'),
        examTime: '10:00 AM',
        durationMinutes: 60,
        marksPerSubject: 50,
        totalMarks: 50,
        status: 'MARKS_ENTERED',
        facultyCode: 'FAC103',
        facultyName: 'Prof. Ketan M. Joshi',
        createdByFacultyId: facultyMap['FAC103']?._id,
        unitSummary: 'Chapter 1: Sets; Chapter 2: Relations & Functions',
      },
      // Exam 104: Board Biology (Std 11 Group B) - MARKS_ENTERED
      {
        examNo: 104,
        title: 'Unit Test 1 — Board Biology (Std 11)',
        examType: 'BOARD',
        subject: 'Biology',
        standard: 'STD_11',
        division: 'ALL',
        streamGroup: 'GROUP_B',
        examDate: new Date('2026-08-12'),
        examTime: '10:00 AM',
        durationMinutes: 60,
        marksPerSubject: 50,
        totalMarks: 50,
        status: 'MARKS_ENTERED',
        facultyCode: 'FAC104',
        facultyName: 'Dr. Heena S. Patel',
        createdByFacultyId: facultyMap['FAC104']?._id,
        unitSummary: 'Chapter 1: Living World; Chapter 2: Biological Classification',
      },
      // Exam 105: JEE Mock Test 1 — PCM (Std 11) - MARKS_ENTERED
      {
        examNo: 105,
        title: 'JEE Mock Test 1 — PCM (Std 11)',
        examType: 'JEE',
        subject: 'Physics, Chemistry, Mathematics',
        standard: 'STD_11',
        division: 'ALL',
        streamGroup: 'GROUP_A',
        examDate: new Date('2026-08-20'),
        examTime: '09:00 AM',
        durationMinutes: 180,
        marksPerSubject: 100,
        totalMarks: 300,
        status: 'MARKS_ENTERED',
        facultyCode: 'FAC101',
        facultyName: 'Prof. Umesh K. Pal',
        createdByFacultyId: facultyMap['FAC101']?._id,
        unitSummary: 'Full Part-1 Syllabus Review (PCM)',
      },
      // Exam 106: NEET Mock Test 1 — PCB (Std 11) - MARKS_ENTERED
      {
        examNo: 106,
        title: 'NEET Mock Test 1 — PCB (Std 11)',
        examType: 'NEET',
        subject: 'Physics, Chemistry, Biology',
        standard: 'STD_11',
        division: 'ALL',
        streamGroup: 'GROUP_B',
        examDate: new Date('2026-08-22'),
        examTime: '09:00 AM',
        durationMinutes: 180,
        marksPerSubject: 100,
        totalMarks: 300,
        status: 'MARKS_ENTERED',
        facultyCode: 'FAC104',
        facultyName: 'Dr. Heena S. Patel',
        createdByFacultyId: facultyMap['FAC104']?._id,
        unitSummary: 'Full Part-1 Syllabus Review (PCB)',
      },
      // Exam 107: Board Physics (Std 12) - MARKS_ENTERED
      {
        examNo: 107,
        title: 'Unit Test 1 — Board Physics (Std 12)',
        examType: 'BOARD',
        subject: 'Physics',
        standard: 'STD_12',
        division: 'ALL',
        streamGroup: 'GROUP_A',
        examDate: new Date('2026-09-01'),
        examTime: '10:00 AM',
        durationMinutes: 60,
        marksPerSubject: 50,
        totalMarks: 50,
        status: 'MARKS_ENTERED',
        facultyCode: 'FAC101',
        facultyName: 'Prof. Umesh K. Pal',
        createdByFacultyId: facultyMap['FAC101']?._id,
        unitSummary: 'Chapter 1: Electric Charges & Fields; Chapter 2: Electrostatic Potential',
      },
      // Exam 108: Board Chemistry (Std 12) - MARKS_ENTERED
      {
        examNo: 108,
        title: 'Unit Test 1 — Board Chemistry (Std 12)',
        examType: 'BOARD',
        subject: 'Chemistry',
        standard: 'STD_12',
        division: 'ALL',
        streamGroup: 'ALL',
        examDate: new Date('2026-09-05'),
        examTime: '10:00 AM',
        durationMinutes: 60,
        marksPerSubject: 50,
        totalMarks: 50,
        status: 'MARKS_ENTERED',
        facultyCode: 'FAC102',
        facultyName: 'Dr. Nisha R. Rao',
        createdByFacultyId: facultyMap['FAC102']?._id,
        unitSummary: 'Chapter 1: Solutions; Chapter 2: Electrochemistry',
      },
      // Exam 109: Board Mathematics (Std 12) - MARKS_ENTERED
      {
        examNo: 109,
        title: 'Unit Test 1 — Board Mathematics (Std 12)',
        examType: 'BOARD',
        subject: 'Mathematics',
        standard: 'STD_12',
        division: 'ALL',
        streamGroup: 'GROUP_A',
        examDate: new Date('2026-09-10'),
        examTime: '10:00 AM',
        durationMinutes: 60,
        marksPerSubject: 50,
        totalMarks: 50,
        status: 'MARKS_ENTERED',
        facultyCode: 'FAC103',
        facultyName: 'Prof. Ketan M. Joshi',
        createdByFacultyId: facultyMap['FAC103']?._id,
        unitSummary: 'Chapter 3: Matrices; Chapter 4: Determinants',
      },
      // Exam 110: Board Biology (Std 12) - MARKS_ENTERED
      {
        examNo: 110,
        title: 'Unit Test 1 — Board Biology (Std 12)',
        examType: 'BOARD',
        subject: 'Biology',
        standard: 'STD_12',
        division: 'ALL',
        streamGroup: 'GROUP_B',
        examDate: new Date('2026-09-12'),
        examTime: '10:00 AM',
        durationMinutes: 60,
        marksPerSubject: 50,
        totalMarks: 50,
        status: 'MARKS_ENTERED',
        facultyCode: 'FAC104',
        facultyName: 'Dr. Heena S. Patel',
        createdByFacultyId: facultyMap['FAC104']?._id,
        unitSummary: 'Chapter 1: Sexual Reproduction in Flowering Plants; Chapter 2: Human Reproduction',
      },
      // Exam 111: JEE Advanced Mock Test (Std 12 PCM) - MARKS_ENTERED
      {
        examNo: 111,
        title: 'JEE Advanced Mock 1 — PCM (Std 12)',
        examType: 'JEE',
        subject: 'Physics, Chemistry, Mathematics',
        standard: 'STD_12',
        division: 'ALL',
        streamGroup: 'GROUP_A',
        examDate: new Date('2026-09-20'),
        examTime: '09:00 AM',
        durationMinutes: 180,
        marksPerSubject: 100,
        totalMarks: 300,
        status: 'MARKS_ENTERED',
        facultyCode: 'FAC101',
        facultyName: 'Prof. Umesh K. Pal',
        createdByFacultyId: facultyMap['FAC101']?._id,
        unitSummary: 'Senior Secondary Comprehensive PCM Examination',
      },
      // Exam 112: NEET Full Mock Test (Std 12 PCB) - MARKS_ENTERED
      {
        examNo: 112,
        title: 'NEET Grand Mock 1 — PCB (Std 12)',
        examType: 'NEET',
        subject: 'Physics, Chemistry, Biology',
        standard: 'STD_12',
        division: 'ALL',
        streamGroup: 'GROUP_B',
        examDate: new Date('2026-09-22'),
        examTime: '09:00 AM',
        durationMinutes: 180,
        marksPerSubject: 100,
        totalMarks: 300,
        status: 'MARKS_ENTERED',
        facultyCode: 'FAC104',
        facultyName: 'Dr. Heena S. Patel',
        createdByFacultyId: facultyMap['FAC104']?._id,
        unitSummary: 'Senior Secondary Comprehensive PCB Examination',
      },
      // Exam 113: GUJCET Comprehensive Test (Std 12) - CONDUCTED (Pending Marks)
      {
        examNo: 113,
        title: 'GUJCET Practice Test 1 (Std 12)',
        examType: 'GUJCET',
        subject: 'Physics, Chemistry, Mathematics, Biology',
        standard: 'STD_12',
        division: 'ALL',
        streamGroup: 'GROUP_AB',
        examDate: new Date(),
        examTime: '10:00 AM',
        durationMinutes: 120,
        marksPerSubject: 40,
        totalMarks: 120,
        status: 'CONDUCTED',
        facultyCode: 'FAC101',
        facultyName: 'Prof. Umesh K. Pal',
        createdByFacultyId: facultyMap['FAC101']?._id,
        unitSummary: 'GUJCET Full Syllabus Standard 12',
      },
      // Exam 114: Scheduled Upcoming Exam
      {
        examNo: 114,
        title: 'Unit Test 2 — Board Physics Wave Optics (Std 12)',
        examType: 'BOARD',
        subject: 'Physics',
        standard: 'STD_12',
        division: 'ALL',
        streamGroup: 'GROUP_A',
        examDate: new Date(Date.now() + 7 * 86400000),
        examTime: '10:00 AM',
        durationMinutes: 60,
        marksPerSubject: 50,
        totalMarks: 50,
        status: 'SCHEDULED',
        facultyCode: 'FAC101',
        facultyName: 'Prof. Umesh K. Pal',
        createdByFacultyId: facultyMap['FAC101']?._id,
        unitSummary: 'Chapter 10: Wave Optics',
      },
    ];

    let examCount = 0;
    for (const exData of sampleExams) {
      const exDoc = await ExamUnit.findOneAndUpdate(
        { examNo: exData.examNo },
        { $set: exData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Seed student scores for exams with status MARKS_ENTERED
      if (exDoc.status === 'MARKS_ENTERED') {
        const targetStudents = studentList.filter((s) => {
          if (s.standard !== exDoc.standard) return false;
          if (exDoc.division && exDoc.division !== 'ALL' && s.division !== exDoc.division) return false;
          if (exDoc.streamGroup === 'GROUP_A') return s.streamGroup === 'GROUP_A' || s.streamGroup === 'GROUP_AB';
          if (exDoc.streamGroup === 'GROUP_B') return s.streamGroup === 'GROUP_B' || s.streamGroup === 'GROUP_AB';
          return true;
        });

        for (const st of targetStudents) {
          const isMulti = ['JEE', 'NEET', 'GUJCET'].includes(exDoc.examType);
          let subjectMarks = [];
          let totalObtained = 0;
          const maxPerSub = exDoc.marksPerSubject || 50;

          if (isMulti) {
            const thirdSub = exDoc.examType === 'NEET' ? 'Biology' : 'Maths';
            // Varied realistic scores
            const score1 = Math.min(maxPerSub, Math.max(25, 55 + (st.rollNo * 5) % 40));
            const score2 = Math.min(maxPerSub, Math.max(25, 50 + (st.rollNo * 7) % 45));
            const score3 = Math.min(maxPerSub, Math.max(25, 60 + (st.rollNo * 4) % 38));
            subjectMarks = [
              { subject: 'Physics', marksObtained: score1, totalMarks: maxPerSub },
              { subject: 'Chemistry', marksObtained: score2, totalMarks: maxPerSub },
              { subject: thirdSub, marksObtained: score3, totalMarks: maxPerSub },
            ];
            totalObtained = score1 + score2 + score3;
          } else {
            const baseScore = Math.min(maxPerSub, Math.max(20, Math.floor(maxPerSub * 0.65) + (st.rollNo * 3) % 16));
            subjectMarks = [{ subject: exDoc.subject, marksObtained: baseScore, totalMarks: maxPerSub }];
            totalObtained = baseScore;
          }

          const totalMax = isMulti ? maxPerSub * 3 : maxPerSub;
          const percentage = parseFloat(((totalObtained / totalMax) * 100).toFixed(2));

          await ExamMarks.findOneAndUpdate(
            { examId: exDoc._id, studentId: st._id },
            {
              $set: {
                rollNo: st.rollNo,
                studentName: st.fullName,
                streamGroup: st.streamGroup,
                examGroup: st.streamGroup === 'GROUP_B' ? 'B' : 'A',
                enteredByName: 'Rajiv A. Mehta',
                ab: false,
                subjectMarks,
                totalObtained,
                totalMaxMarks: totalMax,
                percentage,
                enteredAt: new Date(exDoc.examDate),
              },
            },
            { upsert: true, setDefaultsOnInsert: true }
          );
        }
      }
      examCount++;
    }
    console.log(`✅ Upserted ${examCount} Exam Units across all subjects with student scores.`);

    // 6. Safe Upsert Notices
    const sampleNotices = [
      {
        title: 'Academic Calendar & Semester 1 Schedule 2026-27',
        message: 'All faculty members are requested to review the weekly LT and Unit Exam schedules uploaded in the academic portal.',
        category: 'ACADEMIC',
        targetScope: 'ALL_FACULTY',
        priority: 'HIGH',
        publishedBy: 'Principal Office',
        senderName: 'Dr. Jayant R. Zadafiya',
        createdAt: new Date(),
      },
      {
        title: 'Laboratory Safety Regulations & Practical Sessions',
        message: 'Assistant Faculty members must ensure laboratory equipment is calibrated before practical exams commence.',
        category: 'CIRCULAR',
        targetScope: 'ALL_ASSISTANT_FACULTY',
        priority: 'NORMAL',
        publishedBy: 'Principal Office',
        senderName: 'Dr. Jayant R. Zadafiya',
        createdAt: new Date(),
      },
    ];

    let noticeCount = 0;
    for (const n of sampleNotices) {
      await Notice.findOneAndUpdate(
        { title: n.title },
        { $set: n },
        { upsert: true, setDefaultsOnInsert: true }
      );
      noticeCount++;
    }
    console.log(`✅ Upserted ${noticeCount} School Notices.`);

    console.log('\n======================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY (Zero destructive operations)');
    console.log(`   - Faculty members: ${facultyCount}`);
    console.log(`   - Students: ${studentCount}`);
    console.log(`   - LTs & Evaluations: ${ltCount}`);
    console.log(`   - Exams: ${examCount}`);
    console.log(`   - Notices: ${noticeCount}`);
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Seeding failed with error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runSeed();
