import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { X, LogOut, ShieldCheck } from 'lucide-react';

const EXTRA_TAB_LOOKUP = [
  { to: '/principal/student-management', label: 'Student Management' },
  { to: '/principal/faculty-management', label: 'Faculty Management' },
  { to: '/principal/manage-access', label: 'Manage Access' },
  { to: '/principal/exam-analysis', label: 'Exam Analysis' },
  { to: '/principal/lt-analysis', label: 'LT Analysis' },
  { to: '/principal/syllabus-tracking', label: 'Syllabus Tracking' },
  { to: '/principal/progress-report', label: 'Progress Report' },
  { to: '/principal/discipline-remark', label: 'Discipline Remark' },
  { to: '/principal/notice-message', label: 'Notice Message' },
  { to: '/assistant/lt', label: 'LT & Timer' },
  { to: '/assistant/cbt-exam', label: 'CBT Exam' },
  { to: '/assistant/exam', label: 'Exam Unit' },
  { to: '/assistant/result', label: 'Result Generation' },
  { to: '/assistant/hall-ticket', label: 'Hall Ticket' },
  { to: '/assistant/notice', label: 'Notice Message' },
  { to: '/assistant/discipline-remark', label: 'Discipline Remark' },
  { to: '/faculty/set-lt', label: 'Set LT' },
  { to: '/faculty/exam-unit', label: 'Exam Unit' },
  { to: '/faculty/syllabus', label: 'Syllabus' },
  { to: '/faculty/reports', label: 'Reports' },
  { to: '/faculty/notice', label: 'Notice Message' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    if (window.confirm('Sign out from G.G. Zadafiya Vidhyalaya Portal?')) {
      logout();
      navigate('/login');
    }
  };

  const role = user?.role || 'faculty';

  const accessibleTabs = Array.isArray(user?.permissions?.accessibleTabs)
    ? user.permissions.accessibleTabs
    : [];

  const extraGrantedTabs = EXTRA_TAB_LOOKUP.filter((item) => {
    if (!accessibleTabs.includes(item.to)) return false;
    if (role === 'faculty' && item.to.startsWith('/faculty')) return false;
    if (role === 'assistant' && item.to.startsWith('/assistant')) return false;
    if (role === 'principal' && item.to.startsWith('/principal')) return false;
    return true;
  });

  const workspaceTitle = {
    principal: 'Principal Workspace',
    faculty: 'Faculty Workspace',
    assistant: 'Assistant Workspace',
    student: 'Student Workspace'
  }[role] || 'Faculty Workspace';

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar__brand">
          <div className="sidebar__logo-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div className="sidebar__title-wrap">
            <div className="sidebar__brand-title" style={{ fontSize: '13.5px', lineHeight: 1.25 }}>G.G. Zadafiya Vidhyalaya</div>
            <div className="sidebar__workspace">{workspaceTitle}</div>
          </div>
          <button className="sidebar__collapse-btn" type="button" onClick={onClose} aria-label="Close navigation menu">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar__nav">
          {/* ==================================================== FACULTY ROLE */}
          {role === 'faculty' && (
            <>
              <NavLink to="/faculty" end className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Home
              </NavLink>

              <div className="sidebar__group-label">Daily Work</div>

              <NavLink to="/faculty/set-lt" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
                Set LT
              </NavLink>

              <NavLink to="/faculty/exam-unit" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                Exam Unit
              </NavLink>

              <NavLink to="/faculty/syllabus" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                Syllabus
              </NavLink>

              <div className="sidebar__group-label">Communication</div>

              <NavLink to="/faculty/reports" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Report
              </NavLink>

              <NavLink to="/faculty/notice" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                Notice Message
              </NavLink>

              <NavLink to="/faculty/profile" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </NavLink>

              {/* Extra Granted Tabs by Principal */}
              {extraGrantedTabs.length > 0 && (
                <>
                  <div className="sidebar__group-label" style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={14} />
                    <span>Granted Access</span>
                  </div>
                  {extraGrantedTabs.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`}
                      onClick={onClose}
                      style={{ borderLeft: '3px solid #10B981', paddingLeft: '11px' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      {item.label}
                    </NavLink>
                  ))}
                </>
              )}
            </>
          )}

          {/* ==================================================== PRINCIPAL ROLE */}
          {role === 'principal' && (
            <>
              <NavLink to="/principal" end className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Home
              </NavLink>

              <div className="sidebar__group-label">Academics</div>

              <NavLink to="/principal/student-management" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M2.8 19c.7-3 3.1-5 6.2-5s5.5 2 6.2 5" />
                  <circle cx="17" cy="8.5" r="2.4" />
                  <path d="M16 13.3c2.3.4 4 2.1 4.6 4.7" />
                </svg>
                Student Management
              </NavLink>

              <NavLink to="/principal/faculty-management" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7.5" r="3.3" />
                  <path d="M5 20c.9-3.6 3.6-6 7-6s6.1 2.4 7 6" />
                  <path d="M17.5 4.5 19 6l2-2" />
                </svg>
                Faculty Management
              </NavLink>

              <NavLink to="/principal/manage-access" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Manage Access
              </NavLink>

              <NavLink to="/principal/exam-analysis" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="2.4" />
                  <path d="M8 14v3M12 10.5V17M16 12.5V17" />
                </svg>
                Exam Analysis
              </NavLink>

              <NavLink to="/principal/lt-analysis" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 3.5h7l3.5 3.5V20a.6.6 0 0 1-.6.6H7a.6.6 0 0 1-.6-.6V4.1A.6.6 0 0 1 7 3.5Z" />
                  <path d="M14 3.5V7h3.5" />
                  <path d="M9 12h6M9 15.3h6M9 8.7h3" />
                </svg>
                LT Analysis
              </NavLink>

              <NavLink to="/principal/syllabus-tracking" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                Syllabus Tracking
              </NavLink>

              <div className="sidebar__group-label">Reporting</div>

              <NavLink to="/principal/progress-report" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19V5M4 19h16" />
                  <path d="m6.5 15 3.5-4 3 2.4L18 8.5" />
                </svg>
                Progress Report
              </NavLink>

              <NavLink to="/principal/discipline-remark" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3.8 4 7.4v5.1c0 4.2 3.3 7.9 8 8.7 4.7-.8 8-4.5 8-8.7V7.4Z" />
                  <path d="M12 8.4v4M12 15.4h.01" />
                </svg>
                Discipline Remark
              </NavLink>

              <div className="sidebar__group-label">Communication</div>

              <NavLink to="/principal/notice-message" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                Notice Message
              </NavLink>

              <NavLink to="/principal/profile" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </NavLink>
            </>
          )}

          {/* ==================================================== ASSISTANT ROLE */}
          {role === 'assistant' && (
            <>
              <NavLink to="/assistant" end className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Home
              </NavLink>

              <div className="sidebar__group-label">Daily Work</div>

              <NavLink to="/assistant/lt" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5V12l3 2" />
                </svg>
                LT & Timer
              </NavLink>

              <NavLink to="/assistant/cbt-exam" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="3" rx="2" />
                  <line x1="8" x2="16" y1="21" y2="21" />
                  <line x1="12" x2="12" y1="17" y2="21" />
                  <path d="m9 10 2 2 4-4" />
                </svg>
                CBT Exam
              </NavLink>

              <NavLink to="/assistant/exam" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="2.4" />
                  <path d="M8 14v3M12 10.5V17M16 12.5V17" />
                </svg>
                Exam Unit
              </NavLink>

              <NavLink to="/assistant/result" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 3.5h7l3.5 3.5V20a.6.6 0 0 1-.6.6H7a.6.6 0 0 1-.6-.6V4.1A.6.6 0 0 1 7 3.5Z" />
                  <path d="M14 3.5V7h3.5" />
                  <path d="M9 12h6M9 15.3h6M9 8.7h3" />
                </svg>
                Result Generation
              </NavLink>

              <NavLink to="/assistant/hall-ticket" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3.5" y="6" width="17" height="12" rx="2" />
                  <path d="M3.5 10.5h17M8 14h3" />
                </svg>
                Hall Ticket
              </NavLink>

              <div className="sidebar__group-label">Communication</div>

              <NavLink to="/assistant/notice" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                Notice Message
              </NavLink>

              <NavLink to="/assistant/discipline-remark" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3.8 4 7.4v5.1c0 4.2 3.3 7.9 8 8.7 4.7-.8 8-4.5 8-8.7V7.4Z" />
                  <path d="M12 8.4v4M12 15.4h.01" />
                </svg>
                Discipline Remark
              </NavLink>

              <NavLink to="/assistant/profile" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </NavLink>

              {/* Extra Granted Tabs by Principal */}
              {extraGrantedTabs.length > 0 && (
                <>
                  <div className="sidebar__group-label" style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={14} />
                    <span>Granted Access</span>
                  </div>
                  {extraGrantedTabs.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`}
                      onClick={onClose}
                      style={{ borderLeft: '3px solid #10B981', paddingLeft: '11px' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      {item.label}
                    </NavLink>
                  ))}
                </>
              )}
            </>
          )}

          {/* ==================================================== STUDENT ROLE */}
          {role === 'student' && (
            <>
              <div className="sidebar__group-label">Examination</div>

              <NavLink to="/student/cbt-exam" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="3" rx="2" />
                  <line x1="8" x2="16" y1="21" y2="21" />
                  <line x1="12" x2="12" y1="17" y2="21" />
                  <path d="m9 10 2 2 4-4" />
                </svg>
                CBT Exam
              </NavLink>

              <div className="sidebar__group-label">Account</div>

              <NavLink to="/student/profile" className={({ isActive }) => `navlink ${isActive ? 'is-active' : ''}`} onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </NavLink>
            </>
          )}
        </nav>

        {/* Bottom Sign Out Area */}
        <div className="sidebar__bottom">
          <button onClick={handleLogout} className="sidebar__signout-btn" type="button">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
