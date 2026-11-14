const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Statistics route (before /:id)
router.get('/statistics', authenticate, studentController.getStatistics);

// Student listing & detail routes for authenticated staff
router.get('/', authenticate, studentController.getStudents);
router.get('/:id', authenticate, studentController.getStudentById);

// Student mutations restricted to Principal and Assistant Faculty
router.post('/', authenticate, requireRole('principal', 'assistant'), studentController.createStudent);
router.put('/:id', authenticate, requireRole('principal', 'assistant'), studentController.updateStudent);
router.delete('/:id', authenticate, requireRole('principal'), studentController.deleteStudent);

module.exports = router;
