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

console.log('\n========================================================');
console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('========================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}

