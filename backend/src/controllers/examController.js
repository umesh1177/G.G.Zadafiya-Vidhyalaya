const examService = require('../services/examService');

class ExamController {
  async getAllExams(req, res) {
    try {
      const { standard, division, examType, status, subject, facultyId, createdByRole } = req.query;
      const data = await examService.getAllExams({
        standard,
        division,
        examType,
        status,
        subject,
        facultyId,
        createdByRole,
      });
      res.json({ success: true, count: data.length, data });
    } catch (err) {
      console.error('Error fetching exams:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch exams' });
    }
  }

  async getExamById(req, res) {
    try {
      const data = await examService.getExamById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message || 'Exam not found' });
    }
  }

  async createExam(req, res) {
    try {
      const data = await examService.createExam(req.body);
      res.status(201).json({
        success: true,
        message: 'Exam created and synchronized successfully',
        data,
      });
    } catch (err) {
      console.error('Error creating exam:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to create exam' });
    }
  }

  async updateExam(req, res) {
    try {
      const data = await examService.updateExam(req.params.id, req.body);
      res.json({ success: true, message: 'Exam updated successfully', data });
    } catch (err) {
      console.error('Error updating exam:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to update exam' });
    }
  }

  async markExamCompleted(req, res) {
    try {
      const data = await examService.markExamCompleted(req.params.id);
      res.json({
        success: true,
        message: 'Exam moved to Pending Marks queue',
        data,
      });
    } catch (err) {
      console.error('Error completing exam:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to update exam status' });
    }
  }

  async uploadQuestionPaper(req, res) {
    try {
      const data = await examService.uploadQuestionPaper(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Question paper PDF uploaded successfully',
        data,
      });
    } catch (err) {
      console.error('Error uploading question paper:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to upload question paper PDF' });
    }
  }

  async downloadQuestionPaper(req, res) {
    try {
      const { filePath, fileName } = await examService.getQuestionPaperFile(req.params.id);
      const isDownload = req.query.download === '1' || req.query.download === 'true';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `${isDownload ? 'attachment' : 'inline'}; filename="${fileName.replace(/"/g, '')}"`
      );
      res.sendFile(filePath);
    } catch (err) {
      res.status(404).json({ success: false, message: err.message || 'Question paper PDF not found' });
    }
  }

  async deleteExam(req, res) {
    try {
      await examService.deleteExam(req.params.id);
      res.json({ success: true, message: 'Exam deleted successfully' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message || 'Failed to delete exam' });
    }
  }

  async getExamMarks(req, res) {
    try {
      const group = req.query.group || 'A';
      const includeAllStd = req.query.includeAllStd === 'true' || req.query.includeAllStd === '1';
      const data = await examService.getExamMarks(req.params.id, { group, includeAllStd });
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error fetching exam marks:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to fetch exam marks' });
    }
  }

  async saveExamMarks(req, res) {
    try {
      const { group, marks, assistantFacultyId, assistantName } = req.body;
      const data = await examService.saveExamMarks(req.params.id, {
        group,
        marks,
        assistantFacultyId,
        assistantName,
      });

      // Generate Excel file and save to Desktop/Exam Marks folder, returning base64 for browser download
      let excelExport = null;
      try {
        const { exportMarksToDesktopExcel } = require('../utils/examMarksExcelExporter');
        excelExport = exportMarksToDesktopExcel({
          examTitle: data?.exam?.title || `Exam #${data?.exam?.examNo}`,
          subject: data?.exam?.subject,
          standard: data?.exam?.standard,
          division: data?.exam?.division,
          examType: data?.exam?.examType,
          examDate: data?.exam?.examDate,
          assistantName,
          rows: data?.rows || marks || [],
          isMulti: Boolean(data?.isMulti),
          marksPerSubject: data?.marksPerSubject,
          thirdLabel: data?.thirdLabel,
        });
      } catch (exErr) {
        console.warn('Excel export error in saveExamMarks:', exErr.message);
      }

      res.json({
        success: true,
        message: 'Exam marks saved successfully',
        data: {
          ...data,
          excelDownload: excelExport,
        },
        excelDownload: excelExport,
      });
    } catch (err) {
      console.error('Error saving exam marks:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to save exam marks' });
    }
  }

  async updateSingleStudentMark(req, res) {
    try {
      const data = await examService.updateSingleStudentMark(
        req.params.id,
        req.params.studentKey,
        req.body
      );
      res.json({
        success: true,
        message: 'Student mark updated successfully',
        data,
      });
    } catch (err) {
      console.error('Error updating student mark:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to update student mark' });
    }
  }

  async getExamAnalysisSummary(req, res) {
    try {
      const { examType, standard, division, subject } = req.query;
      const data = await examService.getExamAnalysisSummary({
        examType,
        standard,
        division,
        subject,
      });
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error computing exam analysis summary:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to compute exam analysis summary' });
    }
  }

  async getExamDetailedAnalysis(req, res) {
    try {
      const scopeGroup = req.query.group || 'ALL';
      const data = await examService.getExamDetailedAnalysis(req.params.id, { scopeGroup });
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error computing exam detailed analysis:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to load exam analytics' });
    }
  }

  async retrainExamModel(req, res) {
    try {
      const data = await examService.retrainMlModel();
      res.json({
        success: true,
        message: 'Exam ML models retrained successfully',
        data,
      });
    } catch (err) {
      console.error('Error retraining exam ML model:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to retrain Exam ML model' });
    }
  }
}

module.exports = new ExamController();

