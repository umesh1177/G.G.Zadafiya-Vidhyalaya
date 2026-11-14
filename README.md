# G.G. Zadafiya Vidhyalaya — Academic Management & Analytics Portal

A full-stack, enterprise-grade Academic Management, Lecture Test (LT) Analytics, Exam Management, and Syllabus Tracking System engineered for **G.G. Zadafiya Vidhyalaya** (Std 11 & 12 Science Stream — GSEB, JEE, NEET, GUJCET).

---

## 📌 Current Project Status

The platform has completed comprehensive stabilization, mobile restructuring, security hardening, and database enrichment:

- **Server-Side Authentication & Security (Phase 1)**: Robust session-based & JWT authentication with `bcryptjs` password hashing, sanitized API responses (zero password hash leakage), timing-safe comparisons, and complete removal of client-side fallback logins.
- **Strict Role-Based Access Control (RBAC)**: Backend-enforced authorization matrix covering `Principal`, `Subject Faculty`, and `Assistant Faculty` across all API endpoints with subject ownership checks.
- **Mobile-First UI & Responsive Overhaul (Phase 2)**: Fully restructured mobile header, responsive side drawers, bottom quick-access navigation, optimized touch targets, and fixed text-wrapping issues across mobile, tablet, and desktop views.
- **Synchronized Syllabus Tracking with Privacy**:
  - Unified curriculum tracking across all subjects and standards.
  - When any faculty completes a curriculum topic/subtopic/example/swadhyay exercise, it reflects as **Finished** for all faculties teaching that subject.
  - **Faculty Privacy**: Subject peers see only the completed status without seeing which specific faculty completed it.
  - **Principal Audit Trail**: The Principal portal retains complete audit visibility (faculty name, subject, employee code, and exact completion timestamp).
  - **Confirmation & Lock**: Irreversible completion confirmation modal prevents accidental unmarking.
- **Lecture Test (LT) Module**: Full test lifecycle — Subject Faculty/Principal scheduling, full-screen projector display with live countdown timer, test conduction by any Assistant Faculty, subject-isolated mark entry, and automated performance categorizations (`Excellent`, `Better`, `Good`, `AB`).
- **Exam Unit Module**: Multi-subject exam units (JEE, NEET, GUJCET, Board) with question paper PDF uploads/downloads, marks evaluation for Groups A, B, and AB, auto-closing edit modals, and class average visualizations.
- **Data Validation Layer**: Input sanitization, strict email validation, past-date scheduling prevention for tests and exams, and error boundaries.
- **Bilingual & Accessibility Features**: Integrated Gujarati virtual keyboard, Web Speech API speech-to-text (`gu-IN` & `en-IN`), and preserved textbook terminology.

---

## 👥 Role Permissions & Access Control Matrix

| Feature / Action | Principal | Subject Faculty | Assistant Faculty |
| :--- | :---: | :---: | :---: |
| **System Overview & KPI Dashboard** | Full School-wide | Assigned Subject Only | Daily Operations |
| **Faculty & Student Management** | Full CRUD | View Only | View / Edit Basic |
| **Syllabus Tracking & Management** | Full (All Subjects + Audit) | Own Subject (Mark Finish) | View Status |
| **Lecture Test (LT) Creation** | Allowed (All) | Assigned Subject Only | Restricted |
| **Lecture Test (LT) Conduction & Timer** | Full Access | Full Access | Any Subject LT |
| **Lecture Test (LT) Marks Entry** | All Subjects | Assigned Subject Only | Assigned Subject Only |
| **Exam Creation & Question Paper Upload** | All Exams | Assigned Subject Only | Assigned Subject Only |
| **Exam Marks Entry & Grading** | All Exams | Assigned Subject Only | Assigned Subject Only |
| **Analytics & ML Retraining** | Full Access | Subject Summary | Restricted |
| **Notices & Circulars** | School-wide Publish | Subject/Class Publish | View & Class Circulars |
| **Discipline Incident Flagging** | Full CRUD | Flag & View Remarks | Flag & View Remarks |

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework**: React 18, Vite
- **Routing**: React Router v6
- **State & Auth**: React Context API (`AuthContext`), secure token handling in memory and `localStorage` with automated session validation
- **Visualizations**: Chart.js & `react-chartjs-2` with non-overlapping horizontal axis labels
- **Icons**: Lucide React
- **Voice & Input**: Web Speech API (Gujarati `gu-IN` and Indian English `en-IN`), Custom Gujarati On-Screen Virtual Keyboard
- **Styling**: Modular CSS design system with safe-area mobile optimizations

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js REST API
- **Security**: `bcryptjs` (salt rounds 10), `jsonwebtoken` (JWT), timing-safe comparison, Role-Based Access Control middleware
- **Uploads**: Multer (sanitized PDF question paper uploads with size limits and type validation)
- **Validation**: Dedicated validation middleware preventing past dates, invalid emails, and unauthorized payload modifications

### Database
- **Engine**: MongoDB (Mongoose ODM)
- **Current Mode**: Local MongoDB (`mongodb://127.0.0.1:27017/GGZ`) for isolated testing and verification; production-ready for MongoDB Atlas.

---

## 📁 Repository Structure

```
G.G.Zadafiya-Vidhyalaya/
├── backend/
│   ├── src/
│   │   ├── config/             # Database connection (MongoDB local / Atlas)
│   │   ├── controllers/        # Auth, Faculty, Student, LT, Exam, Syllabus, Notice, Discipline
│   │   ├── data/               # Standard 11 & 12 curriculum definitions
│   │   ├── middleware/         # Authentication, requireRole, requireSubjectScope, validate
│   │   ├── models/             # Mongoose schemas (Faculty, Student, LT, Exam, Syllabus, Notice, etc.)
│   │   ├── routes/             # REST route endpoints with RBAC enforcement
│   │   ├── services/           # Core business logic, analytics, and data transformations
│   │   ├── utils/              # Password hashing, JWT helpers, input validators
│   │   ├── seedMongo.js        # Comprehensive test data seeder (20 students, 15 LTs, 14 exams)
│   │   └── server.js           # Express app bootstrap
│   ├── uploads/                # Question paper PDF storage
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Shared UI: Sidebar, Navbar, Pagination, VirtualKeyboard, Modals
│   │   ├── context/            # AuthContext (role-based session state)
│   │   ├── pages/
│   │   │   ├── principal/      # Home, Faculty & Student Management, Syllabus Tracking, Analytics
│   │   │   ├── faculty/        # Set LT, Syllabus Tracker, Exam Unit
│   │   │   ├── assistant/      # Today's LT, Projector Timer, LT & Exam Marks Entry, History
│   │   │   └── Login.jsx       # Secure login with toggleable password visibility
│   │   ├── services/           # Axios / fetch API client service wrappers
│   │   ├── styles/             # Global CSS and role-based themes
│   │   └── utils/              # Subject authorization helpers and syllabus calculations
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017` (or MongoDB Atlas URI)

### 2. Environment Configuration
Ensure `backend/.env` is configured:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/GGZ
JWT_SECRET=ggzv_academic_secure_jwt_secret_2026_key_token
NODE_ENV=development
```

Ensure `frontend/.env` (optional, defaults to port 5000):
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Installation
```bash
# Clone the repository
git clone https://github.com/umesh1177/G.G.Zadafiya-Vidhyalaya.git
cd G.G.Zadafiya-Vidhyalaya

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Seed the Database
Populate the database with realistic academic data (20 active students, full curriculum, evaluated and scheduled LTs, and completed multi-subject exams):
```bash
cd backend
node src/seedMongo.js
```

### 5. Running the Application
Open two terminal windows:

**Terminal 1 — Backend API Server:**
```bash
cd backend
npm start
# Server runs on http://localhost:5000
```

**Terminal 2 — Frontend Application:**
```bash
cd frontend
npm run dev
# Vite runs on http://localhost:5173
```

---

## 🔑 Test Credentials (Seeded Accounts)

All accounts are pre-seeded with secure hashed passwords:

| Role | Username / Identifier | Password | Description |
| :--- | :--- | :--- | :--- |
| **Principal** | `admin` (or `principal@ggzv.edu.in`) | `admin123` | Full administrative authority across all modules |
| **Subject Faculty (Physics)** | `PHYS01` (or `physics.faculty@ggzv.edu.in`) | `admin123` | Physics curriculum, setting LTs, exam papers |
| **Subject Faculty (Chemistry)** | `CHEM01` (or `chemistry.faculty@ggzv.edu.in`) | `admin123` | Chemistry curriculum, setting LTs, exam papers |
| **Subject Faculty (Maths)** | `MATH01` (or `maths.faculty@ggzv.edu.in`) | `admin123` | Mathematics curriculum & tests |
| **Subject Faculty (Biology)** | `BIO01` (or `biology.faculty@ggzv.edu.in`) | `admin123` | Biology curriculum & tests |
| **Assistant Faculty (Physics)** | `ASST_PHYS` (or `asst.physics@ggzv.edu.in`) | `admin123` | Conducts any LT; enters marks for Physics |
| **Assistant Faculty (Chemistry)** | `ASST_CHEM` (or `asst.chemistry@ggzv.edu.in`) | `admin123` | Conducts any LT; enters marks for Chemistry |

---

## 🧪 Verification & Build Status

- **Backend Syntax**: 100% verified (`node -c` on all controllers, services, routes, middleware, and models).
- **Frontend Build**: Verified production build (`npm run build` succeeds with 0 errors across 1641 modules).
- **Git Branch**: All current work is staged on branch `saumil`.
