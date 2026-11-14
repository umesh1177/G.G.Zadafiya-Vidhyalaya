/**
 * G.G. Zadafiya Vidhyalaya - Authentication & Role-Based Authorization Middleware
 */

const { verifyAuthToken } = require('../utils/security');
const Faculty = require('../models/Faculty');

function normalizeRole(raw) {
  const r = String(raw || '').toLowerCase().trim();
  if (r.includes('assistant')) return 'assistant';
  if (r.includes('principal')) return 'principal';
  if (r.includes('faculty')) return 'faculty';
  return r;
}

/**
 * Middleware: Verify user authentication token
 * Extracts token from Authorization header (Bearer <token>), x-auth-token header, or query token
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.headers['x-auth-token']) {
      token = String(req.headers['x-auth-token']).trim();
    } else if (req.query && req.query.token) {
      token = String(req.query.token).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in with your credentials.',
      });
    }

    const decoded = verifyAuthToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired or token is invalid. Please log in again.',
      });
    }

    req.user = decoded;
    if (req.user && req.user.role) {
      req.user.role = normalizeRole(req.user.role);
    }
    next();
  } catch (err) {
    console.error('Authentication middleware error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal error verifying authentication credentials.',
    });
  }
}

/**
 * Middleware: Optional authentication (does not reject if unauthenticated, but attaches req.user if present)
 */
function optionalAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.headers['x-auth-token']) {
    token = String(req.headers['x-auth-token']).trim();
  } else if (req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  if (token) {
    const decoded = verifyAuthToken(token);
    if (decoded && decoded.id) {
      req.user = decoded;
      if (req.user && req.user.role) {
        req.user.role = normalizeRole(req.user.role);
      }
    }
  }
  next();
}

/**
 * Middleware factory: Enforce role-based access control (RBAC)
 * @param  {...string} allowedRoles Allowed roles: 'principal', 'faculty', 'assistant'
 */
function requireRole(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase().trim());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access this resource.',
      });
    }

    const userRole = normalizeRole(req.user.role);
    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Requires one of [${allowedRoles.join(', ')}] role.`,
      });
    }

    next();
  };
}

/**
 * Middleware: Enforce faculty subject scope
 * If user is 'faculty', ensure they can only modify content matching their assigned subject
 * Principals are exempt and have full school-wide authority.
 */
function requireSubjectScope(subjectField = 'subject') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userRole = String(req.user.role || '').toLowerCase();
    // Principal has all-access
    if (userRole === 'principal') {
      return next();
    }

    if (userRole === 'faculty') {
      const requestedSubject =
        (req.body && req.body[subjectField]) ||
        (req.query && req.query[subjectField]) ||
        (req.params && req.params[subjectField]);

      const userSubject = String(req.user.subject || '').trim();

      if (requestedSubject && userSubject) {
        // Normalize for comparison (e.g. "Chemistry (Board)" matches "Chemistry" or exact)
        const normReq = String(requestedSubject).toLowerCase().trim();
        const normUser = userSubject.toLowerCase().trim();

        const match =
          normReq === normUser ||
          normUser.includes(normReq) ||
          normReq.includes(normUser);

        if (!match) {
          return res.status(403).json({
            success: false,
            message: `Access denied. You are assigned to subject "${userSubject}" and cannot modify "${requestedSubject}".`,
          });
        }
      }
    }

    next();
  };
}

/**
 * Helper: Check if a user's assigned subject grants authority over a target test subject
 * Handles composite subjects like "Lab — Physics/Chemistry" for Assistant Faculty
 */
function isSubjectAuthorized(userRole, userSubject, targetSubject) {
  const normRole = String(userRole || '').toLowerCase();
  if (normRole === 'principal') return true;
  if (!userSubject || !targetSubject) return false;

  const u = String(userSubject).toLowerCase();
  const t = String(targetSubject).toLowerCase();

  if (u === t) return true;

  const keywords = ['physics', 'chemistry', 'biology', 'mathematics', 'maths'];
  const userHas = keywords.filter((k) => u.includes(k));

  for (const k of userHas) {
    if (t.includes(k)) return true;
    if (k === 'mathematics' && t.includes('maths')) return true;
    if (k === 'maths' && t.includes('mathematics')) return true;
  }

  const words = u.split(/[\s—\/\-,]+/).filter((w) => w.length > 2);
  for (const w of words) {
    if (t.includes(w)) return true;
  }

  return false;
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireSubjectScope,
  isSubjectAuthorized,
};

