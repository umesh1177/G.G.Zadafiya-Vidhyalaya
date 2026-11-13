const mongoose = require('mongoose');
const LT = require('../models/LT');
const LTMarks = require('../models/LTMarks');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const FacultyReport = require('../models/FacultyReport');
const {
  analyzeClassDistribution,
  computeScoreTrajectory,
  computeConsistentPerformers,
  retrainMlModel,
  loadMlModel,
  normalizeStd,
  formatStdDisplay,
} = require('./ltAnalyticsEngine');

class LtService {
  normalizeStandard(std) {
    if (!std) return 'STD_12';
    const s = String(std).toUpperCase().trim();
    if (s.includes('11')) return 'STD_11';
    return 'STD_12';
  }

  normalizeDivision(div) {
    if (!div) return 'ALL';
    const d = String(div).toUpperCase().trim();
    if (d === 'A' || d === 'DIVISION A') return 'A';
    if (d === 'B' || d === 'DIVISION B') return 'B';
    return 'ALL';
  }

  normalizeSubjectRegex(subject) {
    if (!subject) return null;
    const s = String(subject).trim().toLowerCase();
    if (s.includes('chem')) return /^chem/i;
    if (s.includes('phys')) return /^phys/i;
    if (s.includes('math')) return /^math/i;
    if (s.includes('bio')) return /^bio/i;
    return new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }

  normalizeBaseSubject(subj) {
    if (!subj) return 'Physics';
    const s = String(subj).trim().toLowerCase();
    if (s.includes('chem')) return 'Chemistry';
    if (s.includes('phys')) return 'Physics';
    if (s.includes('math')) return 'Mathematics';
    if (s.includes('bio')) return 'Biology';
    return subj;
  }

  async getAllLts(filters = {}) {
    const query = {};
    if (filters.subject) query.subject = this.normalizeSubjectRegex(filters.subject);
    if (filters.standard) query.standard = this.normalizeStandard(filters.standard);
    if (filters.status) query.status = filters.status;

    return await LT.find(query)
      .populate('marksEnteredBy', 'fullName firstName lastName role')
      .sort({ ltNo: -1, createdAt: -1 });
  }

  async getLtById(idOrNo) {
    let lt = null;
    if (mongoose.Types.ObjectId.isValid(idOrNo)) {
      lt = await LT.findById(idOrNo).populate('marksEnteredBy', 'fullName firstName lastName role');
    }
    if (!lt && !isNaN(Number(idOrNo))) {
      lt = await LT.findOne({ ltNo: Number(idOrNo) }).populate('marksEnteredBy', 'fullName firstName lastName role');
    }
    if (!lt) {
      throw new Error('Lecture Test (LT) not found.');
    }
    return lt;
  }

  async createLt(data) {
    // Verify subject faculty isolation: subject faculty can ONLY create LT for their assigned subject
    if (data.subjectFacultyId) {
      let faculty = null;
      if (mongoose.Types.ObjectId.isValid(data.subjectFacultyId)) {
        faculty = await Faculty.findById(data.subjectFacultyId);
      }
      if (!faculty) {
        faculty = await Faculty.findOne({
          $or: [
            { empCode: String(data.subjectFacultyId).toUpperCase() },
            { email: String(data.subjectFacultyId).toLowerCase() },
          ],
        });
      }

      if (faculty && faculty.role === 'Subject Faculty' && faculty.subject) {
        const facBase = this.normalizeBaseSubject(faculty.subject);
        const ltBase = this.normalizeBaseSubject(data.subject);
        if (facBase !== ltBase) {
          throw new Error(
            `Access Denied: Subject Faculty (${faculty.fullName || faculty.firstName}) assigned to ${faculty.subject} cannot set LT for ${data.subject || 'another subject'}.`
          );
        }
      }
    }

    const lastLt = await LT.findOne().sort({ ltNo: -1 });
    const nextLtNo = (lastLt?.ltNo || 0) + 1;

    const standard = this.normalizeStandard(data.standard);
    const division = this.normalizeDivision(data.division);

    const parsedQuestions = (data.questions || [])
      .filter(q => q && q.questionText && String(q.questionText).trim())
      .map((q, idx) => ({
        questionNo: idx + 1,
        questionText: String(q.questionText).trim(),
        sourceTopicCode: q.sourceTopicCode || '',
        sourceTopicTitle: q.sourceTopicTitle || '',
        marks: Number(q.marks) || 2,
      }));

    const topicsCovered =
      Array.isArray(data.topicsCovered) && data.topicsCovered.length > 0
        ? data.topicsCovered
        : parsedQuestions.map(q => q.sourceTopicTitle || q.questionText);

    const examDt = data.examDate ? new Date(data.examDate) : new Date();

    const newLt = await LT.create({
      ltNo: nextLtNo,
      title: data.title || `LT #${nextLtNo} - ${data.subject || 'Physics'}`,
      subject: data.subject || 'Physics',
      standard,
      division,
      examDate: examDt,
      takenDate: data.takenDate ? new Date(data.takenDate) : examDt,
      duration: (data.duration !== undefined && !isNaN(Number(data.duration))) ? Math.max(0, Number(data.duration)) : 15,
      durationSeconds: (data.durationSeconds !== undefined && !isNaN(Number(data.durationSeconds))) ? Math.max(0, Math.min(59, Number(data.durationSeconds))) : 0,
      note: data.note || '',
      facultyName: data.facultyName || '',
      subjectFacultyId: mongoose.Types.ObjectId.isValid(data.subjectFacultyId) ? data.subjectFacultyId : undefined,
      topicsCovered,
      questions: parsedQuestions,
      status: 'SCHEDULED',
    });

    return newLt;
  }

  async updateLt(idOrNo, data) {
    const lt = await this.getLtById(idOrNo);

    if (data.subject !== undefined) {
      const facId = data.subjectFacultyId || lt.subjectFacultyId;
      if (facId) {
        let faculty = null;
        if (mongoose.Types.ObjectId.isValid(facId)) faculty = await Faculty.findById(facId);
        if (!faculty) {
          faculty = await Faculty.findOne({
            $or: [{ empCode: String(facId).toUpperCase() }, { email: String(facId).toLowerCase() }],
          });
        }
        if (faculty && faculty.role === 'Subject Faculty' && faculty.subject) {
          const facBase = this.normalizeBaseSubject(faculty.subject);
          const ltBase = this.normalizeBaseSubject(data.subject);
          if (facBase !== ltBase) {
            throw new Error(
              `Access Denied: Subject Faculty (${faculty.fullName || faculty.firstName}) assigned to ${faculty.subject} cannot set LT for ${data.subject}.`
            );
          }
        }
      }
      lt.subject = data.subject;
    }
    if (data.standard !== undefined) lt.standard = this.normalizeStandard(data.standard);
    if (data.division !== undefined) lt.division = this.normalizeDivision(data.division);
    if (data.examDate !== undefined) {
      lt.examDate = new Date(data.examDate);
      if (!lt.takenDate) lt.takenDate = new Date(data.examDate);
    }
    if (data.takenDate !== undefined) lt.takenDate = new Date(data.takenDate);
    if (data.duration !== undefined && !isNaN(Number(data.duration))) lt.duration = Math.max(0, Number(data.duration));
    if (data.durationSeconds !== undefined && !isNaN(Number(data.durationSeconds))) lt.durationSeconds = Math.max(0, Math.min(59, Number(data.durationSeconds)));
    if (data.note !== undefined) lt.note = data.note;
    if (data.status !== undefined) {
      lt.status = data.status;
      // Record takenDate when conducted if not yet set
      if (data.status === 'CONDUCTED' && !lt.takenDate) {
        lt.takenDate = lt.examDate || new Date();
      }
    }

    if (Array.isArray(data.questions)) {
      lt.questions = data.questions
        .filter(q => q && q.questionText && String(q.questionText).trim())
        .map((q, idx) => ({
          questionNo: idx + 1,
          questionText: String(q.questionText).trim(),
          sourceTopicCode: q.sourceTopicCode || '',
          sourceTopicTitle: q.sourceTopicTitle || '',
          marks: Number(q.marks) || 2,
        }));
      lt.topicsCovered =
        Array.isArray(data.topicsCovered) && data.topicsCovered.length > 0
          ? data.topicsCovered
          : lt.questions.map(q => q.sourceTopicTitle || q.questionText);
    }

    await lt.save();
    return lt;
  }

  async deleteLt(idOrNo) {
    const lt = await this.getLtById(idOrNo);
    await LTMarks.deleteMany({ ltId: lt._id });
    await FacultyReport.deleteMany({ ltId: lt._id });
    return await LT.findByIdAndDelete(lt._id);
  }

  async getLtMarks(idOrNo) {
    const lt = await this.getLtById(idOrNo);
    const marks = await LTMarks.find({ ltId: lt._id }).populate('studentId', 'rollNo fullName firstName lastName standard division');
    return marks;
  }

  async saveLtMarks(idOrNo, entries = [], assistantFacultyId = null, assistantName = '') {
    const lt = await this.getLtById(idOrNo);

    // Resolve assistant faculty name from DB if ID is valid
    let resolvedAssistantName = (assistantName || '').trim();
    const validAssistantId = mongoose.Types.ObjectId.isValid(assistantFacultyId) ? assistantFacultyId : null;
    if (validAssistantId && !resolvedAssistantName) {
      const fac = await Faculty.findById(validAssistantId).select('fullName firstName lastName');
      if (fac) {
        resolvedAssistantName = fac.fullName || [fac.firstName, fac.lastName].filter(Boolean).join(' ');
      }
    }
    if (!resolvedAssistantName) {
      resolvedAssistantName = 'Assistant Faculty';
    }

    for (const entry of entries) {
      let studentObjId = entry.studentId;
      if (!mongoose.Types.ObjectId.isValid(studentObjId) && entry.rollNo) {
        const studentDoc = await Student.findOne({ rollNo: Number(entry.rollNo) });
        if (studentDoc) studentObjId = studentDoc._id;
      }
      if (!mongoose.Types.ObjectId.isValid(studentObjId)) continue;

      await LTMarks.findOneAndUpdate(
        { ltId: lt._id, studentId: studentObjId },
        {
          ltId: lt._id,
          studentId: studentObjId,
          rollNo: entry.rollNo,
          studentName: entry.studentName || entry.name,
          assistantFacultyId: validAssistantId || undefined,
          grade: entry.mark || entry.grade || 'Better',
          evaluatedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    lt.status = 'EVALUATED';
    lt.marksEnteredAt = new Date();
    if (validAssistantId) lt.marksEnteredBy = validAssistantId;
    lt.marksEnteredByName = resolvedAssistantName;
    if (!lt.takenDate) lt.takenDate = lt.examDate || new Date();
    await lt.save();

    return await this.getLtMarks(lt._id);
  }

  /**
   * Principal Overview: returns evaluated LTs + pending LTs enriched with ML class averages,
   * takenDate, marksEnteredAt, marksEnteredByName, standard, and filter options.
   */
  async getAnalyticsOverview() {
    const [allLts, allMarks, assistantDocs] = await Promise.all([
      LT.find()
        .populate('marksEnteredBy', 'fullName firstName lastName empCode')
        .sort({ examDate: -1, ltNo: -1 }),
      LTMarks.find().populate('studentId', 'rollNo fullName firstName lastName standard division'),
      Faculty.find({ role: 'Assistant Faculty' }).select('fullName firstName lastName empCode status'),
    ]);

    const marksByLtId = new Map();
    allMarks.forEach((m) => {
      const k = String(m.ltId);
      if (!marksByLtId.has(k)) marksByLtId.set(k, []);
      marksByLtId.get(k).push(m);
    });

    const assistantNamesSet = new Set();
    assistantDocs.forEach((a) => {
      const nm = a.fullName || [a.firstName, a.lastName].filter(Boolean).join(' ');
      if (nm) assistantNamesSet.add(nm);
    });

    const uniqueTopicsSet = new Set();

    const enrichedLts = allLts.map((lt) => {
      const ltId = String(lt._id);
      const ltMarks = marksByLtId.get(ltId) || [];
      const analysis = analyzeClassDistribution(ltMarks);

      const enteredBy =
        lt.marksEnteredByName ||
        lt.marksEnteredBy?.fullName ||
        (lt.marksEnteredBy?.firstName
          ? `${lt.marksEnteredBy.firstName} ${lt.marksEnteredBy.lastName || ''}`.trim()
          : '');
      if (enteredBy) assistantNamesSet.add(enteredBy);

      (lt.topicsCovered || []).forEach((t) => {
        if (t && String(t).trim()) uniqueTopicsSet.add(String(t).trim());
      });

      const marksEntryDate =
        lt.marksEnteredAt ||
        (ltMarks.length > 0 ? ltMarks[0].evaluatedAt || ltMarks[0].updatedAt : null) ||
        (lt.status === 'EVALUATED' ? lt.updatedAt : null);

      return {
        id: ltId,
        ltNo: lt.ltNo,
        title: lt.title,
        subject: lt.subject,
        standard: normalizeStd(lt.standard),
        standardLabel: formatStdDisplay(lt.standard),
        division: lt.division || 'ALL',
        takenDate: lt.takenDate || lt.examDate,
        examDate: lt.examDate,
        marksEnteredAt: marksEntryDate,
        marksEnteredByName: enteredBy || 'Assistant Faculty',
        status: lt.status,
        topicsCovered: lt.topicsCovered || [],
        questionsCount: lt.questions?.length || 0,
        overallAverage: lt.status === 'EVALUATED' ? analysis.overallAverage : null,
        classAverageScore: lt.status === 'EVALUATED' ? analysis.classAverageScore : 0,
        classAveragePercent: lt.status === 'EVALUATED' ? analysis.classAveragePercent : 0,
        alertStatus: lt.status === 'EVALUATED' ? analysis.alertStatus : null,
        distribution: analysis.distribution,
      };
    });

    const evaluatedLts = enrichedLts.filter((l) => l.status === 'EVALUATED');
    const pendingLts = enrichedLts.filter((l) => l.status !== 'EVALUATED');

    const mlModel = loadMlModel();

    return {
      stats: {
        totalConducted: evaluatedLts.length,
        totalTopicsCovered: uniqueTopicsSet.size,
        totalPending: pendingLts.length,
        weakAlertCount: evaluatedLts.filter((l) => l.alertStatus === 'WEAK_TOPIC_UNDERSTANDING').length,
      },
      assistants: Array.from(assistantNamesSet).sort(),
      evaluatedLts,
      pendingLts,
      mlModelMeta: {
        version: mlModel.version,
        trainedAt: mlModel.trainedAt,
        topicClassifierAccuracy: mlModel.topicWeaknessModel.validationAccuracyPercent,
        consistencyClassifierAccuracy: mlModel.consistencyModel.validationAccuracyPercent,
      },
    };
  }

  /**
   * Principal Detailed Single-LT Analytics (Class average + alert + Donut distribution +
   * Score Increase/Decrease from previous same-subject LT + ML Consistent Good/Poor Performers)
   */
  async getLtDetailedAnalysis(idOrNo) {
    const currentLt = await this.getLtById(idOrNo);
    const curId = String(currentLt._id);

    const [allEvaluatedLts, allMarks, existingReports] = await Promise.all([
      LT.find({ status: 'EVALUATED' }).sort({ examDate: 1, ltNo: 1 }),
      LTMarks.find().populate('studentId', 'rollNo fullName firstName lastName standard division'),
      FacultyReport.find({ ltId: currentLt._id }).sort({ createdAt: -1 }),
    ]);

    const marksByLtId = new Map();
    allMarks.forEach((m) => {
      const k = String(m.ltId);
      if (!marksByLtId.has(k)) marksByLtId.set(k, []);
      marksByLtId.get(k).push(m);
    });

    const currentMarks = marksByLtId.get(curId) || [];
    const distAnalysis = analyzeClassDistribution(currentMarks);
    const trajectory = computeScoreTrajectory(currentLt, currentMarks, allEvaluatedLts, marksByLtId);
    const consistency = computeConsistentPerformers(currentLt, allEvaluatedLts, marksByLtId);

    const marksEnteredByName =
      currentLt.marksEnteredByName ||
      currentLt.marksEnteredBy?.fullName ||
      'Assistant Faculty';

    const marksEntryDate =
      currentLt.marksEnteredAt ||
      (currentMarks.length > 0 ? currentMarks[0].evaluatedAt || currentMarks[0].updatedAt : null) ||
      currentLt.updatedAt;

    return {
      lt: {
        id: curId,
        ltNo: currentLt.ltNo,
        title: currentLt.title,
        subject: currentLt.subject,
        standard: normalizeStd(currentLt.standard),
        standardLabel: formatStdDisplay(currentLt.standard),
        division: currentLt.division || 'ALL',
        takenDate: currentLt.takenDate || currentLt.examDate,
        examDate: currentLt.examDate,
        marksEnteredAt: marksEntryDate,
        marksEnteredByName,
        facultyName: currentLt.facultyName || '',
        subjectFacultyId: currentLt.subjectFacultyId || null,
        topicsCovered: currentLt.topicsCovered || [],
        questions: currentLt.questions || [],
        status: currentLt.status,
      },
      ...distAnalysis,
      trajectory,
      consistency,
      sentReports: existingReports.map((r) => {
        const obj = r.toJSON ? r.toJSON() : { ...r };
        if ((!obj.questions || obj.questions.length === 0) && Array.isArray(currentLt.questions)) {
          obj.questions = currentLt.questions;
        }
        return obj;
      }),
    };
  }

  async retrainAnalyticsModel() {
    return retrainMlModel();
  }
}

module.exports = new LtService();
