const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticate, requireRole, requireSubjectScope, isSubjectAuthorized } = require('../middleware/authMiddleware');
const ExamUnit = require('../models/ExamUnit');

router.get('/', authenticate, (req, res) => examController.getAllExams(req, res));
router.post('/', authenticate, requireRole('principal', 'faculty', 'assistant'), (req, res) => examController.createExam(req, res));

// Static analytics routes MUST precede /:id wildcard routes
router.get('/analytics/summary', authenticate, (req, res) => examController.getExamAnalysisSummary(req, res));
router.post('/ml/retrain', authenticate, requireRole('principal'), (req, res) => examController.retrainExamModel(req, res));

router.get('/:id/analytics', authenticate, (req, res) => examController.getExamDetailedAnalysis(req, res));
router.get('/:id', authenticate, (req, res) => examController.getExamById(req, res));
router.put('/:id', authenticate, requireRole('principal', 'faculty', 'assistant'), (req, res) => examController.updateExam(req, res));
router.delete('/:id', authenticate, requireRole('principal', 'faculty'), (req, res) => examController.deleteExam(req, res));

// Assistant faculty can mark exam completed (conducted)
router.post('/:id/complete', authenticate, requireRole('principal', 'faculty', 'assistant'), (req, res) => examController.markExamCompleted(req, res));
router.post('/:id/question-paper', authenticate, requireRole('principal', 'faculty'), (req, res) => examController.uploadQuestionPaper(req, res));
router.get('/:id/question-paper', authenticate, (req, res) => examController.downloadQuestionPaper(req, res));

// Marks endpoints:
// Assistant Faculty can only enter/update marks for their assigned subject!
router.get('/:id/marks', authenticate, (req, res) => examController.getExamMarks(req, res));

router.post('/:id/marks', authenticate, requireRole('principal', 'assistant', 'faculty'), async (req, res) => {
  try {
    const examDoc = await ExamUnit.findById(req.params.id);
    if (!examDoc) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const userRole = String(req.user?.role || '').toLowerCase();
    const userSubject = req.user?.subject || '';

    if (!isSubjectAuthorized(userRole, userSubject, examDoc.subject)) {
      return res.status(403).json({
        success: false,
        message: `Access restricted. As an Assistant Faculty for "${userSubject}", you are only authorized to enter marks for your assigned subjects (not for "${examDoc.subject}").`,
      });
    }

    return examController.saveExamMarks(req, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Error processing exam marks entry.' });
  }
});

router.put('/:id/marks/:studentKey', authenticate, requireRole('principal', 'assistant', 'faculty'), async (req, res) => {
  try {
    const examDoc = await ExamUnit.findById(req.params.id);
    if (!examDoc) {
      return res.status(404).json({ success: false, message: 'Exam not found.' });
    }

    const userRole = String(req.user?.role || '').toLowerCase();
    const userSubject = req.user?.subject || '';

    if (!isSubjectAuthorized(userRole, userSubject, examDoc.subject)) {
      return res.status(403).json({
        success: false,
        message: `Access restricted. As an Assistant Faculty for "${userSubject}", you are only authorized to update marks for your assigned subjects (not for "${examDoc.subject}").`,
      });
    }

    return examController.updateSingleStudentMark(req, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Error updating student mark.' });
  }
});

module.exports = router;
