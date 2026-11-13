const express = require('express');
const router = express.Router();
const ltController = require('../controllers/ltController');

// Analytics & Reports routes BEFORE `/:id` wildcard!
router.get('/analytics/overview', (req, res) => ltController.getAnalyticsOverview(req, res));
router.post('/analytics/retrain', (req, res) => ltController.retrainAnalyticsModel(req, res));
router.get('/analytics/weeks', (req, res) => ltController.getAvailableWeeks(req, res));
router.get('/analytics/weekly-report', (req, res) => ltController.getWeeklyReport(req, res));
router.get('/analytics/monthly-report', (req, res) => ltController.getMonthlyReport(req, res));
router.get('/analytics/student-performance', (req, res) => ltController.getStudentPerformance(req, res));
router.post('/analytics/saved-reports', (req, res) => ltController.savePrintedReport(req, res));
router.get('/analytics/saved-reports', (req, res) => ltController.getSavedReports(req, res));
router.get('/analytics/saved-reports/:id', (req, res) => ltController.getSavedReportById(req, res));

router.get('/', (req, res) => ltController.getAllLts(req, res));
router.get('/:id/analysis', (req, res) => ltController.getLtDetailedAnalysis(req, res));
router.get('/:id', (req, res) => ltController.getLtById(req, res));
router.post('/', (req, res) => ltController.createLt(req, res));
router.put('/:id', (req, res) => ltController.updateLt(req, res));
router.delete('/:id', (req, res) => ltController.deleteLt(req, res));

router.get('/:id/marks', (req, res) => ltController.getLtMarks(req, res));
router.post('/:id/marks', (req, res) => ltController.saveLtMarks(req, res));

module.exports = router;

