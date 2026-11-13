import React from 'react';
import { Download, Share, MoreVertical, Monitor, X, CheckCircle2 } from 'lucide-react';

export default function PwaInstallModal({ isOpen, onClose, isIos, isAndroid }) {
  if (!isOpen) return null;

  return (
    <div
      className="pwa-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pwa-modal-box">
        <div className="pwa-modal-head">
          <div>
            <h3 id="pwa-install-modal-title" className="pwa-modal-title">
              <Download size={18} color="#123B5D" />
              Install G.G. Zadafiya Vidhyalaya App
            </h3>
            <p className="pwa-modal-sub">
              Add the Academic Portal to your home screen or desktop for standalone app access.
            </p>
          </div>
          <button
            type="button"
            className="pwa-modal-close"
            onClick={onClose}
            aria-label="Close install instructions"
          >
            <X size={16} />
          </button>
        </div>

        <div className="pwa-guide-box">
          {isIos ? (
            <>
              <div className="pwa-guide-step">
                <span className="pwa-step-num">1</span>
                <span>
                  Tap the <strong>Share</strong> icon{' '}
                  <Share size={14} style={{ verticalAlign: 'text-bottom', color: '#123B5D' }} /> in Safari&apos;s toolbar.
                </span>
              </div>
              <div className="pwa-guide-step">
                <span className="pwa-step-num">2</span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </div>
              <div className="pwa-guide-step">
                <span className="pwa-step-num">3</span>
                <span>
                  Tap <strong>Add</strong> in the top-right corner to launch as a standalone app.
                </span>
              </div>
            </>
          ) : isAndroid ? (
            <>
              <div className="pwa-guide-step">
                <span className="pwa-step-num">1</span>
                <span>
                  Tap the browser menu{' '}
                  <MoreVertical size={14} style={{ verticalAlign: 'text-bottom', color: '#123B5D' }} /> in the top-right corner of Chrome.
                </span>
              </div>
              <div className="pwa-guide-step">
                <span className="pwa-step-num">2</span>
                <span>
                  Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </span>
              </div>
              <div className="pwa-guide-step">
                <span className="pwa-step-num">3</span>
                <span>
                  Confirm <strong>Install</strong> to add GGZV Portal directly to your phone.
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="pwa-guide-step">
                <span className="pwa-step-num">1</span>
                <span>
                  In Chrome or Edge, look for the{' '}
                  <Monitor size={14} style={{ verticalAlign: 'text-bottom', color: '#123B5D' }} />{' '}
                  <strong>Install</strong> icon on the right side of the address bar.
                </span>
              </div>
              <div className="pwa-guide-step">
                <span className="pwa-step-num">2</span>
                <span>
                  Or open the browser menu (<MoreVertical size={13} style={{ verticalAlign: 'text-bottom' }} />) and choose{' '}
                  <strong>Cast, save, and share → Install page as app</strong>.
                </span>
              </div>
              <div className="pwa-guide-step">
                <span className="pwa-step-num">3</span>
                <span>
                  Once installed, GGZV Portal opens in its own dedicated app window.
                </span>
              </div>
            </>
          )}
        </div>

        <div className="pwa-guide-note">
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>Runs in standalone full-screen mode with offline app shell caching.</span>
        </div>

        <div className="pwa-modal-foot">
          <button type="button" className="pwa-modal-ok-btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
