import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'

// Login
import Login from './pages/Login'

// Principal pages
import PrincipalHome from './pages/principal/Home'
import StudentManagement from './pages/principal/StudentManagement'
import FacultyManagement from './pages/principal/FacultyManagement'
import ExamAnalysis from './pages/principal/ExamAnalysis'
import ExamAnalysisDetail from './pages/principal/ExamAnalysisDetail'
import LtAnalysis from './pages/principal/LtAnalysis'
import LtAnalysisDetail from './pages/principal/LtAnalysisDetail'
import SyllabusTracking from './pages/principal/SyllabusTracking'
import ProgressReport from './pages/principal/ProgressReport'
import DisciplineRemark from './pages/principal/DisciplineRemark'
import NoticeMessage from './pages/principal/NoticeMessage'
import PrincipalProfile from './pages/principal/Profile'

// Faculty pages
import FacultyHome from './pages/faculty/Home'
import SetLt from './pages/faculty/SetLt'
import ExamUnit from './pages/faculty/ExamUnit'
import FacultySyllabus from './pages/faculty/Syllabus'
import FacultyReports from './pages/faculty/Reports'
import FacultyNotice from './pages/faculty/Notice'
import FacultyProfile from './pages/faculty/Profile'

// Assistant pages
import AssistantHome from './pages/assistant/Home'
import AssistantLt from './pages/assistant/Lt'
import LtHistoryDetail from './pages/assistant/LtHistoryDetail'
import LtEnterMarks from './pages/assistant/LtEnterMarks'
import AssistantExam from './pages/assistant/Exam'
import AssistantCbtExam from './pages/assistant/CbtExam'
import ExamEnterMarks from './pages/assistant/ExamEnterMarks'
import ExamViewMarks from './pages/assistant/ExamViewMarks'
import AssistantResult from './pages/assistant/Result'
import HallTicket from './pages/assistant/HallTicket'
import AssistantNotice from './pages/assistant/Notice'
import AssistantDiscipline from './pages/assistant/DisciplineRemark'
import AssistantProfile from './pages/assistant/Profile'

// Student pages
import StudentHome from './pages/student/Home'
import StudentCbtExam from './pages/student/CbtExam'
import StudentLtAnalysis from './pages/student/LtAnalysis'
import StudentProgressReport from './pages/student/ProgressReport'
import StudentExamResult from './pages/student/ExamResult'
import StudentResult from './pages/student/Result'
import StudentHallTicket from './pages/student/HallTicket'
import StudentNoticeMessage from './pages/student/NoticeMessage'
import StudentDisciplineRemark from './pages/student/DisciplineRemark'
import StudentProfile from './pages/student/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Principal Routes */}
            <Route
              path="/principal"
              element={
                <ProtectedRoute role="principal">
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PrincipalHome />} />
              <Route path="student-management" element={<StudentManagement />} />
              <Route path="faculty-management" element={<FacultyManagement />} />
              <Route path="faculty-management/new" element={<FacultyManagement defaultTab="add-faculty" />} />
              <Route path="exam-analysis" element={<ExamAnalysis />} />
              <Route path="exam-analysis/:id" element={<ExamAnalysisDetail />} />
              <Route path="lt-analysis" element={<LtAnalysis />} />
              <Route path="lt-analysis/:id" element={<LtAnalysisDetail />} />
              <Route path="syllabus-tracking" element={<SyllabusTracking />} />
              <Route path="progress-report" element={<ProgressReport />} />
              <Route path="discipline-remark" element={<DisciplineRemark />} />
              <Route path="notice-message" element={<NoticeMessage />} />
              <Route path="profile" element={<PrincipalProfile />} />
            </Route>

            {/* Faculty Routes */}
            <Route
              path="/faculty"
              element={
                <ProtectedRoute role="faculty">
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<FacultyHome />} />
              <Route path="set-lt" element={<SetLt />} />
              <Route path="exam-unit" element={<ExamUnit />} />
              <Route path="syllabus" element={<FacultySyllabus />} />
              <Route path="reports" element={<FacultyReports />} />
              <Route path="notice" element={<FacultyNotice />} />
              <Route path="profile" element={<FacultyProfile />} />
            </Route>

            {/* Assistant Routes */}
            <Route
              path="/assistant"
              element={
                <ProtectedRoute role="assistant">
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AssistantHome />} />
              <Route path="lt" element={<AssistantLt />} />
              <Route path="lt/history/:id" element={<LtHistoryDetail />} />
              <Route path="lt/enter-marks/:id" element={<LtEnterMarks />} />
              <Route path="cbt-exam" element={<AssistantCbtExam />} />
              <Route path="exam" element={<AssistantExam />} />
              <Route path="exam/enter-marks/:id" element={<ExamEnterMarks />} />
              <Route path="exam/view-marks/:id" element={<ExamViewMarks />} />
              <Route path="result" element={<AssistantResult />} />
              <Route path="hall-ticket" element={<HallTicket />} />
              <Route path="notice" element={<AssistantNotice />} />
              <Route path="discipline-remark" element={<AssistantDiscipline />} />
              <Route path="profile" element={<AssistantProfile />} />
            </Route>

            {/* Student Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute role="student">
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentHome />} />
              <Route path="cbt-exam" element={<StudentCbtExam />} />
              <Route path="lt-analysis" element={<StudentLtAnalysis />} />
              <Route path="progress-report" element={<StudentProgressReport />} />
              <Route path="exam-result" element={<StudentExamResult />} />
              <Route path="result" element={<StudentResult />} />
              <Route path="hall-ticket" element={<StudentHallTicket />} />
              <Route path="notice-message" element={<StudentNoticeMessage />} />
              <Route path="discipline-remark" element={<StudentDisciplineRemark />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

