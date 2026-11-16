const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/rateLimitMiddleware');
const { getCsrfToken } = require('../middleware/csrfMiddleware');

// Public route: CSRF token retrieval
router.get('/csrf-token', getCsrfToken);

// Public route: Staff login with rate limiting
router.post('/login', loginRateLimiter, (req, res) => authController.login(req, res));

// Protected routes: session verification, logout, password change
router.get('/me', authenticate, (req, res) => authController.getCurrentUser(req, res));
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));
router.put('/change-password', authenticate, (req, res) => authController.changePassword(req, res));

module.exports = router;
