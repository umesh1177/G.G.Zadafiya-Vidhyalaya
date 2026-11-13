const reportService = require('../services/reportService');

class ReportController {
  async createFacultyReport(req, res) {
    try {
      const data = await reportService.createFacultyReport(req.body);
      const kindLabel = data?.reportType === 'EXAM' ? 'Exam' : 'LT';
      res.status(201).json({
        success: true,
        message: `${kindLabel} report generated and sent to Subject Faculty successfully.`,
        data,
      });
    } catch (err) {
      console.error('Error creating faculty report:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to generate faculty report' });
    }
  }

  async getFacultyReports(req, res) {
    try {
      const { subject, standard, alertStatus, ltId, examId, reportType } = req.query;
      const data = await reportService.getFacultyReports({
        subject,
        standard,
        alertStatus,
        ltId,
        examId,
        reportType,
      });
      res.json({ success: true, count: data.length, data });
    } catch (err) {
      console.error('Error fetching faculty reports:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch faculty reports' });
    }
  }

  async acknowledgeReport(req, res) {
    try {
      const data = await reportService.acknowledgeReport(req.params.id);
      res.json({ success: true, message: 'Report acknowledged', data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message || 'Failed to acknowledge report' });
    }
  }
}

module.exports = new ReportController();

