const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');

router.get('/', (req, res) => examController.getAllExams(req, res));
router.post('/', (req, res) => examController.createExam(req, res));

// Static analytics routes MUST precede /:id wildcard routes
router.get('/analytics/summary', (req, res) => examController.getExamAnalysisSummary(req, res));
router.post('/ml/retrain', (req, res) => examController.retrainExamModel(req, res));

router.get('/:id/analytics', (req, res) => examController.getExamDetailedAnalysis(req, res));
router.get('/:id', (req, res) => examController.getExamById(req, res));
router.put('/:id', (req, res) => examController.updateExam(req, res));
router.delete('/:id', (req, res) => examController.deleteExam(req, res));

router.post('/:id/complete', (req, res) => examController.markExamCompleted(req, res));
router.post('/:id/question-paper', (req, res) => examController.uploadQuestionPaper(req, res));
router.get('/:id/question-paper', (req, res) => examController.downloadQuestionPaper(req, res));

router.get('/:id/marks', (req, res) => examController.getExamMarks(req, res));
router.post('/:id/marks', (req, res) => examController.saveExamMarks(req, res));
router.put('/:id/marks/:studentKey', (req, res) => examController.updateSingleStudentMark(req, res));

module.exports = router;

