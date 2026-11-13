const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');

// Static route BEFORE /:id wildcard
router.get('/recipients', (req, res) => noticeController.getRecipientsDirectory(req, res));

router.get('/', (req, res) => noticeController.getNotices(req, res));
router.post('/', (req, res) => noticeController.createNotice(req, res));
router.get('/:id/attachments/:attachmentId', (req, res) => noticeController.getAttachment(req, res));
router.delete('/:id', (req, res) => noticeController.deleteNotice(req, res));

module.exports = router;

