const express = require('express');
const router = express.Router();
const ltController = require('../controllers/ltController');
const { authenticate, requireRole, requireSubjectScope, isSubjectAuthorized } = require('../middleware/authMiddleware');
const LT = require('../models/LT');

// Analytics & Reports routes BEFORE `/:id` wildcard!
router.get('/analytics/overview', authenticate, (req, res) => ltController.getAnalyticsOverview(req, res));
router.post('/analytics/retrain', authenticate, requireRole('principal'), (req, res) => ltController.retrainAnalyticsModel(req, res));
router.get('/analytics/weeks', authenticate, (req, res) => ltController.getAvailableWeeks(req, res));
router.get('/analytics/weekly-report', authenticate, (req, res) => ltController.getWeeklyReport(req, res));
router.get('/analytics/monthly-report', authenticate, (req, res) => ltController.getMonthlyReport(req, res));
router.get('/analytics/student-performance', authenticate, (req, res) => ltController.getStudentPerformance(req, res));
router.post('/analytics/saved-reports', authenticate, (req, res) => ltController.savePrintedReport(req, res));
router.get('/analytics/saved-reports', authenticate, (req, res) => ltController.getSavedReports(req, res));
router.get('/analytics/saved-reports/:id', authenticate, (req, res) => ltController.getSavedReportById(req, res));

// Core LT endpoints
router.get('/', authenticate, (req, res) => ltController.getAllLts(req, res));
router.get('/:id/analysis', authenticate, (req, res) => ltController.getLtDetailedAnalysis(req, res));
router.get('/:id', authenticate, (req, res) => ltController.getLtById(req, res));

// Creating LT restricted to Principal and Subject Faculty with subject ownership check
router.post('/', authenticate, requireRole('principal', 'faculty'), requireSubjectScope('subject'), (req, res) => ltController.createLt(req, res));

// Updating LT:
// - Conducting / Finishing LT (status: 'CONDUCTED') or Timer changes: ALL Assistant Faculty can conduct ANY subject LT!
// - Content changes (questions, topics): Restricted to Principal & assigned Subject Faculty
router.put('/:id', authenticate, async (req, res) => {
  const userRole = String(req.user?.role || '').toLowerCase();
  const isAssistant = userRole === 'assistant' || userRole.includes('assistant');
  const isPrincipal = userRole === 'principal' || userRole.includes('principal');
  const isFaculty = userRole === 'faculty' || (userRole.includes('faculty') && !isAssistant);

  const isConductOrTimer =
    req.body &&
    (req.body.status === 'CONDUCTED' ||
     req.body.status === 'SCHEDULED' ||
     req.body.duration !== undefined ||
     req.body.durationSeconds !== undefined) &&
    !req.body.questions &&
    !req.body.topicsCovered;

  if (isAssistant) {
    if (isConductOrTimer) {
      // Any assistant faculty is authorized to conduct / timer / finish any subject LT
      return ltController.updateLt(req, res);
    }
    return res.status(403).json({
      success: false,
      message: 'Assistant faculty can only conduct or finish LTs, not edit test questions.',
    });
  }

  // Principal has full access
  if (isPrincipal) {
    return ltController.updateLt(req, res);
  }

  // Subject Faculty must match assigned subject
  if (isFaculty) {
    const ltDoc = await LT.findById(req.params.id);
    if (!ltDoc) return res.status(404).json({ success: false, message: 'LT not found.' });
    if (!isSubjectAuthorized(userRole, req.user.subject, ltDoc.subject)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You are assigned to "${req.user.subject}" and cannot modify "${ltDoc.subject}".`,
      });
    }
    return ltController.updateLt(req, res);
  }

  return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges.' });
});

router.delete('/:id', authenticate, requireRole('principal', 'faculty'), (req, res) => ltController.deleteLt(req, res));

// LT Marks endpoints:
// Assistant Faculty can only enter marks for their assigned subject! (Principal can enter for all)
router.get('/:id/marks', authenticate, (req, res) => ltController.getLtMarks(req, res));
router.post('/:id/marks', authenticate, requireRole('principal', 'assistant', 'faculty'), async (req, res) => {
  try {
    const ltDoc = await LT.findById(req.params.id);
    if (!ltDoc) {
      return res.status(404).json({ success: false, message: 'Lecture Test not found.' });
    }

    const userRole = String(req.user?.role || '').toLowerCase();
    const userSubject = req.user?.subject || '';

    if (!isSubjectAuthorized(userRole, userSubject, ltDoc.subject)) {
      return res.status(403).json({
        success: false,
        message: `Access restricted. As an Assistant Faculty for "${userSubject}", you are only authorized to enter marks for your assigned subjects (not for "${ltDoc.subject}").`,
      });
    }

    return ltController.saveLtMarks(req, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Error processing marks entry.' });
  }
});

module.exports = router;
