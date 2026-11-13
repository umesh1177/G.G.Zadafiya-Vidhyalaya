// Static demo data for the Faculty (Subject Faculty) Dashboard
export const initialFacultyData = {
  faculty: {
    name: "Pal Umesh",
    email: "umesh.pal@ggzv.edu.in",
    contactNo: "+91 98765 43210",
    subject: "Physics",
    username: "pal_umesh",
    password: "Password@123",
    role: "Subject Faculty",
    joiningDate: "15 June 2022",
    photo: "/images/profile.png",
    school: "G.G. Zadafiya Vidhyalaya",
    initials: "PU",
  },

  // ---------------- HOME / SYLLABUS OVERVIEW ----------------
  syllabusStats: { totalChapters: 12, completed: 7, pending: 5 },
  completionPercent: 62,

  todayFinishTopics: [
    { srNo: 1, topicNo: "4.2", topicName: "Newton's Second Law — Numericals", chapter: "Laws of Motion" },
    { srNo: 2, topicNo: "4.3", topicName: "Friction in Inclined Planes", chapter: "Laws of Motion" },
  ],

  // ---------------- CHAPTERS (used by Syllabus page & Exam Unit page) ----------------
  chapters: [
    {
      chapterNo: 1, chapterName: "Laws of Motion",
      topics: [
        { topicNo: "1.1", name: "Newton's First Law", status: "done" },
        { topicNo: "1.2", name: "Newton's Second Law", status: "done" },
        { topicNo: "1.3", name: "Newton's Third Law", status: "done" },
        { topicNo: "1.4", name: "Friction in Inclined Planes", status: "pending" },
      ],
    },
    {
      chapterNo: 2, chapterName: "Work, Energy and Power",
      topics: [
        { topicNo: "2.1", name: "Work Done by a Force", status: "done" },
        { topicNo: "2.2", name: "Kinetic & Potential Energy", status: "done" },
        { topicNo: "2.3", name: "Conservation of Energy", status: "pending" },
      ],
    },
    {
      chapterNo: 3, chapterName: "Rotational Dynamics",
      topics: [
        { topicNo: "3.1", name: "Torque and Angular Momentum", status: "pending" },
        { topicNo: "3.2", name: "Moment of Inertia", status: "pending" },
      ],
    },
  ],

  // ---------------- EXAM UNIT ----------------
  examHistory: [
    { srNo: 1, date: "19 May 2026", type: "Weekly", unit: "1, 2 till 2.2" },
    { srNo: 2, date: "12 May 2026", type: "Weekly", unit: "1 till 1.3" },
    { srNo: 3, date: "30 Apr 2026", type: "Monthly", unit: "1, 2, 3 till 3.2" },
  ],

  // ---------------- LT HISTORY ----------------
  ltHistory: [
    { srNo: 1, date: "26 May 2026", subject: "Physics", topics: "Newton's First Law, Newton's Second Law" },
    { srNo: 2, date: "19 May 2026", subject: "Physics", topics: "Newton's Third Law" },
    { srNo: 3, date: "12 May 2026", subject: "Physics", topics: "Work Done by a Force" },
  ],

  // ---------------- NOTICE (inbox, read-only) ----------------
  notices: [
    { srNo: 1, date: "10 May 2026", message: "Today is a half-day on account of the inter-school science exhibition. All Std 11–12 Science students must report to the auditorium by 9:00 AM." },
    { srNo: 2, date: "14 May 2026", message: "Kindly submit the Chemistry Unit Test marksheet by Friday for the monthly result compilation." },
    { srNo: 3, date: "20 May 2026", message: "Please ensure syllabus tracking is updated daily — the Principal's dashboard reflects this in real time." },
  ],
};

