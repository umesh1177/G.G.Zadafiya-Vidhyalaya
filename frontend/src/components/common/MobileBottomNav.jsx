import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  GraduationCap,
  Users,
  BookOpen,
  Clock,
  Award,
  FileText,
  FileSpreadsheet,
  Ticket,
  BarChart2,
  TrendingUp,
  User,
  LayoutGrid,
  X,
  ChevronRight,
} from 'lucide-react';

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const role = user?.role || 'faculty';

  // Role Navigation Configuration
  const roleConfig = {
    principal: {
      title: 'Principal Services',
      primary: [
        { to: '/principal', label: 'Home', icon: Home, end: true },
        { to: '/principal/student-management', label: 'Students', icon: GraduationCap },
        { to: '/principal/faculty-management', label: 'Faculty', icon: Users },
        { to: '/principal/exam-analysis', label: 'Exam Analysis', icon: BarChart2 },
      ],
      moreGrid: [
        {
          to: '/principal/lt-analysis',
          label: 'LT Analysis',
          subtitle: 'Lecture test analytics & reports',
          icon: Clock,
          color: '#0284C7',
          bg: '#E0F2FE',
        },
        {
          to: '/principal/syllabus-tracking',
          label: 'Syllabus',
          subtitle: 'Curriculum & topic progress',
          icon: BookOpen,
          color: '#D97706',
          bg: '#FEF3C7',
        },
        {
          to: '/principal/progress-report',
          label: 'Progress Report',
          subtitle: 'Student academic growth dossiers',
          icon: TrendingUp,
          color: '#7C3AED',
          bg: '#EDE9FE',
        },
        {
          to: '/principal/discipline-remark',
          label: 'Discipline',
          subtitle: 'Conduct records & remarks',
          icon: Award,
          color: '#DC2626',
          bg: '#FEE2E2',
        },
        {
          to: '/principal/notice-message',
          label: 'Notice Message',
          subtitle: 'School circulars & notifications',
          icon: FileText,
          color: '#059669',
          bg: '#D1FAE5',
        },
      ],
      moreList: [
        {
          to: '/principal/profile',
          label: 'My Profile',
          subtitle: 'Account coordinates, credentials & security',
          icon: User,
          color: '#123B5D',
          bg: '#F1F5F9',
        },
      ],
    },
    faculty: {
      title: 'Faculty Services',
      primary: [
        { to: '/faculty', label: 'Home', icon: Home, end: true },
        { to: '/faculty/set-lt', label: 'Set LT', icon: Clock },
        { to: '/faculty/exam-unit', label: 'Exam Unit', icon: Award },
        { to: '/faculty/syllabus', label: 'Syllabus', icon: BookOpen },
      ],
      moreGrid: [
        {
          to: '/faculty/reports',
          label: 'Reports',
          subtitle: 'Diagnostic evaluation & reviews',
          icon: FileText,
          color: '#0284C7',
          bg: '#E0F2FE',
        },
        {
          to: '/faculty/notice',
          label: 'Notice Message',
          subtitle: 'School announcements & circulars',
          icon: FileSpreadsheet,
          color: '#059669',
          bg: '#D1FAE5',
        },
      ],
      moreList: [
        {
          to: '/faculty/profile',
          label: 'My Profile',
          subtitle: 'Faculty credentials, subjects & lab stream',
          icon: User,
          color: '#123B5D',
          bg: '#F1F5F9',
        },
      ],
    },
    assistant: {
      title: 'Assistant Services',
      primary: [
        { to: '/assistant', label: 'Home', icon: Home, end: true },
        { to: '/assistant/lt', label: 'LT & Timer', icon: Clock },
        { to: '/assistant/exam', label: 'Exam Unit', icon: FileSpreadsheet },
        { to: '/assistant/result', label: 'Results', icon: Award },
      ],
      moreGrid: [
        {
          to: '/assistant/cbt-exam',
          label: 'CBT Exam',
          subtitle: 'Computer based tests & extraction',
          icon: FileText,
          color: '#2563EB',
          bg: '#DBEAFE',
        },
        {
          to: '/assistant/hall-ticket',
          label: 'Hall Ticket',
          subtitle: 'Generate & print exam hall tickets',
          icon: Ticket,
          color: '#D97706',
          bg: '#FEF3C7',
        },
        {
          to: '/assistant/notice',
          label: 'Notice Message',
          subtitle: 'Campus announcements & alerts',
          icon: FileSpreadsheet,
          color: '#059669',
          bg: '#D1FAE5',
        },
        {
          to: '/assistant/discipline-remark',
          label: 'Discipline',
          subtitle: 'Conduct remarks & behavior tracking',
          icon: Award,
          color: '#DC2626',
          bg: '#FEE2E2',
        },
      ],
      moreList: [
        {
          to: '/assistant/profile',
          label: 'My Profile',
          subtitle: 'Assistant faculty coordinates & settings',
          icon: User,
          color: '#123B5D',
          bg: '#F1F5F9',
        },
      ],
    },
    student: {
      title: 'Student Services',
      primary: [
        { to: '/student', label: 'Home', icon: Home, end: true },
        { to: '/student/cbt-exam', label: 'CBT Exam', icon: FileText },
        { to: '/student/lt-analysis', label: 'LT Analysis', icon: BarChart2 },
        { to: '/student/exam-result', label: 'Exam Result', icon: Award },
      ],
      moreGrid: [
        {
          to: '/student/progress-report',
          label: 'Progress Report',
          subtitle: 'Academic performance & score charts',
          icon: TrendingUp,
          color: '#7C3AED',
          bg: '#EDE9FE',
        },
        {
          to: '/student/notice-message',
          label: 'Notice Message',
          subtitle: 'School circulars & examination schedule',
          icon: FileText,
          color: '#059669',
          bg: '#D1FAE5',
        },
        {
          to: '/student/discipline-remark',
          label: 'Discipline',
          subtitle: 'Personal discipline observations',
          icon: Award,
          color: '#DC2626',
          bg: '#FEE2E2',
        },
      ],
      moreList: [
        {
          to: '/student/profile',
          label: 'My Profile',
          subtitle: 'Student profile, standard & roll number',
          icon: User,
          color: '#123B5D',
          bg: '#F1F5F9',
        },
      ],
    },
  };

  const currentConfig = roleConfig[role] || roleConfig.faculty;
  const primaryItems = currentConfig.primary || [];
  const moreGridItems = currentConfig.moreGrid || [];
  const moreListItems = currentConfig.moreList || [];
  const allMoreItems = [...moreGridItems, ...moreListItems];

  // Auto-close sheet when route changes
  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  // Lock background scroll when more drawer is open
  useEffect(() => {
    if (isMoreOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMoreOpen]);

  // Check if current route is within the more items
  const isMoreActive = allMoreItems.some((item) => {
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/');
  });

  const handleNavigate = (path) => {
    setIsMoreOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* ── Fixed Mobile Bottom Nav Bar ── */}
      <nav className="mobile-bottom-nav" aria-label="Mobile quick-access navigation">
        {/* First 4 Primary NavLinks */}
        {primaryItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `mobile-bottom-nav__item ${isActive ? 'is-active' : ''}`
              }
            >
              <div className="mobile-bottom-nav__icon-wrap">
                <IconComponent size={20} strokeWidth={2.2} />
              </div>
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </NavLink>
          );
        })}

        {/* 5th Tab: "More" Action Button */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`mobile-bottom-nav__item ${isMoreActive || isMoreOpen ? 'is-active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Open more navigation services"
        >
          <div className="mobile-bottom-nav__icon-wrap">
            <LayoutGrid size={20} strokeWidth={2.2} />
          </div>
          <span className="mobile-bottom-nav__label">More</span>
        </button>
      </nav>

      {/* ── Slide-up Bottom Sheet Drawer for "More" (Matching Photo 2) ── */}
      {isMoreOpen && (
        <div
          className="mobile-more-overlay"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="mobile-more-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Pill */}
            <div
              style={{
                width: 42,
                height: 4.5,
                background: '#CBD5E1',
                borderRadius: 999,
                margin: '0 auto 14px',
              }}
            />

            {/* Header Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: '#059669',
                    display: 'inline-block',
                  }}
                />
                <h3
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 800,
                    color: '#123B5D',
                    letterSpacing: '-0.01em',
                  }}
                >
                  More {currentConfig.title || 'Services'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* 2-Column Grid of Remaining Service Cards (Matching Photo 2) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 12,
                marginBottom: 12,
              }}
            >
              {moreGridItems.map((item) => {
                const IconComponent = item.icon;
                const isActive =
                  location.pathname === item.to || location.pathname.startsWith(item.to + '/');

                return (
                  <div
                    key={item.to}
                    onClick={() => handleNavigate(item.to)}
                    className={`mobile-more-card ${isActive ? 'is-active' : ''}`}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: item.bg,
                        color: item.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComponent size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: isActive ? '#123B5D' : '#0F172A',
                          lineHeight: 1.25,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#64748B',
                          marginTop: 3,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full-width List Item(s) at bottom (e.g. My Profile - Matching Photo 2) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {moreListItems.map((item) => {
                const IconComponent = item.icon;
                const isActive =
                  location.pathname === item.to || location.pathname.startsWith(item.to + '/');

                return (
                  <div
                    key={item.to}
                    onClick={() => handleNavigate(item.to)}
                    className={`mobile-more-list-item ${isActive ? 'is-active' : ''}`}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: item.bg,
                        color: item.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconComponent size={20} strokeWidth={2.2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: isActive ? '#123B5D' : '#0F172A',
                        }}
                      >
                        {item.label}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                        {item.subtitle}
                      </div>
                    </div>
                    <ChevronRight size={16} color="#94A3B8" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
