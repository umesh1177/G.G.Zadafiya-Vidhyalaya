/**
 * Dynamic API Base URL Resolution
 * - Localhost dev: http://localhost:5000
 * - Production (Render / Cloud / Custom Domain): same-origin relative URLs ('')
 */
export const getApiBaseUrl = () => {
  if (import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return '';
    }
  }
  return 'http://localhost:5000';
};

export const API_ROOT = getApiBaseUrl();

