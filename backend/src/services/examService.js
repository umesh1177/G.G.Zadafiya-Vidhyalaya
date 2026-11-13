const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ExamUnit = require('../models/ExamUnit');
const ExamMarks = require('../models/ExamMarks');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const FacultyReport = require('../models/FacultyReport');
const {
  retrainExamMlModel,
  extractStudentScoreEntries,
  computeSummaryStatsFromEntries,
  computeSubjectAnalytics,
  buildExamDetailedAnalytics,
} = require('./examAnalyticsEngine');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/exam-papers');
const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB limit

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function normalizeExamType(raw = 'BOARD') {
  const s = String(raw || 'BOARD').trim().toUpperCase();
  if (s.includes('GUJCET')) return 'GUJCET';
  if (s.includes('JEE')) return 'JEE';
  if (s.includes('NEET')) return 'NEET';
  if (s.includes('BOARD')) return 'BOARD';
  if (s.includes('ANNUAL')) return 'ANNUAL';
  if (s.includes('WEEK')) return 'WEEKLY';
  return 'OTHER';
}

function normalizeStandard(std = 'STD_11') {
  const s = String(std || 'STD_11').trim().toUpperCase();
  if (s.includes('12')) return 'STD_12';
  return 'STD_11';
}

function normalizeDivision(div = 'ALL') {
  const d = String(div || 'ALL').trim().toUpperCase().replace(/^DIVISION\s+/i, '');
  if (['A', 'B', 'C', 'D'].includes(d)) return d;
  return 'ALL';
}

function inferStreamGroup(examType, explicitGroup = '') {
  const exp = String(explicitGroup || '').trim().toUpperCase();
  if (['GROUP_A', 'GROUP_B', 'GROUP_AB', 'ALL'].includes(exp) && exp !== '') {
    return exp;
  }
  if (examType === 'JEE') return 'GROUP_A';
  if (examType === 'NEET') return 'GROUP_B';
  if (examType === 'GUJCET') return 'GROUP_AB';
  return 'ALL';
}

function isMultiSubjectExamType(examType) {
  return ['JEE', 'NEET', 'GUJCET'].includes(normalizeExamType(examType));
}

function getSubjectsForExamGroup(examType, examSubject = 'Physics', group = 'A') {
  const type = normalizeExamType(examType);
  if (type === 'JEE') {
    return { effectiveGroup: 'A', subjects: ['Physics', 'Chemistry', 'Maths'], thirdLabel: 'Maths' };
  }
  if (type === 'NEET') {
    return { effectiveGroup: 'B', subjects: ['Physics', 'Chemistry', 'Biology'], thirdLabel: 'Biology' };
  }
  if (type === 'GUJCET') {
    const g = String(group || 'A').trim().toUpperCase() === 'B' ? 'B' : 'A';
    if (g === 'B') {
      return { effectiveGroup: 'B', subjects: ['Physics', 'Chemistry', 'Biology'], thirdLabel: 'Biology' };
    }
    return { effectiveGroup: 'A', subjects: ['Physics', 'Chemistry', 'Maths'], thirdLabel: 'Maths' };
  }
  return {
    effectiveGroup: 'ALL',
    subjects: [examSubject || 'Physics'],
    thirdLabel: examSubject || 'Physics',
  };
}

function buildUnitSummary(selectedUnits = [], fallbackSummary = '') {
  const trimmedFallback = String(fallbackSummary || '').trim();
  if (trimmedFallback) return trimmedFallback;
  if (!Array.isArray(selectedUnits) || selectedUnits.length === 0) return 'Custom Exam Unit';
  return selectedUnits.map(u => String(u.label || '').trim()).filter(Boolean).join('; ');
}

function buildChaptersFromSelectedUnits(selectedUnits = []) {
  const byChapter = new Map();
  (selectedUnits || []).forEach((u) => {
    const chNo = Number(u.chapterNo) || 0;
    const chName = u.chapterName || (chNo ? `Chapter ${chNo}` : 'Selected Units');
    const key = `${chNo}:${chName}`;
    if (!byChapter.has(key)) {
      byChapter.set(key, {
        chapterNo: chNo || undefined,
        chapterName: chName,
        topics: [],
      });
    }
    if (u.label) {
      byChapter.get(key).topics.push(String(u.label).trim());
    }
  });
  return Array.from(byChapter.values());
}

function parsePdfBase64Payload({ fileName = 'question-paper.pdf', base64Data = '' }) {
  if (!base64Data || typeof base64Data !== 'string') {
    throw new Error('Question paper PDF content is missing.');
  }
  const stripped = base64Data.replace(/^data:[^;]+;base64,/i, '').trim();
  if (!stripped) {
    throw new Error('Question paper PDF content is empty.');
  }
  const buffer = Buffer.from(stripped, 'base64');
  if (!buffer || buffer.length === 0) {
    throw new Error('Invalid base64 PDF payload.');
  }
  if (buffer.length > MAX_PDF_BYTES) {
    throw new Error('Question paper PDF exceeds maximum size of 15 MB.');
  }
  const magic = buffer.slice(0, 4).toString('ascii');
  if (magic !== '%PDF') {
    throw new Error('Uploaded file must be a valid PDF document.');
  }
  const safeBase = path
    .basename(String(fileName || 'question-paper.pdf'))
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  const finalName = safeBase.toLowerCase().endsWith('.pdf') ? safeBase : `${safeBase}.pdf`;
  return { buffer, fileName: finalName, size: buffer.length };
}

function buildExamMarksEntryPayload({
  entry,
  examType,
  examSubject,
  examGroup,
  marksPerSubject,
}) {
  const { effectiveGroup, subjects } = getSubjectsForExamGroup(examType, examSubject, examGroup);
  const maxPerSub = Number(marksPerSubject) > 0 ? Number(marksPerSubject) : 100;
  const isMulti = isMultiSubjectExamType(examType);
  const isAbsent = Boolean(entry.ab);

  const clampMark = (val) => {
    if (isAbsent || val === '' || val === null || val === undefined) return 0;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(maxPerSub, Math.round(n * 100) / 100);
  };

  let subjectMarks = [];
  if (isMulti) {
    const phyVal = clampMark(entry.phy);
    const chemVal = clampMark(entry.chem);
    const thirdVal = clampMark(entry.third);
    subjectMarks = [
      { subject: subjects[0], marksObtained: phyVal, totalMarks: maxPerSub },
      { subject: subjects[1], marksObtained: chemVal, totalMarks: maxPerSub },
      { subject: subjects[2], marksObtained: thirdVal, totalMarks: maxPerSub },
    ];
  } else {
    const singleVal = clampMark(entry.single ?? entry.marksObtained);
    subjectMarks = [
      { subject: subjects[0], marksObtained: singleVal, totalMarks: maxPerSub },
    ];
  }

  const totalObtained = isAbsent
    ? 0
    : Math.round(subjectMarks.reduce((acc, sm) => acc + sm.marksObtained, 0) * 100) / 100;
  const totalMaxMarks = subjectMarks.reduce((acc, sm) => acc + sm.totalMarks, 0);
  const percentage =
    isAbsent || totalMaxMarks <= 0
      ? 0
      : Math.round((totalObtained / totalMaxMarks) * 1000) / 10;

  return {
    examGroup: effectiveGroup,
    ab: isAbsent,
    subjectMarks,
    totalObtained,
    totalMaxMarks,
    percentage,
  };
}

class ExamService {
  constructor() {
    this._indexSynced = false;
  }

  async _ensureExamMarksIndex() {
    if (this._indexSynced) return;
    try {
      const indexes = await ExamMarks.collection.indexes();
      const legacy = indexes.find(
        (idx) =>
          idx.name === 'examId_1_studentId_1' ||
          (idx.key && idx.key.examId === 1 && idx.key.studentId === 1 && !idx.key.examGroup)
      );
      if (legacy && legacy.name) {
        await ExamMarks.collection.dropIndex(legacy.name);
      }
      await ExamMarks.syncIndexes();
      this._indexSynced = true;
    } catch {
      // Non-fatal in disconnected or fresh index states
      this._indexSynced = true;
    }
  }

  async _savePdfForExam(examDoc, pdfPayload) {
    const parsed = parsePdfBase64Payload(pdfPayload);
    ensureUploadDir();
    if (examDoc.questionPaperPath) {
      const oldFull = path.join(UPLOAD_DIR, path.basename(examDoc.questionPaperPath));
      if (fs.existsSync(oldFull)) {
        try {
          fs.unlinkSync(oldFull);
        } catch {
          // ignore cleanup failure
        }
      }
    }
    const storedFilename = `exam_${examDoc.examNo || examDoc._id}_${Date.now()}.pdf`;
    const destPath = path.join(UPLOAD_DIR, storedFilename);
    fs.writeFileSync(destPath, parsed.buffer);

    examDoc.questionPaperStatus = 'UPLOADED';
    examDoc.questionPaperFileName = parsed.fileName;
    examDoc.questionPaperPath = storedFilename;
    examDoc.questionPaperSize = parsed.size;
    examDoc.questionPaperUploadedAt = new Date();
    examDoc.questionPaperPdfUrl = `/api/exams/${examDoc._id}/question-paper`;
    await examDoc.save();
    return examDoc;
  }

  async getAllExams(filters = {}) {
    const query = {};
    if (filters.standard) query.standard = normalizeStandard(filters.standard);
    if (filters.division && filters.division !== 'ALL') {
      query.division = normalizeDivision(filters.division);
    }
    if (filters.examType && filters.examType !== 'ALL') {
      query.examType = normalizeExamType(filters.examType);
    }
    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }
    if (filters.createdByRole) {
      query.createdByRole = filters.createdByRole;
    }
    if (filters.subject) {
      const s = String(filters.subject).trim().toLowerCase();
      if (s.includes('chem')) query.subject = /^chem|pcm|pcb/i;
      else if (s.includes('phys')) query.subject = /^phys|pcm|pcb/i;
      else if (s.includes('math')) query.subject = /^math|pcm/i;
      else if (s.includes('bio')) query.subject = /^bio|pcb/i;
      else query.subject = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    if (filters.facultyId) {
      if (mongoose.Types.ObjectId.isValid(filters.facultyId)) {
        query.$or = [
          { createdByFacultyId: filters.facultyId },
          { facultyCode: String(filters.facultyId) },
        ];
      } else {
        query.facultyCode = String(filters.facultyId);
      }
    }

    return await ExamUnit.find(query).sort({ examDate: -1, examNo: -1, createdAt: -1 });
  }

  async getExamById(idOrNo) {
    let exam = null;
    if (mongoose.Types.ObjectId.isValid(idOrNo)) {
      exam = await ExamUnit.findById(idOrNo);
    }
    if (!exam && !isNaN(Number(idOrNo))) {
      exam = await ExamUnit.findOne({ examNo: Number(idOrNo) });
    }
    if (!exam) {
      throw new Error('Exam record not found.');
    }
    return exam;
  }

  async createExam(data) {
    const lastExam = await ExamUnit.findOne().sort({ examNo: -1 });
    const nextExamNo = Math.max(101, (lastExam?.examNo || 100) + 1);

    const examType = normalizeExamType(data.examType || data.type || 'BOARD');
    const standard = normalizeStandard(data.standard);
    const division = normalizeDivision(data.division);
    const isMulti = isMultiSubjectExamType(examType);

    let defaultSubj = data.subject || 'Physics';
    if (examType === 'JEE' && (!data.subject || data.subject === 'AUTO')) defaultSubj = 'PCM';
    if (examType === 'NEET' && (!data.subject || data.subject === 'AUTO')) defaultSubj = 'PCB';
    if (examType === 'GUJCET' && (!data.subject || data.subject === 'AUTO')) defaultSubj = 'PCMB';

    const marksPerSubject =
      Number(data.marksPerSubject) > 0
        ? Number(data.marksPerSubject)
        : Number(data.totalMarks) > 0 && !isMulti
        ? Number(data.totalMarks)
        : 100;
    const totalMarks =
      Number(data.totalMarks) > 0
        ? Number(data.totalMarks)
        : isMulti
        ? marksPerSubject * 3
        : marksPerSubject;

    const selectedUnits = Array.isArray(data.selectedUnits)
      ? data.selectedUnits.filter((u) => u && String(u.label || '').trim())
      : [];
    const unitSummary = buildUnitSummary(selectedUnits, data.unitSummary || data.unit || '');
    const chapters =
      Array.isArray(data.chapters) && data.chapters.length > 0
        ? data.chapters
        : buildChaptersFromSelectedUnits(selectedUnits);

    const createdByRole = ['faculty', 'assistant', 'principal'].includes(data.createdByRole)
      ? data.createdByRole
      : 'faculty';

    // Assistant-created exams go directly to 'CONDUCTED' (Pending Marks) unless explicitly specified
    const initialStatus =
      data.status && ['SCHEDULED', 'CONDUCTED', 'MARKS_ENTERED', 'RESULT_PUBLISHED'].includes(data.status)
        ? data.status
        : createdByRole === 'assistant'
        ? 'CONDUCTED'
        : 'SCHEDULED';

    const examDoc = await ExamUnit.create({
      examNo: nextExamNo,
      title:
        String(data.title || '').trim() ||
        `Exam #${nextExamNo} — ${defaultSubj} (${examType})`,
      examType,
      subject: defaultSubj,
      standard,
      division,
      streamGroup: inferStreamGroup(examType, data.streamGroup),
      examDate: data.examDate ? new Date(data.examDate) : new Date(),
      examTime: String(data.examTime || '10:00 AM').trim(),
      durationMinutes: Number(data.durationMinutes) > 0 ? Number(data.durationMinutes) : 60,
      marksPerSubject,
      totalMarks,
      unitSummary,
      selectedUnits,
      chapters,
      createdByFacultyId: mongoose.Types.ObjectId.isValid(data.createdByFacultyId)
        ? data.createdByFacultyId
        : undefined,
      facultyCode: String(data.facultyCode || '').trim(),
      facultyName: String(data.facultyName || '').trim(),
      createdByRole,
      questionPaperStatus: 'PENDING',
      status: initialStatus,
    });

    if (data.questionPaper && data.questionPaper.base64Data) {
      await this._savePdfForExam(examDoc, data.questionPaper);
    }

    return examDoc;
  }

  async uploadQuestionPaper(idOrNo, pdfPayload) {
    const exam = await this.getExamById(idOrNo);
    return await this._savePdfForExam(exam, pdfPayload);
  }

  async getQuestionPaperFile(idOrNo) {
    const exam = await this.getExamById(idOrNo);
    if (!exam.questionPaperPath || exam.questionPaperStatus !== 'UPLOADED') {
      throw new Error('No question paper PDF has been uploaded for this exam yet.');
    }
    const safeBasename = path.basename(exam.questionPaperPath);
    const fullPath = path.join(UPLOAD_DIR, safeBasename);
    if (!fs.existsSync(fullPath)) {
      throw new Error('Question paper PDF file was not found on server storage.');
    }
    return {
      filePath: fullPath,
      fileName: exam.questionPaperFileName || safeBasename,
      size: exam.questionPaperSize || fs.statSync(fullPath).size,
    };
  }

  async updateExam(idOrNo, data = {}) {
    const exam = await this.getExamById(idOrNo);
    if (data.examDate !== undefined) exam.examDate = new Date(data.examDate);
    if (data.examTime !== undefined) exam.examTime = String(data.examTime).trim();
    if (data.durationMinutes !== undefined && Number(data.durationMinutes) > 0) {
      exam.durationMinutes = Number(data.durationMinutes);
    }
    if (data.subject !== undefined) exam.subject = String(data.subject).trim();
    if (data.examType !== undefined) {
      exam.examType = normalizeExamType(data.examType);
      exam.streamGroup = inferStreamGroup(exam.examType, data.streamGroup);
    }
    if (data.standard !== undefined) exam.standard = normalizeStandard(data.standard);
    if (data.division !== undefined) exam.division = normalizeDivision(data.division);
    if (data.unitSummary !== undefined) exam.unitSummary = String(data.unitSummary).trim();
    if (Array.isArray(data.selectedUnits)) {
      exam.selectedUnits = data.selectedUnits;
      exam.chapters = buildChaptersFromSelectedUnits(data.selectedUnits);
    }
    if (data.marksPerSubject !== undefined && Number(data.marksPerSubject) > 0) {
      exam.marksPerSubject = Number(data.marksPerSubject);
      exam.totalMarks = isMultiSubjectExamType(exam.examType)
        ? exam.marksPerSubject * 3
        : exam.marksPerSubject;
    }
    if (data.status && ['SCHEDULED', 'CONDUCTED', 'MARKS_ENTERED', 'RESULT_PUBLISHED'].includes(data.status)) {
      exam.status = data.status;
    }
    await exam.save();
    return exam;
  }

  async markExamCompleted(idOrNo) {
    const exam = await this.getExamById(idOrNo);
    if (exam.status === 'SCHEDULED') {
      exam.status = 'CONDUCTED';
      await exam.save();
    }
    return exam;
  }

  async deleteExam(idOrNo) {
    const exam = await this.getExamById(idOrNo);
    if (exam.questionPaperPath) {
      const fullPath = path.join(UPLOAD_DIR, path.basename(exam.questionPaperPath));
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch {
          // ignore
        }
      }
    }
    await ExamMarks.deleteMany({ examId: exam._id });
    await FacultyReport.deleteMany({ examId: exam._id });
    return await ExamUnit.findByIdAndDelete(exam._id);
  }

  async getExamMarks(idOrNo, { group = 'A', includeAllStd = false } = {}) {
    await this._ensureExamMarksIndex();
    const exam = await this.getExamById(idOrNo);
    const { effectiveGroup, subjects, thirdLabel } = getSubjectsForExamGroup(
      exam.examType,
      exam.subject,
      group
    );
    const isMulti = isMultiSubjectExamType(exam.examType);

    const studentQuery = { status: 'ACTIVE', standard: exam.standard };
    if (exam.division && exam.division !== 'ALL') {
      studentQuery.division = exam.division;
    }

    const allClassStudents = await Student.find(studentQuery).sort({ division: 1, rollNo: 1 });

    let filteredStudents = allClassStudents;
    if (!includeAllStd) {
      if (exam.examType === 'JEE' || (exam.examType === 'GUJCET' && effectiveGroup === 'A')) {
        filteredStudents = allClassStudents.filter(
          (s) => s.streamGroup === 'GROUP_A' || s.streamGroup === 'GROUP_AB'
        );
      } else if (exam.examType === 'NEET' || (exam.examType === 'GUJCET' && effectiveGroup === 'B')) {
        filteredStudents = allClassStudents.filter(
          (s) => s.streamGroup === 'GROUP_B' || s.streamGroup === 'GROUP_AB'
        );
      } else {
        const subLow = String(exam.subject || '').toLowerCase();
        if (subLow.includes('math')) {
          filteredStudents = allClassStudents.filter(
            (s) => s.streamGroup === 'GROUP_A' || s.streamGroup === 'GROUP_AB'
          );
        } else if (subLow.includes('bio')) {
          filteredStudents = allClassStudents.filter(
            (s) => s.streamGroup === 'GROUP_B' || s.streamGroup === 'GROUP_AB'
          );
        }
      }
    }

    const savedMarks = await ExamMarks.find({
      examId: exam._id,
      ...(exam.examType === 'GUJCET' ? { examGroup: effectiveGroup } : {}),
    }).populate('studentId', 'rollNo fullName firstName lastName standard division streamGroup');

    const savedByStudentId = new Map();
    savedMarks.forEach((m) => {
      const sid = String(m.studentId?._id || m.studentId);
      savedByStudentId.set(sid, m);
    });

    const rows = filteredStudents.map((s) => {
      const sid = String(s._id);
      const saved = savedByStudentId.get(sid);
      const mapBySub = new Map();
      (saved?.subjectMarks || []).forEach((sm) => {
        mapBySub.set(String(sm.subject || '').toLowerCase(), sm.marksObtained);
      });

      const phyVal = isMulti && saved && !saved.ab ? String(mapBySub.get('physics') ?? 0) : '';
      const chemVal = isMulti && saved && !saved.ab ? String(mapBySub.get('chemistry') ?? 0) : '';
      const thirdKey = thirdLabel.toLowerCase();
      const thirdVal = isMulti && saved && !saved.ab ? String(mapBySub.get(thirdKey) ?? 0) : '';
      const singleVal =
        !isMulti && saved && !saved.ab
          ? String(saved.subjectMarks?.[0]?.marksObtained ?? saved.totalObtained ?? 0)
          : '';

      return {
        studentId: sid,
        rollNo: s.rollNo,
        name: s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' '),
        standard: s.standard,
        division: s.division,
        streamGroup: s.streamGroup,
        examGroup: effectiveGroup,
        ab: saved ? Boolean(saved.ab) : false,
        phy: phyVal,
        chem: chemVal,
        third: thirdVal,
        single: singleVal,
        totalObtained: saved ? saved.totalObtained : 0,
        totalMaxMarks: saved
          ? saved.totalMaxMarks
          : isMulti
          ? (exam.marksPerSubject || 100) * 3
          : exam.marksPerSubject || 100,
        percentage: saved ? saved.percentage : 0,
        subjectMarks: saved?.subjectMarks || [],
        hasSavedRecord: Boolean(saved),
      };
    });

    return {
      exam,
      effectiveGroup,
      subjects,
      thirdLabel,
      isMulti,
      marksPerSubject: exam.marksPerSubject || 100,
      allClassStudentsCount: allClassStudents.length,
      rows,
    };
  }

  async _resolveAssistantMeta(assistantFacultyId, assistantName) {
    let resolvedName = String(assistantName || '').trim();
    const validId = mongoose.Types.ObjectId.isValid(assistantFacultyId) ? assistantFacultyId : null;
    if (validId && !resolvedName) {
      const fac = await Faculty.findById(validId).select('fullName firstName lastName');
      if (fac) {
        resolvedName = fac.fullName || [fac.firstName, fac.lastName].filter(Boolean).join(' ');
      }
    }
    return {
      validAssistantId: validId,
      resolvedName: resolvedName || 'Assistant Faculty',
    };
  }

  async saveExamMarks(idOrNo, { group = 'A', marks = [], assistantFacultyId = null, assistantName = '' } = {}) {
    await this._ensureExamMarksIndex();
    const exam = await this.getExamById(idOrNo);
    const { validAssistantId, resolvedName } = await this._resolveAssistantMeta(
      assistantFacultyId,
      assistantName
    );
    const { effectiveGroup } = getSubjectsForExamGroup(exam.examType, exam.subject, group);

    let savedCount = 0;
    for (const entry of marks) {
      let studentDoc = null;
      if (mongoose.Types.ObjectId.isValid(entry.studentId)) {
        studentDoc = await Student.findById(entry.studentId);
      } else if (entry.rollNo) {
        studentDoc = await Student.findOne({
          standard: exam.standard,
          rollNo: Number(entry.rollNo),
          ...(exam.division && exam.division !== 'ALL' ? { division: exam.division } : {}),
        });
      }
      if (!studentDoc) continue;

      const built = buildExamMarksEntryPayload({
        entry,
        examType: exam.examType,
        examSubject: exam.subject,
        examGroup: effectiveGroup,
        marksPerSubject: exam.marksPerSubject || 100,
      });

      await ExamMarks.findOneAndUpdate(
        { examId: exam._id, studentId: studentDoc._id, examGroup: built.examGroup },
        {
          examId: exam._id,
          studentId: studentDoc._id,
          rollNo: studentDoc.rollNo,
          studentName:
            entry.name ||
            studentDoc.fullName ||
            [studentDoc.firstName, studentDoc.lastName].filter(Boolean).join(' '),
          streamGroup: studentDoc.streamGroup,
          examGroup: built.examGroup,
          enteredByAssistantFacultyId: validAssistantId || undefined,
          enteredByName: resolvedName,
          ab: built.ab,
          subjectMarks: built.subjectMarks,
          totalObtained: built.totalObtained,
          totalMaxMarks: built.totalMaxMarks,
          percentage: built.percentage,
          enteredAt: new Date(),
        },
        { upsert: true, returnDocument: 'after' }
      );
      savedCount += 1;
    }

    if (savedCount > 0) {
      exam.status = 'MARKS_ENTERED';
      exam.marksEnteredAt = new Date();
      exam.marksEnteredByName = resolvedName;
      await exam.save();
    }

    return await this.getExamMarks(exam._id, { group: effectiveGroup });
  }

  async updateSingleStudentMark(idOrNo, studentKey, payload = {}) {
    await this._ensureExamMarksIndex();
    const exam = await this.getExamById(idOrNo);
    const { validAssistantId, resolvedName } = await this._resolveAssistantMeta(
      payload.assistantFacultyId,
      payload.assistantName
    );

    let studentDoc = null;
    if (mongoose.Types.ObjectId.isValid(studentKey)) {
      studentDoc = await Student.findById(studentKey);
    } else if (!isNaN(Number(studentKey))) {
      studentDoc = await Student.findOne({
        standard: exam.standard,
        rollNo: Number(studentKey),
        ...(exam.division && exam.division !== 'ALL' ? { division: exam.division } : {}),
      });
    }
    if (!studentDoc) {
      throw new Error('Student not found for exam marks update.');
    }

    const built = buildExamMarksEntryPayload({
      entry: payload,
      examType: exam.examType,
      examSubject: exam.subject,
      examGroup: payload.group || 'A',
      marksPerSubject: exam.marksPerSubject || 100,
    });

    await ExamMarks.findOneAndUpdate(
      { examId: exam._id, studentId: studentDoc._id, examGroup: built.examGroup },
      {
        examId: exam._id,
        studentId: studentDoc._id,
        rollNo: studentDoc.rollNo,
        studentName:
          studentDoc.fullName || [studentDoc.firstName, studentDoc.lastName].filter(Boolean).join(' '),
        streamGroup: studentDoc.streamGroup,
        examGroup: built.examGroup,
        enteredByAssistantFacultyId: validAssistantId || undefined,
        enteredByName: resolvedName,
        ab: built.ab,
        subjectMarks: built.subjectMarks,
        totalObtained: built.totalObtained,
        totalMaxMarks: built.totalMaxMarks,
        percentage: built.percentage,
        enteredAt: new Date(),
      },
      { upsert: true, new: true }
    );

    if (exam.status !== 'MARKS_ENTERED') {
      exam.status = 'MARKS_ENTERED';
      exam.marksEnteredAt = new Date();
      exam.marksEnteredByName = resolvedName;
      await exam.save();
    }

    return await this.getExamMarks(exam._id, { group: built.examGroup });
  }

  async getExamAnalysisSummary(filters = {}) {
    const allExams = await ExamUnit.find({})
      .sort({ examDate: -1, examNo: -1, createdAt: -1 })
      .lean();

    const evaluatedIds = allExams
      .filter((e) => e.status === 'MARKS_ENTERED' || e.status === 'RESULT_PUBLISHED')
      .map((e) => e._id);

    const allMarks = evaluatedIds.length
      ? await ExamMarks.find({ examId: { $in: evaluatedIds } }).lean()
      : [];

    const marksByExamId = new Map();
    allMarks.forEach((m) => {
      const k = String(m.examId);
      if (!marksByExamId.has(k)) marksByExamId.set(k, []);
      marksByExamId.get(k).push(m);
    });

    const stats = {
      total: allExams.length,
      board: 0,
      gujcet: 0,
      jee: 0,
      neet: 0,
      pending: 0,
      completed: 0,
    };

    const enriched = allExams.map((ex) => {
      const t = normalizeExamType(ex.examType);
      if (t === 'BOARD') stats.board += 1;
      else if (t === 'GUJCET') stats.gujcet += 1;
      else if (t === 'JEE') stats.jee += 1;
      else if (t === 'NEET') stats.neet += 1;

      const isCompleted = ex.status === 'MARKS_ENTERED' || ex.status === 'RESULT_PUBLISHED';
      if (isCompleted) stats.completed += 1;
      else stats.pending += 1;

      const eid = String(ex._id);
      const mDocs = marksByExamId.get(eid) || [];
      let classAveragePercent = null;
      let averageMarks = null;
      let totalMaxMarks = ex.totalMarks || 100;
      let passStudents = 0;
      let failedStudents = 0;
      let presentCount = 0;
      let absentCount = 0;
      let marksEnteredByName = ex.marksEnteredByName || '';

      if (isCompleted && mDocs.length > 0) {
        const entries = extractStudentScoreEntries(ex, mDocs, { scopeGroup: 'ALL' });
        const summary = computeSummaryStatsFromEntries(entries);
        classAveragePercent = summary.classAveragePercent;
        averageMarks = summary.averageMarks;
        totalMaxMarks = summary.totalMaxMarks;
        passStudents = summary.passStudents;
        failedStudents = summary.failedStudents;
        presentCount = summary.presentCount;
        absentCount = summary.absentCount;
        if (!marksEnteredByName) {
          marksEnteredByName = mDocs.find((d) => d.enteredByName)?.enteredByName || 'Assistant Faculty';
        }
      }

      return {
        id: eid,
        examNo: ex.examNo,
        title: ex.title,
        examType: t,
        subject: ex.subject,
        standard: normalizeStandard(ex.standard),
        standardLabel: normalizeStandard(ex.standard) === 'STD_11' ? 'Standard 11' : 'Standard 12',
        division: ex.division || 'ALL',
        streamGroup: ex.streamGroup || 'ALL',
        examDate: ex.examDate,
        examTime: ex.examTime || '10:00 AM',
        unitSummary: ex.unitSummary || 'Syllabus Unit',
        questionPaperStatus: ex.questionPaperStatus || 'PENDING',
        status: ex.status,
        isCompleted,
        marksEnteredAt: ex.marksEnteredAt || null,
        marksEnteredByName: marksEnteredByName || 'Assistant Faculty',
        classAveragePercent,
        averageMarks,
        totalMaxMarks,
        passStudents,
        failedStudents,
        presentCount,
        absentCount,
      };
    });

    const filtered = enriched.filter((e) => {
      if (filters.examType && filters.examType !== 'ALL') {
        if (e.examType !== normalizeExamType(filters.examType)) return false;
      }
      if (filters.standard && filters.standard !== 'ALL') {
        if (e.standard !== normalizeStandard(filters.standard)) return false;
      }
      if (filters.division && filters.division !== 'ALL') {
        if (e.division !== 'ALL' && e.division !== normalizeDivision(filters.division)) return false;
      }
      if (filters.subject && filters.subject !== 'ALL') {
        const qSubj = String(filters.subject).trim().toLowerCase();
        const eSubj = String(e.subject || '').toLowerCase();
        if (qSubj.includes('chem') && !eSubj.includes('chem') && !eSubj.includes('pcm') && !eSubj.includes('pcb')) return false;
        if (qSubj.includes('phys') && !eSubj.includes('phys') && !eSubj.includes('pcm') && !eSubj.includes('pcb')) return false;
        if (qSubj.includes('math') && !eSubj.includes('math') && !eSubj.includes('pcm')) return false;
        if (qSubj.includes('bio') && !eSubj.includes('bio') && !eSubj.includes('pcb')) return false;
      }
      return true;
    });

    return {
      stats,
      completedExams: filtered.filter((e) => e.isCompleted),
      pendingExams: filtered.filter((e) => !e.isCompleted),
    };
  }

  async getExamDetailedAnalysis(idOrNo, { scopeGroup = 'ALL' } = {}) {
    const currentExam = await this.getExamById(idOrNo);
    const curId = String(currentExam._id);

    const allEvaluatedExams = await ExamUnit.find({
      $or: [
        { status: { $in: ['MARKS_ENTERED', 'RESULT_PUBLISHED'] } },
        { _id: currentExam._id },
      ],
    })
      .sort({ examDate: 1, examNo: 1, createdAt: 1 })
      .lean();

    const examIds = allEvaluatedExams.map((e) => e._id);
    const allMarks = await ExamMarks.find({ examId: { $in: examIds } })
      .populate('studentId', 'rollNo fullName firstName lastName standard division streamGroup')
      .lean();

    const marksByExamId = new Map();
    allMarks.forEach((m) => {
      const k = String(m.examId);
      if (!marksByExamId.has(k)) marksByExamId.set(k, []);
      marksByExamId.get(k).push(m);
    });

    const analytics = buildExamDetailedAnalytics(
      currentExam.toJSON ? currentExam.toJSON() : currentExam,
      allEvaluatedExams,
      marksByExamId,
      { scopeGroup }
    );

    const sentReports = await FacultyReport.find({
      reportType: 'EXAM',
      examId: curId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return {
      ...analytics,
      sentReports: sentReports.map((r) => ({ ...r, id: String(r._id) })),
    };
  }

  async getExamSubjectReportMetrics(idOrNo, targetSubject) {
    const currentExam = await this.getExamById(idOrNo);
    const allEvaluatedExams = await ExamUnit.find({
      $or: [
        { status: { $in: ['MARKS_ENTERED', 'RESULT_PUBLISHED'] } },
        { _id: currentExam._id },
      ],
    })
      .sort({ examDate: 1, examNo: 1, createdAt: 1 })
      .lean();

    const examIds = allEvaluatedExams.map((e) => e._id);
    const allMarks = await ExamMarks.find({ examId: { $in: examIds } })
      .populate('studentId', 'rollNo fullName firstName lastName standard division streamGroup')
      .lean();

    const marksByExamId = new Map();
    allMarks.forEach((m) => {
      const k = String(m.examId);
      if (!marksByExamId.has(k)) marksByExamId.set(k, []);
      marksByExamId.get(k).push(m);
    });

    const examObj = currentExam.toJSON ? currentExam.toJSON() : currentExam;
    const effectiveSubject = isMultiSubjectExamType(examObj.examType)
      ? targetSubject || 'Physics'
      : examObj.subject;

    const subjectMetrics = computeSubjectAnalytics(
      examObj,
      allEvaluatedExams,
      marksByExamId,
      effectiveSubject
    );

    return {
      exam: examObj,
      subjectMetrics,
    };
  }

  async retrainMlModel() {
    const model = retrainExamMlModel();
    return {
      version: model.version,
      trainedAt: model.trainedAt,
      examPerformanceAccuracy: model.examPerformanceModel.validationAccuracyPercent,
      studentTrajectoryAccuracy: model.studentTrajectoryModel.validationAccuracyPercent,
    };
  }
}

module.exports = new ExamService();
module.exports.helpers = {
  normalizeExamType,
  normalizeStandard,
  normalizeDivision,
  inferStreamGroup,
  isMultiSubjectExamType,
  getSubjectsForExamGroup,
  buildUnitSummary,
  parsePdfBase64Payload,
  buildExamMarksEntryPayload,
};
