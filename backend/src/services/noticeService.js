const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Notice = require('../models/Notice');
const Faculty = require('../models/Faculty');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/notices');
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per attachment
const MAX_ATTACHMENTS = 3;

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function normalizeSenderRole(raw = 'PRINCIPAL') {
  const s = String(raw || 'PRINCIPAL').trim().toUpperCase();
  if (s === 'PRINCIPAL') return 'PRINCIPAL';
  if (s.includes('ASSISTANT')) return 'ASSISTANT_FACULTY';
  return 'SUBJECT_FACULTY';
}

function normalizeTargetScope(raw = 'ALL_FACULTY') {
  const s = String(raw || 'ALL_FACULTY').trim().toUpperCase();
  const allowed = [
    'ALL',
    'ALL_STUDENTS',
    'ALL_FACULTY',
    'ALL_SUBJECT_FACULTY',
    'ALL_ASSISTANT_FACULTY',
    'SPECIFIC_FACULTY',
    'PRINCIPAL',
  ];
  if (allowed.includes(s)) return s;
  return 'ALL_FACULTY';
}

function detectAndValidateAttachment(payload = {}) {
  const { fileName = 'attachment', mimeType = '', base64Data = '' } = payload;
  if (!base64Data || typeof base64Data !== 'string') {
    throw new Error(`Attachment content is missing for "${fileName}".`);
  }

  // Extract data-URL mime if present
  const dataUrlMatch = base64Data.match(/^data:([^;]+);base64,/i);
  const declaredMime = String(dataUrlMatch?.[1] || mimeType || '').toLowerCase();
  const stripped = base64Data.replace(/^data:[^;]+;base64,/i, '').trim();
  if (!stripped) {
    throw new Error(`Attachment "${fileName}" is empty.`);
  }

  const buffer = Buffer.from(stripped, 'base64');
  if (!buffer || buffer.length === 0) {
    throw new Error(`Invalid base64 payload for "${fileName}".`);
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(`Attachment "${fileName}" exceeds maximum size of 10 MB.`);
  }

  // Magic-byte verification for PDF & standard images
  const isPdfMagic = buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === '%PDF';
  const isPngMagic =
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isJpgMagic =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  const isGifMagic =
    buffer.length >= 4 &&
    ['GIF8'].includes(buffer.slice(0, 4).toString('ascii'));
  const isWebpMagic =
    buffer.length >= 12 &&
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP';

  let resolvedMime = '';
  let fileType = '';
  let defaultExt = '';

  if (isPdfMagic || (declaredMime === 'application/pdf' && isPdfMagic)) {
    resolvedMime = 'application/pdf';
    fileType = 'PDF';
    defaultExt = '.pdf';
  } else if (isPngMagic) {
    resolvedMime = 'image/png';
    fileType = 'IMAGE';
    defaultExt = '.png';
  } else if (isJpgMagic) {
    resolvedMime = 'image/jpeg';
    fileType = 'IMAGE';
    defaultExt = '.jpg';
  } else if (isWebpMagic) {
    resolvedMime = 'image/webp';
    fileType = 'IMAGE';
    defaultExt = '.webp';
  } else if (isGifMagic) {
    resolvedMime = 'image/gif';
    fileType = 'IMAGE';
    defaultExt = '.gif';
  } else {
    throw new Error(
      `Unsupported file format for "${fileName}". Only PDF, PNG, JPG, WEBP, and GIF files are allowed.`
    );
  }

  const safeBase = path
    .basename(String(fileName || `notice_file${defaultExt}`))
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = path.extname(safeBase) || defaultExt;
  const cleanName = safeBase.includes('.') ? safeBase : `${safeBase}${defaultExt}`;

  return {
    buffer,
    fileName: cleanName,
    mimeType: resolvedMime,
    fileType,
    size: buffer.length,
    ext,
  };
}

function matchesIdentity(target = {}, viewer = {}) {
  const tId = String(target.facultyId || target.id || '').trim();
  const tCode = String(target.empCode || '').trim().toUpperCase();
  const tEmail = String(target.email || '').trim().toLowerCase();

  const vId = String(viewer.id || viewer.viewerId || '').trim();
  const vCode = String(viewer.empCode || viewer.viewerEmpCode || '').trim().toUpperCase();
  const vEmail = String(viewer.email || viewer.viewerEmail || '').trim().toLowerCase();

  if (vId && tId && vId === tId) return true;
  if (vCode && tCode && vCode === tCode) return true;
  if (vEmail && tEmail && vEmail === tEmail) return true;
  return false;
}

class NoticeService {
  async getRecipientsDirectory() {
    const activeFaculty = await Faculty.find({ status: 'ACTIVE' })
      .sort({ role: -1, fullName: 1 })
      .lean();

    return activeFaculty.map((f) => ({
      id: f._id.toString(),
      facultyId: f._id.toString(),
      empCode: f.empCode,
      name: f.fullName || [f.firstName, f.lastName].filter(Boolean).join(' '),
      role: f.role, // 'Subject Faculty' | 'Assistant Faculty' | 'Principal'
      subject: f.subject || '',
      email: f.email || '',
    }));
  }

  async createNotice(payload = {}) {
    const messageClean = String(payload.message || '').trim();
    if (!messageClean) {
      throw new Error('Notice message cannot be empty.');
    }

    const senderRole = normalizeSenderRole(payload.senderRole);
    const targetScope = normalizeTargetScope(payload.targetScope);

    // Resolve specific recipients when targetScope === 'SPECIFIC_FACULTY'
    let resolvedRecipients = [];
    if (targetScope === 'SPECIFIC_FACULTY') {
      const rawList = Array.isArray(payload.recipients) ? payload.recipients : [];
      if (rawList.length === 0) {
        throw new Error('Please select at least one faculty or staff member.');
      }

      const activeFaculty = await Faculty.find({ status: 'ACTIVE' }).lean();
      const byId = new Map(activeFaculty.map((f) => [f._id.toString(), f]));
      const byCode = new Map(activeFaculty.map((f) => [String(f.empCode || '').toUpperCase(), f]));

      resolvedRecipients = rawList.map((r) => {
        if (typeof r === 'string') {
          const doc = byId.get(r) || byCode.get(r.toUpperCase());
          if (doc) {
            return {
              facultyId: doc._id.toString(),
              empCode: doc.empCode,
              email: doc.email || '',
              name: doc.fullName,
              role: doc.role,
              subject: doc.subject || '',
            };
          }
          return {
            facultyId: r,
            empCode: '',
            email: '',
            name: r,
            role: 'Subject Faculty',
            subject: '',
          };
        }

        const matched =
          byId.get(String(r.facultyId || r.id || '')) ||
          byCode.get(String(r.empCode || '').toUpperCase());

        if (matched) {
          return {
            facultyId: matched._id.toString(),
            empCode: matched.empCode,
            email: matched.email || r.email || '',
            name: matched.fullName || r.name,
            role: matched.role || r.role || 'Subject Faculty',
            subject: matched.subject || r.subject || '',
          };
        }

        return {
          facultyId: String(r.facultyId || r.id || ''),
          empCode: String(r.empCode || '').toUpperCase(),
          email: String(r.email || '').toLowerCase(),
          name: String(r.name || 'Staff Member').trim(),
          role: r.role || 'Subject Faculty',
          subject: r.subject || '',
        };
      });
    } else if (targetScope === 'PRINCIPAL') {
      resolvedRecipients = [
        {
          facultyId: 'PRINCIPAL',
          empCode: 'PRINCIPAL',
          email: 'principal@ggzv.edu.in',
          name: 'Principal Office',
          role: 'Principal',
          subject: 'Administration',
        },
      ];
    }

    const defaultScopeLabels = {
      ALL: 'All Students & Faculty',
      ALL_STUDENTS: 'All Students',
      ALL_FACULTY: 'All Faculty (Subject & Assistant)',
      ALL_SUBJECT_FACULTY: 'All Subject Faculty',
      ALL_ASSISTANT_FACULTY: 'All Assistant Faculty',
      PRINCIPAL: 'Principal Office',
      SPECIFIC_FACULTY:
        resolvedRecipients.length <= 2
          ? resolvedRecipients.map((r) => r.name).join(', ')
          : `${resolvedRecipients[0]?.name}, ${resolvedRecipients[1]?.name} +${resolvedRecipients.length - 2} more`,
    };

    const audienceLabel =
      String(payload.audienceLabel || payload.audience || '').trim() ||
      defaultScopeLabels[targetScope] ||
      'All Faculty';

    // Process up to MAX_ATTACHMENTS Image/PDF files
    const rawAttachments = Array.isArray(payload.attachments)
      ? payload.attachments
      : payload.attachment
      ? [payload.attachment]
      : [];

    if (rawAttachments.length > MAX_ATTACHMENTS) {
      throw new Error(`You can attach up to ${MAX_ATTACHMENTS} files per notice.`);
    }

    const last = await Notice.findOne().sort({ srNo: -1 }).select('srNo').lean();
    const nextSrNo = (last?.srNo || 0) + 1;

    const noticeDoc = new Notice({
      srNo: nextSrNo,
      title: String(payload.title || '').trim(),
      type: String(payload.type || 'General').trim(),
      targetScope,
      audienceLabel,
      recipients: resolvedRecipients,
      message: messageClean,
      date: payload.date ? new Date(payload.date) : new Date(),
      senderId: String(payload.senderId || '').trim(),
      senderEmpCode: String(payload.senderEmpCode || '').trim().toUpperCase(),
      senderEmail: String(payload.senderEmail || '').trim().toLowerCase(),
      senderName: String(payload.senderName || (senderRole === 'PRINCIPAL' ? 'Principal' : 'Faculty')).trim(),
      senderRole,
      senderSubject: String(payload.senderSubject || '').trim(),
      attachments: [],
    });

    if (rawAttachments.length > 0) {
      ensureUploadDir();
      const savedAttachments = [];
      for (let i = 0; i < rawAttachments.length; i += 1) {
        const parsed = detectAndValidateAttachment(rawAttachments[i]);
        const attachmentId = crypto.randomBytes(8).toString('hex');
        const storedName = `notice_${noticeDoc._id}_${attachmentId}${parsed.ext}`;
        const destPath = path.join(UPLOAD_DIR, storedName);
        fs.writeFileSync(destPath, parsed.buffer);
        savedAttachments.push({
          attachmentId,
          fileName: parsed.fileName,
          storedName,
          mimeType: parsed.mimeType,
          fileType: parsed.fileType,
          size: parsed.size,
          url: `/api/notices/${noticeDoc._id}/attachments/${attachmentId}`,
        });
      }
      noticeDoc.attachments = savedAttachments;
    }

    await noticeDoc.save();
    return noticeDoc.toJSON();
  }

  async getNotices(filters = {}) {
    const viewerRole = String(filters.viewerRole || 'principal').trim().toLowerCase();
    const box = String(filters.box || 'all').trim().toLowerCase();
    const senderRoleFilter = String(filters.senderRole || 'ALL').trim().toUpperCase();
    const typeFilter = String(filters.type || 'ALL').trim();
    const search = String(filters.search || '').trim().toLowerCase();

    const viewerIdentity = {
      id: filters.viewerId || '',
      empCode: filters.viewerEmpCode || '',
      email: filters.viewerEmail || '',
    };

    const allDocs = await Notice.find().sort({ date: -1, createdAt: -1 });
    const allNotices = allDocs.map((d) => d.toJSON());

    const visible = allNotices.filter((n) => {
      const isSentByMe =
        (viewerRole === 'principal' && n.senderRole === 'PRINCIPAL') ||
        (viewerRole === 'faculty' &&
          n.senderRole === 'SUBJECT_FACULTY' &&
          (matchesIdentity(
            { facultyId: n.senderId, empCode: n.senderEmpCode, email: n.senderEmail },
            viewerIdentity
          ) ||
            (!viewerIdentity.id && !viewerIdentity.empCode && !viewerIdentity.email))) ||
        (viewerRole === 'assistant' &&
          n.senderRole === 'ASSISTANT_FACULTY' &&
          (matchesIdentity(
            { facultyId: n.senderId, empCode: n.senderEmpCode, email: n.senderEmail },
            viewerIdentity
          ) ||
            (!viewerIdentity.id && !viewerIdentity.empCode && !viewerIdentity.email)));

      let isAddressedToMe = false;

      if (viewerRole === 'principal') {
        const principalTargeted =
          n.targetScope === 'PRINCIPAL' ||
          (n.targetScope === 'SPECIFIC_FACULTY' &&
            (n.recipients || []).some(
              (r) =>
                String(r.role || '').toLowerCase() === 'principal' ||
                String(r.empCode || '').toUpperCase() === 'PRINCIPAL' ||
                matchesIdentity(r, viewerIdentity)
            ));
        // Principal can view sent notices (to all or specific faculty/students) + notices addressed to Principal + staff broadcasts
        isAddressedToMe =
          n.senderRole !== 'PRINCIPAL' &&
          (principalTargeted || n.targetScope === 'ALL' || n.targetScope === 'ALL_FACULTY');
        // Notice: Principal also oversees ALL notices if box === 'all' or 'broadcast' or 'specific'!
      } else if (viewerRole === 'faculty') {
        const matchedRecipient = (n.recipients || []).some((r) => matchesIdentity(r, viewerIdentity));
        isAddressedToMe =
          ['ALL', 'ALL_FACULTY', 'ALL_SUBJECT_FACULTY'].includes(n.targetScope) ||
          (n.targetScope === 'SPECIFIC_FACULTY' && matchedRecipient);
      } else if (viewerRole === 'assistant') {
        const matchedRecipient = (n.recipients || []).some((r) => matchesIdentity(r, viewerIdentity));
        isAddressedToMe =
          ['ALL', 'ALL_FACULTY', 'ALL_ASSISTANT_FACULTY'].includes(n.targetScope) ||
          (n.targetScope === 'SPECIFIC_FACULTY' && matchedRecipient);
      } else if (viewerRole === 'student') {
        isAddressedToMe = ['ALL', 'ALL_STUDENTS'].includes(n.targetScope);
      }

      if (viewerRole === 'principal') {
        // Principal access: anything Principal sent OR anything sent to Principal / All Staff / Faculty
        const isPrincipalVisible = isSentByMe || isAddressedToMe || n.senderRole === 'PRINCIPAL';
        if (!isPrincipalVisible) return false;

        if (box === 'sent') return isSentByMe;
        if (box === 'inbox') return !isSentByMe && isAddressedToMe;
        if (box === 'broadcast') {
          return ['ALL', 'ALL_STUDENTS', 'ALL_FACULTY', 'ALL_SUBJECT_FACULTY', 'ALL_ASSISTANT_FACULTY'].includes(
            n.targetScope
          );
        }
        if (box === 'specific') {
          return n.targetScope === 'SPECIFIC_FACULTY';
        }
      } else {
        if (!isSentByMe && !isAddressedToMe) return false;
        if (box === 'sent') return isSentByMe;
        if (box === 'inbox') return isAddressedToMe && !isSentByMe;
      }

      return true;
    });

    const filtered = visible.filter((n) => {
      if (senderRoleFilter !== 'ALL' && n.senderRole !== senderRoleFilter) return false;
      if (typeFilter !== 'ALL' && String(n.type || '').toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      if (search) {
        const recipientNames = (n.recipients || []).map((r) => `${r.name} ${r.subject} ${r.role}`).join(' ');
        const hay = `${n.title || ''} ${n.message || ''} ${n.senderName || ''} ${n.audienceLabel || ''} ${n.type || ''} ${recipientNames}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    return filtered;
  }

  async getAttachmentFile(noticeId, attachmentId) {
    const doc = await Notice.findById(noticeId).lean();
    if (!doc) throw new Error('Notice not found.');
    const att = (doc.attachments || []).find((a) => a.attachmentId === attachmentId);
    if (!att) throw new Error('Attachment not found.');

    const fullPath = path.join(UPLOAD_DIR, path.basename(att.storedName));
    if (!fs.existsSync(fullPath)) {
      throw new Error('Attachment file is missing on server.');
    }

    return {
      filePath: fullPath,
      fileName: att.fileName,
      mimeType: att.mimeType,
      fileType: att.fileType,
    };
  }

  async deleteNotice(noticeId) {
    const doc = await Notice.findById(noticeId);
    if (!doc) throw new Error('Notice not found.');
    if (Array.isArray(doc.attachments)) {
      doc.attachments.forEach((att) => {
        if (att.storedName) {
          const full = path.join(UPLOAD_DIR, path.basename(att.storedName));
          if (fs.existsSync(full)) {
            try {
              fs.unlinkSync(full);
            } catch {
              // ignore cleanup errors
            }
          }
        }
      });
    }
    await Notice.findByIdAndDelete(noticeId);
    return true;
  }
}

module.exports = new NoticeService();

