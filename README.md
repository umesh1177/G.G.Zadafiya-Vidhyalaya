# G.G. Zadafiya Vidhyalaya — School Management & LT Analytics Portal

A full-stack Academic Management, Lecture Test (LT) Analytics, and Syllabus Tracking System designed for G.G. Zadafiya Vidhyalaya (Std 11 & 12 Science Stream — GSEB, JEE, NEET).

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: React 18, Vite, React Router v6, Chart.js / react-chartjs-2, Web Speech API (Gujarati `gu-IN` & English `en-IN`), Custom Gujarati Virtual Keyboard, PWA (Progressive Web App).
- **Backend**: Node.js, Express.js REST API.
- **Database**: MongoDB Atlas (`student_management_system`) via Mongoose.

---

## 📁 Project Structure

```
├── backend/                  # Node.js + Express API server
│   ├── src/
│   │   ├── config/           # Database configuration (MongoDB Atlas)
│   │   ├── controllers/      # Auth, Faculty, Student, LT, Exam, Syllabus, Notice, Discipline
│   │   ├── data/             # Std 11 & 12 curriculum definitions (Physics, Chemistry, Maths, Biology)
│   │   ├── models/           # Mongoose schemas (Faculty, Student, Syllabus, LT, Exam, Notice, etc.)
│   │   ├── routes/           # Express API route endpoints
│   │   └── services/         # Business logic and ML evaluation algorithms
│   ├── public/syllabus/      # Diagram images for Physics, Maths, and Chemistry
│   └── package.json
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── components/       # Reusable UI, VoiceInputControl, GujaratiVirtualKeyboard, Modals
│   │   ├── context/          # Authentication & App Contexts
│   │   ├── pages/            # Principal, Faculty, Assistant, Student, Login dashboards
│   │   ├── services/         # Frontend API clients (REST endpoints)
│   │   └── styles/           # CSS design system
│   ├── public/syllabus/      # Static image assets
│   └── package.json
├── .gitignore
├── package.json              # Workspace root scripts
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB Atlas connection string configured in `backend/.env`

### 2. Installation
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Running the System
```bash
# Start backend API (runs on http://localhost:5000)
npm run backend

# Start frontend application (runs on http://localhost:5173)
npm run frontend
```

---

## 🔐 Default Principal Credentials

- **Username / Email**: `admin` or `principal@ggzv.edu.in` or `FAC100`
- **Password**: `admin123`
- **Portal**: Principal Dashboard with complete Faculty, Student, Syllabus, LT Analysis, Exam Analysis, and Discipline Management.

---

## ✨ Key Features

- **Lecture Test (LT) Workflow & Analytics**: Daily LT creation, subject faculty isolation, assistant mark entry, performance categorization (`Excellent`, `Better`, `Good`), weekly & monthly reports, growth/downfall tracking, and printable reports.
- **Syllabus Management**: Standard 11 & 12 complete curriculum for Physics, Chemistry, Mathematics, and Biology with textbook diagram integration, topic status tracking, and progress metrics.
- **Voice-to-Text & Gujarati Virtual Keyboard**: Speech-to-text supporting Gujarati (`gu-IN`) and English (`en-IN`) with interim preview and a full on-screen virtual Gujarati keyboard across all remark/question/notice fields.
- **Discipline & Notice Workspace**: Incident recording, behavioral tracking, circular dispatch with PDF and image attachments.
