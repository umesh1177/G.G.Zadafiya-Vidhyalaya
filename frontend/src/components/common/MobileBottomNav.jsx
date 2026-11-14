import React from 'react';
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';

export default function MobileBottomNav() {
  const { user } = useAuth();
  const role = user?.role || 'faculty';

  const roleNavItems = {
    principal: [
      { to: '/principal', label: 'Home', icon: Home, end: true },
      { to: '/principal/student-management', label: 'Students', icon: GraduationCap },
      { to: '/principal/faculty-management', label: 'Faculty', icon: Users },
      { to: '/principal/lt-analysis', label: 'LT Analysis', icon: Clock },
      { to: '/principal/syllabus-tracking', label: 'Syllabus', icon: BookOpen },
    ],
    faculty: [
      { to: '/faculty', label: 'Home', icon: Home, end: true },
      { to: '/faculty/set-lt', label: 'Set LT', icon: Clock },
      { to: '/faculty/exam-unit', label: 'Exam Unit', icon: Award },
      { to: '/faculty/syllabus', label: 'Syllabus', icon: BookOpen },
      { to: '/faculty/reports', label: 'Reports', icon: FileText },
    ],
    assistant: [
      { to: '/assistant', label: 'Home', icon: Home, end: true },
      { to: '/assistant/lt', label: 'LT & Timer', icon: Clock },
      { to: '/assistant/exam', label: 'Exam Unit', icon: FileSpreadsheet },
      { to: '/assistant/result', label: 'Results', icon: Award },
      { to: '/assistant/hall-ticket', label: 'Hall Ticket', icon: Ticket },
    ],
    student: [
      { to: '/student', label: 'Home', icon: Home, end: true },
      { to: '/student/lt-analysis', label: 'LT Analysis', icon: BarChart2 },
      { to: '/student/progress-report', label: 'Progress', icon: TrendingUp },
      { to: '/student/exam-result', label: 'Exam Result', icon: Award },
      { to: '/student/profile', label: 'Profile', icon: User },
    ],
  };

  const navItems = roleNavItems[role] || roleNavItems.faculty;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile quick-access navigation">
      {navItems.map((item) => {
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
    </nav>
  );
}

