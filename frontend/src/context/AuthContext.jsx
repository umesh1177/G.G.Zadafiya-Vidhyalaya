import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_ROOT, authFetch } from '../services/apiConfig';

const AuthContext = createContext(null);

const SCHOOL_NAME = 'G.G. Zadafiya Vidhyalaya';

function normalizeStoredUser(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const oldSchool = String(raw.school || '');
  const normalizedSchool =
    !oldSchool || /shree\s+vidya\s+vihar|svvs/i.test(oldSchool)
      ? SCHOOL_NAME
      : oldSchool;
  const oldEmail = String(raw.email || '');
  const normalizedEmail = oldEmail.replace(/@(?:vidyavihar|svvs|svvschool)\.edu\.in$/i, '@ggzv.edu.in');
  return {
    ...raw,
    school: normalizedSchool,
    email: normalizedEmail || raw.email,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sms_auth_user');
      if (!saved) return null;
      return normalizeStoredUser(JSON.parse(saved));
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  // Validate session token with backend on application startup
  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      const token = localStorage.getItem('sms_auth_token');
      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const res = await authFetch(`${API_ROOT}/api/auth/me`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user && isMounted) {
            const normalized = normalizeStoredUser(data.user);
            setUser(normalized);
            localStorage.setItem('sms_auth_user', JSON.stringify(normalized));
          }
        } else if (res.status === 401 || res.status === 403) {
          // Token expired or invalidated
          if (isMounted) {
            setUser(null);
            localStorage.removeItem('sms_auth_user');
            localStorage.removeItem('sms_auth_token');
          }
        }
      } catch (err) {
        // If server is temporarily unreachable, retain local session but do not fabricate data
        console.warn('Session verification ping error:', err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (identifier, password) => {
    const trimmedId = (identifier || '').trim();
    const trimmedPass = (password || '').trim();

    if (!trimmedId || !trimmedPass) {
      return { success: false, error: 'Please enter both username/email/employee code and password.' };
    }

    try {
      const res = await fetch(`${API_ROOT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedId, password: trimmedPass }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user) {
        const normalized = normalizeStoredUser(data.user);
        setUser(normalized);
        if (data.token) {
          localStorage.setItem('sms_auth_token', data.token);
        }
        localStorage.setItem('sms_auth_user', JSON.stringify(normalized));
        return { success: true, redirect: normalized.redirect || `/${normalized.role}` };
      }

      return {
        success: false,
        error: data.message || 'Invalid credentials. Please verify your email / employee code and password.',
      };
    } catch (err) {
      console.error('Login error:', err);
      return {
        success: false,
        error: 'Unable to connect to school server. Please verify backend service is running.',
      };
    }
  };

  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updatedFields };
      try {
        localStorage.setItem('sms_auth_user', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save updated user in storage', e);
      }
      return next;
    });
  }, []);

  const logout = async () => {
    try {
      await authFetch(`${API_ROOT}/api/auth/logout`, { method: 'POST' }).catch(() => {});
    } finally {
      setUser(null);
      localStorage.removeItem('sms_auth_user');
      localStorage.removeItem('sms_auth_token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
