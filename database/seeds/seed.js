/**
 * Database Seed Script for PostgreSQL / Prisma ORM
 * Populates realistic 11th & 12th Science Stream demo data
 * Run with: node database/seeds/seed.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting School Management System Database Seeding...');

  // 1. Clean existing records in dependency order
  await prisma.disciplineRemark.deleteMany({});
  await prisma.studentAttendance.deleteMany({});
  await prisma.progressReport.deleteMany({});
  await prisma.hallTicket.deleteMany({});
  await prisma.hallTicketBatch.deleteMany({});
  await prisma.resultItem.deleteMany({});
  await prisma.resultBatch.deleteMany({});
  await prisma.examMarkEntry.deleteMany({});
  await prisma.examUnitCoverage.deleteMany({});
  await prisma.exam.deleteMany({});
  await prisma.ltMarkEntry.deleteMany({});
  await prisma.ltTopicCoverage.deleteMany({});
  await prisma.lectureTest.deleteMany({});
  await prisma.syllabusCompletion.deleteMany({});
  await prisma.subtopic.deleteMany({});
  await prisma.topic.deleteMany({});
  await prisma.chapter.deleteMany({});
  await prisma.facultySubjectAllocation.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.notice.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.faculty.deleteMany({});
  await prisma.principal.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Users & Profiles
  // 2.1 Principal User
  const principalUser = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: '$2b$10$hashed_admin_password', // demo hash
      email: 'principal@vidyavihar.edu.in',
      contactNo: '+91 98765 43210',
      role: 'PRINCIPAL',
      principalProfile: {
        create: {
          name: 'Dr. Suresh Varma',
          email: 'principal@vidyavihar.edu.in',
          contactNo: '+91 98765 43210',
          schoolName: 'Shree Vidya Vihar Science School',
          qualification: 'Ph.D in Physics, M.Sc, B.Ed',
        },
      },
    },
  });

  // 2.2 Subject Faculty: Physics
  const physicsFacultyUser = await prisma.user.create({
    data: {
      username: 'faculty',
      passwordHash: '$2b$10$hashed_faculty_password',
      email: 'physics.faculty@vidyavihar.edu.in',
      contactNo: '+91 98220 11223',
      role: 'SUBJECT_FACULTY',
      facultyProfile: {
        create: {
          name: 'Prof. Nisha Rao',
          email: 'physics.faculty@vidyavihar.edu.in',
          contactNo: '+91 98220 11223',
          role: 'SUBJECT_FACULTY',
          primarySubject: 'PHYSICS',
          photoUrl: '/images/profile.png',
        },
      },
    },
    include: { facultyProfile: true },
  });

  // 2.3 Subject Faculty: Chemistry
  const chemFacultyUser = await prisma.user.create({
    data: {
      username: 'chem_faculty',
      passwordHash: '$2b$10$hashed_faculty_password',
      email: 'chem.faculty@vidyavihar.edu.in',
      contactNo: '+91 98220 44556',
      role: 'SUBJECT_FACULTY',
      facultyProfile: {
        create: {
          name: 'Dr. Arun Dave',
          email: 'chem.faculty@vidyavihar.edu.in',
          contactNo: '+91 98220 44556',
          role: 'SUBJECT_FACULTY',
          primarySubject: 'CHEMISTRY',
        },
      },
    },
    include: { facultyProfile: true },
  });

  // 2.4 Assistant Faculty
  const assistantUser = await prisma.user.create({
    data: {
      username: 'assistant',
      passwordHash: '$2b$10$hashed_assistant_password',
      email: 'assistant@vidyavihar.edu.in',
      contactNo: '+91 98220 77889',
      role: 'ASSISTANT_FACULTY',
      facultyProfile: {
        create: {
          name: 'Rajiv Mehta',
          email: 'assistant@vidyavihar.edu.in',
          contactNo: '+91 98220 77889',
          role: 'ASSISTANT_FACULTY',
          primarySubject: 'PHYSICS',
        },
      },
    },
    include: { facultyProfile: true },
  });

  // 3. Subjects & Chapters & Topics
  const subjectsData = [
    { code: 'PHYSICS', name: 'Physics', isCore: true, group: null },
    { code: 'CHEMISTRY', name: 'Chemistry', isCore: true, group: null },
    { code: 'MATHEMATICS', name: 'Mathematics', isCore: true, group: 'GROUP_A' },
    { code: 'BIOLOGY', name: 'Biology', isCore: true, group: 'GROUP_B' },
  ];

  const subjects = {};
  for (const s of subjectsData) {
    subjects[s.code] = await prisma.subject.create({
      data: {
        code: s.code,
        name: s.name,
        isCoreScience: s.isCore,
        applicableGroup: s.group,
      },
    });
  }

  // Chapters & Topics for Physics (Std 11)
  const ch1 = await prisma.chapter.create({
    data: {
      subjectId: subjects['PHYSICS'].id,
      standard: 'STD_11',
      chapterNo: 1,
      chapterName: "Newton's Laws of Motion",
      topics: {
        create: [
          { topicNo: '1.1', name: 'First Law & Inertia' },
          { topicNo: '1.2', name: 'Momentum & Second Law' },
          { topicNo: '1.3', name: 'Third Law & Action-Reaction' },
          { topicNo: '1.4', name: 'Friction & Circular Motion' },
        ],
      },
    },
    include: { topics: true },
  });

  const ch2 = await prisma.chapter.create({
    data: {
      subjectId: subjects['CHEMISTRY'].id,
      standard: 'STD_11',
      chapterNo: 2,
      chapterName: 'Mole Concept & Stoichiometry',
      topics: {
        create: [
          { topicNo: '2.1', name: 'Mole Concept — Basics' },
          { topicNo: '2.2', name: 'Molar Mass & Empirical Formula' },
          { topicNo: '2.3', name: 'Stoichiometric Calculations' },
        ],
      },
    },
    include: { topics: true },
  });

  // 4. Create Students (Group A PCM & Group B PCB)
  const studentsRaw = [
    { rollNo: 1, firstName: 'Umesh', lastName: 'Pal', group: 'GROUP_A', email: 'umesh.pal@student.edu.in' },
    { rollNo: 2, firstName: 'Soumil', lastName: 'Shah', group: 'GROUP_A', email: 'soumil.shah@student.edu.in' },
    { rollNo: 3, firstName: 'Riya', lastName: 'Patel', group: 'GROUP_B', email: 'riya.patel@student.edu.in' },
    { rollNo: 4, firstName: 'Aarav', lastName: 'Mehta', group: 'GROUP_A', email: 'aarav.mehta@student.edu.in' },
    { rollNo: 5, firstName: 'Diya', lastName: 'Joshi', group: 'GROUP_B', email: 'diya.joshi@student.edu.in' },
    { rollNo: 6, firstName: 'Kabir', lastName: 'Trivedi', group: 'GROUP_A', email: 'kabir.trivedi@student.edu.in' },
    { rollNo: 7, firstName: 'Ananya', lastName: 'Desai', group: 'GROUP_B', email: 'ananya.desai@student.edu.in' },
    { rollNo: 8, firstName: 'Vivaan', lastName: 'Shah', group: 'GROUP_A', email: 'vivaan.shah@student.edu.in' },
  ];

  const students = [];
  for (const s of studentsRaw) {
    const studentUser = await prisma.user.create({
      data: {
        username: `student_${s.rollNo}`,
        passwordHash: '$2b$10$hashed_student_password',
        email: s.email,
        contactNo: `+91 99000 ${10000 + s.rollNo}`,
        role: 'STUDENT',
        studentProfile: {
          create: {
            rollNo: s.rollNo,
            firstName: s.firstName,
            lastName: s.lastName,
            fullName: `${s.firstName} ${s.lastName}`,
            standard: 'STD_11',
            division: 'A',
            streamGroup: s.group,
            contactNo: `+91 99000 ${10000 + s.rollNo}`,
            email: s.email,
            status: 'ACTIVE',
          },
        },
      },
      include: { studentProfile: true },
    });
    students.push(studentUser.studentProfile);
  }

  // 5. Syllabus Completion: Today's Finished Topics by Subject Faculty
  const completedTopic1 = ch1.topics[0]; // 1.1
  const completedTopic2 = ch1.topics[1]; // 1.2
  await prisma.syllabusCompletion.createMany({
    data: [
      {
        topicId: completedTopic1.id,
        facultyId: physicsFacultyUser.facultyProfile.id,
        standard: 'STD_11',
        division: 'A',
        isFinished: true,
        completedDate: new Date(),
      },
      {
        topicId: completedTopic2.id,
        facultyId: physicsFacultyUser.facultyProfile.id,
        standard: 'STD_11',
        division: 'A',
        isFinished: true,
        completedDate: new Date(),
      },
    ],
  });

  // 6. LT Module: Subject Faculty creates LT from finished topics
  const lt1 = await prisma.lectureTest.create({
    data: {
      ltNo: 101,
      date: new Date(),
      standard: 'STD_11',
      division: 'A',
      subjectId: subjects['PHYSICS'].id,
      timeMinutes: 15,
      totalMarks: 20,
      status: 'EVALUATED',
      createdById: physicsFacultyUser.facultyProfile.id,
      assignedAssistantId: assistantUser.facultyProfile.id,
      questionDetails: 'State Newton’s 2nd Law and derive F = ma. Calculate acceleration for m = 5kg, F = 20N.',
      topicsCovered: {
        create: [{ topicId: completedTopic1.id }, { topicId: completedTopic2.id }],
      },
    },
  });

  // Assistant Faculty evaluates students in LT: Excellent / Better / Good / AB
  const ltGrades = ['EXCELLENT', 'EXCELLENT', 'BETTER', 'GOOD', 'BETTER', 'EXCELLENT', 'GOOD', 'EXCELLENT'];
  for (let i = 0; i < students.length; i++) {
    await prisma.ltMarkEntry.create({
      data: {
        ltId: lt1.id,
        studentId: students[i].id,
        scoreGrade: ltGrades[i],
        numericScore: ltGrades[i] === 'EXCELLENT' ? 19 : ltGrades[i] === 'BETTER' ? 16 : 13,
        isAbsent: false,
        evaluatedById: assistantUser.facultyProfile.id,
        isWeakTopic: ltGrades[i] === 'GOOD',
      },
    });
  }

  // 7. Exam Module: Subject Faculty creates JEE & Board Exams
  // 7.1 Board Exam (Single Subject)
  const boardExam = await prisma.exam.create({
    data: {
      examNo: 101,
      title: 'Physics Board Unit Exam #1',
      examType: 'BOARD',
      standard: 'STD_11',
      division: 'A',
      subject: 'Physics',
      date: new Date('2026-05-19'),
      totalMarks: 100,
      passingMarks: 33,
      unitCoverageSummary: 'Ch 1 (Newton’s Laws of Motion) — All Topics',
      status: 'EVALUATED',
      createdById: physicsFacultyUser.facultyProfile.id,
      conductedById: assistantUser.facultyProfile.id,
      coveredUnits: {
        create: [{ chapterId: ch1.id, isFullChapter: true, unitLabel: 'Ch 1 — All Topics' }],
      },
    },
  });

  // Assistant Faculty enters Board single-subject marks
  for (let i = 0; i < students.length; i++) {
    const score = 75 + ((i * 3) % 23);
    await prisma.examMarkEntry.create({
      data: {
        examId: boardExam.id,
        studentId: students[i].id,
        singleSubjectScore: score,
        totalScore: score,
        percentage: score,
        rank: i + 1,
        percentile: 100 - i * 5,
        enteredById: assistantUser.facultyProfile.id,
      },
    });
  }

  // 7.2 JEE / GUJCET Multi-Subject Exam (PCM for Group A)
  const jeeExam = await prisma.exam.create({
    data: {
      examNo: 103,
      title: 'JEE Mock Exam #1',
      examType: 'JEE',
      standard: 'STD_11',
      division: 'A',
      applicableGroup: 'GROUP_A',
      subject: 'PCM',
      date: new Date('2026-05-22'),
      totalMarks: 300,
      unitCoverageSummary: 'Physics Ch 1, Chemistry Ch 2, Maths Ch 1',
      status: 'EVALUATED',
      createdById: physicsFacultyUser.facultyProfile.id,
      conductedById: assistantUser.facultyProfile.id,
    },
  });

  // Assistant Faculty enters 3-subject marks for Group A students
  const groupAStudents = students.filter(s => s.streamGroup === 'GROUP_A');
  for (let i = 0; i < groupAStudents.length; i++) {
    const phy = 80 + i * 2;
    const chem = 82 + i * 2;
    const maths = 85 + i * 2;
    const total = phy + chem + maths;
    await prisma.examMarkEntry.create({
      data: {
        examId: jeeExam.id,
        studentId: groupAStudents[i].id,
        physicsScore: phy,
        chemistryScore: chem,
        mathsScore: maths,
        totalScore: total,
        percentage: Number(((total / 300) * 100).toFixed(1)),
        rank: i + 1,
        percentile: 99.4 - i * 0.8,
        enteredById: assistantUser.facultyProfile.id,
      },
    });
  }

  // 8. Result Generation: Assistant Faculty generates Weekly Result Batch
  const resultBatch = await prisma.resultBatch.create({
    data: {
      standard: 'STD_11',
      division: 'A',
      resultType: 'WEEKLY',
      date: new Date(),
      academicPeriod: 'May 2026 — Week 3',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      generatedById: assistantUser.facultyProfile.id,
      includedSubjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    },
  });

  for (let i = 0; i < students.length; i++) {
    const total = 260 + i * 4;
    await prisma.resultItem.create({
      data: {
        resultBatchId: resultBatch.id,
        studentId: students[i].id,
        totalMarksObtained: total,
        maxMarks: 300,
        percentage: Number(((total / 300) * 100).toFixed(1)),
        classRank: i + 1,
        overallPercentile: 99.5 - i * 1.2,
        subjectBreakdown: [
          { subject: 'Physics', marks: 88, max: 100 },
          { subject: 'Chemistry', marks: 84, max: 100 },
          { subject: students[i].streamGroup === 'GROUP_A' ? 'Mathematics' : 'Biology', marks: 92, max: 100 },
        ],
        status: 'PUBLISHED',
      },
    });
  }

  // 9. Hall Ticket Generation: Assistant Faculty creates Hall Ticket Batch
  const htBatch = await prisma.hallTicketBatch.create({
    data: {
      standard: 'STD_11',
      examType: 'BOARD',
      examDate: new Date('2026-06-15'),
      status: 'PUBLISHED',
      generatedById: assistantUser.facultyProfile.id,
      scheduleDetails: [
        { subject: 'Physics', date: '2026-06-15', time: '10:00 AM - 01:00 PM' },
        { subject: 'Chemistry', date: '2026-06-17', time: '10:00 AM - 01:00 PM' },
        { subject: 'Mathematics / Biology', date: '2026-06-19', time: '10:00 AM - 01:00 PM' },
      ],
    },
  });

  for (let i = 0; i < students.length; i++) {
    await prisma.hallTicket.create({
      data: {
        batchId: htBatch.id,
        studentId: students[i].id,
        seatNumber: `SVV-11A-${String(students[i].rollNo).padStart(3, '0')}`,
        status: 'PUBLISHED',
      },
    });
  }

  // 10. Notices & Discipline Remarks
  await prisma.notice.create({
    data: {
      title: 'Weekly Unit Test Schedule',
      message: 'Weekly test for Std 11 (PCM/PCB) will commence on Monday at 09:00 AM sharp.',
      targetRole: null, // broadcast to all
      targetStandard: 'STD_11',
      createdById: principalUser.principalProfile.id,
    },
  });

  await prisma.disciplineRemark.create({
    data: {
      studentId: students[2].id, // Riya Patel
      incidentType: 'COME_LATE',
      message: 'Arrived 15 minutes late for morning prayer assembly.',
      notedById: assistantUser.facultyProfile.id,
      notedByName: 'Rajiv Mehta',
      standard: 'STD_11',
      division: 'A',
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log(`- 1 Principal created`);
  console.log(`- 2 Subject Faculties & 1 Assistant Faculty created`);
  console.log(`- ${students.length} Students seeded across Group A (PCM) and Group B (PCB)`);
  console.log(`- Chapters, Topics, Syllabus Completions seeded`);
  console.log(`- LTs, Exams, Multi-subject Marks, Results, and Hall Tickets seeded`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

