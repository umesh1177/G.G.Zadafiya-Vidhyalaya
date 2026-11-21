/**
 * Access Control & Permissions Service
 * Handles tab visibility, subject marks entry permissions, and audit logging.
 */

const Faculty = require('../models/Faculty');
const AccessHistory = require('../models/AccessHistory');

// In-memory cache for fast sync and resilient persistence across sessions
const inMemoryCustomPermissions = new Map();

// Master Catalog of Configurable Tabs across Workspaces
const MASTER_TABS = [
  // Principal Workspace Tabs
  {
    id: '/principal/student-management',
    label: 'Student Management',
    group: 'Principal',
    badge: 'Academics',
    description: 'Enrollment, student directory, and profiles',
  },
  {
    id: '/principal/faculty-management',
    label: 'Faculty Management',
    group: 'Principal',
    badge: 'Staff',
    description: 'Faculty directory and credentials',
  },
  {
    id: '/principal/manage-access',
    label: 'Manage Access',
    group: 'Principal',
    badge: 'Security',
    description: 'Configure staff permissions and access audit logs',
  },
  {
    id: '/principal/exam-analysis',
    label: 'Exam Analysis',
    group: 'Principal',
    badge: 'Analytics',
    description: 'Institutional examination analytics & charts',
  },
  {
    id: '/principal/lt-analysis',
    label: 'LT Analysis',
    group: 'Principal',
    badge: 'Analytics',
    description: 'Daily Lecture Test performance metrics',
  },
  {
    id: '/principal/syllabus-tracking',
    label: 'Syllabus Tracking',
    group: 'Principal',
    badge: 'Curriculum',
    description: 'Track syllabus completion across subjects',
  },
  {
    id: '/principal/progress-report',
    label: 'Progress Report',
    group: 'Principal',
    badge: 'Reports',
    description: 'Comprehensive student academic growth dossiers',
  },
  {
    id: '/principal/discipline-remark',
    label: 'Discipline Remark',
    group: 'Principal',
    badge: 'Conduct',
    description: 'Student discipline tracking and remarks',
  },
  {
    id: '/principal/notice-message',
    label: 'Notice Message',
    group: 'Principal',
    badge: 'Communication',
    description: 'Send and broadcast official school circulars',
  },

  // Faculty Workspace Tabs
  {
    id: '/faculty/set-lt',
    label: 'Set LT',
    group: 'Faculty',
    badge: 'Daily Work',
    description: 'Schedule and set daily lecture tests',
  },
  {
    id: '/faculty/exam-unit',
    label: 'Exam Unit',
    group: 'Faculty',
    badge: 'Examinations',
    description: 'Create exam units, question papers & blueprints',
  },
  {
    id: '/faculty/syllabus',
    label: 'Syllabus',
    group: 'Faculty',
    badge: 'Curriculum',
    description: 'Track and mark completed chapters and topics',
  },
  {
    id: '/faculty/reports',
    label: 'Reports',
    group: 'Faculty',
    badge: 'Communication',
    description: 'Monthly faculty activity and progress reports',
  },
  {
    id: '/faculty/notice',
    label: 'Notice Message',
    group: 'Faculty',
    badge: 'Communication',
    description: 'View school bulletins and circulars',
  },

  // Assistant Workspace Tabs
  {
    id: '/assistant/lt',
    label: 'LT & Timer',
    group: 'Assistant',
    badge: 'Daily Work',
    description: 'Run live projector timer and enter daily LT marks',
  },
  {
    id: '/assistant/cbt-exam',
    label: 'CBT Exam',
    group: 'Assistant',
    badge: 'Online Exams',
    description: 'Create, extract and monitor CBT question papers',
  },
  {
    id: '/assistant/exam',
    label: 'Exam Unit',
    group: 'Assistant',
    badge: 'Daily Work',
    description: 'Enter and review marks for term and board exams',
  },
  {
    id: '/assistant/result',
    label: 'Result Generation',
    group: 'Assistant',
    badge: 'Results',
    description: 'Tabulate, rank and print student scorecards',
  },
  {
    id: '/assistant/hall-ticket',
    label: 'Hall Ticket',
    group: 'Assistant',
    badge: 'Exams',
    description: 'Generate and print exam admission passes',
  },
  {
    id: '/assistant/notice',
    label: 'Notice Message',
    group: 'Assistant',
    badge: 'Communication',
    description: 'Publish and review assistant notices',
  },
  {
    id: '/assistant/discipline-remark',
    label: 'Discipline Remark',
    group: 'Assistant',
    badge: 'Conduct',
    description: 'Log and monitor student disciplinary records',
  },
];

const MASTER_EXAM_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Mathematics',
  'Biology',
  'PCM',
  'PCB',
  'PCMB',
];

const MASTER_LT_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Mathematics',
  'Biology',
];

class AccessService {
  /**
   * Return master catalogs of configurable tabs & subjects
   */
  getMasterConfig() {
    return {
      tabs: MASTER_TABS,
      examSubjects: MASTER_EXAM_SUBJECTS,
      ltSubjects: MASTER_LT_SUBJECTS,
    };
  }

  /**
   * Calculate default role permissions for a faculty member
   */
  getDefaultPermissions(faculty) {
    const isAssistant = faculty.role === 'Assistant Faculty';
    const isPrincipal = faculty.role === 'Principal';

    // Tabs
    let accessibleTabs = [];
    if (isPrincipal) {
      accessibleTabs = MASTER_TABS.map((t) => t.id);
    } else if (isAssistant) {
      accessibleTabs = [
        '/assistant/lt',
        '/assistant/cbt-exam',
        '/assistant/exam',
        '/assistant/result',
        '/assistant/hall-ticket',
        '/assistant/notice',
        '/assistant/discipline-remark',
      ];
    } else {
      // Subject Faculty
      accessibleTabs = [
        '/faculty/set-lt',
        '/faculty/exam-unit',
        '/faculty/syllabus',
        '/faculty/reports',
        '/faculty/notice',
      ];
    }

    // Determine subjects from faculty.subject
    const rawSub = String(faculty.subject || '').toLowerCase();
    const examSubjects = [];
    const ltSubjects = [];

    if (rawSub.includes('physics')) {
      examSubjects.push('Physics');
      ltSubjects.push('Physics');
    }
    if (rawSub.includes('chem')) {
      examSubjects.push('Chemistry');
      ltSubjects.push('Chemistry');
    }
    if (rawSub.includes('math')) {
      examSubjects.push('Mathematics');
      ltSubjects.push('Mathematics');
    }
    if (rawSub.includes('bio')) {
      examSubjects.push('Biology');
      ltSubjects.push('Biology');
    }

    // Assistant with general lab or unspecified gets all subjects by default
    if (isAssistant && examSubjects.length === 0) {
      examSubjects.push('Physics', 'Chemistry', 'Mathematics', 'Biology');
      ltSubjects.push('Physics', 'Chemistry', 'Mathematics', 'Biology');
    }

    if (isPrincipal) {
      examSubjects.push(...MASTER_EXAM_SUBJECTS);
      ltSubjects.push(...MASTER_LT_SUBJECTS);
    }

    // Fallback if none detected
    if (examSubjects.length === 0 && faculty.subject) {
      examSubjects.push(faculty.subject);
      ltSubjects.push(faculty.subject);
    }

    return {
      accessibleTabs,
      allowedExamSubjects: [...new Set(examSubjects)],
      allowedLtSubjects: [...new Set(ltSubjects)],
    };
  }

  /**
   * Resolve effective permissions (saved permissions or role defaults)
   */
  resolveEffectivePermissions(faculty) {
    const defaults = this.getDefaultPermissions(faculty);
    const code = String(faculty.empCode || '').toUpperCase();
    const email = String(faculty.email || '').toLowerCase();
    const id = String(faculty._id || faculty.id || '');

    const memCached =
      inMemoryCustomPermissions.get(code) ||
      inMemoryCustomPermissions.get(email) ||
      inMemoryCustomPermissions.get(id);

    const saved =
      faculty.permissions &&
      ((Array.isArray(faculty.permissions.accessibleTabs) && faculty.permissions.accessibleTabs.length > 0) ||
        (Array.isArray(faculty.permissions.allowedExamSubjects) && faculty.permissions.allowedExamSubjects.length > 0))
        ? faculty.permissions
        : memCached || faculty.permissions || {};

    const accessibleTabs =
      Array.isArray(saved.accessibleTabs) && saved.accessibleTabs.length > 0
        ? saved.accessibleTabs
        : defaults.accessibleTabs;

    const allowedExamSubjects =
      Array.isArray(saved.allowedExamSubjects) && saved.allowedExamSubjects.length > 0
        ? saved.allowedExamSubjects
        : defaults.allowedExamSubjects;

    const allowedLtSubjects =
      Array.isArray(saved.allowedLtSubjects) && saved.allowedLtSubjects.length > 0
        ? saved.allowedLtSubjects
        : defaults.allowedLtSubjects;

    return {
      accessibleTabs: [...new Set(accessibleTabs)],
      allowedExamSubjects: [...new Set(allowedExamSubjects)],
      allowedLtSubjects: [...new Set(allowedLtSubjects)],
      isCustomized: Boolean(
        (saved.accessibleTabs && saved.accessibleTabs.length > 0) ||
        (saved.allowedExamSubjects && saved.allowedExamSubjects.length > 0) ||
        (saved.allowedLtSubjects && saved.allowedLtSubjects.length > 0)
      ),
    };
  }

  /**
   * Fast permission query by user employee code, email, or id
   */
  async getPermissionsForUser({ empCode = '', email = '', id = '' }) {
    let faculty = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      faculty = await Faculty.findById(id);
    }
    if (!faculty && empCode) {
      faculty = await Faculty.findOne({ empCode: empCode.toUpperCase() });
    }
    if (!faculty && email) {
      faculty = await Faculty.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    }

    if (faculty) {
      return this.resolveEffectivePermissions(faculty);
    }

    const code = String(empCode || '').toUpperCase();
    const mail = String(email || '').toLowerCase();
    const cached =
      inMemoryCustomPermissions.get(code) ||
      inMemoryCustomPermissions.get(mail) ||
      inMemoryCustomPermissions.get(id);

    if (cached) {
      return this.resolveEffectivePermissions({
        empCode: code,
        email: mail,
        role: code === 'FAC105' || code === 'FAC106' ? 'Assistant Faculty' : 'Subject Faculty',
        permissions: cached,
      });
    }

    // Role defaults
    const isAsst = code === 'FAC105' || code === 'FAC106' || mail.includes('mehta') || mail.includes('desai');
    return this.resolveEffectivePermissions({
      empCode: code,
      email: mail,
      role: isAsst ? 'Assistant Faculty' : 'Subject Faculty',
      subject: 'Physics',
    });
  }

  /**
   * Get all faculties with effective permissions and stats
   */
  async getAllFacultiesWithAccess(filters = {}) {
    const { search = '', role = '', subject = '' } = filters;

    const query = { status: { $ne: 'DEACTIVATED' } };
    if (role && role !== 'ALL') {
      query.role = role;
    }
    if (subject && subject !== 'ALL') {
      query.subject = { $regex: subject, $options: 'i' };
    }
    if (search && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { empCode: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
      ];
    }

    const faculties = await Faculty.find(query).sort({ role: -1, empCode: 1 });

    const totalFaculties = faculties.length;
    const subjectFacultiesCount = faculties.filter((f) => f.role === 'Subject Faculty').length;
    const assistantFacultiesCount = faculties.filter((f) => f.role === 'Assistant Faculty').length;
    const totalLogsCount = await AccessHistory.countDocuments();

    const enriched = faculties.map((faculty) => {
      const effectivePermissions = this.resolveEffectivePermissions(faculty);
      return {
        id: faculty._id.toString(),
        _id: faculty._id.toString(),
        empCode: faculty.empCode,
        fullName: faculty.fullName,
        role: faculty.role,
        subject: faculty.subject,
        email: faculty.email,
        contactNo: faculty.contactNo,
        status: faculty.status,
        joiningDate: faculty.joiningDate,
        qualification: faculty.qualification,
        permissions: effectivePermissions,
      };
    });

    return {
      faculties: enriched,
      statistics: {
        totalFaculties,
        subjectFacultiesCount,
        assistantFacultiesCount,
        totalLogsCount,
      },
      masterCatalog: this.getMasterConfig(),
    };
  }

  /**
   * Get single faculty permissions and history
   */
  async getFacultyAccessById(id) {
    const faculty = await Faculty.findById(id);
    if (!faculty) {
      throw new Error('Faculty member not found');
    }

    const effectivePermissions = this.resolveEffectivePermissions(faculty);
    const history = await AccessHistory.find({ facultyId: faculty._id })
      .sort({ createdAt: -1 })
      .limit(20);

    return {
      faculty: {
        id: faculty._id.toString(),
        _id: faculty._id.toString(),
        empCode: faculty.empCode,
        fullName: faculty.fullName,
        role: faculty.role,
        subject: faculty.subject,
        email: faculty.email,
        contactNo: faculty.contactNo,
        status: faculty.status,
        permissions: effectivePermissions,
      },
      history,
      masterCatalog: this.getMasterConfig(),
    };
  }

  /**
   * Update faculty access permissions and log history
   */
  async updateFacultyAccess(facultyId, updateData, changedBy = 'Principal') {
    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      throw new Error('Faculty member not found');
    }

    const previousEffective = this.resolveEffectivePermissions(faculty);

    const newAccessibleTabs = Array.isArray(updateData.accessibleTabs)
      ? [...new Set(updateData.accessibleTabs)]
      : previousEffective.accessibleTabs;

    const newAllowedExamSubjects = Array.isArray(updateData.allowedExamSubjects)
      ? [...new Set(updateData.allowedExamSubjects)]
      : previousEffective.allowedExamSubjects;

    const newAllowedLtSubjects = Array.isArray(updateData.allowedLtSubjects)
      ? [...new Set(updateData.allowedLtSubjects)]
      : previousEffective.allowedLtSubjects;

    // Detect differences
    const addedTabs = newAccessibleTabs.filter((t) => !previousEffective.accessibleTabs.includes(t));
    const removedTabs = previousEffective.accessibleTabs.filter((t) => !newAccessibleTabs.includes(t));

    const addedExamSubs = newAllowedExamSubjects.filter((s) => !previousEffective.allowedExamSubjects.includes(s));
    const removedExamSubs = previousEffective.allowedExamSubjects.filter((s) => !newAllowedExamSubjects.includes(s));

    const addedLtSubs = newAllowedLtSubjects.filter((s) => !previousEffective.allowedLtSubjects.includes(s));
    const removedLtSubs = previousEffective.allowedLtSubjects.filter((s) => !newAllowedLtSubjects.includes(s));

    // Construct human-readable changes
    const detailLines = [];
    const summaryParts = [];

    // Helper to get tab readable label
    const getTabName = (tabId) => {
      const found = MASTER_TABS.find((t) => t.id === tabId);
      return found ? found.label : tabId.replace(/^\/[^/]+\//, '');
    };

    if (addedTabs.length > 0) {
      const names = addedTabs.map(getTabName).join(', ');
      detailLines.push(`Granted access to tabs: ${names}`);
      summaryParts.push(`+ ${addedTabs.length} tab(s) [${names}]`);
    }
    if (removedTabs.length > 0) {
      const names = removedTabs.map(getTabName).join(', ');
      detailLines.push(`Revoked access to tabs: ${names}`);
      summaryParts.push(`- ${removedTabs.length} tab(s) [${names}]`);
    }

    if (addedExamSubs.length > 0) {
      const subs = addedExamSubs.join(', ');
      detailLines.push(`Allowed Exam marks entry for: ${subs}`);
      summaryParts.push(`+ Exam: ${subs}`);
    }
    if (removedExamSubs.length > 0) {
      const subs = removedExamSubs.join(', ');
      detailLines.push(`Removed Exam marks entry for: ${subs}`);
      summaryParts.push(`- Exam: ${subs}`);
    }

    if (addedLtSubs.length > 0) {
      const subs = addedLtSubs.join(', ');
      detailLines.push(`Allowed LT marks entry for: ${subs}`);
      summaryParts.push(`+ LT: ${subs}`);
    }
    if (removedLtSubs.length > 0) {
      const subs = removedLtSubs.join(', ');
      detailLines.push(`Removed LT marks entry for: ${subs}`);
      summaryParts.push(`- LT: ${subs}`);
    }

    const summaryText =
      summaryParts.length > 0
        ? summaryParts.join(' | ')
        : 'Re-saved current permissions without alterations';

    // Update faculty record
    faculty.permissions = {
      accessibleTabs: newAccessibleTabs,
      allowedExamSubjects: newAllowedExamSubjects,
      allowedLtSubjects: newAllowedLtSubjects,
    };
    await faculty.save();

    // Cache in memory for instant multi-session retrieval
    inMemoryCustomPermissions.set(faculty.empCode.toUpperCase(), faculty.permissions);
    inMemoryCustomPermissions.set(faculty._id.toString(), faculty.permissions);
    if (faculty.email) inMemoryCustomPermissions.set(faculty.email.toLowerCase(), faculty.permissions);

    // Create AccessHistory record
    const historyRecord = await AccessHistory.create({
      facultyId: faculty._id,
      facultyName: faculty.fullName,
      facultyEmpCode: faculty.empCode,
      facultyRole: faculty.role,
      changedBy: changedBy || 'Principal',
      action: 'Updated Access Permissions',
      summary: summaryText,
      details: detailLines,
      note: updateData.note || '',
      previousAccess: {
        accessibleTabs: previousEffective.accessibleTabs,
        allowedExamSubjects: previousEffective.allowedExamSubjects,
        allowedLtSubjects: previousEffective.allowedLtSubjects,
      },
      newAccess: {
        accessibleTabs: newAccessibleTabs,
        allowedExamSubjects: newAllowedExamSubjects,
        allowedLtSubjects: newAllowedLtSubjects,
      },
    });

    const updatedEffective = this.resolveEffectivePermissions(faculty);

    return {
      faculty: {
        id: faculty._id.toString(),
        _id: faculty._id.toString(),
        empCode: faculty.empCode,
        fullName: faculty.fullName,
        role: faculty.role,
        subject: faculty.subject,
        email: faculty.email,
        contactNo: faculty.contactNo,
        status: faculty.status,
        permissions: updatedEffective,
      },
      historyRecord,
      summary: summaryText,
    };
  }

  /**
   * Get paginated access history
   */
  async getAccessHistory(params = {}) {
    const { facultyId = '', search = '', page = 1, limit = 15 } = params;
    const query = {};

    if (facultyId) {
      query.facultyId = facultyId;
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      query.$or = [
        { facultyName: { $regex: q, $options: 'i' } },
        { facultyEmpCode: { $regex: q, $options: 'i' } },
        { summary: { $regex: q, $options: 'i' } },
        { changedBy: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const [total, records] = await Promise.all([
      AccessHistory.countDocuments(query),
      AccessHistory.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    ]);

    return {
      records,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
    };
  }
}

module.exports = new AccessService();
