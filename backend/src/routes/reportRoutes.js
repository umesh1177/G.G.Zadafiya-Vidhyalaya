const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.post('/faculty', (req, res) => reportController.createFacultyReport(req, res));
router.get('/faculty', (req, res) => reportController.getFacultyReports(req, res));
router.put('/faculty/:id/acknowledge', (req, res) => reportController.acknowledgeReport(req, res));

module.exports = router;

