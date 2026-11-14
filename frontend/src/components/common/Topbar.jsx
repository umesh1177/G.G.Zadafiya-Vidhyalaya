import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import PwaInstallModal from './PwaInstallModal';
import { Menu, RefreshCw, Download } from 'lucide-react';

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
            aria-label="Open navigation menu"
            onClick={onOpenSidebar}
          >
            <Menu size={22} strokeWidth={2.2} />
          </button>
          <div className="topbar__titles">
            <h1 className="topbar__title">{title}</h1>
            {subtitle && <p className="topbar__subtitle">{subtitle}</p>}
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
              <RefreshCw size={14} className="spin-on-hover" />
              <span className="pwa-btn-label">Update App</span>
            </button>
          )}
          {canShowInstallAction && (
            <button
              type="button"
              className="btn btn-ghost btn-sm pwa-install-btn"
              onClick={handleInstallClick}
              title={canInstall ? 'Install G.G. Zadafiya Vidhyalaya Portal App' : 'How to install GGZV Portal App'}
            >
              <Download size={14} />
              <span className="pwa-btn-label">{canInstall ? 'Install App' : 'Get App'}</span>
            </button>
          )}
          <span className="topbar__school-name">
            {user?.school || 'G.G. Zadafiya Vidhyalaya'}
          </span>
          <Link to={profilePath} className="topbar__user-chip" title="View Profile">
            <div className="topbar__avatar">
              {user?.initials || 'ST'}
            </div>
            <div className="topbar__user-info">
              <span className="topbar__user-name">{user?.name || 'Faculty'}</span>
              <span className="topbar__user-role">{roleLabels[user?.role] || 'User'}</span>
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
