import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePwaInstall } from '../hooks/usePwaInstall';
import PwaInstallModal from '../components/common/PwaInstallModal';
import { School, Download, GraduationCap, BookOpen, FlaskConical, Atom, Ruler, Dna, Microscope, Backpack } from 'lucide-react';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    canInstall,
    canShowInstallAction,
    isInstalled,
    isOnline,
    isIos,
    isAndroid,
    swUpdateReady,
    promptInstall,
    applyUpdate,
  } = usePwaInstall();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(searchParams.get('error') || '');
  const [showInstallModal, setShowInstallModal] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (user && user.redirect) {
      navigate(user.redirect, { replace: true });
    }
  }, [user, navigate]);

  const handleInstallClick = async () => {
    if (canInstall) {
      const result = await promptInstall();
      if (result?.outcome === 'unavailable') {
        setShowInstallModal(true);
      }
      return;
    }
    setShowInstallModal(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await login(username, password);
      if (result.success) {
        navigate(result.redirect, { replace: true });
      } else {
        setError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoUser, demoPass) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setError('');
    setIsSubmitting(true);
    try {
      const result = await login(demoUser, demoPass);
      if (result.success) {
        navigate(result.redirect, { replace: true });
      } else {
        setError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-body-wrapper">
      <div className="bg-orbs" />
      <div className="login-wrap">
        <div className="login-card">
          <div className="brand">
            <div className="brand__logo">GGZ</div>
            <div>
              <div className="brand__name">G.G. Zadafiya Vidhyalaya</div>
              <div className="brand__sub">Std 11–12 • Science Stream • GSEB / JEE / NEET</div>
            </div>
          </div>

          <div className="login-pwa-row">
            <span className={`login-status-pill ${!isOnline ? 'is-offline' : ''}`}>
              {!isOnline
                ? '● Offline Mode'
                : isInstalled
                  ? '✓ App Installed'
                  : <><School size={13} style={{marginRight:4}}/> Academic Portal</>}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {swUpdateReady && (
                <button
                  type="button"
                  className="login-install-btn"
                  onClick={applyUpdate}
                >
                  ↻ Update App
                </button>
              )}
              {canShowInstallAction && (
                <button
                  type="button"
                  className="login-install-btn"
                  onClick={handleInstallClick}
                >
                  {canInstall ? <><Download size={13} style={{marginRight:4}}/>Install App</> : <><Download size={13} style={{marginRight:4}}/>Install Guide</>}
                </button>
              )}
            </div>
          </div>

          <div className="login-title">Welcome back</div>
          <div className="login-sub">Sign in with your school credentials to access your dashboard</div>

          {error && (
            <div className="login-error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} id="loginForm">
            <div className="form-group">
              <label htmlFor="username">Email Address / Employee Code / Username</label>
              <input
                type="text"
                id="username"
                className="login-input"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. faculty@ggzv.edu.in or FAC101 or admin"
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                className="login-input"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="btn-login" disabled={isSubmitting}>
              {isSubmitting ? 'Authenticating...' : 'Sign In →'}
            </button>
          </form>

          <div className="role-hints">
            <div className="role-hints__title">Quick Login — Portal Roles</div>
            <div className="role-grid">
              <button type="button" className="role-card" onClick={() => handleQuickLogin('admin', 'admin123')}>
                <div className="role-card__name"><><GraduationCap size={14} style={{marginRight:4}}/>Principal</></div>
                <div className="role-card__cred"><span>admin</span> / admin123</div>
              </button>
              <button type="button" className="role-card" onClick={() => handleQuickLogin('faculty', 'faculty123')}>
                <div className="role-card__name"><><BookOpen size={14} style={{marginRight:4}}/>Physics Faculty</></div>
                <div className="role-card__cred"><span>FAC101</span> / faculty123</div>
              </button>
              <button type="button" className="role-card" onClick={() => handleQuickLogin('nisha.rao@ggzv.edu.in', 'faculty123')}>
                <div className="role-card__name"><><FlaskConical size={14} style={{marginRight:4}}/>Chem (Board)</></div>
                <div className="role-card__cred"><span>FAC102</span> / faculty123</div>
              </button>
              <button type="button" className="role-card" onClick={() => handleQuickLogin('harsh.patel@ggzv.edu.in', 'faculty123')}>
                <div className="role-card__name"><><Atom size={14} style={{marginRight:4}}/>Chem (JEE)</></div>
                <div className="role-card__cred"><span>FAC108</span> / faculty123</div>
              </button>
              <button type="button" className="role-card" onClick={() => handleQuickLogin('FAC103', 'faculty123')}>
                <div className="role-card__name"><><Ruler size={14} style={{marginRight:4}}/>Maths Faculty</></div>
                <div className="role-card__cred"><span>FAC103</span> / faculty123</div>
              </button>
              <button type="button" className="role-card" onClick={() => handleQuickLogin('FAC104', 'faculty123')}>
                <div className="role-card__name"><><Dna size={14} style={{marginRight:4}}/>Biology Faculty</></div>
                <div className="role-card__cred"><span>FAC104</span> / faculty123</div>
              </button>
              <button type="button" className="role-card" onClick={() => handleQuickLogin('assistant', 'asst123')}>
                <div className="role-card__name"><><Microscope size={14} style={{marginRight:4}}/>Asst. Faculty</></div>
                <div className="role-card__cred"><span>assistant</span> / asst123</div>
              </button>
              <button type="button" className="role-card" onClick={() => handleQuickLogin('student', 'student123')}>
                <div className="role-card__name"><><Backpack size={14} style={{marginRight:4}}/>Student</></div>
                <div className="role-card__cred"><span>student</span> / student123</div>
              </button>
            </div>
          </div>
        </div>
        <div className="login-footer-note">
          G.G. Zadafiya Vidhyalaya • Academic Management &amp; LT Analytics System
        </div>
      </div>
      <PwaInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        isIos={isIos}
        isAndroid={isAndroid}
      />
    </div>
  );
}
