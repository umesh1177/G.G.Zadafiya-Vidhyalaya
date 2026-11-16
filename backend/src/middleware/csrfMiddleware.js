/**
 * G.G. Zadafiya Vidhyalaya - CSRF (Cross-Site Request Forgery) Protection Middleware
 *
 * Implements the Synchronizer Token Pattern (STP) with Double Submit Cookie synchronization:
 * 1. Generates a cryptographically secure random token (32 bytes hex) stored in the session.
 * 2. Mirrors the token into an 'XSRF-TOKEN' cookie readable by the frontend client.
 * 3. Enforces that all state-changing HTTP methods (POST, PUT, PATCH, DELETE) provide
 *    the matching token via the 'X-CSRF-Token' or 'X-XSRF-Token' request header.
 * 4. Exempts public authentication handshake endpoints like login.
 */

const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Generate a cryptographically secure token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Constant-time string equality check
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Middleware: Enforce CSRF token validation on state-changing requests
 */
function csrfProtection(req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';

  // Ensure session exists
  if (!req.session) {
    return next();
  }

  // Initialize CSRF token in session if not present
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }

  // Mirror token to client-readable cookie so frontend fetch wrappers can read it
  res.cookie('XSRF-TOKEN', req.session.csrfToken, {
    httpOnly: false, // Frontend JS needs to read this cookie
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });

  // Safe HTTP read methods do not modify state
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Exempt public login endpoint from CSRF check (session is initialized/regenerated upon login)
  if (req.originalUrl === '/api/auth/login' || req.path === '/login') {
    return next();
  }

  // State-changing requests (POST, PUT, PATCH, DELETE):
  const submittedToken =
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'] ||
    (req.body && req.body._csrf);

  if (!submittedToken || !safeEqual(submittedToken, req.session.csrfToken)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token. Request rejected for security.',
    });
  }

  next();
}

/**
 * Controller endpoint: GET /api/auth/csrf-token
 * Allows frontend to explicitly fetch a fresh CSRF token
 */
function getCsrfToken(req, res) {
  if (!req.session) {
    return res.status(500).json({ success: false, message: 'Session unavailable.' });
  }
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('XSRF-TOKEN', req.session.csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
  return res.json({
    success: true,
    csrfToken: req.session.csrfToken,
  });
}

module.exports = {
  csrfProtection,
  getCsrfToken,
};
