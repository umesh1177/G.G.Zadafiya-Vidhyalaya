const express = require('express');
const router = express.Router();
const syllabusController = require('../controllers/syllabusController');

router.get('/', (req, res) => syllabusController.getSyllabus(req, res));
router.get('/finished-today', (req, res) => syllabusController.getTodayFinished(req, res));
router.get('/principal-overview', (req, res) => syllabusController.getPrincipalOverview(req, res));
router.post('/chapter', (req, res) => syllabusController.addChapter(req, res));
router.post('/topic', (req, res) => syllabusController.addTopic(req, res));
router.put('/toggle-status', (req, res) => syllabusController.toggleStatus(req, res));
router.delete('/chapter/:id', (req, res) => syllabusController.deleteChapter(req, res));

module.exports = router;
