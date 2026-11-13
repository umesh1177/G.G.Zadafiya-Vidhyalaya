const ltService = require('../services/ltService');
const ltReportService = require('../services/ltReportService');

class LtController {
  async getAllLts(req, res) {
    try {
      const { subject, standard, status } = req.query;
      const data = await ltService.getAllLts({ subject, standard, status });
      res.json({ success: true, count: data.length, data });
    } catch (err) {
      console.error('Error fetching LTs:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch LTs' });
    }
  }

  async getLtById(req, res) {
    try {
      const data = await ltService.getLtById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message || 'LT not found' });
    }
  }

  async createLt(req, res) {
    try {
      const data = await ltService.createLt(req.body);
      res.status(201).json({ success: true, message: 'Lecture Test scheduled successfully', data });
    } catch (err) {
      console.error('Error creating LT:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to create LT' });
    }
  }

  async updateLt(req, res) {
    try {
      const data = await ltService.updateLt(req.params.id, req.body);
      res.json({ success: true, message: 'Lecture Test updated successfully', data });
    } catch (err) {
      console.error('Error updating LT:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to update LT' });
    }
  }

  async deleteLt(req, res) {
    try {
      await ltService.deleteLt(req.params.id);
      res.json({ success: true, message: 'Lecture Test deleted' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message || 'Failed to delete LT' });
    }
  }

  async getLtMarks(req, res) {
    try {
      const data = await ltService.getLtMarks(req.params.id);
      res.json({ success: true, count: data.length, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message || 'Failed to fetch LT marks' });
    }
  }

  async saveLtMarks(req, res) {
    try {
      const { marks, assistantFacultyId, assistantName } = req.body;
      const data = await ltService.saveLtMarks(req.params.id, marks, assistantFacultyId, assistantName);
      res.json({ success: true, message: 'LT grades saved successfully', data });
    } catch (err) {
      console.error('Error saving LT marks:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to save LT marks' });
    }
  }

  async getAnalyticsOverview(req, res) {
    try {
      const data = await ltService.getAnalyticsOverview(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching LT analytics overview:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to compute LT analytics overview' });
    }
  }

  async getLtDetailedAnalysis(req, res) {
    try {
      const data = await ltService.getLtDetailedAnalysis(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching LT detailed analysis:', err);
      res.status(404).json({ success: false, message: err.message || 'Failed to compute LT analysis detail' });
    }
  }

  async retrainAnalyticsModel(req, res) {
    try {
      const model = await ltService.retrainAnalyticsModel();
      res.json({ success: true, message: 'LT ML Models retrained successfully', data: model });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message || 'Failed to retrain LT ML models' });
    }
  }

  async getAvailableWeeks(req, res) {
    try {
      const data = await ltReportService.getAvailableWeeks();
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching available weeks:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to get weeks' });
    }
  }

  async getWeeklyReport(req, res) {
    try {
      const data = await ltReportService.getWeeklyReport(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error generating weekly report:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to generate weekly report' });
    }
  }

  async getMonthlyReport(req, res) {
    try {
      const data = await ltReportService.getMonthlyReport(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error generating monthly report:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to generate monthly report' });
    }
  }

  async getStudentPerformance(req, res) {
    try {
      const data = await ltReportService.getStudentPerformance(req.query);
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error generating student performance:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to generate student performance' });
    }
  }

  async savePrintedReport(req, res) {
    try {
      const data = await ltReportService.savePrintedReport(req.body);
      res.status(201).json({ success: true, message: 'Report saved into ledger', data });
    } catch (err) {
      console.error('Error saving printed report:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to save report' });
    }
  }

  async getSavedReports(req, res) {
    try {
      const data = await ltReportService.getSavedReports(req.query);
      res.json({ success: true, count: data.length, data });
    } catch (err) {
      console.error('Error fetching saved reports:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch saved reports' });
    }
  }

  async getSavedReportById(req, res) {
    try {
      const data = await ltReportService.getSavedReportById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message || 'Report not found' });
    }
  }
}

module.exports = new LtController();

