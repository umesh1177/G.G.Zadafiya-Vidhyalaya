import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();

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

  if (role && normalizeRole(user.role) !== normalizeRole(role)) {
    return <Navigate to={user.redirect || `/${normalizeRole(user.role)}`} replace />;
  }

  return children;
}

