// Static demo data for the Parent/Student Dashboard prototype.

module.exports = {
  student: {
    name: "Umesh Pal",
    rollNo: 1,
    standard: "11-A",
    school: "Shree Vidya Vihar Science School",
    initials: "UP",
    totalStudentsInClass: 50,
  },

  // ---------------- HOME OVERVIEW ----------------
  homeStats: {
    overallPercentile: 99.45,
    currentRank: 1,
    thisWeekAverage: 91,
    growthVsLastWeek: 4.2,
  },

  // ---------------- LT ANALYSIS ----------------
  lt: {
    thisWeek: [
      { subject: "Physics", level: "Excellent", value: 3 },
      { subject: "Chemistry", level: "Better", value: 2 },
      { subject: "Maths", level: "Excellent", value: 3 },
    ],
    growthRateByWeek: [
      { week: "Week 1", value: 78 },
      { week: "Week 2", value: 83 },
      { week: "Week 3", value: 91 },
    ],
    weakTopics: [
      { ltNo: 6, subject: "Chemistry", date: "20 May 2026", score: "Good", topic: "Mole Concept — Basics" },
    ],
    history: [
      { ltNo: 1, subject: "Physics", date: "19 May 2026", score: "Excellent", topic: "Newton's Laws of Motion" },
      { ltNo: 2, subject: "Chemistry", date: "20 May 2026", score: "Better", topic: "Mole Concept — Basics" },
      { ltNo: 3, subject: "Maths", date: "21 May 2026", score: "Excellent", topic: "Probability — Conditional" },
      { ltNo: 4, subject: "Biology", date: "22 May 2026", score: "Better", topic: "Cell Structure — Organelles" },
      { ltNo: 5, subject: "Physics", date: "23 May 2026", score: "Excellent", topic: "Rotational Dynamics — Intro" },
    ],
  },

  // ---------------- PROGRESS REPORT ----------------
  progressReport: {
    weekly: {
      average: 91, growthVsLastWeek: 4.2, rank: 1, rankChange: "+2", percentile: 99.45,
      subjectAverages: [
        { subject: "Physics", avg: 96 }, { subject: "Chemistry", avg: 86 },
        { subject: "Maths", avg: 92 }, { subject: "Biology", avg: 89 },
      ],
      message: "Excellent week — Physics and Maths both above 90%. Chemistry (Mole Concept) is the one area worth a quick revision before the next test.",
    },
    monthly: {
      average: 84, momGrowth: 6.5, rank: 2, rankChange: "+3",
      examAverage: 89,
      monthComparison: { lastMonth: 78, thisMonth: 84 },
      trend: [
        { week: "Week 1", avg: 74 }, { week: "Week 2", avg: 79 },
        { week: "Week 3", avg: 83 }, { week: "Week 4", avg: 91 },
      ],
      recurringWeakTopics: ["Mole Concept (Chemistry)"],
      classAverage: 76,
      consistencyScore: "8.5/10",
      peerBenchmark: "Top 5%",
      disciplineRemarks: "Good attendance, minor uniform violation noted.",
      overallPerformance: "Excellent progress shown in the latter half of the month.",
      topInSubjects: ["Physics", "Maths"],
      bestWeek: "Week 4 (91%)",
      worstWeek: "Week 1 (74%)",
      netGrowth: "+17%",
      weeksImproved: 3,
      weeksDeclined: 0,
      ltAverage: 88,
    },
    principal: {
      poorStudentGraph: [
        { subject: "Chemistry", percentWeak: 40 },
        { subject: "Maths", percentWeak: 60 },
        { subject: "Physics", percentWeak: 15 },
        { subject: "Biology", percentWeak: 25 },
      ],
      studentPercentiles: [
        { rank: 1, name: "Umesh Pal", percentile: 99.45 },
        { rank: 2, name: "Aryan Sharma", percentile: 94.20 },
        { rank: 3, name: "Rahul Verma", percentile: 88.50 },
        { rank: 4, name: "Neha Patel", percentile: 82.10 },
        { rank: 5, name: "Priya Singh", percentile: 76.90 }
      ]
    },
  },

  // ---------------- EXAM RESULT (per-exam marks) ----------------
  examResults: [
    { srNo: 1, subject: "Physics", examDate: "19 May 2026", rank: 1, percentile: 99.45, score: 96, type: "Board" },
    { srNo: 2, subject: "Chemistry", examDate: "20 May 2026", rank: 4, percentile: 93.1, score: 86, type: "Board" },
    { srNo: 3, subject: "Maths", examDate: "21 May 2026", rank: 2, percentile: 97.8, score: 92, type: "GUJCET" },
    { srNo: 4, subject: "Physics", examDate: "22 May 2026", rank: 1, percentile: 98.9, score: 94, type: "JEE" },
    { srNo: 5, subject: "Biology", examDate: "23 May 2026", rank: 3, percentile: 95.4, score: 89, type: "NEET" },
  ],

  // ---------------- RESULT (aggregated sheets) ----------------
  resultStats: { total: 12, weekly: 8, monthly: 3, annual: 1 },
  resultHistory: [
    { srNo: 1, type: "Weekly", standard: "11-A", date: "19 May 2026" },
    { srNo: 2, type: "Weekly", standard: "11-A", date: "12 May 2026" },
    { srNo: 3, type: "Monthly", standard: "11-A", date: "30 Apr 2026" },
  ],

  // ---------------- HALL TICKET ----------------
  hallTickets: [
    { srNo: 1, standard: "11-A", date: "26 May 2026", examType: "Board" },
    { srNo: 2, standard: "11-A", date: "27 May 2026", examType: "GUJCET" },
  ],

  // ---------------- NOTICE (received) ----------------
  notices: [
    { srNo: 1, date: "10 May 2026", message: "Today is a half-day on account of the inter-school science exhibition. All Std 11–12 Science students must report to the auditorium by 9:00 AM." },
    { srNo: 2, date: "12 May 2026", message: "Please ensure regular attendance going forward; two late arrivals have been noted this month." },
  ],

  // ---------------- DISCIPLINE REMARK (own records) ----------------
  disciplineHistory: [
    { srNo: 1, type: "Long hair", date: "21 May 2026", notedBy: "Rajiv Mehta", message: "Reminded to follow grooming guidelines as per school uniform policy; to be corrected by next week." },
  ],
};
