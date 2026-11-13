import React, { createContext, useContext, useState } from 'react';

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

export const CREDENTIALS = {
  admin: {
    password: 'admin123',
    role: 'principal',
    name: 'Principal',
    email: 'principal@ggzv.edu.in',
    school: SCHOOL_NAME,
    initials: 'PR',
    redirect: '/principal',
  },
  faculty: {
    id: 'FAC101',
    empCode: 'FAC101',
    password: 'faculty123',
    role: 'faculty',
    name: 'Pal Umesh',
    email: 'umesh.pal@ggzv.edu.in',
    subject: 'Physics',
    qualification: 'M.Sc. Physics (Gold Medalist), B.Ed.',
    experience: '8 Years',
    contactNo: '+91 98765 43210',
    school: SCHOOL_NAME,
    initials: 'PU',
    redirect: '/faculty',
  },
  chemboard: {
    id: 'FAC102',
    empCode: 'FAC102',
    password: 'faculty123',
    role: 'faculty',
    name: 'Dr. Nisha R. Rao',
    email: 'nisha.rao@ggzv.edu.in',
    subject: 'Chemistry (Board)',
    qualification: 'Ph.D. Organic Chemistry',
    experience: '7 Years',
    contactNo: '+91 99887 11002',
    school: SCHOOL_NAME,
    initials: 'NR',
    redirect: '/faculty',
  },
  chemjee: {
    id: 'FAC108',
    empCode: 'FAC108',
    password: 'faculty123',
    role: 'faculty',
    name: 'Prof. Harsh D. Patel',
    email: 'harsh.patel@ggzv.edu.in',
    subject: 'Chemistry (JEE)',
    qualification: 'M.Tech. Chemical, B.Ed.',
    experience: '6 Years',
    contactNo: '+91 99887 11008',
    school: SCHOOL_NAME,
    initials: 'HP',
    redirect: '/faculty',
  },
  maths: {
    id: 'FAC103',
    empCode: 'FAC103',
    password: 'faculty123',
    role: 'faculty',
    name: 'Prof. Ketan M. Joshi',
    email: 'ketan.j@ggzv.edu.in',
    subject: 'Mathematics',
    qualification: 'M.Sc. Mathematics, B.Ed.',
    experience: '9 Years',
    contactNo: '+91 99887 11003',
    school: SCHOOL_NAME,
    initials: 'KJ',
    redirect: '/faculty',
  },
  fac103: {
    id: 'FAC103',
    empCode: 'FAC103',
    password: 'faculty123',
    role: 'faculty',
    name: 'Prof. Ketan M. Joshi',
    email: 'ketan.j@ggzv.edu.in',
    subject: 'Mathematics',
    qualification: 'M.Sc. Mathematics, B.Ed.',
    experience: '9 Years',
    contactNo: '+91 99887 11003',
    school: SCHOOL_NAME,
    initials: 'KJ',
    redirect: '/faculty',
  },
  biology: {
    id: 'FAC104',
    empCode: 'FAC104',
    password: 'faculty123',
    role: 'faculty',
    name: 'Dr. Heena S. Patel',
    email: 'heena.p@ggzv.edu.in',
    subject: 'Biology',
    qualification: 'Ph.D. Life Sciences, B.Ed.',
    experience: '10 Years',
    contactNo: '+91 99887 11004',
    school: SCHOOL_NAME,
    initials: 'HP',
    redirect: '/faculty',
  },
  fac104: {
    id: 'FAC104',
    empCode: 'FAC104',
    password: 'faculty123',
    role: 'faculty',
    name: 'Dr. Heena S. Patel',
    email: 'heena.p@ggzv.edu.in',
    subject: 'Biology',
    qualification: 'Ph.D. Life Sciences, B.Ed.',
    experience: '10 Years',
    contactNo: '+91 99887 11004',
    school: SCHOOL_NAME,
    initials: 'HP',
    redirect: '/faculty',
  },
  assistant: {
    id: 'FAC105',
    empCode: 'FAC105',
    password: 'asst123',
    role: 'assistant',
    name: 'Rajiv Mehta',
    email: 'rajiv.mehta@ggzv.edu.in',
    subject: 'Lab — Physics/Chemistry',
    qualification: 'B.Sc. Chemistry, DMLT',
    experience: '5 Years',
    contactNo: '+91 98222 33445',
    school: SCHOOL_NAME,
    initials: 'RM',
    redirect: '/assistant',
  },
  student: {
    password: 'student123',
    role: 'student',
    name: 'Umesh Pal',
    email: 'umesh.student@ggzv.edu.in',
    standard: 'STD_11',
    division: 'A',
    streamGroup: 'GROUP_A',
    contactNo: '+91 99000 12345',
    school: SCHOOL_NAME,
    initials: 'UP',
    redirect: '/student',
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sms_auth_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      const normalized = normalizeStoredUser(parsed);
      if (normalized && normalized.school !== parsed?.school) {
        localStorage.setItem('sms_auth_user', JSON.stringify(normalized));
      }
      return normalized;
    } catch {
      return null;
    }
  });

  const login = async (identifier, password) => {
    const trimmedId = (identifier || '').trim();
    const trimmedPass = (password || '').trim();

    if (!trimmedId || !trimmedPass) {
      return { success: false, error: 'Please enter both username/email and password.' };
    }

    // 1. Try Live MongoDB Backend Authentication
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedId, password: trimmedPass }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.user) {
        const u = normalizeStoredUser(data.user);
        setUser(u);
        localStorage.setItem('sms_auth_user', JSON.stringify(u));
        return { success: true, redirect: u.redirect || `/${u.role}` };
      }

      if (res.status === 401 || res.status === 400) {
        return { success: false, error: data.message || 'Invalid credentials' };
      }
    } catch (err) {
      console.warn('Backend auth request unreachable, falling back to local verification:', err.message);
    }

    // 2. Fallback to Local Demo Credentials (key, email, or empCode)
    const key = trimmedId.toLowerCase();
    const matchedEntry =
      CREDENTIALS[key]
        ? [key, CREDENTIALS[key]]
        : Object.entries(CREDENTIALS).find(
            ([, c]) =>
              c.email?.toLowerCase() === key ||
              c.empCode?.toLowerCase() === key
          );
    if (matchedEntry && matchedEntry[1].password === trimmedPass) {
      const [credKey, cred] = matchedEntry;
      const userData = {
        id: cred.id,
        empCode: cred.empCode,
        username: credKey,
        role: cred.role,
        name: cred.name,
        email: cred.email || `${credKey}@ggzv.edu.in`,
        school: cred.school || SCHOOL_NAME,
        initials: cred.initials,
        subject: cred.subject,
        qualification: cred.qualification,
        experience: cred.experience,
        contactNo: cred.contactNo,
        standard: cred.standard,
        division: cred.division,
        streamGroup: cred.streamGroup,
        redirect: cred.redirect,
      };
      setUser(userData);
      localStorage.setItem('sms_auth_user', JSON.stringify(userData));
      return { success: true, redirect: cred.redirect };
    }

    return {
      success: false,
      error: 'Invalid email, employee code, or password. Please verify and try again.'
    };
  };

  const updateUser = (updatedFields) => {
    setUser(prev => {
      const next = { ...prev, ...updatedFields };
      try {
        localStorage.setItem('sms_auth_user', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save updated user in storage', e);
      }
      return next;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sms_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, credentialsList: CREDENTIALS }}>
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
