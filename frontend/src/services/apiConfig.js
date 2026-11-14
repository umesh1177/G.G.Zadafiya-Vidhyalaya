/**
 * Dynamic API Base URL Resolution & Authenticated Fetch Helper
 * - Localhost dev: http://localhost:5000
 * - Production: same-origin relative URLs ('')
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

/**
 * Retrieve active auth token from client storage
 */
export const getAuthToken = () => {
  try {
    return localStorage.getItem('sms_auth_token') || '';
  } catch {
    return '';
  }
};

/**
 * Wrapper around window.fetch that automatically attaches the
 * Bearer token for authorized requests
 */
export const authFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization') && !headers.has('authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
};
