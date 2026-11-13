# School Management System (SMS) — React Frontend

A modern, responsive React + Vite Single Page Application (SPA) migration of the School Management System (SMS), maintaining exact visual, thematic, and behavioral parity with the multi-role EJS dashboard.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The app will start at `http://localhost:5173/`.

### 3. Build for Production
```bash
npm run build
```
Creates an optimized production bundle in `frontend/dist/`.

---

## 👥 Demo Credentials & Roles

| Role | Username | Password | Default Route |
| :--- | :--- | :--- | :--- |
| **Principal** | `admin` | `admin123` | `/principal` |
| **Faculty** | `faculty` | `faculty123` | `/faculty` |
| **Assistant** | `assistant` | `asst123` | `/assistant` |
| **Student / Parent** | `student` | `student123` | `/student` |

> 💡 **Quick Login:** The `/login` page includes **1-click quick login cards** for each role for instant testing without manual typing.

---

## 📁 Architecture & File Structure

```
frontend/
├── index.html                 # Entry HTML with Google Fonts (Space Grotesk, Manrope, IBM Plex Mono)
├── package.json               # React 18, React Router v6, Chart.js, react-chartjs-2, lucide-react, Vite
├── vite.config.js             # Vite configuration (port 5173)
├── public/                    # Static assets (images, profile pictures)
└── src/
    ├── main.jsx               # React entry point
    ├── App.jsx                # Router definition with all 30+ role routes & ProtectedRoute guards
    ├── index.css              # Master styling importing CSS design system tokens
    ├── context/
    │   ├── AuthContext.jsx    # User session, login, logout, role check, localStorage persistence
    │   └── DataContext.jsx    # Central reactive state for all 4 roles (Students, Faculty, LTs, Exams, Notices)
    ├── layouts/
    │   └── DashboardLayout.jsx# Responsive sidebar + topbar layout with dynamic titles
    ├── components/
    │   └── common/
    │       ├── Sidebar.jsx    # Role-aware sidebar with active state highlights & mobile toggle
    │       ├── Topbar.jsx     # Header with page title/subtitle, school branding, user avatar
    │       └── ProtectedRoute.jsx # Route authentication & role authorization guard
    ├── pages/
    │   ├── Login.jsx          # Dark-indigo login screen with credentials & 1-click test cards
    │   ├── principal/         # 12 Principal pages (Home, Students, Faculty, Exams, LTs, Syllabus, Reports, Discipline, Notices, Profile)
    │   ├── faculty/           # 6 Faculty pages (Home, Set LT, Exam Unit, Syllabus Checklist, Notices, Profile)
    │   ├── assistant/         # 11 Assistant pages (Home, LT Live Timer & Marks, Exam Marks Entry & View, Results, Hall Tickets, Notices, Discipline)
    │   └── student/           # 8 Student pages (Home, LT Analysis, Progress Reports, Exam Results, Results, Hall Tickets, Notices, Discipline)
    └── styles/                # Faithful extraction of the original EJS CSS design system
```

---

## 🎨 Theme & Design System

- **Colors:**
  - Canvas: `#F6F7FB`
  - Brand Indigo: `#3B4FE0`
  - Emerald Green: `#2F8F5B`
  - Amber / Warning: `#D99A2B`
  - Ruby / Danger: `#E0473D`
- **Typography:**
  - Headings: `Space Grotesk`
  - Body: `Manrope`
  - Numbers / Data: `IBM Plex Mono`
- **Charts:** Implemented with `Chart.js` & `react-chartjs-2` with the exact same color palettes, scales, and custom tick formatters as the EJS original.

