import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePwaInstall } from '../hooks/usePwaInstall';
import PwaInstallModal from '../components/common/PwaInstallModal';
import { School, Download, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
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

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setError('Please enter your email address or employee code.');
      return;
    }
    if (!trimmedPass) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(trimmedUser, trimmedPass);
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
                  : <><School size={13} style={{ marginRight: 4 }} /> Academic Portal</>}
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
                  {canInstall ? <><Download size={13} style={{ marginRight: 4 }} />Install App</> : <><Download size={13} style={{ marginRight: 4 }} />Install Guide</>}
                </button>
              )}
            </div>
          </div>

          <div className="login-title">Staff Sign In</div>
          <div className="login-sub">Sign in with your registered school credentials to access your dashboard</div>

          {error && (
            <div className="login-error-banner" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} id="loginForm" noValidate>
            <div className="form-group">
              <label htmlFor="username">Email Address / Employee Code</label>
              <input
                type="text"
                id="username"
                className="login-input"
                name="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. FAC101 or faculty@ggzv.edu.in"
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="login-input"
                  style={{ paddingRight: '42px' }}
                  name="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your account password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: showPassword ? '#38bdf8' : '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-login" disabled={isSubmitting}>
              {isSubmitting ? 'Authenticating...' : 'Sign In →'}
            </button>
          </form>

          <div className="login-security-notice" style={{ marginTop: '20px', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="#38bdf8" />
            <span>Authorized access only. Session secured with encrypted tokens.</span>
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
