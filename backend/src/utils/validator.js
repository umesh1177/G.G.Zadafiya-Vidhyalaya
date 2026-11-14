/**
 * G.G. Zadafiya Vidhyalaya - Validation & Input Sanitization Utilities
 */

const mongoose = require('mongoose');

/**
 * Check if a string is a valid MongoDB ObjectId
 */
function isValidObjectId(id) {
  if (!id || typeof id !== 'string') return false;
  return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id;
}

/**
 * Sanitize object keys recursively to prevent NoSQL query operator injection ($gt, $ne, etc.)
 */
function sanitizeNoSql(input) {
  if (!input || typeof input !== 'object') return input;

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeNoSql(item));
  }

  const clean = {};
  for (const [key, value] of Object.entries(input)) {
    // Strip leading dollar signs or dots in object keys
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeNoSql(value);
  }
  return clean;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

/**
 * Validate Indian phone number (10 digits with optional +91 or leading 0)
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/[\s\-+()]/g, '');
  // 10 digits starting with 6, 7, 8, or 9; or 12 digits starting with 91[6-9]
  return /^(?:91)?[6-9]\d{9}$/.test(digits);
}

/**
 * Validate calendar date
 */
function parseAndValidateDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Validate numeric marks
 */
function validateMarks(obtained, total) {
  const obt = Number(obtained);
  const tot = Number(total);

  if (isNaN(obt) || isNaN(tot)) {
    return { valid: false, error: 'Marks must be valid numbers.' };
  }
  if (obt < 0) {
    return { valid: false, error: 'Obtained marks cannot be negative.' };
  }
  if (tot <= 0) {
    return { valid: false, error: 'Total marks must be greater than zero.' };
  }
  if (obt > tot) {
    return { valid: false, error: `Obtained marks (${obt}) cannot exceed total marks (${tot}).` };
  }
  return { valid: true };
}

/**
 * Escape search strings for safe MongoDB regex queries
 */
function escapeRegex(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  isValidObjectId,
  sanitizeNoSql,
  isValidEmail,
  isValidPhone,
  parseAndValidateDate,
  validateMarks,
  escapeRegex,
};

