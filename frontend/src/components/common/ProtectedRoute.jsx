import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login?error=Please+log+in+first" replace />;
  }

  const normalizeRole = (r) => {
    if (!r) return '';
    const s = r.toString().toLowerCase();
    if (s.includes('subject') || s === 'faculty') return 'faculty';
    if (s.includes('assist') || s === 'assistant') return 'assistant';
    if (s.includes('principal') || s === 'admin') return 'principal';
    if (s.includes('student')) return 'student';
    return s;
  };

  const userRole = normalizeRole(user.role);
  const targetRole = normalizeRole(role);

  // If user role matches route role, allow directly
  if (!targetRole || userRole === targetRole) {
    return children;
  }

  // Check if faculty/assistant has explicit granted tab access from Principal
  const grantedTabs = Array.isArray(user.permissions?.accessibleTabs)
    ? user.permissions.accessibleTabs
    : [];

  const currentPath = location.pathname.replace(/\/$/, '');
  const hasTabPermission = grantedTabs.some((tab) => {
    if (!tab) return false;
    const cleanTab = tab.replace(/\/$/, '');
    return currentPath === cleanTab || currentPath.startsWith(cleanTab + '/');
  });

  if (hasTabPermission) {
    return children;
  }

  return <Navigate to={user.redirect || `/${userRole}`} replace />;
}
