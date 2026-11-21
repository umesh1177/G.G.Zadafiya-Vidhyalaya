/**
 * Student Controller
 */
const studentService = require('../services/studentService');

exports.getStudents = async (req, res) => {
  try {
    const filters = {
      search: req.query.search || '',
      standard: req.query.standard || '',
      division: req.query.division || '',
      streamGroup: req.query.streamGroup || '',
      status: req.query.status || 'ACTIVE',
      sortBy: req.query.sortBy || 'rollNo',
      sortOrder: req.query.sortOrder || 'asc',
    };
    const students = await studentService.getStudents(filters);
    res.json({ success: true, count: students.length, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await studentService.getStudentById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const student = await studentService.createStudent(req.body);
    res.status(201).json({ success: true, message: 'Student registered successfully', data: student });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const updated = await studentService.updateStudent(req.params.id, req.body);
    res.json({ success: true, message: 'Student updated successfully', data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const deleted = await studentService.deleteStudent(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, message: 'Student removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStatistics = async (req, res) => {
  try {
    const stats = await studentService.getStatistics();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const { buffer, fileName } = studentService.generateTemplate();
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
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.bulkUpload = async (req, res) => {
  try {
    const result = await studentService.bulkUpload(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

