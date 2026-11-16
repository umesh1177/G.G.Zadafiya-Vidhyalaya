/**
 * G.G. Zadafiya Vidhyalaya - API Configuration & Secure Authenticated Fetch Helper
 * - Uses server-side session authentication with HTTP-only cookies (credentials: 'include').
 * - Implements automated CSRF token attachment (X-CSRF-Token) for all state-changing requests.
 * - Resolves API base URL dynamically between local development and production.
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

// In-memory CSRF token cache
let memoryCsrfToken = '';

export const setCsrfToken = (token) => {
  if (token && typeof token === 'string') {
    memoryCsrfToken = token;
  }
};

/**
 * Retrieve CSRF token from document.cookie (XSRF-TOKEN cookie)
 */
export const getCsrfToken = () => {
  if (memoryCsrfToken) return memoryCsrfToken;
  if (typeof document === 'undefined') return '';

  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return '';
};

/**
 * Wrapper around window.fetch for secure session-based requests:
 * 1. Always includes session cookies (credentials: 'include').
 * 2. Automatically attaches CSRF token on POST, PUT, PATCH, DELETE.
 */
export const authFetch = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  // Attach CSRF protection header for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf && !headers.has('X-CSRF-Token') && !headers.has('x-csrf-token')) {
      headers.set('X-CSRF-Token', csrf);
    }
  }

  return fetch(url, {
    credentials: 'include', // Send and receive session cookies
    ...options,
    headers,
  });
};
