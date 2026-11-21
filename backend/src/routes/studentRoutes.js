const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// Statistics route (before /:id)
router.get('/statistics', studentController.getStatistics);

// Excel template & bulk upload (before /:id)
router.get('/template', studentController.getTemplate);
router.post('/bulk-upload', studentController.bulkUpload);

// Student CRUD routes
router.get('/', studentController.getStudents);
router.post('/', studentController.createStudent);
router.get('/:id', studentController.getStudentById);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

module.exports = router;

