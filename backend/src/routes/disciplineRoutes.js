const express = require('express');
const router = express.Router();
const disciplineController = require('../controllers/disciplineController');

// Static routes MUST precede /:id wildcard routes
router.get('/types', (req, res) => disciplineController.getTypes(req, res));
router.delete('/types/:id', (req, res) => disciplineController.deleteCustomType(req, res));
router.get('/lookup-student', (req, res) => disciplineController.lookupStudent(req, res));
router.get('/principal-overview', (req, res) => disciplineController.getPrincipalOverview(req, res));

router.get('/', (req, res) => disciplineController.getAllRemarks(req, res));
router.post('/', (req, res) => disciplineController.createRemark(req, res));
router.put('/:id', (req, res) => disciplineController.updateRemark(req, res));
router.delete('/:id', (req, res) => disciplineController.deleteRemark(req, res));

module.exports = router;

