const disciplineService = require('../services/disciplineService');

class DisciplineController {
  async getAllRemarks(req, res) {
    try {
      const data = await disciplineService.getAllRemarks(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching discipline remarks:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch discipline remarks' });
    }
  }

  async getTypes(req, res) {
    try {
      const data = await disciplineService.getTypes();
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching discipline types:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch discipline types' });
    }
  }

  async deleteCustomType(req, res) {
    try {
      await disciplineService.deleteCustomType(req.params.id);
      const types = await disciplineService.getTypes();
      res.json({ success: true, message: 'Custom remark type removed', data: types });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message || 'Failed to delete remark type' });
    }
  }

  async lookupStudent(req, res) {
    try {
      const { standard, division, rollNo } = req.query;
      const student = await disciplineService.lookupStudent({ standard, division, rollNo });
      res.json({
        success: true,
        found: Boolean(student),
        data: student,
      });
    } catch (err) {
      console.error('Error looking up student:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to look up student' });
    }
  }

  async getPrincipalOverview(req, res) {
    try {
      const data = await disciplineService.getPrincipalOverview(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error building principal discipline overview:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to load discipline overview' });
    }
  }

  async createRemark(req, res) {
    try {
      const result = await disciplineService.createRemark(req.body);
      res.status(201).json({
        success: true,
        message: result.addedNewType
          ? `Discipline remark logged & "${result.remark.type}" added to remark suggestions`
          : 'Discipline remark logged successfully',
        data: result.remark,
        types: result.types,
        addedNewType: result.addedNewType,
      });
    } catch (err) {
      console.error('Error creating discipline remark:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to create discipline remark' });
    }
  }

  async updateRemark(req, res) {
    try {
      const updated = await disciplineService.updateRemark(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Discipline remark updated successfully',
        data: updated,
      });
    } catch (err) {
      console.error('Error updating discipline remark:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to update discipline remark' });
    }
  }

  async deleteRemark(req, res) {
    try {
      await disciplineService.deleteRemark(req.params.id);
      res.json({ success: true, message: 'Discipline remark deleted successfully' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message || 'Failed to delete discipline remark' });
    }
  }
}

module.exports = new DisciplineController();

