import { useState, useEffect, useCallback } from 'react';

const listeners = new Set();

function checkIsStandalone() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.matchMedia?.('(display-mode: window-controls-overlay)')?.matches ||
      window.navigator?.standalone === true
  );
}

function detectPlatform() {
  if (typeof navigator === 'undefined') {
    return { isIos: false, isAndroid: false };
  }
  const ua = navigator.userAgent || '';
  const isIos =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
  const isAndroid = /Android/i.test(ua);
  return { isIos, isAndroid };
}

const pwaStore = {
  deferredPrompt: null,
  isInstalled: checkIsStandalone(),
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
  swReady: false,
  swUpdateReady: false,
  waitingWorker: null,
  ...detectPlatform(),
};

function notifyListeners() {
  const snapshot = { ...pwaStore };
  listeners.forEach((fn) => fn(snapshot));
}

let initialized = false;
let refreshingForUpdate = false;

export function initPwaRuntime() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pwaStore.deferredPrompt = e;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    pwaStore.isInstalled = true;
    pwaStore.deferredPrompt = null;
    notifyListeners();
  });

  window.addEventListener('online', () => {
    pwaStore.isOnline = true;
    notifyListeners();
  });

  window.addEventListener('offline', () => {
    pwaStore.isOnline = false;
    notifyListeners();
  });

  const mql = window.matchMedia?.('(display-mode: standalone)');
  mql?.addEventListener?.('change', (ev) => {
    if (ev.matches) {
      pwaStore.isInstalled = true;
      pwaStore.deferredPrompt = null;
      notifyListeners();
    }
  });

  const isSecureContextForSw =
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if ('serviceWorker' in navigator && isSecureContextForSw) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshingForUpdate) return;
      refreshingForUpdate = true;
      window.location.reload();
    });

    const registerSw = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        pwaStore.swReady = true;

        if (reg.waiting && navigator.serviceWorker.controller) {
          pwaStore.waitingWorker = reg.waiting;
          pwaStore.swUpdateReady = true;
          notifyListeners();
        }

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              pwaStore.waitingWorker = reg.waiting || installing;
              pwaStore.swUpdateReady = true;
              notifyListeners();
            }
          });
        });

        notifyListeners();
      } catch (err) {
        console.warn('Service Worker registration skipped:', err?.message || err);
      }
    };

    if (document.readyState === 'complete') {
      registerSw();
    } else {
      window.addEventListener('load', registerSw, { once: true });
    }
  }
}

initPwaRuntime();

export function usePwaInstall() {
  const [state, setState] = useState(() => ({ ...pwaStore }));

  useEffect(() => {
    initPwaRuntime();
    const handler = (next) => setState(next);
    listeners.add(handler);
    setState({ ...pwaStore });
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!pwaStore.deferredPrompt) {
      return { outcome: 'unavailable' };
    }
    try {
      pwaStore.deferredPrompt.prompt();
      const choiceResult = await pwaStore.deferredPrompt.userChoice;
      if (choiceResult?.outcome === 'accepted') {
        pwaStore.isInstalled = true;
      }
      pwaStore.deferredPrompt = null;
      notifyListeners();
      return choiceResult || { outcome: 'dismissed' };
    } catch {
      return { outcome: 'error' };
    }
  }, []);

  const applyUpdate = useCallback(() => {
    if (pwaStore.waitingWorker) {
      pwaStore.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }, []);

  return {
    canInstall: Boolean(state.deferredPrompt) && !state.isInstalled,
    canShowInstallAction: !state.isInstalled,
    isInstalled: state.isInstalled,
    isOnline: state.isOnline,
    isIos: state.isIos,
    isAndroid: state.isAndroid,
    swReady: state.swReady,
    swUpdateReady: state.swUpdateReady,
    promptInstall,
    applyUpdate,
  };
}

export default usePwaInstall;
