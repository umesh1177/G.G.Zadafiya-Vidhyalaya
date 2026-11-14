const express = require('express');
const router = express.Router();
const disciplineController = require('../controllers/disciplineController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Static routes MUST precede /:id wildcard routes
router.get('/types', authenticate, (req, res) => disciplineController.getTypes(req, res));
router.delete('/types/:id', authenticate, requireRole('principal'), (req, res) => disciplineController.deleteCustomType(req, res));
router.get('/lookup-student', authenticate, (req, res) => disciplineController.lookupStudent(req, res));
router.get('/principal-overview', authenticate, (req, res) => disciplineController.getPrincipalOverview(req, res));

router.get('/', authenticate, (req, res) => disciplineController.getAllRemarks(req, res));
router.post('/', authenticate, requireRole('principal', 'assistant', 'faculty'), (req, res) => disciplineController.createRemark(req, res));
router.put('/:id', authenticate, requireRole('principal', 'assistant', 'faculty'), (req, res) => disciplineController.updateRemark(req, res));
router.delete('/:id', authenticate, requireRole('principal'), (req, res) => disciplineController.deleteRemark(req, res));

module.exports = router;
