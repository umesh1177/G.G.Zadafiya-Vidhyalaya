# Combined Dashboard — SVVS School Management System

A single Express + EJS server that combines all four school dashboards with session-based role authentication.

## 🚀 Quick Start

```bash
cd combined-dashboard
npm install
node server.js
```

Then open **http://localhost:4000**

---

## 🔐 Login Credentials

| Role | Username | Password | Redirects To |
|------|----------|----------|--------------|
| 🎓 Principal | `admin` | `admin123` | `/principal/` |
| 📚 Subject Faculty | `faculty` | `faculty123` | `/faculty/` |
| 🔬 Assistant Faculty | `assistant` | `asst123` | `/assistant/` |
| 🎒 Student / Parent | `student` | `student123` | `/student/` |

> On the login page, click any role card to auto-fill and sign in instantly.

---

## 📁 Project Structure

```
combined-dashboard/
├── server.js              ← Main Express server (port 4000)
├── package.json
├── data/
│   ├── principal.js       ← Principal dashboard data
│   ├── faculty.js         ← Faculty dashboard data
│   ├── assistant.js       ← Assistant faculty data
│   └── student.js         ← Student/parent data
├── views/
│   ├── login.ejs          ← Login page
│   ├── principal/         ← Principal views (pages + partials)
│   ├── faculty/           ← Faculty views
│   ├── assistant/         ← Assistant Faculty views
│   └── student/           ← Student/Parent views
└── public/
    ├── principal/css/      ← Principal CSS
    ├── principal/js/       ← Principal JS
    ├── faculty/css/
    ├── faculty/js/
    ├── assistant/css/
    ├── assistant/js/
    ├── student/css/
    └── student/js/
```

---

## 🔗 Dashboard Routes

### Principal (`/principal/*`)
- `/principal/` — Home
- `/principal/student-management` — Manage students
- `/principal/faculty-management` — Manage faculty
- `/principal/exam-analysis` — Exam analytics
- `/principal/lt-analysis` — LT analytics
- `/principal/syllabus-tracking` — Syllabus progress
- `/principal/progress-report` — Progress reports (Weekly/Monthly/Advance)
- `/principal/discipline-remark` — Discipline records
- `/principal/notice-message` — Send notices
- `/principal/profile` — Principal profile

### Faculty (`/faculty/*`)
- `/faculty/` — Home
- `/faculty/set-lt` — Set LT
- `/faculty/exam-unit` — Exam unit management
- `/faculty/syllabus` — Syllabus tracking
- `/faculty/notice` — Notices
- `/faculty/profile` — Profile

### Assistant Faculty (`/assistant/*`)
- `/assistant/` — Home
- `/assistant/lt` — LT management
- `/assistant/lt/history/:id` — LT history detail
- `/assistant/lt/enter-marks/:id` — Enter LT marks
- `/assistant/exam` — Exam management
- `/assistant/exam/enter-marks/:id` — Enter exam marks
- `/assistant/exam/view-marks/:id` — View exam marks
- `/assistant/result` — Result generation
- `/assistant/hall-ticket` — Hall ticket generation
- `/assistant/notice` — Notices
- `/assistant/discipline-remark` — Discipline remarks

### Student / Parent (`/student/*`)
- `/student/` — Home
- `/student/lt-analysis` — LT performance
- `/student/progress-report` — Weekly/Monthly progress
- `/student/exam-result` — Exam results
- `/student/result` — Result sheets
- `/student/hall-ticket` — Hall tickets
- `/student/notice-message` — Notices
- `/student/discipline-remark` — Discipline records

---

## ⚙️ Technical Details

- **Port**: 4000
- **Framework**: Express 5 + EJS 6
- **Auth**: `express-session` (8-hour sessions)
- **Static assets**: Served per-role under `/principal/`, `/faculty/`, `/assistant/`, `/student/`
- **Security**: Protected routes redirect to `/login` if unauthenticated; cross-role access redirects to own dashboard
