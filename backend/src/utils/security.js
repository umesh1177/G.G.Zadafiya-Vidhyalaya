/**
 * G.G. Zadafiya Vidhyalaya - Security & Cryptographic Utilities
 * Provides:
 * 1. Secure password hashing using Node's native crypto (scrypt + 16-byte salt)
 * 2. Constant-time password verification & transparent hash migration
 * 3. Cryptographically signed authentication tokens (HMAC-SHA256)
 */

const crypto = require('crypto');

// Server secret for signing tokens. In production, load from process.env.JWT_SECRET or SESSION_SECRET
const TOKEN_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'ggzv_super_secret_auth_key_2026_local_safety';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Hash a plain text password using scrypt with a unique random salt
 * Format: scrypt$<saltHex>$<hashHex>
 */
function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verify a password against a stored hash or legacy plain text
 * Returns { valid: boolean, needsRehash: boolean }
 */
function verifyPassword(password, storedHashOrPlain) {
  if (!password || !storedHashOrPlain) {
    return { valid: false, needsRehash: false };
  }

  // 1. Check if stored in our scrypt format
  if (typeof storedHashOrPlain === 'string' && storedHashOrPlain.startsWith('scrypt$')) {
    const parts = storedHashOrPlain.split('$');
    if (parts.length === 3) {
      const salt = parts[1];
      const expectedKey = Buffer.from(parts[2], 'hex');
      const actualKey = crypto.scryptSync(password, salt, 64);
      if (expectedKey.length === actualKey.length && crypto.timingSafeEqual(expectedKey, actualKey)) {
        return { valid: true, needsRehash: false };
      }
      return { valid: false, needsRehash: false };
    }
  }

  // 2. Backward compatibility: if existing record is plain text (e.g. from initial seed)
  if (password === storedHashOrPlain) {
    return { valid: true, needsRehash: true };
  }

  return { valid: false, needsRehash: false };
}

/**
 * Create a cryptographically signed URL-safe token (HMAC-SHA256)
 * Payload format: base64url(payload).signature
 */
function createAuthToken(userPayload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Date.now() + TOKEN_EXPIRY_MS;
  const payload = { ...userPayload, exp };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify a signed auth token
 * Returns decoded payload or null if invalid/expired
 */
function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;

  // Verify HMAC signature in constant time
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createAuthToken,
  verifyAuthToken,
};

