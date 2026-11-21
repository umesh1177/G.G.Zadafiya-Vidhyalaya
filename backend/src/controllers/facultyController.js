const facultyService = require('../services/facultyService');

exports.getAllFaculty = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      subject: req.query.subject,
      role: req.query.role,
      status: req.query.status,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };
    const faculty = await facultyService.getFaculty(filters);
    res.json({ success: true, count: faculty.length, data: faculty });
  } catch (err) {
    next(err);
  }
};

exports.getFacultyById = async (req, res, next) => {
  try {
    const faculty = await facultyService.getFacultyById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    res.json({ success: true, data: faculty });
  } catch (err) {
    next(err);
  }
};

exports.createFaculty = async (req, res, next) => {
  try {
    const created = await facultyService.createFaculty(req.body);
    res.status(201).json({ success: true, message: 'Faculty registered successfully', data: created });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateFaculty = async (req, res, next) => {
  try {
    const updated = await facultyService.updateFaculty(req.params.id, req.body);
    res.json({ success: true, message: 'Faculty updated successfully', data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteFaculty = async (req, res, next) => {
  try {
    await facultyService.deleteFaculty(req.params.id);
    res.json({ success: true, message: 'Faculty deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getStatistics = async (req, res, next) => {
  try {
    const stats = await facultyService.getStatistics();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

exports.getTemplate = async (req, res, next) => {
  try {
    const { buffer, fileName } = facultyService.generateTemplate();
    if (req.query.format === 'json') {
      return res.json({
        success: true,
        fileName,
        fileBase64: buffer.toString('base64'),
      });
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

exports.bulkUpload = async (req, res, next) => {
  try {
    const result = await facultyService.bulkUpload(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

