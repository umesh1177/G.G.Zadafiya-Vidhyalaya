const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.post('/faculty', authenticate, requireRole('principal', 'faculty'), (req, res) => reportController.createFacultyReport(req, res));
router.get('/faculty', authenticate, (req, res) => reportController.getFacultyReports(req, res));
router.put('/faculty/:id/acknowledge', authenticate, requireRole('principal'), (req, res) => reportController.acknowledgeReport(req, res));

module.exports = router;
