// Static demo data for the Assistant Faculty Dashboard prototype.

module.exports = {
  assistant: {
    name: "Rajiv Mehta",
    role: "Assistant Faculty — Physics / Chemistry Lab",
    school: "Shree Vidya Vihar Science School",
    initials: "RM",
  },

  // ---------------- HOME OVERVIEW ----------------
  homeStats: {
    pendingLT: 1,
    pendingExamMarks: 3,
    hallTicketsGenerated: 50,
    openDisciplineNotes: 2,
  },

  // ---------------- LT ----------------
  lt: {
    today: { subject: "Physics", date: "24 May 2026", type: "Daily LT", topic: "Newton's Laws of Motion — Numericals", defaultMinutes: 15 },
    todayLTs: [
      { id: 1, subject: "Physics",   date: "24 May 2026", type: "Daily LT", topic: "Newton's Laws of Motion — Numericals", defaultMinutes: 15 },
      { id: 2, subject: "Chemistry", date: "24 May 2026", type: "Daily LT", topic: "Mole Concept — Stoichiometry",         defaultMinutes: 15 },
      { id: 3, subject: "Maths",     date: "24 May 2026", type: "Daily LT", topic: "Probability — Conditional Events",     defaultMinutes: 20 },
      { id: 4, subject: "Biology",   date: "24 May 2026", type: "Daily LT", topic: "Cell Structure — Organelles",          defaultMinutes: 15 },
    ],
    historyStats: { totalLT: 132, totalLTPending: 1 },
    history: [
      { ltNo: 5, subject: "Physics",   date: "24 May 2026" },
      { ltNo: 6, subject: "Chemistry", date: "24 May 2026" },
      { ltNo: 7, subject: "Maths",     date: "24 May 2026" },
      { ltNo: 8, subject: "Biology",   date: "24 May 2026" },
      { ltNo: 1, subject: "Physics",   date: "19 May 2026" },
      { ltNo: 2, subject: "Chemistry", date: "20 May 2026" },
      { ltNo: 3, subject: "Maths",     date: "21 May 2026" },
      { ltNo: 4, subject: "Biology",   date: "22 May 2026" },
    ],
    historyDetail: {
      1: { subject: "Physics",   date: "19 May 2026", type: "Daily LT", time: "15 min", topic: "Newton's Laws of Motion" },
      2: { subject: "Chemistry", date: "20 May 2026", type: "Daily LT", time: "15 min", topic: "Mole Concept — Basics" },
      3: { subject: "Maths",     date: "21 May 2026", type: "Daily LT", time: "20 min", topic: "Probability — Conditional" },
      4: { subject: "Biology",   date: "22 May 2026", type: "Daily LT", time: "15 min", topic: "Cell Structure — Organelles" },
      5: { subject: "Physics",   date: "24 May 2026", type: "Daily LT", time: "15 min", topic: "Newton's Laws of Motion — Numericals" },
      6: { subject: "Chemistry", date: "24 May 2026", type: "Daily LT", time: "15 min", topic: "Mole Concept — Stoichiometry" },
      7: { subject: "Maths",     date: "24 May 2026", type: "Daily LT", time: "20 min", topic: "Probability — Conditional Events" },
      8: { subject: "Biology",   date: "24 May 2026", type: "Daily LT", time: "15 min", topic: "Cell Structure — Organelles" },
    },
    pending: [
      { ltNo: 5, date: "23 May 2026", standard: "11-A" },
    ],
    pendingStudents: [
      { rollNo: 1, name: "Umesh Pal" }, { rollNo: 2, name: "Soumil Shah" },
      { rollNo: 3, name: "Riya Patel" }, { rollNo: 6, name: "Kabir Trivedi" },
      { rollNo: 8, name: "Vivaan Shah" },
    ],
    historyStudentMarks: {
      1: [
        { rollNo: 1, name: "Umesh Pal",      mark: "Excellent" },
        { rollNo: 2, name: "Soumil Shah",    mark: "Better" },
        { rollNo: 3, name: "Riya Patel",     mark: "Good" },
        { rollNo: 6, name: "Kabir Trivedi",  mark: "Excellent" },
        { rollNo: 8, name: "Vivaan Shah",    mark: "Better" },
      ],
      2: [
        { rollNo: 1, name: "Umesh Pal",      mark: "Better" },
        { rollNo: 2, name: "Soumil Shah",    mark: "Good" },
        { rollNo: 3, name: "Riya Patel",     mark: "Excellent" },
        { rollNo: 6, name: "Kabir Trivedi",  mark: "Good" },
        { rollNo: 8, name: "Vivaan Shah",    mark: "Excellent" },
      ],
      3: [
        { rollNo: 1, name: "Umesh Pal",      mark: "Excellent" },
        { rollNo: 2, name: "Soumil Shah",    mark: "Excellent" },
        { rollNo: 3, name: "Riya Patel",     mark: "Better" },
        { rollNo: 6, name: "Kabir Trivedi",  mark: "Better" },
        { rollNo: 8, name: "Vivaan Shah",    mark: "Good" },
      ],
      4: [
        { rollNo: 1, name: "Umesh Pal",      mark: "Good" },
        { rollNo: 2, name: "Soumil Shah",    mark: "Better" },
        { rollNo: 3, name: "Riya Patel",     mark: "Good" },
        { rollNo: 6, name: "Kabir Trivedi",  mark: "Excellent" },
        { rollNo: 8, name: "Vivaan Shah",    mark: "Excellent" },
      ],
      5: [
        { rollNo: 1, name: "Umesh Pal",      mark: "Excellent" },
        { rollNo: 2, name: "Soumil Shah",    mark: "Excellent" },
        { rollNo: 3, name: "Riya Patel",     mark: "Better" },
        { rollNo: 6, name: "Kabir Trivedi",  mark: "Good" },
        { rollNo: 8, name: "Vivaan Shah",    mark: "Better" },
      ],
      6: [
        { rollNo: 1, name: "Umesh Pal",      mark: "Better" },
        { rollNo: 2, name: "Soumil Shah",    mark: "Good" },
        { rollNo: 3, name: "Riya Patel",     mark: "Excellent" },
        { rollNo: 6, name: "Kabir Trivedi",  mark: "Excellent" },
        { rollNo: 8, name: "Vivaan Shah",    mark: "Good" },
      ],
      7: [
        { rollNo: 1, name: "Umesh Pal",      mark: "Good" },
        { rollNo: 2, name: "Soumil Shah",    mark: "Better" },
        { rollNo: 3, name: "Riya Patel",     mark: "Excellent" },
        { rollNo: 6, name: "Kabir Trivedi",  mark: "Better" },
        { rollNo: 8, name: "Vivaan Shah",    mark: "Excellent" },
      ],
      8: [
        { rollNo: 1, name: "Umesh Pal",      mark: "Excellent" },
        { rollNo: 2, name: "Soumil Shah",    mark: "Better" },
        { rollNo: 3, name: "Riya Patel",     mark: "Good" },
        { rollNo: 6, name: "Kabir Trivedi",  mark: "Excellent" },
        { rollNo: 8, name: "Vivaan Shah",    mark: "Better" },
      ],
    },
  },

  // ---------------- EXAM ----------------
  examStats: { total: 64, pending: 5, upcoming: 4, completed: 3 },
  examUpcoming: [
    { srNo: 1, date: "26 May 2026", subject: "Maths", unit: "Ch 8, 9", type: "Board" },
    { srNo: 2, date: "27 May 2026", subject: "Physics", unit: "Ch 9", type: "GUJCET" },
    { srNo: 3, date: "29 May 2026", subject: "Biology", unit: "Ch 11", type: "NEET" },
    { srNo: 4, date: "30 May 2026", subject: "Chemistry", unit: "Ch 7", type: "JEE" },
  ],
  examCompleted: [
    { examNo: 106, date: "24 May 2026", standard: "11-A", type: "Board", subject: "Chemistry", status: "awaiting" },
    { examNo: 107, date: "25 May 2026", standard: "12-A", type: "Board", subject: "Maths", status: "awaiting" },
    { examNo: 108, date: "23 May 2026", standard: "11-B", type: "GUJCET", subject: "Physics", status: "awaiting" },
    { examNo: 109, date: "22 May 2026", standard: "12-B", type: "JEE", subject: "Maths", status: "awaiting" },
    { examNo: 110, date: "21 May 2026", standard: "12-A", type: "NEET", subject: "Biology", status: "awaiting" },
    { examNo: 101, date: "19 May 2026", standard: "11-A", type: "Board", subject: "Physics", status: "entered" },
    { examNo: 102, date: "20 May 2026", standard: "11-A", type: "Board", subject: "Chemistry", status: "entered" },
    { examNo: 103, date: "18 May 2026", standard: "12-A", type: "JEE", subject: "Physics", status: "entered" },
  ],
  examMarksStudents: [
    { rollNo: 1, name: "Umesh Pal" }, { rollNo: 2, name: "Soumil Shah" },
    { rollNo: 3, name: "Riya Patel" }, { rollNo: 4, name: "Aarav Mehta" },
    { rollNo: 5, name: "Diya Joshi" },
  ],

  // ---------------- RESULT GENERATION ----------------
  resultStats: { total: 28, weekly: 18, monthly: 8, annual: 2 },
  resultHistory: [
    { srNo: 1, standard: 12, division: "A", date: "19 May 2026", type: "Weekly" },
    { srNo: 2, standard: 11, division: "B", date: "12 May 2026", type: "Weekly" },
    { srNo: 3, standard: 11, division: "A", date: "30 Apr 2026", type: "Monthly" },
  ],
  resultGeneratedList: [
    { rollNo: 1, name: "Umesh Pal" }, { rollNo: 2, name: "Soumil Shah" },
    { rollNo: 3, name: "Riya Patel" }, { rollNo: 4, name: "Aarav Mehta" },
  ],

  // ---------------- HALL TICKET ----------------
  hallTicketGeneratedList: [
    { rollNo: 1, name: "Umesh Pal" }, { rollNo: 2, name: "Soumil Shah" },
    { rollNo: 3, name: "Riya Patel" }, { rollNo: 4, name: "Aarav Mehta" },
    { rollNo: 5, name: "Diya Joshi" },
  ],
  hallTicketHistory: [
    { srNo: 1, standard: 12, date: "18 May 2026", type: "Board" },
    { srNo: 2, standard: 11, date: "10 May 2026", type: "GUJCET" },
    { srNo: 3, standard: 12, date: "05 May 2026", type: "JEE" },
  ],

  // ---------------- NOTICE (inbox, read-only for assistant) ----------------
  notices: [
    { srNo: 1, date: "10 May 2026", message: "Today is a half-day on account of the inter-school science exhibition. All Std 11–12 Science students must report to the auditorium by 9:00 AM." },
    { srNo: 2, date: "14 May 2026", message: "Kindly submit the Chemistry Unit Test marksheet by Friday for the monthly result compilation." },
    { srNo: 3, date: "21 May 2026", message: "Lab inventory audit scheduled for next Monday — please ensure the chemical stock register is up to date." },
  ],

  // ---------------- DISCIPLINE REMARK ----------------
  disciplineHistory: [
    { rollNo: 1, standard: "12-A", name: "Umesh Pal", type: "Long hair", date: "21 May 2026", notedBy: "Rajiv Mehta", message: "Reminded to follow grooming guidelines as per school uniform policy; to be corrected by next week." },
    { rollNo: 3, standard: "11-B", name: "Riya Patel", type: "Come late", date: "22 May 2026", notedBy: "Nisha Rao", message: "Arrived 25 minutes after assembly for the second time this month." },
  ],
};
