const accessService = require('../services/accessService');

class AccessController {
  async getConfig(req, res, next) {
    try {
      const config = accessService.getMasterConfig();
      res.json({ success: true, ...config });
    } catch (err) {
      next(err);
    }
  }

  async getFaculties(req, res, next) {
    try {
      const result = await accessService.getAllFacultiesWithAccess(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getFacultyAccess(req, res, next) {
    try {
      const result = await accessService.getFacultyAccessById(req.params.id);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  }

  async updateFacultyAccess(req, res, next) {
    try {
      const changedBy = req.body.changedBy || req.user?.name || 'Principal';
      const result = await accessService.updateFacultyAccess(req.params.id, req.body, changedBy);
      res.json({
        success: true,
        message: 'Access permissions updated successfully and logged in history.',
        ...result,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getHistory(req, res, next) {
    try {
      const result = await accessService.getAccessHistory(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AccessController();
