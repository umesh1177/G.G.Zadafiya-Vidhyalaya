/**
 * G.G. Zadafiya Vidhyalaya - Validation Middleware & Centralized Error Handler
 */

const { isValidObjectId, sanitizeNoSql } = require('../utils/validator');

/**
 * Middleware: Validate that a URL parameter is a valid MongoDB ObjectId
 */
function validateObjectIdParam(paramName = 'id') {
  return (req, res, next) => {
    const val = req.params[paramName];
    // If route accepts numeric IDs (e.g. examNo or ltNo), allow numbers
    if (!isNaN(val) && Number(val) > 0) {
      return next();
    }
    if (!val || !isValidObjectId(val)) {
      return res.status(400).json({
        success: false,
        message: `Invalid identifier format: "${val}". Must be a valid 24-character hexadecimal ObjectId.`,
      });
    }
    next();
  };
}

/**
 * Middleware: Sanitize request body and query against NoSQL operator injection
 */
function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSql(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeNoSql(req.query);
  }
  next();
}

/**
 * Centralized error handling middleware
 */
function errorHandler(err, req, res, next) {
  // 1. Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid format for field "${err.path}": "${err.value}".`,
    });
  }

  // 2. Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join('. ') || 'Validation failed for request data.',
      errors: messages,
    });
  }

  // 3. MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    return res.status(409).json({
      success: false,
      message: `A record with this ${fields.join(', ')} already exists in the system.`,
    });
  }

  // 4. Client-thrown validation / business logic error
  if (err.status && err.status < 500) {
    return res.status(err.status).json({
      success: false,
      message: err.message || 'Client request error.',
    });
  }

  // 5. Default 500 Internal Server Error (never leak stack trace in response)
  console.error('Unhandled server error:', err);
  return res.status(500).json({
    success: false,
    message: err.message || 'An unexpected error occurred on the server.',
  });
}

module.exports = {
  validateObjectIdParam,
  sanitizeRequest,
  errorHandler,
};

