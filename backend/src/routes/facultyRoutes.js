const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Reading faculty info requires authenticated staff
router.get('/statistics', authenticate, facultyController.getStatistics);
router.get('/', authenticate, facultyController.getAllFaculty);
router.get('/:id', authenticate, facultyController.getFacultyById);

// Modifying faculty list is restricted strictly to Principal
router.post('/', authenticate, requireRole('principal'), facultyController.createFaculty);
router.put('/:id', authenticate, requireRole('principal'), facultyController.updateFaculty);
router.delete('/:id', authenticate, requireRole('principal'), facultyController.deleteFaculty);

module.exports = router;
