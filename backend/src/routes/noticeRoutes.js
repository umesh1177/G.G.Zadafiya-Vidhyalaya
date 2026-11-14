const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Static route BEFORE /:id wildcard
router.get('/recipients', authenticate, (req, res) => noticeController.getRecipientsDirectory(req, res));

router.get('/', authenticate, (req, res) => noticeController.getNotices(req, res));
router.post('/', authenticate, requireRole('principal', 'faculty', 'assistant'), (req, res) => noticeController.createNotice(req, res));
router.get('/:id/attachments/:attachmentId', authenticate, (req, res) => noticeController.getAttachment(req, res));
router.delete('/:id', authenticate, requireRole('principal'), (req, res) => noticeController.deleteNotice(req, res));

module.exports = router;
