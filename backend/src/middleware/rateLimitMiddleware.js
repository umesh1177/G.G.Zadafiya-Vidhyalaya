/**
 * G.G. Zadafiya Vidhyalaya - Login Rate Limiting Middleware
 * Protects against brute-force password guessing and credential stuffing.
 * Tracks failed attempts per IP address with automatic sliding-window expiry.
 */

const attemptsByIp = new Map();

// Configuration
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;      // Max 5 failed attempts per window

/**
 * Periodically purge stale entries from memory every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attemptsByIp.entries()) {
    if (now - record.firstAttemptAt > WINDOW_MS) {
      attemptsByIp.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Middleware: Check if IP has exceeded failed login threshold
 */
function loginRateLimiter(req, res, next) {
  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown-ip';

  const record = attemptsByIp.get(clientIp);
  const now = Date.now();

  if (record) {
    // If window has passed, reset record
    if (now - record.firstAttemptAt > WINDOW_MS) {
      attemptsByIp.delete(clientIp);
    } else if (record.failedCount >= MAX_FAILED_ATTEMPTS) {
      const waitMinutes = Math.ceil((WINDOW_MS - (now - record.firstAttemptAt)) / 60000);
      return res.status(429).json({
        success: false,
        message: `Too many failed login attempts. For security, account access from this network is locked for ${waitMinutes} minute(s). Please try again later.`,
      });
    }
  }

  // Attach tracker helper to response so controller can record failures
  res.recordFailedLogin = () => {
    const existing = attemptsByIp.get(clientIp);
    if (!existing) {
      attemptsByIp.set(clientIp, { failedCount: 1, firstAttemptAt: Date.now() });
    } else {
      existing.failedCount += 1;
    }
  };

  res.clearFailedLogin = () => {
    attemptsByIp.delete(clientIp);
  };

  next();
}

module.exports = { loginRateLimiter };
