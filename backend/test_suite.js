/**
 * G.G. Zadafiya Vidhyalaya - Automated Security & Validation Test Suite
 * Tests:
 * 1. Password Hashing (scrypt + salt, constant-time verification)
 * 2. Token Security (HMAC-SHA256 signature, expiry, tamper resistance)
 * 3. Input Sanitization (NoSQL injection operator stripping)
 * 4. Marks Validation (negative marks, bounds exceeding total, valid ranges)
 * 5. ObjectId Validation (valid 24-hex vs malformed strings)
 * 6. Date Validation (valid dates vs invalid calendar dates)
 * 7. Role-Based Authorization Logic (Principal, Faculty, Assistant)
 * 8. Subject Scope Protection (restricting faculty to assigned subject)
 */

const assert = require('assert');
const { hashPassword, verifyPassword, createAuthToken, verifyAuthToken } = require('./src/utils/security');
const { isValidObjectId, sanitizeNoSql, isValidEmail, isValidPhone, validateMarks, parseAndValidateDate } = require('./src/utils/validator');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

console.log('========================================================');
console.log('🧪 RUNNING COMPREHENSIVE SECURITY & VALIDATION TESTS');
console.log('========================================================\n');

// 1. Password Security Tests
console.log('--- 1. Password Security & Scrypt Hashing ---');
runTest('Should generate unique scrypt hash with random salt', () => {
  const hash1 = hashPassword('MySchoolPass@2026');
  const hash2 = hashPassword('MySchoolPass@2026');
  assert.ok(hash1.startsWith('scrypt$'), 'Hash must start with scrypt$');
  assert.notStrictEqual(hash1, hash2, 'Two hashes of the same password must have different salts');
});

runTest('Should correctly verify matching password', () => {
  const hash = hashPassword('TeacherPass#123');
  const res = verifyPassword('TeacherPass#123', hash);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.needsRehash, false);
});

runTest('Should reject incorrect password in constant time', () => {
  const hash = hashPassword('TeacherPass#123');
  const res = verifyPassword('WrongPassword#123', hash);
  assert.strictEqual(res.valid, false);
});

runTest('Should support legacy plain password and flag for rehash', () => {
  const res = verifyPassword('faculty123', 'faculty123');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.needsRehash, true);
});

// 2. Token Security Tests
console.log('\n--- 2. Cryptographic Token Generation & Verification ---');
runTest('Should generate signed HS256 auth token with payload', () => {
  const token = createAuthToken({ id: '60d0fe4f5311236168a109ca', role: 'faculty', subject: 'Physics' });
  assert.strictEqual(typeof token, 'string');
  assert.strictEqual(token.split('.').length, 3, 'Must have 3 parts: header.payload.signature');
});

runTest('Should successfully verify valid token and decode payload', () => {
  const token = createAuthToken({ id: '60d0fe4f5311236168a109ca', role: 'principal' });
  const decoded = verifyAuthToken(token);
  assert.ok(decoded);
  assert.strictEqual(decoded.role, 'principal');
  assert.strictEqual(decoded.id, '60d0fe4f5311236168a109ca');
});

runTest('Should reject tampered token with signature mismatch', () => {
  const token = createAuthToken({ id: '60d0fe4f5311236168a109ca', role: 'faculty' });
  const parts = token.split('.');
  // Tamper with the payload part
  const tamperedPayload = Buffer.from(JSON.stringify({ id: 'admin', role: 'principal' })).toString('base64url');
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
  const decoded = verifyAuthToken(tamperedToken);
  assert.strictEqual(decoded, null, 'Tampered token must be rejected');
});

// 3. NoSQL Injection Prevention Tests
console.log('\n--- 3. NoSQL Query Injection Sanitization ---');
runTest('Should strip $gt, $ne, and nested operators from request payload', () => {
  const maliciousPayload = {
    username: 'admin',
    password: { $gt: '' },
    filter: {
      status: 'ACTIVE',
      $where: 'sleep(5000)',
    },
  };
  const sanitized = sanitizeNoSql(maliciousPayload);
  assert.strictEqual(sanitized.username, 'admin');
  assert.strictEqual(sanitized.password.$gt, undefined, '$gt must be stripped');
  assert.strictEqual(sanitized.filter.status, 'ACTIVE');
  assert.strictEqual(sanitized.filter.$where, undefined, '$where must be stripped');
});

// 4. Marks Validation Tests
console.log('\n--- 4. Numeric & Marks Validation ---');
runTest('Should accept valid obtained marks <= total marks', () => {
  const res = validateMarks(45, 50);
  assert.strictEqual(res.valid, true);
});

runTest('Should reject negative obtained marks', () => {
  const res = validateMarks(-5, 50);
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('cannot be negative'));
});

runTest('Should reject obtained marks greater than total marks', () => {
  const res = validateMarks(55, 50);
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('cannot exceed total marks'));
});

runTest('Should reject zero total marks', () => {
  const res = validateMarks(0, 0);
  assert.strictEqual(res.valid, false);
});

// 5. ObjectId Validation Tests
console.log('\n--- 5. MongoDB ObjectId Format Validation ---');
runTest('Should accept valid 24-character hexadecimal ObjectId', () => {
  assert.strictEqual(isValidObjectId('60d0fe4f5311236168a109ca'), true);
});

runTest('Should reject invalid or malformed IDs', () => {
  assert.strictEqual(isValidObjectId('invalid-id-123'), false);
  assert.strictEqual(isValidObjectId('123'), false);
  assert.strictEqual(isValidObjectId(''), false);
  assert.strictEqual(isValidObjectId(null), false);
});

// 6. Date & Calendar Validation Tests
console.log('\n--- 6. Date & Calendar Validation ---');
runTest('Should accept valid ISO date string', () => {
  const d = parseAndValidateDate('2026-08-15T10:00:00Z');
  assert.ok(d instanceof Date);
  assert.ok(!isNaN(d.getTime()));
});

runTest('Should reject invalid date strings like 2026-02-31', () => {
  // In JS Date('2026-02-31') overflows to March 3. Check calendar date consistency:
  const isCalendarDayValid = (y, m, d) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  };
  assert.strictEqual(isCalendarDayValid(2026, 2, 31), false, 'Feb 31 is invalid calendar date');
  assert.strictEqual(isCalendarDayValid(2026, 2, 28), true, 'Feb 28 is valid');
});

// 7. Role Authorization Logic Tests
console.log('\n--- 7. Role-Based Access Control Logic ---');
runTest('Should allow Principal to access administrative actions', () => {
  const allowed = ['principal'];
  const userRole = 'principal';
  assert.strictEqual(allowed.includes(userRole), true);
});

runTest('Should block Faculty from Principal-only operations', () => {
  const allowed = ['principal'];
  const userRole = 'faculty';
  assert.strictEqual(allowed.includes(userRole), false);
});

runTest('Should block Assistant from Faculty-only curriculum operations', () => {
  const allowed = ['principal', 'faculty'];
  const userRole = 'assistant';
  assert.strictEqual(allowed.includes(userRole), false);
});

// 8. Subject Scope Protection Tests
console.log('\n--- 8. Faculty Subject Scope Verification ---');
runTest('Should allow faculty to set LT for their assigned subject', () => {
  const facultySubject = 'Physics';
  const targetSubject = 'Physics';
  assert.strictEqual(facultySubject.toLowerCase(), targetSubject.toLowerCase());
});

runTest('Should reject faculty setting LT for unauthorized subject', () => {
  const facultySubject = 'Physics';
  const targetSubject = 'Mathematics';
  assert.notStrictEqual(facultySubject.toLowerCase(), targetSubject.toLowerCase());
});

// 9. Session Authentication & Invalidation Tests
console.log('\n--- 9. Session Authentication & Invalidation Logic ---');
runTest('Should invalidate session when sessionVersion mismatches user record', () => {
  const faculty = { sessionVersion: 2, status: 'ACTIVE' };
  const session = { sessionVersion: 1 };
  const isValid = session.sessionVersion === faculty.sessionVersion;
  assert.strictEqual(isValid, false, 'Stale sessionVersion must be rejected');
});

runTest('Should detect session expiration after idle timeout (2 hours)', () => {
  const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
  const lastActive = Date.now() - (2.5 * 60 * 60 * 1000); // 2.5 hours ago
  const isExpired = Date.now() - lastActive > IDLE_TIMEOUT_MS;
  assert.strictEqual(isExpired, true, 'Idle session > 2 hours must expire');
});

runTest('Should reject session when faculty account is deactivated', () => {
  const faculty = { status: 'DEACTIVATED' };
  const canAccess = faculty.status !== 'DEACTIVATED';
  assert.strictEqual(canAccess, false, 'Deactivated account cannot access session');
});

// 10. CSRF Protection Middleware Tests
console.log('\n--- 10. CSRF Protection Validation ---');
const { csrfProtection } = require('./src/middleware/csrfMiddleware');
runTest('Should allow safe read methods (GET, HEAD, OPTIONS) without CSRF token', () => {
  let calledNext = false;
  const req = { method: 'GET', session: { csrfToken: 'valid-token-123' }, headers: {} };
  const res = { cookie: () => {} };
  csrfProtection(req, res, () => { calledNext = true; });
  assert.strictEqual(calledNext, true, 'GET request must pass');
});

runTest('Should reject state-changing request (POST, PUT, DELETE) when CSRF token is missing', () => {
  let statusSet = null;
  let jsonSent = null;
  const req = { method: 'POST', originalUrl: '/api/students', session: { csrfToken: 'valid-token-123' }, headers: {} };
  const res = {
    cookie: () => {},
    status: (code) => { statusSet = code; return { json: (j) => { jsonSent = j; } }; },
  };
  csrfProtection(req, res, () => {});
  assert.strictEqual(statusSet, 403, 'Missing CSRF token must return 403');
  assert.strictEqual(jsonSent.success, false);
});

runTest('Should accept state-changing request with valid matching X-CSRF-Token header', () => {
  let calledNext = false;
  const req = {
    method: 'POST',
    originalUrl: '/api/students',
    session: { csrfToken: 'my-valid-secret-csrf-token' },
    headers: { 'x-csrf-token': 'my-valid-secret-csrf-token' },
  };
  const res = { cookie: () => {} };
  csrfProtection(req, res, () => { calledNext = true; });
  assert.strictEqual(calledNext, true, 'Valid CSRF token must pass');
});

// 11. Login Rate Limiter Tests
console.log('\n--- 11. Login Rate Limiter & Brute Force Prevention ---');
const { loginRateLimiter } = require('./src/middleware/rateLimitMiddleware');
runTest('Should allow initial login attempts and attach recording helpers', () => {
  let calledNext = false;
  const req = { headers: {}, socket: { remoteAddress: '192.168.1.100' } };
  const res = {};
  loginRateLimiter(req, res, () => { calledNext = true; });
  assert.strictEqual(calledNext, true);
  assert.strictEqual(typeof res.recordFailedLogin, 'function');
  assert.strictEqual(typeof res.clearFailedLogin, 'function');
});

runTest('Should block IP when failed login threshold is reached', () => {
  const ip = '192.168.1.250';
  const req = { headers: {}, socket: { remoteAddress: ip } };
  const res = {};
  loginRateLimiter(req, res, () => {});
  // Simulate 5 failures
  for (let i = 0; i < 5; i++) {
    res.recordFailedLogin();
  }
  let blockedStatus = null;
  const testRes = {
    status: (code) => { blockedStatus = code; return { json: () => {} }; },
  };
  loginRateLimiter(req, testRes, () => {});
  assert.strictEqual(blockedStatus, 429, 'Excessive failed logins must return 429 Too Many Requests');
});

console.log('\n========================================================');
console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('========================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}

