// Static demo data for the Principal Dashboard prototype.
// All values are illustrative placeholders standing in for real database records.

module.exports = {
  principal: {
    name: "Principal",
    school: "Shree Vidya Vihar Science School",
    initials: "PR",
    email: "principal@svvs.edu.in",
    contactNo: "+91 99099 88776",
    username: "admin",
  },

  // ---------------- STUDENT MANAGEMENT ----------------
  studentStats: { total: 50, groupA: 20, groupB: 20, groupAB: 10 },
  students: [
    { rollNo: 1, name: "Umesh Pal", group: "A", standard: 11, division: "A", dob: "12 Oct 2009", contactNo: "+91 98765 43210", email: "umesh.pal@example.in", joiningDate: "12 Jun 2025", endingDate: "—", status: "active", photo: "/images/umesh.jpg" },
    { rollNo: 2, name: "Soumil Shah", group: "A", standard: 11, division: "A", dob: "05 Jan 2009", contactNo: "+91 98765 43211", email: "soumil.shah@example.in", joiningDate: "12 Jun 2025", endingDate: "—", status: "active", photo: "" },
    { rollNo: 3, name: "Riya Patel", group: "B", standard: 11, division: "B", dob: "22 Mar 2009", contactNo: "+91 98765 43212", email: "riya.patel@example.in", joiningDate: "14 Jun 2025", endingDate: "—", status: "active", photo: "" },
    { rollNo: 4, name: "Aarav Mehta", group: "AB", standard: 12, division: "A", dob: "18 Aug 2008", contactNo: "+91 98765 43213", email: "aarav.mehta@example.in", joiningDate: "10 Jun 2024", endingDate: "—", status: "active", photo: "" },
    { rollNo: 5, name: "Diya Joshi", group: "A", standard: 12, division: "B", dob: "30 Nov 2008", contactNo: "+91 98765 43214", email: "diya.joshi@example.in", joiningDate: "10 Jun 2024", endingDate: "—", status: "active", photo: "" },
    { rollNo: 6, name: "Kabir Trivedi", group: "B", standard: 11, division: "A", dob: "14 Feb 2009", contactNo: "+91 98765 43215", email: "kabir.t@example.in", joiningDate: "16 Jun 2025", endingDate: "—", status: "active", photo: "" },
    { rollNo: 7, name: "Anaya Desai", group: "AB", standard: 12, division: "B", dob: "09 Jul 2008", contactNo: "+91 98765 43216", email: "anaya.d@example.in", joiningDate: "08 Jun 2024", endingDate: "—", status: "active", photo: "" },
    { rollNo: 8, name: "Vivaan Shah", group: "B", standard: 11, division: "B", dob: "27 Sep 2009", contactNo: "+91 98765 43217", email: "vivaan.s@example.in", joiningDate: "18 Jun 2025", endingDate: "—", status: "active", photo: "" },
  ],
  alumni: [
    { rollNo: 21, name: "Krish Nair", group: "A", standard: 12, division: "A", dob: "14 Apr 2007", job: "B.Tech, NIT Surat", endingDate: "30 Apr 2025", contactNo: "+91 91234 50001", email: "krish.n@example.in", photo: "" },
    { rollNo: 22, name: "Meera Iyer", group: "AB", standard: 12, division: "B", dob: "11 Dec 2006", job: "MBBS, GMERS", endingDate: "30 Apr 2024", contactNo: "+91 91234 50002", email: "meera.i@example.in", photo: "" },
  ],

  // ---------------- FACULTY MANAGEMENT ----------------
  facultyStats: { total: 20, subjectFaculty: 10, assistantFaculty: 10 },
  faculty: [
    { sNo: 1, name: "Pal Umesh", subject: "Physics", role: "Subject Faculty", contactNo: "+91 99887 11001", email: "umesh.faculty@example.in", joiningDate: "01 Jun 2018", status: "active" },
    { sNo: 2, name: "Nisha Rao", subject: "Chemistry", role: "Subject Faculty", contactNo: "+91 99887 11002", email: "nisha.rao@example.in", joiningDate: "11 Jun 2019", status: "active" },
    { sNo: 3, name: "Ketan Joshi", subject: "Mathematics", role: "Subject Faculty", contactNo: "+91 99887 11003", email: "ketan.j@example.in", joiningDate: "03 Jun 2017", status: "active" },
    { sNo: 4, name: "Heena Patel", subject: "Biology", role: "Subject Faculty", contactNo: "+91 99887 11004", email: "heena.p@example.in", joiningDate: "20 Jun 2021", status: "active" },
    { sNo: 5, name: "Rajiv Mehta", subject: "Lab \u2014 Physics/Chemistry", role: "Assistant Faculty", contactNo: "+91 99887 11005", email: "rajiv.m@example.in", joiningDate: "05 Jul 2020", status: "active" },
    { sNo: 6, name: "Komal Desai", subject: "Lab \u2014 Biology", role: "Assistant Faculty", contactNo: "+91 99887 11006", email: "komal.d@example.in", joiningDate: "14 Jul 2022", status: "active" },
  ],
  deactiveFaculty: [
    { sNo: 1, name: "Sanjay Vora", subject: "Mathematics", role: "Subject Faculty", contactNo: "+91 99887 12001", email: "sanjay.v@example.in", joiningDate: "01 Jun 2015", resignationDate: "30 Apr 2026" },
  ],

  // ---------------- EXAM ANALYSIS ----------------
  examStats: { total: 64, board: 24, gujcet: 16, jee: 12, neet: 12, pending: 3, completed: 61, subjects: [{ name: "Physics", count: 25 }, { name: "Chemistry", count: 26 }, { name: "Maths", count: 13 }] },
  exams: [
    { examNo: 101, subject: "Physics", type: "Board", date: "19 May 2026", unit: "1, 2, 3 till 3.5", classAverage: 78, status: "completed" },
    { examNo: 102, subject: "Chemistry", type: "Board", date: "20 May 2026", unit: "Ch 4, 5", classAverage: 71, status: "completed" },
    { examNo: 103, subject: "Maths", type: "GUJCET", date: "21 May 2026", unit: "Ch 6, 7", classAverage: 64, status: "completed" },
    { examNo: 104, subject: "Physics", type: "JEE", date: "22 May 2026", unit: "Ch 8", classAverage: 58, status: "completed" },
    { examNo: 105, subject: "Biology", type: "NEET", date: "23 May 2026", unit: "Ch 9, 10", classAverage: 69, status: "completed" },
    { examNo: 106, subject: "Chemistry", type: "Board", date: "24 May 2026", unit: "Ch 11", classAverage: null, status: "pending" },
    { examNo: 107, subject: "Maths", type: "Board", date: "25 May 2026", unit: "Ch 12", classAverage: null, status: "pending" },
  ],
  examAnalysisDetail: {
    101: {
      examNo: 101, subject: "Physics", type: "Board", date: "19 May 2026",
      difficulty: "Hard",
      performance: {
        overallAverage: 78, passStudents: 46, failedStudents: 4,
        scoreBrackets: [
          { range: "90\u2013100%", count: 6 }, { range: "75\u201390%", count: 16 },
          { range: "60\u201375%", count: 18 }, { range: "40\u201360%", count: 6 }, { range: "Below 40%", count: 4 },
        ],
        growthChart: { labels: ["Previous Exam", "Current Exam"], increase: 31, decrease: 14, sameLevel: 5 },
        message: "Class performance is Good this exam \u2014 average rose 6% despite a Hard-rated paper.",
      },
      leaderboard: [
        { rank: 1, rollNo: 1, name: "Umesh Pal", marks: 96, percentile: 99.45 },
        { rank: 2, rollNo: 4, name: "Aarav Mehta", marks: 93, percentile: 98.2 },
        { rank: 3, rollNo: 7, name: "Anaya Desai", marks: 91, percentile: 97.1 },
        { rank: 4, rollNo: 2, name: "Soumil Shah", marks: 88, percentile: 95.6 },
        { rank: 5, rollNo: 5, name: "Diya Joshi", marks: 85, percentile: 93.4 },
      ],
      studentAnalysis: {
        topGrowth: [
          { rollNo: 1, name: "Umesh Pal", rate: 9.2 }, { rollNo: 6, name: "Kabir Trivedi", rate: 7.4 },
        ],
        decreaseGrowth: [
          { rollNo: 8, name: "Vivaan Shah", rate: 5.1 }, { rollNo: 3, name: "Riya Patel", rate: 3.6 },
        ],
        consistentGrowth: [{ rollNo: 1, name: "Umesh Pal" }, { rollNo: 4, name: "Aarav Mehta" }],
        consistentDecrease: [{ rollNo: 8, name: "Vivaan Shah" }],
        subjectWise: { labels: ["Physics", "Chemistry", "Maths"], weak: [8, 11, 14], strong: [22, 17, 15] },
      },
    },
  },

  // ---------------- LT ANALYSIS ----------------
  ltStats: { totalLT: 132, totalTopicCovered: 118, totalLTPending: 6 },
  ltList: [
    { ltNo: 1, subject: "Physics", date: "19 May 2026", overallAverage: "Better", status: "completed" },
    { ltNo: 2, subject: "Chemistry", date: "20 May 2026", overallAverage: "Good", status: "completed" },
    { ltNo: 3, subject: "Maths", date: "21 May 2026", overallAverage: "Excellent", status: "completed" },
    { ltNo: 4, subject: "Biology", date: "22 May 2026", overallAverage: "Good", status: "completed" },
    { ltNo: 5, subject: "Physics", date: "23 May 2026", overallAverage: "\u2014", status: "pending" },
  ],
  ltAnalysisDetail: {
    1: {
      ltNo: 1, subject: "Physics", tokenDate: "18 May 2026", dateOfAssessment: "19 May 2026",
      ltTopic: "Newton's Laws of Motion", overallAverage: "Better",
      distribution: { excellent: 14, better: 24, good: 12 },
      excellentList: [{ rollNo: 1, name: "Umesh Pal" }, { rollNo: 4, name: "Aarav Mehta" }],
      betterList: [{ rollNo: 2, name: "Soumil Shah" }, { rollNo: 5, name: "Diya Joshi" }],
      goodList: [{ rollNo: 8, name: "Vivaan Shah" }],
      scoreIncreaseList: [{ rollNo: 6, name: "Kabir Trivedi" }],
      scoreDecreaseList: [{ rollNo: 3, name: "Riya Patel" }],
      weakTopicList: [
        { srNo: 1, topicName: "Rotational Dynamics", classAverage: "Good" },
        { srNo: 2, topicName: "Friction in Inclined Planes", classAverage: "Good" },
      ],
      consistentGoodList: [{ rollNo: 1, name: "Umesh Pal", excellentCount: 8, betterCount: 2, goodCount: 0 }],
      consistentPoorList: [{ rollNo: 8, name: "Vivaan Shah", excellentCount: 0, betterCount: 1, goodCount: 9 }],
    },
  },

  // ---------------- SYLLABUS TRACKING ----------------
  syllabus: {
    subjects: [
      { name: "Physics", completion: 60 },
      { name: "Chemistry", completion: 90 },
      { name: "Maths", completion: 75 },
      { name: "Biology", completion: 82 },
    ],
    completedTopics: 96,
    pendingTopics: 28,
    todayFinishTopics: [
      { srNo: 1, subject: "Physics", topicsFinished: 2 },
      { srNo: 2, subject: "Chemistry", topicsFinished: 1 },
      { srNo: 3, subject: "Maths", topicsFinished: 3 },
    ],
    todayTopicDetail: [
      { srNo: 1, topicName: "Newton's Laws of Motion \u2014 Numericals" },
      { srNo: 2, topicName: "Friction in Inclined Planes" },
      { srNo: 3, topicName: "Atomic Structure \u2014 Quantum Numbers" },
    ],
  },

  // ---------------- PROGRESS REPORT (Principal-level summary) ----------------
  // ---------------- PROGRESS REPORT (Principal-level summary) ----------------
  progressReport: {
    weekly: {
      classAverage: 74, growthVsLastWeek: 4.2, downfallVsLastWeek: 0,
      subjectAverages: [
        { subject: "Physics", avg: 78 }, { subject: "Chemistry", avg: 71 }, { subject: "Maths", avg: 64 }
      ],
      examAverages: [
        { type: "Theory Exam", avg: 72 }, { type: "MCQ Exam", avg: 68 }
      ],
      scoreBrackets: [
        { range: "100-90%", count: 2 }, { range: "70-90%", count: 5 }, { range: "50-70%", count: 10 }
      ],
      prevVsCurr: [
        { period: "Previous", avg: 69 }, { period: "Current", avg: 74 }
      ],
      top3: [
        { rollNo: 1, name: "Umesh Pal", subject: "Physics", score: 95 },
        { rollNo: 4, name: "Aarav Mehta", subject: "Chemistry", score: 92 },
        { rollNo: 5, name: "Diya Joshi", subject: "Maths", score: 90 }
      ],
      bottom3: [
        { rollNo: 8, name: "Vivaan Shah", score: 42 },
        { rollNo: 3, name: "Riya Patel", score: 48 },
        { rollNo: 2, name: "Soumil Shah", score: 52 }
      ],
      growth: [
        { rollNo: 1, name: "Umesh Pal", growth: "+9.2%" },
        { rollNo: 6, name: "Kabir Trivedi", growth: "+7.4%" }
      ],
      downfall: [
        { rollNo: 8, name: "Vivaan Shah", downfall: "-5.1%" },
        { rollNo: 3, name: "Riya Patel", downfall: "-3.6%" }
      ],
      ltAnalysis: {
        prevVsCurr: [
          { period: "Previous", avg: 71 }, { period: "Current", avg: 75 }
        ],
        subjectRanges: [
          { label: "Excellent", val: 5 }, { label: "Good", val: 10 }, { label: "Better", val: 20 }
        ],
        goodPerformers: [
          { rollNo: 1, name: "Umesh Pal", excellent: 5, better: 2, good: 1 }
        ],
        badPerformers: [
          { rollNo: 8, name: "Vivaan Shah", excellent: 0, better: 1, good: 4 },
          { rollNo: 3, name: "Riya Patel", excellent: 0, better: 2, good: 3 }
        ],
        weakTopics: [
          { srNo: 1, topicName: "Rotational Dynamics", classAverage: "Good" },
          { srNo: 2, topicName: "Friction in Inclined Planes", classAverage: "Good" }
        ]
      },
      syllabusComplete: [
        { subject: "Physics", val: 10.1 }, { subject: "Chemistry", val: 20.1 }, { subject: "Maths", val: 30.1 }
      ],
      facultyTopics: [
        { name: "Manly Sir", topics: 25 }, { name: "Gupta Sir", topics: 20 }
      ],
      message: "Strong week overall \u2014 Physics and Biology trending up; Maths needs focused revision before the next GUJCET-pattern test."
    },
    monthly: {
      classAverage: 71, growthVsLastWeek: 3.1, downfallVsLastWeek: 1.2,
      subjectAverages: [
        { subject: "Physics", avg: 74 }, { subject: "Chemistry", avg: 73 }, { subject: "Maths", avg: 68 }
      ],
      examAverages: [
        { type: "Theory Exam", avg: 70 }, { type: "MCQ Exam", avg: 72 }
      ],
      scoreBrackets: [
        { range: "100-90%", count: 3 }, { range: "70-90%", count: 8 }, { range: "50-70%", count: 12 }
      ],
      prevVsCurr: [
        { period: "Previous", avg: 68 }, { period: "Current", avg: 71 }
      ],
      top3: [
        { rollNo: 4, name: "Aarav Mehta", subject: "Maths", score: 94 },
        { rollNo: 1, name: "Umesh Pal", subject: "Chemistry", score: 91 },
        { rollNo: 6, name: "Kabir Trivedi", subject: "Physics", score: 89 }
      ],
      bottom3: [
        { rollNo: 8, name: "Vivaan Shah", score: 44 },
        { rollNo: 3, name: "Riya Patel", score: 46 },
        { rollNo: 7, name: "Ananya Desai", score: 54 }
      ],
      growth: [
        { rollNo: 4, name: "Aarav Mehta", growth: "+6.8%" },
        { rollNo: 5, name: "Diya Joshi", growth: "+5.2%" }
      ],
      downfall: [
        { rollNo: 8, name: "Vivaan Shah", downfall: "-4.2%" },
        { rollNo: 2, name: "Soumil Shah", downfall: "-2.8%" }
      ],
      ltAnalysis: {
        prevVsCurr: [
          { period: "Previous", avg: 69 }, { period: "Current", avg: 72 }
        ],
        subjectRanges: [
          { label: "Excellent", val: 7 }, { label: "Good", val: 12 }, { label: "Better", val: 18 }
        ],
        goodPerformers: [
          { rollNo: 4, name: "Aarav Mehta", excellent: 6, better: 3, good: 1 }
        ],
        badPerformers: [
          { rollNo: 8, name: "Vivaan Shah", excellent: 0, better: 3, good: 7 }
        ],
        weakTopics: [
          { srNo: 1, topicName: "Mole Concept", classAverage: "Better" },
          { srNo: 2, topicName: "Rotational Dynamics", classAverage: "Good" }
        ]
      },
      syllabusComplete: [
        { subject: "Physics", val: 40.5 }, { subject: "Chemistry", val: 50.2 }, { subject: "Maths", val: 65.0 }
      ],
      facultyTopics: [
        { name: "Manly Sir", topics: 95 }, { name: "Gupta Sir", topics: 80 }
      ],
      message: "Monthly review indicates steady progress in Physics and Chemistry. Maths requires dedicated remedial sessions to address rotational mechanics difficulties."
    },
    advance: {
      classAverage: 78, growthVsLastWeek: 5.4, downfallVsLastWeek: 0.8,
      subjectAverages: [
        { subject: "Physics", avg: 80 }, { subject: "Chemistry", avg: 77 }, { subject: "Maths", avg: 75 }
      ],
      examAverages: [
        { type: "Theory Exam", avg: 81 }, { type: "MCQ Exam", avg: 75 }
      ],
      scoreBrackets: [
        { range: "100-90%", count: 6 }, { range: "70-90%", count: 15 }, { range: "50-70%", count: 5 }
      ],
      prevVsCurr: [
        { period: "Previous", avg: 73 }, { period: "Current", avg: 78 }
      ],
      top3: [
        { rollNo: 1, name: "Umesh Pal", subject: "Maths", score: 98 },
        { rollNo: 5, name: "Diya Joshi", subject: "Physics", score: 96 },
        { rollNo: 4, name: "Aarav Mehta", subject: "Biology", score: 95 }
      ],
      bottom3: [
        { rollNo: 8, name: "Vivaan Shah", score: 50 },
        { rollNo: 3, name: "Riya Patel", score: 52 },
        { rollNo: 2, name: "Soumil Shah", score: 58 }
      ],
      growth: [
        { rollNo: 1, name: "Umesh Pal", growth: "+12.4%" },
        { rollNo: 5, name: "Diya Joshi", growth: "+10.1%" }
      ],
      downfall: [
        { rollNo: 8, name: "Vivaan Shah", downfall: "-2.1%" }
      ],
      ltAnalysis: {
        prevVsCurr: [
          { period: "Previous", avg: 74 }, { period: "Current", avg: 77 }
        ],
        subjectRanges: [
          { label: "Excellent", val: 10 }, { label: "Good", val: 15 }, { label: "Better", val: 25 }
        ],
        goodPerformers: [
          { rollNo: 1, name: "Umesh Pal", excellent: 12, better: 4, good: 2 }
        ],
        badPerformers: [],
        weakTopics: [
          { srNo: 1, topicName: "Probability", classAverage: "Good" }
        ]
      },
      syllabusComplete: [
        { subject: "Physics", val: 85.0 }, { subject: "Chemistry", val: 95.0 }, { subject: "Maths", val: 92.5 }
      ],
      facultyTopics: [
        { name: "Manly Sir", topics: 220 }, { name: "Gupta Sir", topics: 195 }
      ],
      message: "Advance analytics indicate solid preparation levels for major science streams. Focus on final diagnostic mock runs in the upcoming semester weeks."
    }
  },

  // ---------------- DISCIPLINE REMARK ----------------
  discipline: {
    undisciplined: [
      { rollNo: 1, name: "Umesh Pal", date: "21 May 2026", standard: 12, type: "Long hair", notedBy: "Rajiv Mehta", description: "Reminded to follow grooming guidelines as per school uniform policy; to be corrected by next week." },
      { rollNo: 3, name: "Riya Patel", date: "22 May 2026", standard: 11, type: "Late to school", notedBy: "Nisha Rao", description: "Arrived 25 minutes after assembly for the second time this month." },
    ],
    frequentOffenders: [
      { rollNo: 1, name: "Umesh Pal", standard: 12, count: 3, history: [
        { type: "Long hair", date: "10 May 2026", notedBy: "Rajiv Mehta" },
        { type: "Long hair", date: "21 May 2026", notedBy: "Rajiv Mehta" },
        { type: "Late to school", date: "23 May 2026", notedBy: "Ketan Joshi" },
      ] },
    ],
  },

  // ---------------- NOTICE MESSAGE ----------------
  notices: [
    { srNo: 1, type: "General", date: "10 May 2026", audience: "All Students & Faculty", message: "Today is a half-day on account of the inter-school science exhibition. All Std 11\u201312 Science students must report to the auditorium by 9:00 AM." },
    { srNo: 2, type: "Specific \u2014 Student", date: "12 May 2026", audience: "Roll No. 3 \u2014 Riya Patel", message: "Please ensure regular attendance going forward; two late arrivals have been noted this month." },
    { srNo: 3, type: "Specific \u2014 Faculty", date: "14 May 2026", audience: "Nisha Rao", message: "Kindly submit the Chemistry Unit Test marksheet by Friday for the monthly result compilation." },
  ],
};
