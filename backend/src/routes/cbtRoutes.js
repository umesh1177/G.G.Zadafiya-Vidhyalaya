const express = require('express');
const router = express.Router();
const cbtController = require('../controllers/cbtController');

// Exam Management
router.get('/exams', cbtController.listExams);
router.post('/exams', cbtController.createExam);
router.get('/exams/:id', cbtController.getExamById);
router.put('/exams/:id', cbtController.updateExam);
router.delete('/exams/:id', cbtController.deleteExam);

// Student Exam Execution (Fullscreen Kiosk Mode)
router.post('/exams/:id/start', cbtController.startExam);
router.post('/exams/:id/save-progress', cbtController.saveProgress);
router.post('/exams/:id/violation', cbtController.recordViolation);
router.post('/exams/:id/submit', cbtController.submitExam);

// Assistant Faculty Controls
router.post('/exams/:id/grant-retry', cbtController.grantRetry);
router.post('/exams/:id/evaluate', cbtController.evaluateExam);
router.get('/exams/:id/analysis', cbtController.getExamAnalysis);
router.get('/exams/:id/live-monitor', cbtController.getLiveMonitor);

module.exports = router;
