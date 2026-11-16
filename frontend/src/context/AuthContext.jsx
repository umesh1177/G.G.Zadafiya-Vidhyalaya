import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_ROOT, authFetch, setCsrfToken } from '../services/apiConfig';

const AuthContext = createContext(null);

const SCHOOL_NAME = 'G.G. Zadafiya Vidhyalaya';

function normalizeUserData(raw) {
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
  // Never treat cached user objects as proof of authentication.
  // Initial state is null until backend verifies the active server-side session.
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate active session with backend via /api/auth/me on app load
  useEffect(() => {
    let isMounted = true;

    // Purge legacy client-side tokens from localStorage
    try {
      localStorage.removeItem('sms_auth_token');
      localStorage.removeItem('sms_auth_user');
    } catch (e) {
      // Ignore storage errors
    }

    const verifySession = async () => {
      try {
        const res = await authFetch(`${API_ROOT}/api/auth/me`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user && isMounted) {
            if (data.csrfToken) setCsrfToken(data.csrfToken);
            const normalized = normalizeUserData(data.user);
            setUser(normalized);
          } else if (isMounted) {
            setUser(null);
          }
        } else {
          // 401 or other status -> not authenticated
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('Session verification error:', err.message);
        if (isMounted) setUser(null);
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
    // Do not trim password to preserve exact user input
    const rawPass = typeof password === 'string' ? password : '';

    if (!trimmedId || !rawPass) {
      return { success: false, error: 'Please enter both username/email/employee code and password.' };
    }

    try {
      const res = await fetch(`${API_ROOT}/api/auth/login`, {
        method: 'POST',
        credentials: 'include', // Send and receive session cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedId, password: rawPass }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user) {
        if (data.csrfToken) setCsrfToken(data.csrfToken);
        const normalized = normalizeUserData(data.user);
        setUser(normalized);
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
      return { ...prev, ...updatedFields };
    });
  }, []);

  const logout = async () => {
    try {
      await authFetch(`${API_ROOT}/api/auth/logout`, { method: 'POST' }).catch(() => {});
    } finally {
      setUser(null);
      try {
        localStorage.removeItem('sms_auth_user');
        localStorage.removeItem('sms_auth_token');
      } catch (e) {
        // Ignore
      }
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
