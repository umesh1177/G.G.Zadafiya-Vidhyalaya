const mongoose = require('mongoose');
const FacultyReport = require('../models/FacultyReport');
const Faculty = require('../models/Faculty');
const ltService = require('./ltService');
const examService = require('./examService');

class ReportService {
  normalizeSubjectRegex(subject) {
    if (!subject) return null;
    const s = String(subject).trim().toLowerCase();
    if (s.includes('chem')) return /^chem/i;
    if (s.includes('phys')) return /^phys/i;
    if (s.includes('math')) return /^math/i;
    if (s.includes('bio')) return /^bio/i;
    return new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }

  async createFacultyReport(payload) {
    if (payload.reportType === 'EXAM' || payload.examId) {
      return await this.createExamFacultyReport(payload);
    }
    if (!payload.ltId) {
      throw new Error('ltId or examId is required to generate a faculty report.');
    }

    // Re-compute live authoritative LT analysis so stats match database state
    const analysis = await ltService.getLtDetailedAnalysis(payload.ltId);
    const { lt, distribution, overallAverage, classAveragePercent, classAverageScore, alertStatus, alertTitle, alertMessage } = analysis;

    // Resolve Subject Faculty if not explicitly provided
    let resolvedFacultyId = mongoose.Types.ObjectId.isValid(lt.subjectFacultyId) ? lt.subjectFacultyId : undefined;
    let resolvedFacultyName = lt.facultyName || '';
    if (!resolvedFacultyId && lt.subject) {
      const subjFac = await Faculty.findOne({
        role: 'Subject Faculty',
        subject: this.normalizeSubjectRegex(lt.subject),
        status: 'ACTIVE',
      }).select('fullName firstName lastName');
      if (subjFac) {
        resolvedFacultyId = subjFac._id;
        if (!resolvedFacultyName) {
          resolvedFacultyName = subjFac.fullName || [subjFac.firstName, subjFac.lastName].filter(Boolean).join(' ');
        }
      }
    }

    const report = await FacultyReport.create({
      reportType: 'LT',
      ltId: lt.id,
      ltNo: lt.ltNo,
      subject: lt.subject,
      targetSubject: lt.subject,
      standard: lt.standard,
      division: lt.division,
      subjectFacultyId: resolvedFacultyId,
      facultyName: resolvedFacultyName || `${lt.subject} Faculty`,
      ltDate: lt.takenDate || lt.examDate,
      markEntryDate: lt.marksEnteredAt,
      marksEnteredByName: lt.marksEnteredByName || 'Assistant Faculty',
      topicsCovered: lt.topicsCovered || [],
      questions: Array.isArray(lt.questions)
        ? lt.questions.map((q, idx) => ({
            questionNo: q.questionNo || idx + 1,
            questionText: q.questionText || '',
            sourceTopicCode: q.sourceTopicCode || '',
            sourceTopicTitle: q.sourceTopicTitle || '',
            marks: q.marks || 2,
          }))
        : [],
      classAverageLabel: overallAverage,
      classAveragePercent,
      classAverageScore,
      counts: {
        excellent: distribution.excellent || 0,
        better: distribution.better || 0,
        good: distribution.good || 0,
        ab: distribution.ab || 0,
        total: distribution.total || 0,
      },
      alertStatus,
      alertTitle,
      alertMessage,
      principalMessage: (payload.principalMessage || '').trim(),
      sentByName: (payload.sentByName || 'Principal').trim(),
      acknowledgedByFaculty: false,
    });

    return report;
  }

  async createExamFacultyReport(payload) {
    if (!payload.examId) {
      throw new Error('examId is required to generate an exam faculty report.');
    }

    const { exam, subjectMetrics } = await examService.getExamSubjectReportMetrics(
      payload.examId,
      payload.targetSubject || payload.subject
    );

    const chosenSubject = subjectMetrics.subject || payload.targetSubject || exam.subject;

    // Resolve target Subject Faculty
    let resolvedFacultyId = mongoose.Types.ObjectId.isValid(payload.subjectFacultyId)
      ? payload.subjectFacultyId
      : undefined;
    let resolvedFacultyName = '';
    if (resolvedFacultyId) {
      const f = await Faculty.findById(resolvedFacultyId).select('fullName firstName lastName');
      if (f) resolvedFacultyName = f.fullName || [f.firstName, f.lastName].filter(Boolean).join(' ');
    }
    if (!resolvedFacultyId && chosenSubject) {
      const subjFac = await Faculty.findOne({
        role: 'Subject Faculty',
        subject: this.normalizeSubjectRegex(chosenSubject),
        status: 'ACTIVE',
      }).select('fullName firstName lastName');
      if (subjFac) {
        resolvedFacultyId = subjFac._id;
        resolvedFacultyName = subjFac.fullName || [subjFac.firstName, subjFac.lastName].filter(Boolean).join(' ');
      }
    }

    const avgPct = subjectMetrics.classAveragePercent || 0;
    const classAverageLabel = avgPct >= 75 ? 'Excellent' : avgPct >= 55 ? 'Better' : 'Good';

    const report = await FacultyReport.create({
      reportType: 'EXAM',
      examId: exam._id || exam.id,
      examNo: exam.examNo,
      examType: exam.examType,
      targetSubject: chosenSubject,
      subject: chosenSubject,
      standard: exam.standard,
      division: exam.division || 'ALL',
      subjectFacultyId: resolvedFacultyId,
      facultyName: resolvedFacultyName || `${chosenSubject} Faculty`,
      examDate: exam.examDate,
      markEntryDate: exam.marksEnteredAt || null,
      marksEnteredByName: exam.marksEnteredByName || 'Assistant Faculty',
      unitSummary: exam.unitSummary || '',
      classAverageLabel,
      classAveragePercent: subjectMetrics.classAveragePercent,
      averageMarks: subjectMetrics.averageMarks,
      totalMarks: subjectMetrics.totalMaxMarks,
      highestMarks: subjectMetrics.highestMarks,
      lowestMarks: subjectMetrics.lowestMarks,
      passCount: subjectMetrics.passCount,
      failCount: subjectMetrics.failCount,
      absentCount: subjectMetrics.absentCount,
      growthRate: subjectMetrics.growthRate,
      downfallRate: subjectMetrics.downfallRate,
      previousExamNo: subjectMetrics.previousExam?.examNo || null,
      previousExamAveragePercent: subjectMetrics.previousExam?.averagePercent ?? null,
      counts: {
        excellent: subjectMetrics.strongCount || 0,
        better: subjectMetrics.midCount || 0,
        good: subjectMetrics.weakCount || 0,
        ab: subjectMetrics.absentCount || 0,
        total: subjectMetrics.totalStudents || 0,
      },
      alertStatus: subjectMetrics.alertStatus,
      alertTitle: subjectMetrics.alertTitle,
      alertMessage: subjectMetrics.alertMessage,
      principalMessage: (payload.principalMessage || '').trim(),
      sentByName: (payload.sentByName || 'Principal').trim(),
      acknowledgedByFaculty: false,
    });

    return report;
  }

  async getFacultyReports(filters = {}) {
    const query = {};
    if (filters.subject) {
      query.subject = this.normalizeSubjectRegex(filters.subject);
    }
    if (filters.standard) {
      const s = String(filters.standard).toUpperCase();
      query.standard = s.includes('11') ? 'STD_11' : 'STD_12';
    }
    if (filters.alertStatus) {
      query.alertStatus = filters.alertStatus;
    }
    if (filters.reportType && ['LT', 'EXAM'].includes(String(filters.reportType).toUpperCase())) {
      query.reportType = String(filters.reportType).toUpperCase();
    }
    if (filters.ltId && mongoose.Types.ObjectId.isValid(filters.ltId)) {
      query.ltId = filters.ltId;
    }
    if (filters.examId && mongoose.Types.ObjectId.isValid(filters.examId)) {
      query.examId = filters.examId;
    }

    const reports = await FacultyReport.find(query)
      .populate('ltId', 'questions topicsCovered')
      .sort({ createdAt: -1 });

    return reports.map((doc) => {
      const obj = doc.toJSON ? doc.toJSON() : { ...doc };
      if (!obj.reportType) obj.reportType = obj.examId ? 'EXAM' : 'LT';
      const populatedLt = doc.ltId && doc.ltId.questions ? doc.ltId : null;
      if (populatedLt) {
        obj.ltId = String(populatedLt._id || populatedLt.id);
        if ((!obj.questions || obj.questions.length === 0) && Array.isArray(populatedLt.questions)) {
          obj.questions = populatedLt.questions;
        }
        if ((!obj.topicsCovered || obj.topicsCovered.length === 0) && Array.isArray(populatedLt.topicsCovered)) {
          obj.topicsCovered = populatedLt.topicsCovered;
        }
      }
      return obj;
    });
  }

  async acknowledgeReport(reportId) {
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      throw new Error('Invalid report ID.');
    }
    const updated = await FacultyReport.findByIdAndUpdate(
      reportId,
      { acknowledgedByFaculty: true, acknowledgedAt: new Date() },
      { new: true }
    ).populate('ltId', 'questions topicsCovered');
    if (!updated) {
      throw new Error('Faculty report not found.');
    }
    const obj = updated.toJSON ? updated.toJSON() : { ...updated };
    const populatedLt = updated.ltId && updated.ltId.questions ? updated.ltId : null;
    if (populatedLt) {
      obj.ltId = String(populatedLt._id || populatedLt.id);
      if ((!obj.questions || obj.questions.length === 0) && Array.isArray(populatedLt.questions)) {
        obj.questions = populatedLt.questions;
      }
      if ((!obj.topicsCovered || obj.topicsCovered.length === 0) && Array.isArray(populatedLt.topicsCovered)) {
        obj.topicsCovered = populatedLt.topicsCovered;
      }
    }
    return obj;
  }
}

module.exports = new ReportService();

