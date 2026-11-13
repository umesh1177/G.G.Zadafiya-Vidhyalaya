const Student = require('../models/Student');
const DisciplineRemark = require('../models/DisciplineRemark');
const DisciplineType = require('../models/DisciplineType');

const DEFAULT_DISCIPLINE_TYPES = [
  'Come late',
  'Long hair',
  'Long nail',
  'Uniform issue',
  'Incomplete homework',
  'Mobile phone in class',
  'Class disturbance',
  'Absent without leave',
  'ID card missing',
  'Misbehavior in class',
];

function normalizeStandard(raw = 'STD_11') {
  const s = String(raw || 'STD_11').trim().toUpperCase();
  if (s.includes('12')) return 'STD_12';
  return 'STD_11';
}

function normalizeDivision(raw = 'A') {
  const d = String(raw || 'A').trim().toUpperCase().replace(/^DIVISION\s+/i, '');
  if (['A', 'B', 'C', 'D'].includes(d)) return d;
  return 'A';
}

function parseFlexibleDate(raw) {
  if (!raw) return new Date();
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
  const s = String(raw).trim();
  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

class DisciplineService {
  async ensureDefaultTypes() {
    const count = await DisciplineType.countDocuments();
    if (count === 0) {
      const ops = DEFAULT_DISCIPLINE_TYPES.map((name) => ({
        updateOne: {
          filter: { normalizedName: name.toLowerCase() },
          update: {
            $setOnInsert: {
              name,
              normalizedName: name.toLowerCase(),
              isDefault: true,
              usageCount: 0,
              createdBy: 'System',
            },
          },
          upsert: true,
        },
      }));
      await DisciplineType.bulkWrite(ops, { ordered: false });
    }
  }

  async getTypes() {
    await this.ensureDefaultTypes();
    const docs = await DisciplineType.find().sort({ isDefault: -1, usageCount: -1, name: 1 });
    return docs.map((d) => d.toJSON());
  }

  async addOrIncrementType(rawType, createdBy = 'Assistant Faculty') {
    await this.ensureDefaultTypes();
    const cleanName = String(rawType || '').trim();
    if (!cleanName) {
      throw new Error('Remark type cannot be empty.');
    }
    const normalizedName = cleanName.toLowerCase();
    const existing = await DisciplineType.findOne({ normalizedName });
    if (existing) {
      existing.usageCount = (existing.usageCount || 0) + 1;
      await existing.save();
      return { typeDoc: existing.toJSON(), addedNewType: false };
    }
    const created = await DisciplineType.create({
      name: cleanName,
      normalizedName,
      isDefault: false,
      usageCount: 1,
      createdBy: String(createdBy || 'Assistant Faculty').trim(),
    });
    return { typeDoc: created.toJSON(), addedNewType: true };
  }

  async deleteCustomType(id) {
    const doc = await DisciplineType.findById(id);
    if (!doc) throw new Error('Remark type not found.');
    if (doc.isDefault) {
      throw new Error('Default school discipline types cannot be removed.');
    }
    await DisciplineType.findByIdAndDelete(id);
    return true;
  }

  async lookupStudent({ standard, division, rollNo }) {
    const rollNum = Number(rollNo);
    if (!rollNum || rollNum < 1) {
      return null;
    }
    const std = normalizeStandard(standard);
    const div = normalizeDivision(division);

    let student = await Student.findOne({
      standard: std,
      division: div,
      rollNo: rollNum,
      status: 'ACTIVE',
    });

    if (!student) {
      student = await Student.findOne({
        standard: std,
        division: div,
        rollNo: rollNum,
      });
    }

    if (!student) return null;

    const priorRemarks = await DisciplineRemark.find({
      standard: std,
      division: div,
      rollNo: rollNum,
    })
      .sort({ date: -1, createdAt: -1 })
      .limit(5);

    const priorCount = await DisciplineRemark.countDocuments({
      standard: std,
      division: div,
      rollNo: rollNum,
    });

    return {
      id: student._id.toString(),
      _id: student._id.toString(),
      rollNo: student.rollNo,
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      fullName: student.fullName || [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
      standard: student.standard,
      division: student.division,
      streamGroup: student.streamGroup,
      contactNo: student.contactNo,
      email: student.email,
      status: student.status,
      priorFlagsCount: priorCount,
      recentFlags: priorRemarks.map((r) => ({
        id: r._id.toString(),
        type: r.type,
        date: r.date,
        message: r.message,
      })),
    };
  }

  async createRemark(payload = {}) {
    const rollNum = Number(payload.rollNo);
    if (!rollNum || rollNum < 1) {
      throw new Error('Valid Roll Number is required.');
    }
    const std = normalizeStandard(payload.standard);
    const div = normalizeDivision(payload.division);
    const typeClean = String(payload.type || '').trim();
    if (!typeClean) {
      throw new Error('Discipline remark type is required.');
    }
    const messageClean = String(payload.message || payload.description || '').trim();
    if (!messageClean) {
      throw new Error('Remark message / observation details are required.');
    }

    // Look up student in MongoDB so details stay authoritative
    let studentDoc = null;
    if (payload.studentId && String(payload.studentId).match(/^[0-9a-fA-F]{24}$/)) {
      studentDoc = await Student.findById(payload.studentId);
    }
    if (!studentDoc) {
      studentDoc = await Student.findOne({ standard: std, division: div, rollNo: rollNum });
    }

    const resolvedName = String(
      payload.studentName || payload.name || studentDoc?.fullName || ''
    ).trim();
    if (!resolvedName) {
      throw new Error('Student Name is required (no student record found for this Std/Div/Roll No).');
    }

    const notedBy = String(payload.notedBy || 'Assistant Faculty').trim();
    const { addedNewType } = await this.addOrIncrementType(typeClean, notedBy);

    const last = await DisciplineRemark.findOne().sort({ srNo: -1 }).select('srNo').lean();
    const nextSrNo = (last?.srNo || 0) + 1;

    const remark = await DisciplineRemark.create({
      srNo: nextSrNo,
      studentId: studentDoc ? studentDoc._id : null,
      rollNo: rollNum,
      studentName: resolvedName,
      standard: std,
      division: div,
      streamGroup: payload.streamGroup || studentDoc?.streamGroup || '',
      contactNo: payload.contactNo || studentDoc?.contactNo || '',
      email: payload.email || studentDoc?.email || '',
      type: typeClean,
      date: parseFlexibleDate(payload.date),
      message: messageClean,
      notedBy,
      notedByRole: payload.notedByRole || 'ASSISTANT_FACULTY',
      notedById: payload.notedById || '',
      status: 'OPEN',
    });

    const types = await this.getTypes();

    return {
      remark: remark.toJSON(),
      addedNewType,
      types,
    };
  }

  async getAllRemarks(filters = {}) {
    const query = {};
    if (filters.standard && filters.standard !== 'ALL') {
      query.standard = normalizeStandard(filters.standard);
    }
    if (filters.division && filters.division !== 'ALL') {
      query.division = normalizeDivision(filters.division);
    }
    if (filters.type && filters.type !== 'ALL') {
      query.type = { $regex: new RegExp(`^${String(filters.type).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    }
    if (filters.status && filters.status !== 'ALL') {
      query.status = String(filters.status).toUpperCase();
    }
    if (filters.rollNo) {
      query.rollNo = Number(filters.rollNo);
    }
    if (filters.studentId && String(filters.studentId).match(/^[0-9a-fA-F]{24}$/)) {
      query.studentId = filters.studentId;
    }
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim();
      const maybeRoll = !isNaN(q) ? Number(q) : null;
      query.$or = [
        { studentName: { $regex: q, $options: 'i' } },
        { type: { $regex: q, $options: 'i' } },
        { message: { $regex: q, $options: 'i' } },
        { notedBy: { $regex: q, $options: 'i' } },
        ...(maybeRoll ? [{ rollNo: maybeRoll }] : []),
      ];
    }

    const docs = await DisciplineRemark.find(query).sort({ date: -1, createdAt: -1 });
    return docs.map((d) => d.toJSON());
  }

  async getPrincipalOverview(filters = {}) {
    await this.ensureDefaultTypes();
    const minFlags = Number(filters.minFlags) >= 1 ? Number(filters.minFlags) : 2;

    const allRemarksDocs = await DisciplineRemark.find().sort({ date: -1, createdAt: -1 });
    const allRemarks = allRemarksDocs.map((d) => d.toJSON());
    const filteredRemarks = await this.getAllRemarks(filters);
    const types = await this.getTypes();

    // Time windows for KPIs
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOf30Days = new Date(startOfToday);
    startOf30Days.setDate(startOf30Days.getDate() - 30);

    let todayCount = 0;
    let thisWeekCount = 0;
    let openCount = 0;
    const typeCountsMap = new Map();
    const studentBuckets = new Map();

    // Group across ALL remarks (or filtered by standard/division if selected) so offender count reflects class scope
    const scopeRemarks = allRemarks.filter((r) => {
      if (filters.standard && filters.standard !== 'ALL' && r.standard !== normalizeStandard(filters.standard)) {
        return false;
      }
      if (filters.division && filters.division !== 'ALL' && r.division !== normalizeDivision(filters.division)) {
        return false;
      }
      if (filters.type && filters.type !== 'ALL' && r.type.toLowerCase() !== String(filters.type).trim().toLowerCase()) {
        return false;
      }
      if (filters.search && filters.search.trim() !== '') {
        const q = filters.search.trim().toLowerCase();
        const hit =
          String(r.studentName || '').toLowerCase().includes(q) ||
          String(r.rollNo || '').includes(q) ||
          String(r.type || '').toLowerCase().includes(q) ||
          String(r.message || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    scopeRemarks.forEach((r) => {
      const rDate = new Date(r.date || r.createdAt);
      if (rDate >= startOfToday) todayCount += 1;
      if (rDate >= startOfWeek) thisWeekCount += 1;
      if (r.status === 'OPEN') openCount += 1;

      const tKey = r.type || 'Other';
      typeCountsMap.set(tKey, (typeCountsMap.get(tKey) || 0) + 1);

      const sKey = `${r.standard}::${r.division}::${r.rollNo}`;
      if (!studentBuckets.has(sKey)) {
        studentBuckets.set(sKey, {
          studentKey: sKey,
          studentId: r.studentId ? String(r.studentId) : null,
          rollNo: r.rollNo,
          studentName: r.studentName,
          name: r.studentName,
          standard: r.standard,
          division: r.division,
          streamGroup: r.streamGroup || '',
          contactNo: r.contactNo || '',
          email: r.email || '',
          count: 0,
          recent30DaysCount: 0,
          openCount: 0,
          latestDate: r.date || r.createdAt,
          typeFreq: new Map(),
          history: [],
        });
      }
      const bucket = studentBuckets.get(sKey);
      bucket.count += 1;
      if (rDate >= startOf30Days) bucket.recent30DaysCount += 1;
      if (r.status === 'OPEN') bucket.openCount += 1;
      if (!bucket.contactNo && r.contactNo) bucket.contactNo = r.contactNo;
      if (!bucket.streamGroup && r.streamGroup) bucket.streamGroup = r.streamGroup;
      if (new Date(r.date || r.createdAt) > new Date(bucket.latestDate)) {
        bucket.latestDate = r.date || r.createdAt;
      }
      bucket.typeFreq.set(tKey, (bucket.typeFreq.get(tKey) || 0) + 1);
      bucket.history.push({
        id: r.id,
        srNo: r.srNo,
        type: r.type,
        date: r.date,
        message: r.message,
        notedBy: r.notedBy,
        notedByRole: r.notedByRole,
        status: r.status,
        principalNote: r.principalNote,
      });
    });

    const totalScope = scopeRemarks.length;
    const typeBreakdown = Array.from(typeCountsMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        percent: totalScope > 0 ? Math.round((count / totalScope) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const allStudentsList = Array.from(studentBuckets.values())
      .map((b) => {
        const typesSummary = Array.from(b.typeFreq.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);
        const topType = typesSummary[0]?.type || '—';
        let riskLevel = 'SINGLE';
        if (b.count >= 4) riskLevel = 'CRITICAL';
        else if (b.count >= 3) riskLevel = 'HIGH';
        else if (b.count >= 2) riskLevel = 'WATCH';

        return {
          studentKey: b.studentKey,
          studentId: b.studentId,
          rollNo: b.rollNo,
          studentName: b.studentName,
          name: b.name,
          standard: b.standard,
          division: b.division,
          streamGroup: b.streamGroup,
          contactNo: b.contactNo,
          email: b.email,
          count: b.count,
          recent30DaysCount: b.recent30DaysCount,
          openCount: b.openCount,
          latestDate: b.latestDate,
          topType,
          riskLevel,
          typesSummary,
          history: b.history,
        };
      })
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return new Date(b.latestDate) - new Date(a.latestDate);
      });

    const frequentOffenders = allStudentsList.filter((s) => s.count >= minFlags);
    const repeat2PlusCount = allStudentsList.filter((s) => s.count >= 2).length;
    const critical3PlusCount = allStudentsList.filter((s) => s.count >= 3).length;

    return {
      stats: {
        totalRemarks: totalScope,
        todayCount,
        thisWeekCount,
        openCount,
        uniqueStudentsFlagged: allStudentsList.length,
        frequentOffendersCount: repeat2PlusCount,
        criticalOffendersCount: critical3PlusCount,
        topInfractionType: typeBreakdown[0] || { type: 'None', count: 0, percent: 0 },
      },
      typeBreakdown,
      frequentOffenders,
      remarks: filteredRemarks,
      types,
    };
  }

  async updateRemark(id, data = {}) {
    const doc = await DisciplineRemark.findById(id);
    if (!doc) throw new Error('Discipline remark not found.');

    if (data.status && ['OPEN', 'REVIEWED', 'RESOLVED'].includes(String(data.status).toUpperCase())) {
      doc.status = String(data.status).toUpperCase();
    }
    if (data.principalNote !== undefined) {
      doc.principalNote = String(data.principalNote || '').trim();
    }
    if (data.message !== undefined) {
      doc.message = String(data.message || '').trim();
    }
    if (data.type && String(data.type).trim()) {
      const cleanType = String(data.type).trim();
      await this.addOrIncrementType(cleanType, data.notedBy || doc.notedBy);
      doc.type = cleanType;
    }

    await doc.save();
    return doc.toJSON();
  }

  async deleteRemark(id) {
    const doc = await DisciplineRemark.findByIdAndDelete(id);
    if (!doc) throw new Error('Discipline remark not found.');
    return true;
  }
}

module.exports = new DisciplineService();

