const express = require('express');
const router = express.Router();
const accessController = require('../controllers/accessController');

router.get('/config', accessController.getConfig);
router.get('/faculties', accessController.getFaculties);
router.get('/faculty/:id', accessController.getFacultyAccess);
router.put('/faculty/:id', accessController.updateFacultyAccess);
router.get('/history', accessController.getHistory);

module.exports = router;
