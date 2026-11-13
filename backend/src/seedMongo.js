const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Student = require('./models/Student');
const Faculty = require('./models/Faculty');
const syllabusService = require('./services/syllabusService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sms_db';
const SCHOOL_NAME = 'G.G. Zadafiya Vidhyalaya';

const initialStudents = [
  {
    rollNo: 1,
    firstName: 'Umesh',
    middleName: 'R.',
    lastName: 'Pal',
    fullName: 'Umesh R. Pal',
    standard: 'STD_11',
    division: 'A',
    streamGroup: 'GROUP_A',
    admissionDate: new Date('2025-06-15'),
    contactNo: '+91 99000 12001',
    email: 'umesh.pal@student.edu.in',
    status: 'ACTIVE',
    schoolName: SCHOOL_NAME,
    attendancePercent: 96.4,
  },
  {
    rollNo: 2,
    firstName: 'Soumil',
    middleName: 'K.',
    lastName: 'Shah',
    fullName: 'Soumil K. Shah',
    standard: 'STD_11',
    division: 'A',
    streamGroup: 'GROUP_A',
    admissionDate: new Date('2025-06-15'),
    contactNo: '+91 99000 12002',
    email: 'soumil.shah@student.edu.in',
    status: 'ACTIVE',
    schoolName: SCHOOL_NAME,
    attendancePercent: 94.0,
  },
  {
    rollNo: 3,
    firstName: 'Riya',
    middleName: 'M.',
    lastName: 'Patel',
    fullName: 'Riya M. Patel',
    standard: 'STD_11',
    division: 'A',
    streamGroup: 'GROUP_B',
    admissionDate: new Date('2025-06-16'),
    contactNo: '+91 99000 12003',
    email: 'riya.patel@student.edu.in',
    status: 'ACTIVE',
    schoolName: SCHOOL_NAME,
    attendancePercent: 91.2,
  },
  {
    rollNo: 4,
    firstName: 'Aarav',
    middleName: 'D.',
    lastName: 'Mehta',
    fullName: 'Aarav D. Mehta',
    standard: 'STD_11',
    division: 'B',
    streamGroup: 'GROUP_A',
    admissionDate: new Date('2025-06-16'),
    contactNo: '+91 99000 12004',
    email: 'aarav.mehta@student.edu.in',
    status: 'ACTIVE',
    schoolName: SCHOOL_NAME,
    attendancePercent: 88.5,
  },
  {
    rollNo: 5,
    firstName: 'Diya',
    middleName: 'S.',
    lastName: 'Joshi',
    fullName: 'Diya S. Joshi',
    standard: 'STD_12',
    division: 'A',
    streamGroup: 'GROUP_B',
    admissionDate: new Date('2024-06-15'),
    contactNo: '+91 99000 12005',
    email: 'diya.joshi@student.edu.in',
    status: 'ACTIVE',
    schoolName: SCHOOL_NAME,
    attendancePercent: 95.8,
  },
  {
    rollNo: 6,
    firstName: 'Kabir',
    middleName: 'N.',
    lastName: 'Trivedi',
    fullName: 'Kabir N. Trivedi',
    standard: 'STD_12',
    division: 'B',
    streamGroup: 'GROUP_AB',
    admissionDate: new Date('2024-06-16'),
    contactNo: '+91 99000 12006',
    email: 'kabir.trivedi@student.edu.in',
    status: 'ACTIVE',
    schoolName: SCHOOL_NAME,
    attendancePercent: 92.0,
  },
  {
    rollNo: 101,
    firstName: 'Ramesh',
    middleName: 'B.',
    lastName: 'Patel',
    fullName: 'Ramesh B. Patel',
    standard: 'STD_12',
    division: 'A',
    streamGroup: 'GROUP_A',
    admissionDate: new Date('2022-06-15'),
    contactNo: '+91 99111 22334',
    email: 'ramesh.alumni@ggzv.edu.in',
    status: 'ALUMNI',
    schoolName: SCHOOL_NAME,
    graduationYear: 2024,
    currentPursuit: 'B.Tech Computer Science (IIT Bombay)',
    endingDate: new Date('2024-05-30'),
  },
  {
    rollNo: 102,
    firstName: 'Kavya',
    middleName: 'P.',
    lastName: 'Shah',
    fullName: 'Kavya P. Shah',
    standard: 'STD_12',
    division: 'B',
    streamGroup: 'GROUP_B',
    admissionDate: new Date('2022-06-15'),
    contactNo: '+91 99111 55667',
    email: 'kavya.alumni@ggzv.edu.in',
    status: 'ALUMNI',
    schoolName: SCHOOL_NAME,
    graduationYear: 2024,
    currentPursuit: 'MBBS (BJ Medical College)',
    endingDate: new Date('2024-05-30'),
  },
];

const initialFaculty = [
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
    email: 'umesh.faculty@ggzv.edu.in',
    password: 'faculty123',
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
    password: 'faculty123',
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
    password: 'faculty123',
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
    qualification: 'M.Sc. Applied Mathematics',
    contactNo: '+91 99887 11003',
    email: 'ketan.j@ggzv.edu.in',
    password: 'faculty123',
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
    password: 'faculty123',
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
    email: 'rajiv.m@ggzv.edu.in',
    password: 'faculty123',
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
    email: 'komal.d@ggzv.edu.in',
    password: 'faculty123',
    joiningDate: new Date('2022-07-14'),
    status: 'ACTIVE',
    experience: '3 Years',
  },
  {
    empCode: 'FAC107',
    firstName: 'Sanjay',
    middleName: 'V.',
    lastName: 'Vora',
    fullName: 'Prof. Sanjay V. Vora',
    role: 'Subject Faculty',
    subject: 'Mathematics',
    qualification: 'M.Sc. Mathematics',
    contactNo: '+91 99887 12001',
    email: 'sanjay.v@ggzv.edu.in',
    joiningDate: new Date('2015-06-01'),
    status: 'DEACTIVATED',
    experience: '10 Years',
    resignationDate: new Date('2026-04-30'),
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding:', MONGODB_URI);

    await Student.deleteMany({});
    await Faculty.deleteMany({});
    console.log('Cleared existing student & faculty collections.');

    const students = await Student.insertMany(initialStudents);
    console.log(`✅ Seeded ${students.length} students into MongoDB.`);

    const faculty = await Faculty.insertMany(initialFaculty);
    console.log(`✅ Seeded ${faculty.length} faculty into MongoDB.`);

    await syllabusService.ensureStd11ChemCurriculum(['Division A', 'Division B']);
    console.log('✅ Seeded Std 11 Chemistry (Part 1: Ch 1-6 & Part 2: Ch 7-9) into MongoDB.');

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
