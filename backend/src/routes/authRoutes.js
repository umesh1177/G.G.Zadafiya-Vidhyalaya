const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', (req, res) => authController.login(req, res));
router.get('/student-login-status', (req, res) => authController.getStudentLoginStatus(req, res));
router.post('/student-login-status', (req, res) => authController.setStudentLoginStatus(req, res));

module.exports = router;

