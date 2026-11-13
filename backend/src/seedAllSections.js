const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Student = require('./models/Student');
const Faculty = require('./models/Faculty');
const Syllabus = require('./models/Syllabus');
const SyllabusProgress = require('./models/SyllabusProgress');
const LT = require('./models/LT');
const LTMarks = require('./models/LTMarks');
const ExamUnit = require('./models/ExamUnit');
const ExamMarks = require('./models/ExamMarks');
const DisciplineRemark = require('./models/DisciplineRemark');
const DisciplineType = require('./models/DisciplineType');
const Notice = require('./models/Notice');
const FacultyReport = require('./models/FacultyReport');
const syllabusService = require('./services/syllabusService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sms_db';
const SCHOOL_NAME = 'G.G. Zadafiya Vidhyalaya';

// -------------------------------------------------------------
// 1. STUDENTS (24 across Std 11 & Std 12, Div A & B, Groups A/B/AB)
// -------------------------------------------------------------
const studentsSeedData = [
  // STD_11 Div A
  { rollNo: 1, firstName: 'Umesh', middleName: 'R.', lastName: 'Pal', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_A', contactNo: '+91 99000 12001', email: 'umesh.pal@student.edu.in', attendancePercent: 96.5 },
  { rollNo: 2, firstName: 'Soumil', middleName: 'K.', lastName: 'Shah', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_A', contactNo: '+91 99000 12002', email: 'soumil.shah@student.edu.in', attendancePercent: 94.2 },
  { rollNo: 3, firstName: 'Riya', middleName: 'M.', lastName: 'Patel', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_B', contactNo: '+91 99000 12003', email: 'riya.patel@student.edu.in', attendancePercent: 91.5 },
  { rollNo: 4, firstName: 'Pooja', middleName: 'V.', lastName: 'Desai', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_B', contactNo: '+91 99000 12004', email: 'pooja.desai@student.edu.in', attendancePercent: 92.8 },
  { rollNo: 5, firstName: 'Manan', middleName: 'H.', lastName: 'Vora', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_AB', contactNo: '+91 99000 12005', email: 'manan.vora@student.edu.in', attendancePercent: 89.0 },
  { rollNo: 6, firstName: 'Bhavya', middleName: 'N.', lastName: 'Soni', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_A', contactNo: '+91 99000 12006', email: 'bhavya.soni@student.edu.in', attendancePercent: 95.0 },

  // STD_11 Div B
  { rollNo: 7, firstName: 'Aarav', middleName: 'D.', lastName: 'Mehta', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_A', contactNo: '+91 99000 12007', email: 'aarav.mehta@student.edu.in', attendancePercent: 86.4 },
  { rollNo: 8, firstName: 'Krisha', middleName: 'L.', lastName: 'Trivedi', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_B', contactNo: '+91 99000 12008', email: 'krisha.trivedi@student.edu.in', attendancePercent: 93.1 },
  { rollNo: 9, firstName: 'Dhruv', middleName: 'P.', lastName: 'Raval', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_A', contactNo: '+91 99000 12009', email: 'dhruv.raval@student.edu.in', attendancePercent: 88.7 },
  { rollNo: 10, firstName: 'Ananya', middleName: 'K.', lastName: 'Shukla', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_B', contactNo: '+91 99000 12010', email: 'ananya.shukla@student.edu.in', attendancePercent: 97.0 },
  { rollNo: 11, firstName: 'Nirav', middleName: 'J.', lastName: 'Chauhan', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_AB', contactNo: '+91 99000 12011', email: 'nirav.c@student.edu.in', attendancePercent: 84.5 },
  { rollNo: 12, firstName: 'Tanvi', middleName: 'B.', lastName: 'Solanki', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_A', contactNo: '+91 99000 12012', email: 'tanvi.s@student.edu.in', attendancePercent: 90.2 },

  // STD_12 Div A
  { rollNo: 1, firstName: 'Diya', middleName: 'S.', lastName: 'Joshi', standard: 'STD_12', division: 'A', streamGroup: 'GROUP_B', contactNo: '+91 99000 12013', email: 'diya.joshi@student.edu.in', attendancePercent: 98.2 },
  { rollNo: 2, firstName: 'Harsh', middleName: 'K.', lastName: 'Pandya', standard: 'STD_12', division: 'A', streamGroup: 'GROUP_A', contactNo: '+91 99000 12014', email: 'harsh.pandya@student.edu.in', attendancePercent: 95.6 },
  { rollNo: 3, firstName: 'Mansi', middleName: 'G.', lastName: 'Bhatt', standard: 'STD_12', division: 'A', streamGroup: 'GROUP_A', contactNo: '+91 99000 12015', email: 'mansi.bhatt@student.edu.in', attendancePercent: 93.4 },
  { rollNo: 4, firstName: 'Yash', middleName: 'C.', lastName: 'Gadhvi', standard: 'STD_12', division: 'A', streamGroup: 'GROUP_B', contactNo: '+91 99000 12016', email: 'yash.gadhvi@student.edu.in', attendancePercent: 91.0 },
  { rollNo: 5, firstName: 'Khushi', middleName: 'N.', lastName: 'Makwana', standard: 'STD_12', division: 'A', streamGroup: 'GROUP_AB', contactNo: '+91 99000 12017', email: 'khushi.m@student.edu.in', attendancePercent: 94.8 },
  { rollNo: 6, firstName: 'Pranav', middleName: 'E.', lastName: 'Chaudhari', standard: 'STD_12', division: 'A', streamGroup: 'GROUP_A', contactNo: '+91 99000 12018', email: 'pranav.c@student.edu.in', attendancePercent: 89.5 },

  // STD_12 Div B
  { rollNo: 7, firstName: 'Kabir', middleName: 'N.', lastName: 'Trivedi', standard: 'STD_12', division: 'B', streamGroup: 'GROUP_AB', contactNo: '+91 99000 12019', email: 'kabir.trivedi@student.edu.in', attendancePercent: 87.2 },
  { rollNo: 8, firstName: 'Sneha', middleName: 'R.', lastName: 'Parikh', standard: 'STD_12', division: 'B', streamGroup: 'GROUP_B', contactNo: '+91 99000 12020', email: 'sneha.p@student.edu.in', attendancePercent: 96.1 },
  { rollNo: 9, firstName: 'Vatsal', middleName: 'M.', lastName: 'Dave', standard: 'STD_12', division: 'B', streamGroup: 'GROUP_A', contactNo: '+91 99000 12021', email: 'vatsal.d@student.edu.in', attendancePercent: 92.0 },
  { rollNo: 10, firstName: 'Isha', middleName: 'A.', lastName: 'Gohil', standard: 'STD_12', division: 'B', streamGroup: 'GROUP_B', contactNo: '+91 99000 12022', email: 'isha.gohil@student.edu.in', attendancePercent: 95.3 },
  { rollNo: 11, firstName: 'Dev', middleName: 'T.', lastName: 'Moradiya', standard: 'STD_12', division: 'B', streamGroup: 'GROUP_A', contactNo: '+91 99000 12023', email: 'dev.m@student.edu.in', attendancePercent: 85.0 },
  { rollNo: 12, firstName: 'Heer', middleName: 'W.', lastName: 'Prajapati', standard: 'STD_12', division: 'B', streamGroup: 'GROUP_AB', contactNo: '+91 99000 12024', email: 'heer.p@student.edu.in', attendancePercent: 93.8 },
];

// -------------------------------------------------------------
// 2. FACULTY
// -------------------------------------------------------------
const facultySeedData = [
  { empCode: 'FAC101', firstName: 'Umesh', middleName: 'K.', lastName: 'Pal', fullName: 'Prof. Umesh K. Pal', role: 'Subject Faculty', subject: 'Physics', qualification: 'M.Sc. Physics (Gold Medalist), B.Ed.', contactNo: '+91 99887 11001', email: 'umesh.faculty@ggzv.edu.in', password: 'faculty123', joiningDate: new Date('2018-06-01'), status: 'ACTIVE', experience: '8 Years' },
  { empCode: 'FAC102', firstName: 'Nisha', middleName: 'R.', lastName: 'Rao', fullName: 'Dr. Nisha R. Rao', role: 'Subject Faculty', subject: 'Chemistry (Board)', qualification: 'Ph.D. Organic Chemistry', contactNo: '+91 99887 11002', email: 'nisha.rao@ggzv.edu.in', password: 'faculty123', joiningDate: new Date('2019-06-11'), status: 'ACTIVE', experience: '6 Years' },
  { empCode: 'FAC108', firstName: 'Harsh', middleName: 'D.', lastName: 'Patel', fullName: 'Prof. Harsh D. Patel', role: 'Subject Faculty', subject: 'Chemistry (JEE)', qualification: 'M.Sc. Chemistry (IIT), B.Ed.', contactNo: '+91 99887 11008', email: 'harsh.patel@ggzv.edu.in', password: 'faculty123', joiningDate: new Date('2021-07-01'), status: 'ACTIVE', experience: '5 Years' },
  { empCode: 'FAC103', firstName: 'Ketan', middleName: 'M.', lastName: 'Joshi', fullName: 'Prof. Ketan M. Joshi', role: 'Subject Faculty', subject: 'Mathematics', qualification: 'M.Sc. Applied Mathematics', contactNo: '+91 99887 11003', email: 'ketan.j@ggzv.edu.in', password: 'faculty123', joiningDate: new Date('2017-06-03'), status: 'ACTIVE', experience: '9 Years' },
  { empCode: 'FAC104', firstName: 'Heena', middleName: 'S.', lastName: 'Patel', fullName: 'Dr. Heena S. Patel', role: 'Subject Faculty', subject: 'Biology', qualification: 'Ph.D. Life Sciences, Botany & Zoology', contactNo: '+91 99887 11004', email: 'heena.p@ggzv.edu.in', password: 'faculty123', joiningDate: new Date('2021-06-20'), status: 'ACTIVE', experience: '5 Years' },
  { empCode: 'FAC105', firstName: 'Rajiv', middleName: 'A.', lastName: 'Mehta', fullName: 'Rajiv A. Mehta', role: 'Assistant Faculty', subject: 'Lab — Physics/Chemistry', qualification: 'B.Sc. Chemistry, Lab Tech Certification', contactNo: '+91 99887 11005', email: 'rajiv.m@ggzv.edu.in', password: 'faculty123', joiningDate: new Date('2020-07-05'), status: 'ACTIVE', experience: '4 Years' },
  { empCode: 'FAC106', firstName: 'Komal', middleName: 'P.', lastName: 'Desai', fullName: 'Komal P. Desai', role: 'Assistant Faculty', subject: 'Lab — Biology', qualification: 'B.Sc. Microbiology', contactNo: '+91 99887 11006', email: 'komal.d@ggzv.edu.in', password: 'faculty123', joiningDate: new Date('2022-07-14'), status: 'ACTIVE', experience: '3 Years' },
  { empCode: 'FAC100', firstName: 'Admin', middleName: 'P.', lastName: 'Principal', fullName: 'Dr. Jayant R. Zadafiya', role: 'Principal', subject: 'Administration', qualification: 'Ph.D., M.Ed., Principal', contactNo: '+91 99887 11000', email: 'principal@ggzv.edu.in', password: 'admin123', joiningDate: new Date('2014-04-01'), status: 'ACTIVE', experience: '15 Years' },
];

async function seedAll() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB for Full System Seeding.');

    // 1. Seed Faculty
    await Faculty.deleteMany({});
    const createdFaculty = await Faculty.insertMany(facultySeedData);
    console.log(`✅ Seeded ${createdFaculty.length} faculty members.`);
    const facultyMap = {};
    createdFaculty.forEach((f) => {
      facultyMap[f.empCode] = f;
      if (f.role === 'Subject Faculty') {
        const s = f.subject.toLowerCase();
        if (s.includes('phys')) facultyMap['physics'] = f;
        if (s.includes('chem') && s.includes('board')) facultyMap['chem_board'] = f;
        if (s.includes('chem') && s.includes('jee')) facultyMap['chem_jee'] = f;
        if (s.includes('math')) facultyMap['maths'] = f;
        if (s.includes('bio')) facultyMap['biology'] = f;
      }
      if (f.role === 'Assistant Faculty') {
        if (!facultyMap['assistant1']) facultyMap['assistant1'] = f;
        else facultyMap['assistant2'] = f;
      }
    });

    // 2. Seed Students
    await Student.deleteMany({});
    const studentsWithFullNames = studentsSeedData.map((s) => ({
      ...s,
      fullName: `${s.firstName} ${s.middleName} ${s.lastName}`,
      status: 'ACTIVE',
      schoolName: SCHOOL_NAME,
      admissionDate: new Date('2025-06-15'),
    }));
    const createdStudents = await Student.insertMany(studentsWithFullNames);
    console.log(`✅ Seeded ${createdStudents.length} students across STD_11 & STD_12.`);

    // 3. Ensure Syllabuses for Std 11 & Std 12
    await syllabusService.ensureStd11ChemCurriculum(['Division A', 'Division B']);
    await syllabusService.ensureStd11PhysicsCurriculum(['Division A', 'Division B']);
    const allSyllabuses = await Syllabus.find({});
    console.log(`✅ Verified ${allSyllabuses.length} chapters in Syllabus.`);

    // 4. Seed SyllabusProgress records conforming to exact schema
    await SyllabusProgress.deleteMany({});
    const sampleProgress = [];
    const facultyProgressPlan = [
      { code: 'FAC101', name: 'Prof. Umesh K. Pal', subj: 'Physics', chNo: 1, chName: 'Laws of Motion', itemKey: '1.1', itemCode: '1.1', itemTitle: "Newton's First Law", itemType: 'TOPIC' },
      { code: 'FAC101', name: 'Prof. Umesh K. Pal', subj: 'Physics', chNo: 1, chName: 'Laws of Motion', itemKey: '1.2', itemCode: '1.2', itemTitle: "Newton's Second Law", itemType: 'TOPIC' },
      { code: 'FAC101', name: 'Prof. Umesh K. Pal', subj: 'Physics', chNo: 1, chName: 'Laws of Motion', itemKey: '1.3', itemCode: '1.3', itemTitle: "Newton's Third Law", itemType: 'TOPIC' },
      { code: 'FAC102', name: 'Dr. Nisha R. Rao', subj: 'Chemistry (Board)', chNo: 7, chName: 'Redox Reactions', itemKey: '7.1', itemCode: '7.1', itemTitle: 'Oxidation Number Concept', itemType: 'TOPIC' },
      { code: 'FAC102', name: 'Dr. Nisha R. Rao', subj: 'Chemistry (Board)', chNo: 7, chName: 'Redox Reactions', itemKey: '7.2', itemCode: '7.2', itemTitle: 'Balancing Redox Reactions', itemType: 'TOPIC' },
      { code: 'FAC108', name: 'Prof. Harsh D. Patel', subj: 'Chemistry (JEE)', chNo: 8, chName: 'Organic Chemistry', itemKey: '8.1', itemCode: '8.1', itemTitle: 'IUPAC Nomenclature', itemType: 'TOPIC' },
      { code: 'FAC108', name: 'Prof. Harsh D. Patel', subj: 'Chemistry (JEE)', chNo: 8, chName: 'Organic Chemistry', itemKey: '8.2', itemCode: '8.2', itemTitle: 'Inductive and Resonance Effects', itemType: 'TOPIC' },
      { code: 'FAC103', name: 'Prof. Ketan M. Joshi', subj: 'Mathematics', chNo: 1, chName: 'Trigonometry', itemKey: '1.1', itemCode: '1.1', itemTitle: 'Compound Angle Formulas', itemType: 'TOPIC' },
      { code: 'FAC103', name: 'Prof. Ketan M. Joshi', subj: 'Mathematics', chNo: 1, chName: 'Trigonometry', itemKey: '1.2', itemCode: '1.2', itemTitle: 'Trigonometric Equations', itemType: 'TOPIC' },
      { code: 'FAC104', name: 'Dr. Heena S. Patel', subj: 'Biology', chNo: 1, chName: 'Cell Biology', itemKey: '1.1', itemCode: '1.1', itemTitle: 'Prokaryotic vs Eukaryotic Cell', itemType: 'TOPIC' },
      { code: 'FAC104', name: 'Dr. Heena S. Patel', subj: 'Biology', chNo: 1, chName: 'Cell Biology', itemKey: '1.2', itemCode: '1.2', itemTitle: 'Structure of Cell Membrane', itemType: 'TOPIC' },
    ];

    for (const item of facultyProgressPlan) {
      for (const div of ['Division A', 'Division B']) {
        const syl = allSyllabuses.find((s) => s.chapterNo === item.chNo) || allSyllabuses[0];
        sampleProgress.push({
          facultyId: item.code,
          facultyName: item.name,
          facultyEmpCode: item.code,
          facultySubject: item.subj,
          chapterId: syl ? syl._id : new mongoose.Types.ObjectId(),
          chapterNo: item.chNo,
          chapterName: item.chName,
          standard: 'STD_11',
          division: div,
          subject: item.subj,
          itemType: item.itemType,
          itemKey: `${item.itemKey}-${div}`,
          itemCode: item.itemCode,
          itemTitle: item.itemTitle,
          completedAt: new Date('2026-05-12'),
        });
      }
    }
    await SyllabusProgress.insertMany(sampleProgress);
    console.log(`✅ Seeded ${sampleProgress.length} SyllabusProgress entries.`);

    // -------------------------------------------------------------
    // 5. SEED LECTURE TESTS (LTs) & LTMarks across 5 Weeks
    // -------------------------------------------------------------
    await LT.deleteMany({});
    await LTMarks.deleteMany({});

    // Define 5 distinct weeks in April/May 2026
    const weeksSchedule = [
      { weekNo: 1, label: 'Week 1', start: new Date('2026-04-20'), end: new Date('2026-04-26') },
      { weekNo: 2, label: 'Week 2', start: new Date('2026-04-27'), end: new Date('2026-05-03') },
      { weekNo: 3, label: 'Week 3', start: new Date('2026-05-04'), end: new Date('2026-05-10') },
      { weekNo: 4, label: 'Week 4', start: new Date('2026-05-11'), end: new Date('2026-05-17') },
      { weekNo: 5, label: 'Week 5', start: new Date('2026-05-18'), end: new Date('2026-05-24') },
    ];

    const weeklyTopics = {
      Physics: [
        { code: 'PHY-1.1', title: "Newton's First & Second Laws of Motion", questions: [
          { q: "State Newton's first law and define inertia.", marks: 2 },
          { q: "Derive F = ma from momentum rate equation.", marks: 2 },
          { q: "Calculate stopping distance of a 1200kg car moving at 20 m/s with 0.4 friction.", marks: 3 },
          { q: "Explain the apparent weight of a person in an accelerating elevator.", marks: 3 }
        ]},
        { code: 'PHY-2.3', title: "Work-Energy Theorem & Variable Forces", questions: [
          { q: "Define work done by a variable spring force.", marks: 2 },
          { q: "Prove Work-Energy Theorem for a particle in 1-D.", marks: 3 },
          { q: "A 2kg block slides down a 30° rough incline. Find work done by friction.", marks: 3 },
          { q: "Differentiate between conservative and non-conservative forces.", marks: 2 }
        ]},
        { code: 'PHY-3.1', title: "Center of Mass & Torque Equilibrium", questions: [
          { q: "Define center of mass of a system of particles.", marks: 2 },
          { q: "Calculate COM of a uniform L-shaped thin lamina.", marks: 3 },
          { q: "State rotational equilibrium conditions under coplanar forces.", marks: 2 },
          { q: "Relate angular momentum with torque vector cross product.", marks: 3 }
        ]},
        { code: 'PHY-4.2', title: "Gravitational Potential & Escape Velocity", questions: [
          { q: "Define gravitational potential energy at height h.", marks: 2 },
          { q: "Derive expression for escape speed from Earth surface.", marks: 3 },
          { q: "Calculate orbital speed of a geostationary satellite.", marks: 3 },
          { q: "Explain weightlessness inside an orbiting spacecraft.", marks: 2 }
        ]},
      ],
      Chemistry: [
        { code: 'CHM-1.2', title: "Mole Concept & Stoichiometry", questions: [
          { q: "Calculate moles in 44g of carbon dioxide at STP.", marks: 2 },
          { q: "Identify limiting reagent when 3g H2 reacts with 29g O2.", marks: 3 },
          { q: "Determine empirical formula of compound with 40% C and 6.7% H.", marks: 3 },
          { q: "Define molarity and molality with temperature dependence.", marks: 2 }
        ]},
        { code: 'CHM-2.1', title: "Bohr Model & Quantum Numbers", questions: [
          { q: "State de Broglie hypothesis and wavelength formula.", marks: 2 },
          { q: "Calculate energy of photon emitted for n=3 to n=2 in Hydrogen.", marks: 3 },
          { q: "Write values of n, l, m for the 4s electron of Potassium.", marks: 2 },
          { q: "Explain Hund's rule of maximum multiplicity with Nitrogen example.", marks: 3 }
        ]},
        { code: 'CHM-7.1', title: "Equilibrium Constant Kp and Kc", questions: [
          { q: "State relation between Kp and Kc for gaseous reaction.", marks: 2 },
          { q: "Calculate Kc for N2 + 3H2 <=> 2NH3 given equilibrium concentrations.", marks: 3 },
          { q: "Predict effect of increasing pressure on SO2 + 1/2 O2 <=> SO3.", marks: 2 },
          { q: "Explain Le Chatelier's principle with temperature change for exothermic reaction.", marks: 3 }
        ]},
        { code: 'CHM-8.2', title: "Redox Balancing & Oxidation States", questions: [
          { q: "Assign oxidation state of Cr in K2Cr2O7 and Mn in KMnO4.", marks: 2 },
          { q: "Balance MnO4- + Fe2+ -> Mn2+ + Fe3+ in acidic medium by ion-electron method.", marks: 3 },
          { q: "Define oxidizing agent and reducing agent with electron transfer.", marks: 2 },
          { q: "Calculate cell EMF for standard Daniel cell at 298K.", marks: 3 }
        ]},
      ],
      Mathematics: [
        { code: 'MTH-1.1', title: "Trigonometric Identities & Multiple Angles", questions: [
          { q: "Prove that sin(2x) = 2 sin(x) cos(x).", marks: 2 },
          { q: "Find value of cos(15°) using subtraction identity.", marks: 2 },
          { q: "Solve for general solution of 2 sin^2(x) + 3 cos(x) = 0.", marks: 3 },
          { q: "Prove [sin(5x) - sin(3x)] / [cos(5x) + cos(3x)] = tan(x).", marks: 3 }
        ]},
        { code: 'MTH-2.4', title: "Limits of Trigonometric & Algebraic Functions", questions: [
          { q: "Evaluate lim (x->0) [sin(5x) / (3x)].", marks: 2 },
          { q: "Evaluate lim (x->2) [(x^3 - 8) / (x - 2)].", marks: 2 },
          { q: "Find lim (x->0) [(1 - cos(2x)) / x^2] using standard limits.", marks: 3 },
          { q: "Check continuity of f(x) = |x|/x at x = 0.", marks: 3 }
        ]},
        { code: 'MTH-3.2', title: "First Order Derivatives & Chain Rule", questions: [
          { q: "Differentiate y = (3x^2 + 5)^4 with respect to x.", marks: 2 },
          { q: "Find dy/dx for implicit function x^2 + y^2 = 25 at point (3,4).", marks: 3 },
          { q: "Differentiate e^(sin x) * cos(3x) using product rule.", marks: 3 },
          { q: "Find second derivative d^2y/dx^2 for y = ln(x).", marks: 2 }
        ]},
      ],
      Biology: [
        { code: 'BIO-1.2', title: "Cell Organelles & Endomembrane System", questions: [
          { q: "Differentiate between rough and smooth endoplasmic reticulum.", marks: 2 },
          { q: "Explain the cis and trans face polarity of Golgi apparatus.", marks: 3 },
          { q: "Why are mitochondria termed semi-autonomous organelles?", marks: 2 },
          { q: "Draw and label fluid mosaic model of plasma membrane.", marks: 3 }
        ]},
        { code: 'BIO-2.1', title: "Mitosis Stages & Checkpoints", questions: [
          { q: "Describe prophase condensation and spindle assembly.", marks: 2 },
          { q: "Explain anaphase chromosome separation by kinetochore microtubules.", marks: 3 },
          { q: "What is the significance of G1/S phase checkpoint?", marks: 2 },
          { q: "Contrast cytokinesis in plant cells vs animal cells.", marks: 3 }
        ]},
        { code: 'BIO-3.3', title: "Photosynthesis: Light Reaction & Z-Scheme", questions: [
          { q: "State role of reaction center chlorophyll a in Photosystem II.", marks: 2 },
          { q: "Explain cyclic vs non-cyclic photophosphorylation.", marks: 3 },
          { q: "What is photolysis of water and where does it occur?", marks: 2 },
          { q: "Describe ATP synthesis via chemiosmotic hypothesis in thylakoid.", marks: 3 }
        ]},
      ],
    };

    let ltCounter = 1;
    const allCreatedLts = [];

    // Subjects mapped to days
    const dailySchedulePlan = [
      { dayOffset: 0, dayName: 'Monday', subject: 'Physics', std: 'STD_11', div: 'A', facCode: 'FAC101' },
      { dayOffset: 1, dayName: 'Tuesday', subject: 'Chemistry', std: 'STD_11', div: 'A', facCode: 'FAC102' },
      { dayOffset: 2, dayName: 'Wednesday', subject: 'Mathematics', std: 'STD_11', div: 'A', facCode: 'FAC103' },
      { dayOffset: 3, dayName: 'Thursday', subject: 'Biology', std: 'STD_11', div: 'A', facCode: 'FAC104' },
      { dayOffset: 4, dayName: 'Friday', subject: 'Physics', std: 'STD_11', div: 'B', facCode: 'FAC101' },
      { dayOffset: 5, dayName: 'Saturday', subject: 'Chemistry', std: 'STD_11', div: 'B', facCode: 'FAC108' },
    ];

    // Seed across all 5 weeks
    for (const week of weeksSchedule) {
      for (const item of dailySchedulePlan) {
        const testDate = new Date(week.start);
        testDate.setDate(week.start.getDate() + item.dayOffset);

        const subjTopics = weeklyTopics[item.subject] || weeklyTopics.Physics;
        const topicObj = subjTopics[(week.weekNo + item.dayOffset) % subjTopics.length];

        const isWeek5Pending = week.weekNo === 5 && item.dayOffset >= 4;
        const isWeek5Scheduled = week.weekNo === 5 && item.dayOffset === 5;
        const status = isWeek5Scheduled ? 'SCHEDULED' : isWeek5Pending ? 'CONDUCTED' : 'EVALUATED';

        const faculty = facultyMap[item.facCode] || createdFaculty[1];
        const asstFaculty = facultyMap['assistant1'] || createdFaculty[5];

        const ltDoc = new LT({
          ltNo: ltCounter++,
          title: `LT #${ltCounter - 1}: ${topicObj.title}`,
          subject: item.subject,
          standard: item.std,
          division: item.div,
          streamGroup: 'ALL',
          examDate: testDate,
          takenDate: status !== 'SCHEDULED' ? testDate : null,
          marksEnteredAt: status === 'EVALUATED' ? new Date(testDate.getTime() + 86400000) : null,
          marksEnteredBy: status === 'EVALUATED' ? asstFaculty._id : null,
          marksEnteredByName: status === 'EVALUATED' ? asstFaculty.fullName : '',
          time: '09:00 AM',
          duration: 15,
          durationSeconds: 900,
          facultyName: faculty.fullName,
          subjectFacultyId: faculty._id,
          topicsCovered: [topicObj.title],
          questions: topicObj.questions.map((q, idx) => ({
            questionNo: idx + 1,
            questionText: q.q,
            sourceTopicCode: topicObj.code,
            sourceTopicTitle: topicObj.title,
            marks: q.marks,
          })),
          status,
          note: `Regular Lecture Diagnostic Test for ${topicObj.title}`,
        });

        await ltDoc.save();
        allCreatedLts.push(ltDoc);

        // Generate student marks if EVALUATED
        if (status === 'EVALUATED') {
          const targetStudents = createdStudents.filter(
            (s) => s.standard === item.std && (item.div === 'ALL' || s.division === item.div)
          );

          const takingStudents = targetStudents.filter((s) => {
            if (item.subject === 'Mathematics') return s.streamGroup === 'GROUP_A' || s.streamGroup === 'GROUP_AB';
            if (item.subject === 'Biology') return s.streamGroup === 'GROUP_B' || s.streamGroup === 'GROUP_AB';
            return true;
          });

          const ltMarksRecords = [];
          for (const stud of takingStudents) {
            let scorePct = 75;
            if (['Umesh Pal', 'Soumil Shah', 'Diya Joshi', 'Ananya Shukla'].includes(stud.fullName)) {
              scorePct = 85 + (stud.rollNo % 3) * 5;
            } else if (['Aarav Mehta', 'Nirav Chauhan', 'Kabir Trivedi', 'Dev Moradiya'].includes(stud.fullName)) {
              scorePct = 42 + (week.weekNo % 2) * 8;
            } else {
              scorePct = 60 + ((stud.rollNo * 7 + week.weekNo * 5) % 25);
            }

            if (week.weekNo === 2) scorePct += 6;
            if (week.weekNo === 3 && item.subject === 'Physics') scorePct -= 8;
            if (week.weekNo === 4) scorePct += 4;
            scorePct = Math.max(30, Math.min(100, scorePct));

            const totalMax = 10;
            const marksObtained = Math.round((scorePct / 100) * totalMax * 2) / 2;
            const grade = marksObtained >= 8 ? 'Excellent' : marksObtained >= 5.5 ? 'Better' : 'Good';

            ltMarksRecords.push({
              ltId: ltDoc._id,
              studentId: stud._id,
              rollNo: stud.rollNo,
              studentName: stud.fullName,
              assistantFacultyId: asstFaculty._id,
              grade,
              marksObtained,
              totalMarks: totalMax,
              remarks: grade === 'Excellent' ? 'Concept thoroughly mastered' : grade === 'Better' ? 'Solid effort, review derivations' : 'Needs review in formula application',
              evaluatedAt: new Date(testDate.getTime() + 86400000),
            });
          }

          if (ltMarksRecords.length > 0) {
            await LTMarks.insertMany(ltMarksRecords);
          }
        }
      }
    }
    console.log(`✅ Seeded ${allCreatedLts.length} Lecture Tests with student grades across 5 Weeks.`);

    // -------------------------------------------------------------
    // 6. SEED EXAMS (ExamUnit & ExamMarks)
    // -------------------------------------------------------------
    await ExamUnit.deleteMany({});
    await ExamMarks.deleteMany({});

    const examsToSeed = [
      {
        examNo: 101,
        title: 'Std 11 Board Diagnostic Exam #1 — Physics',
        examType: 'BOARD',
        subject: 'Physics',
        standard: 'STD_11',
        division: 'ALL',
        examDate: new Date('2026-05-02'),
        marksPerSubject: 100,
        totalMarks: 100,
        status: 'MARKS_ENTERED',
        marksEnteredByName: 'Rajiv A. Mehta',
        unitSummary: "Unit 1: Physical World & Measurement, Unit 2: Kinematics & Newton's Laws",
        questionPaperStatus: 'UPLOADED',
      },
      {
        examNo: 102,
        title: 'Std 11 Board Diagnostic Exam #2 — Chemistry',
        examType: 'BOARD',
        subject: 'Chemistry',
        standard: 'STD_11',
        division: 'ALL',
        examDate: new Date('2026-05-08'),
        marksPerSubject: 100,
        totalMarks: 100,
        status: 'MARKS_ENTERED',
        marksEnteredByName: 'Rajiv A. Mehta',
        unitSummary: 'Unit 1: Some Basic Concepts, Unit 2: Structure of Atom, Unit 7: Equilibrium',
        questionPaperStatus: 'UPLOADED',
      },
      {
        examNo: 103,
        title: 'Std 11 GUJCET Combined Mock #1 — PCMB',
        examType: 'GUJCET',
        subject: 'PCMB',
        standard: 'STD_11',
        division: 'ALL',
        examDate: new Date('2026-05-12'),
        marksPerSubject: 40,
        totalMarks: 120,
        status: 'MARKS_ENTERED',
        marksEnteredByName: 'Komal P. Desai',
        unitSummary: 'Comprehensive Term 1 Syllabus Coverage (PCM / PCB)',
        questionPaperStatus: 'UPLOADED',
      },
      {
        examNo: 104,
        title: 'Std 11 JEE Main Mock Test #1 — PCM',
        examType: 'JEE',
        subject: 'PCM',
        standard: 'STD_11',
        division: 'ALL',
        examDate: new Date('2026-05-16'),
        marksPerSubject: 100,
        totalMarks: 300,
        status: 'MARKS_ENTERED',
        marksEnteredByName: 'Rajiv A. Mehta',
        unitSummary: 'JEE Main Pattern Physics + Chemistry + Mathematics',
        questionPaperStatus: 'UPLOADED',
      },
      {
        examNo: 105,
        title: 'Std 11 NEET Full Mock Test #1 — PCB',
        examType: 'NEET',
        subject: 'PCB',
        standard: 'STD_11',
        division: 'ALL',
        examDate: new Date('2026-05-18'),
        marksPerSubject: 180,
        totalMarks: 720,
        status: 'MARKS_ENTERED',
        marksEnteredByName: 'Komal P. Desai',
        unitSummary: 'NEET Pattern Physics + Chemistry + Biology (Botany & Zoology)',
        questionPaperStatus: 'UPLOADED',
      },
      {
        examNo: 106,
        title: 'Std 11 Board Term 2 Exam — Mathematics',
        examType: 'BOARD',
        subject: 'Mathematics',
        standard: 'STD_11',
        division: 'ALL',
        examDate: new Date('2026-05-26'),
        marksPerSubject: 100,
        totalMarks: 100,
        status: 'SCHEDULED',
        unitSummary: 'Trigonometry, Calculus Limits, Quadratic Equations',
        questionPaperStatus: 'PENDING',
      },
    ];

    for (const exData of examsToSeed) {
      const examDoc = new ExamUnit({
        ...exData,
        facultyName: 'Prof. Umesh K. Pal',
        createdByRole: 'faculty',
        marksEnteredAt: exData.status === 'MARKS_ENTERED' ? new Date(exData.examDate.getTime() + 86400000) : null,
      });
      await examDoc.save();

      // Seed student exam marks if MARKS_ENTERED
      if (exData.status === 'MARKS_ENTERED') {
        const std11Students = createdStudents.filter((s) => s.standard === 'STD_11');
        const examMarksList = [];

        for (const stud of std11Students) {
          const isGroupA = stud.streamGroup === 'GROUP_A' || stud.streamGroup === 'GROUP_AB';
          const isGroupB = stud.streamGroup === 'GROUP_B' || stud.streamGroup === 'GROUP_AB';

          let subjectMarks = [];
          if (exData.examType === 'BOARD') {
            const basePct = stud.rollNo <= 3 ? 88 : stud.rollNo === 7 ? 48 : 72;
            const marksObt = Math.round((basePct / 100) * exData.totalMarks);
            subjectMarks.push({ subject: exData.subject, marksObtained: marksObt, totalMarks: exData.totalMarks });
          } else if (exData.examType === 'GUJCET') {
            const subjects = isGroupA ? ['Physics', 'Chemistry', 'Mathematics'] : ['Physics', 'Chemistry', 'Biology'];
            subjectMarks = subjects.map((subj) => ({
              subject: subj,
              marksObtained: 28 + (stud.rollNo % 5) * 2,
              totalMarks: 40,
            }));
          } else if (exData.examType === 'JEE') {
            if (!isGroupA) continue;
            subjectMarks = [
              { subject: 'Physics', marksObtained: 68 + (stud.rollNo % 4) * 4, totalMarks: 100 },
              { subject: 'Chemistry', marksObtained: 74 + (stud.rollNo % 3) * 5, totalMarks: 100 },
              { subject: 'Mathematics', marksObtained: 65 + (stud.rollNo % 5) * 4, totalMarks: 100 },
            ];
          } else if (exData.examType === 'NEET') {
            if (!isGroupB) continue;
            subjectMarks = [
              { subject: 'Physics', marksObtained: 125 + (stud.rollNo % 4) * 8, totalMarks: 180 },
              { subject: 'Chemistry', marksObtained: 135 + (stud.rollNo % 3) * 10, totalMarks: 180 },
              { subject: 'Biology', marksObtained: 310 + (stud.rollNo % 5) * 8, totalMarks: 360 },
            ];
          }

          const totalObt = subjectMarks.reduce((acc, sm) => acc + sm.marksObtained, 0);
          const totalMax = subjectMarks.reduce((acc, sm) => acc + sm.totalMarks, 0);
          const percentage = totalMax > 0 ? Math.round((totalObt / totalMax) * 1000) / 10 : 0;

          examMarksList.push({
            examId: examDoc._id,
            studentId: stud._id,
            rollNo: stud.rollNo,
            studentName: stud.fullName,
            streamGroup: stud.streamGroup,
            examGroup: isGroupA ? 'A' : 'B',
            ab: false,
            subjectMarks,
            totalObtained: totalObt,
            totalMaxMarks: totalMax,
            percentage,
            enteredByName: exData.marksEnteredByName,
            enteredAt: new Date(exData.examDate.getTime() + 86400000),
          });
        }

        if (examMarksList.length > 0) {
          await ExamMarks.insertMany(examMarksList);
        }
      }
    }
    console.log(`✅ Seeded ${examsToSeed.length} Exams with student marks ledger.`);

    // -------------------------------------------------------------
    // 7. SEED DISCIPLINE REMARKS & TYPES
    // -------------------------------------------------------------
    await DisciplineRemark.deleteMany({});
    await DisciplineType.deleteMany({});
    const baseDisciplineTypes = [
      'Late Arrival', 'Incomplete Homework', 'Uniform Incomplete', 'Mobile Phone in Class',
      'Disruptive Behavior', 'Lab Safety Violation', 'Bunking Lecture', 'Misconduct'
    ];
    await DisciplineType.insertMany(
      baseDisciplineTypes.map((t) => ({
        name: t,
        normalizedName: t.trim().toLowerCase(),
        isDefault: true,
        usageCount: 1,
        createdBy: 'System',
      }))
    );

    const disciplineSeed = [
      { srNo: 1, rollNo: 7, studentName: 'Aarav D. Mehta', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_A', contactNo: '+91 99000 12007', email: 'aarav.mehta@student.edu.in', type: 'Late Arrival', message: 'Arrived 25 minutes late for Physics morning diagnostic lecture.', notedBy: 'Prof. Umesh K. Pal', notedByRole: 'SUBJECT_FACULTY', status: 'OPEN', date: new Date('2026-05-18') },
      { srNo: 2, rollNo: 7, studentName: 'Aarav D. Mehta', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_A', contactNo: '+91 99000 12007', email: 'aarav.mehta@student.edu.in', type: 'Incomplete Homework', message: 'Failed to submit Chemistry assignment on Thermodynamics equations.', notedBy: 'Dr. Nisha R. Rao', notedByRole: 'SUBJECT_FACULTY', status: 'REVIEWED', date: new Date('2026-05-12') },
      { srNo: 3, rollNo: 7, studentName: 'Aarav D. Mehta', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_A', contactNo: '+91 99000 12007', email: 'aarav.mehta@student.edu.in', type: 'Mobile Phone in Class', message: 'Using mobile phone during Mathematics problem solving session.', notedBy: 'Prof. Ketan M. Joshi', notedByRole: 'SUBJECT_FACULTY', status: 'RESOLVED', date: new Date('2026-05-04') },
      { srNo: 4, rollNo: 7, studentName: 'Kabir N. Trivedi', standard: 'STD_12', division: 'B', streamGroup: 'GROUP_AB', contactNo: '+91 99000 12019', email: 'kabir.trivedi@student.edu.in', type: 'Lab Safety Violation', message: 'Did not wear safety lab coat and handled reagents without gloves.', notedBy: 'Rajiv A. Mehta', notedByRole: 'ASSISTANT_FACULTY', status: 'REVIEWED', date: new Date('2026-05-15') },
      { srNo: 5, rollNo: 7, studentName: 'Kabir N. Trivedi', standard: 'STD_12', division: 'B', streamGroup: 'GROUP_AB', contactNo: '+91 99000 12019', email: 'kabir.trivedi@student.edu.in', type: 'Uniform Incomplete', message: 'Missing school blazer and ID badge during morning assembly.', notedBy: 'Prof. Umesh K. Pal', notedByRole: 'SUBJECT_FACULTY', status: 'OPEN', date: new Date('2026-05-09') },
      { srNo: 6, rollNo: 11, studentName: 'Nirav J. Chauhan', standard: 'STD_11', division: 'B', streamGroup: 'GROUP_AB', contactNo: '+91 99000 12011', email: 'nirav.c@student.edu.in', type: 'Bunking Lecture', message: 'Left school premises before Biology practical session without permission slip.', notedBy: 'Dr. Heena S. Patel', notedByRole: 'SUBJECT_FACULTY', status: 'REVIEWED', date: new Date('2026-05-14') },
      { srNo: 7, rollNo: 5, studentName: 'Manan H. Vora', standard: 'STD_11', division: 'A', streamGroup: 'GROUP_AB', contactNo: '+91 99000 12005', email: 'manan.vora@student.edu.in', type: 'Disruptive Behavior', message: 'Talking loudly during principal lecture announcement.', notedBy: 'Dr. Jayant R. Zadafiya', notedByRole: 'PRINCIPAL', status: 'RESOLVED', date: new Date('2026-05-06') },
    ];
    await DisciplineRemark.insertMany(disciplineSeed);
    console.log(`✅ Seeded ${disciplineSeed.length} Discipline Remarks with repeat offender records.`);

    // -------------------------------------------------------------
    // 8. SEED NOTICES
    // -------------------------------------------------------------
    await Notice.deleteMany({});
    const noticeSeed = [
      {
        srNo: 1,
        title: 'Weekly Science Stream Academic Review & LT Compliance',
        type: 'Academic',
        targetScope: 'ALL_FACULTY',
        audienceLabel: 'All Faculty Members (Subject & Assistant)',
        senderName: 'Dr. Jayant R. Zadafiya',
        senderRole: 'PRINCIPAL',
        senderEmpCode: 'FAC100',
        message: 'All Subject Faculty are requested to verify that daily Lecture Tests (LTs) align strictly with syllabus progress. Assistant faculty must complete marks entry within 24 hours of test completion.',
        priority: 'HIGH',
        date: new Date('2026-05-18'),
      },
      {
        srNo: 2,
        title: 'Special Focus on Chemistry Thermodynamics Numerical Problem Solving',
        type: 'Curriculum',
        targetScope: 'SPECIFIC_FACULTY',
        audienceLabel: 'Dr. Nisha R. Rao, Prof. Harsh D. Patel',
        recipients: [
          { name: 'Dr. Nisha R. Rao', role: 'Subject Faculty', subject: 'Chemistry (Board)', empCode: 'FAC102' },
          { name: 'Prof. Harsh D. Patel', role: 'Subject Faculty', subject: 'Chemistry (JEE)', empCode: 'FAC108' },
        ],
        senderName: 'Dr. Jayant R. Zadafiya',
        senderRole: 'PRINCIPAL',
        senderEmpCode: 'FAC100',
        message: 'LT analysis indicates an average below 60% on Le Chatelier numericals. Kindly schedule a 45-minute doubt clearing and problem-solving workshop for Division B students.',
        priority: 'URGENT',
        date: new Date('2026-05-16'),
      },
      {
        srNo: 3,
        title: 'Physics Lab Optical Bench & Sonometer Setup for Wednesday',
        type: 'Lab Requirement',
        targetScope: 'ALL_ASSISTANT_FACULTY',
        audienceLabel: 'Assistant Faculty & Lab Technicians',
        senderName: 'Prof. Umesh K. Pal',
        senderRole: 'SUBJECT_FACULTY',
        senderEmpCode: 'FAC101',
        senderSubject: 'Physics',
        message: 'Please arrange 12 sets of optical benches and verify concave mirror focal lengths for Std 11 practical session scheduled for Wednesday 10:30 AM.',
        priority: 'NORMAL',
        date: new Date('2026-05-17'),
      },
      {
        srNo: 4,
        title: 'Laboratory Safety Audit and Reagents Stock Register Submission',
        type: 'Administrative',
        targetScope: 'PRINCIPAL',
        audienceLabel: 'Principal',
        senderName: 'Rajiv A. Mehta',
        senderRole: 'ASSISTANT_FACULTY',
        senderEmpCode: 'FAC105',
        senderSubject: 'Lab — Physics/Chemistry',
        message: 'Respected Sir, the monthly safety inspection for Physics and Chemistry laboratories has been conducted. All fire extinguishers and eye-wash stations are in working order. Report attached.',
        priority: 'NORMAL',
        date: new Date('2026-05-14'),
      },
    ];
    await Notice.insertMany(noticeSeed);
    console.log(`✅ Seeded ${noticeSeed.length} Notices across administrative & academic scopes.`);

    // -------------------------------------------------------------
    // 9. SEED INITIAL FACULTY DIAGNOSTIC REPORTS
    // -------------------------------------------------------------
    await FacultyReport.deleteMany({});
    const firstEvaluatedLt = allCreatedLts.find((l) => l.status === 'EVALUATED') || allCreatedLts[0];
    if (firstEvaluatedLt) {
      await FacultyReport.create({
        reportType: 'LT',
        ltId: firstEvaluatedLt._id,
        ltNo: firstEvaluatedLt.ltNo,
        subject: firstEvaluatedLt.subject,
        targetSubject: firstEvaluatedLt.subject,
        standard: firstEvaluatedLt.standard,
        division: firstEvaluatedLt.division,
        facultyName: firstEvaluatedLt.facultyName,
        ltDate: firstEvaluatedLt.takenDate,
        markEntryDate: firstEvaluatedLt.marksEnteredAt,
        marksEnteredByName: firstEvaluatedLt.marksEnteredByName,
        topicsCovered: firstEvaluatedLt.topicsCovered,
        questions: firstEvaluatedLt.questions,
        classAverageLabel: 'Better',
        classAveragePercent: 74,
        classAverageScore: 7.4,
        counts: { excellent: 4, better: 2, good: 0, ab: 0, total: 6 },
        alertStatus: 'GOOD_UNDERSTANDING',
        alertTitle: 'Strong Conceptual Grasp Observed',
        alertMessage: 'Majority of students demonstrated clear derivation skills.',
        principalMessage: 'Good performance. Keep reinforcing practical examples.',
        sentByName: 'Dr. Jayant R. Zadafiya (Principal)',
      });
      console.log(`✅ Seeded initial FacultyReport.`);
    }

    console.log('🎉 FULL SYSTEM SEEDING COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Full seeding error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

seedAll();
