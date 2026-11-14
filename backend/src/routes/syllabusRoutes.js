const express = require('express');
const router = express.Router();
const syllabusController = require('../controllers/syllabusController');
const { authenticate, requireRole, requireSubjectScope } = require('../middleware/authMiddleware');

router.get('/', authenticate, (req, res) => syllabusController.getSyllabus(req, res));
router.get('/finished-today', authenticate, (req, res) => syllabusController.getTodayFinished(req, res));
router.get('/principal-overview', authenticate, (req, res) => syllabusController.getPrincipalOverview(req, res));

// Modifying chapters and topics restricted to Principal and Subject Faculty with subject ownership check
router.post('/chapter', authenticate, requireRole('principal', 'faculty'), requireSubjectScope('subject'), (req, res) => syllabusController.addChapter(req, res));
router.post('/topic', authenticate, requireRole('principal', 'faculty'), requireSubjectScope('subject'), (req, res) => syllabusController.addTopic(req, res));
router.put('/toggle-status', authenticate, requireRole('principal', 'faculty'), (req, res) => syllabusController.toggleStatus(req, res));
router.delete('/chapter/:id', authenticate, requireRole('principal'), (req, res) => syllabusController.deleteChapter(req, res));

module.exports = router;
