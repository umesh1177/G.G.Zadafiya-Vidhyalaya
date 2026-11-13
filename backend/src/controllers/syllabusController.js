const syllabusService = require('../services/syllabusService');

class SyllabusController {
  async getSyllabus(req, res) {
    try {
      const { standard, division, subject, facultyId, role } = req.query;
      const data = await syllabusService.getSyllabus({
        standard,
        division,
        subject,
        facultyId,
        role,
      });
      const stats = syllabusService.calculateCompletion(data);
      res.json({ success: true, count: data.length, stats, data });
    } catch (err) {
      console.error('Error fetching syllabus:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch syllabus' });
    }
  }

  async getTodayFinished(req, res) {
    try {
      const { subject, date, tzOffset, facultyId, role } = req.query;
      const data = await syllabusService.getTodayFinished({
        subject,
        localDate: date,
        tzOffset,
        facultyId,
        role,
      });
      res.json({ success: true, count: data.length, data });
    } catch (err) {
      console.error('Error fetching today finished topics:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch today finished topics' });
    }
  }

  async getPrincipalOverview(req, res) {
    try {
      const { standard, division, subject, facultyId, day, date, tzOffset } = req.query;
      const overview = await syllabusService.getPrincipalOverview({
        standard,
        division,
        subject,
        facultyId,
        day,
        localDate: date,
        tzOffset,
      });
      res.json({ success: true, data: overview });
    } catch (err) {
      console.error('Error fetching principal syllabus overview:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch principal overview' });
    }
  }

  async addChapter(req, res) {
    try {
      const chapter = await syllabusService.addChapter(req.body);
      res.status(201).json({ success: true, message: 'Chapter created successfully', data: chapter });
    } catch (err) {
      console.error('Error adding chapter:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to add chapter' });
    }
  }

  async addTopic(req, res) {
    try {
      const chapter = await syllabusService.addTopic(req.body);
      res.status(201).json({ success: true, message: 'Topic/Subtopic added successfully', data: chapter });
    } catch (err) {
      console.error('Error adding topic:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to add topic' });
    }
  }

  async toggleStatus(req, res) {
    try {
      const {
        chapterId,
        itemNo,
        itemType,
        itemId,
        parentTopicNo,
        facultyId,
        facultyName,
        facultyEmpCode,
        facultySubject,
      } = req.body;
      const chapter = await syllabusService.toggleStatus({
        chapterId,
        itemNo,
        itemType,
        itemId,
        parentTopicNo,
        facultyId,
        facultyName,
        facultyEmpCode,
        facultySubject,
      });
      res.json({ success: true, message: 'Status updated', data: chapter });
    } catch (err) {
      console.error('Error updating status:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to update status' });
    }
  }

  async deleteChapter(req, res) {
    try {
      await syllabusService.deleteChapter(req.params.id);
      res.json({ success: true, message: 'Chapter deleted' });
    } catch (err) {
      console.error('Error deleting chapter:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to delete chapter' });
    }
  }
}

module.exports = new SyllabusController();
