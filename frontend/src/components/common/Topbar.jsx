import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import PwaInstallModal from './PwaInstallModal';

export default function Topbar({ title, subtitle, onOpenSidebar }) {
  const { user } = useAuth();
  const {
    canInstall,
    canShowInstallAction,
    isOnline,
    isIos,
    isAndroid,
    swUpdateReady,
    promptInstall,
    applyUpdate,
  } = usePwaInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  const handleInstallClick = async () => {
    if (canInstall) {
      const result = await promptInstall();
      if (result?.outcome === 'unavailable') {
        setShowGuideModal(true);
      }
      return;
    }
    setShowGuideModal(true);
  };

  const roleLabels = {
    principal: 'Principal',
    faculty: `${user?.subject || 'Physics'} Faculty`,
    assistant: 'Assistant Faculty',
    student: 'Student'
  };

  const profilePath = `/${user?.role || 'faculty'}/profile`;

  return (
    <>
      <header className="topbar">
        <div className="topbar__left">
          <button
            className="topbar__menu-btn"
            type="button"
            aria-label="Open menu"
            onClick={onOpenSidebar}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <div className="topbar__titles">
            <div className="topbar__title">{title}</div>
            {subtitle && <div className="topbar__subtitle">{subtitle}</div>}
          </div>
        </div>
        <div className="topbar__right">
          {!isOnline && (
            <span className="pwa-offline-pill" title="Working offline from cached app shell">
              Offline
            </span>
          )}
          {swUpdateReady && (
            <button
              type="button"
              className="btn btn-ghost btn-sm pwa-update-btn"
              onClick={applyUpdate}
              title="A new version of GGZV Portal is ready. Click to update."
            >
              ↻ Update App
            </button>
          )}
          {canShowInstallAction && (
            <button
              type="button"
              className="btn btn-ghost btn-sm pwa-install-btn"
              onClick={handleInstallClick}
              title={canInstall ? 'Install G.G. Zadafiya Vidhyalaya Portal App' : 'How to install GGZV Portal App'}
            >
              {canInstall ? '⬇ Install App' : '⬇ Get App'}
            </button>
          )}
          <span className="topbar__school-name" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--slate)' }}>
            {user?.school || 'G.G. Zadafiya Vidhyalaya'}
          </span>
          <Link to={profilePath} className="topbar__user-chip" style={{ textDecoration: 'none', cursor: 'pointer' }} title="View Profile">
            <div className="topbar__avatar">
              {user?.initials || 'ST'}
            </div>
            <div className="topbar__user-info" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)' }}>{user?.name || 'Faculty'}</span>
              <span style={{ fontSize: '11px', color: 'var(--slate)' }}>{roleLabels[user?.role] || 'User'}</span>
            </div>
          </Link>
        </div>
      </header>
      <PwaInstallModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isIos={isIos}
        isAndroid={isAndroid}
      />
    </>
  );
}
