import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  noticeApi,
  readNoticeAttachmentAsPayload,
  getNoticeAttachmentUrl,
} from '../../services/noticeApi';
import PaginationBar from './PaginationBar';
import VoiceInputControl from './VoiceInputControl';

const PAGE_SIZE = 6;

function formatDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSenderRoleBadge(senderRole) {
  if (senderRole === 'PRINCIPAL') return { label: 'Principal', cls: 'chip-neutral' };
  if (senderRole === 'ASSISTANT_FACULTY') return { label: 'Assistant Faculty', cls: 'chip-warning' };
  return { label: 'Subject Faculty', cls: 'chip-success' };
}

function getScopeLabel(n) {
  if (n.audienceLabel) return n.audienceLabel;
  switch (n.targetScope) {
    case 'ALL': return 'All Students & Faculty';
    case 'ALL_STUDENTS': return 'All Students';
    case 'ALL_FACULTY': return 'All Faculty (Subject & Assistant)';
    case 'ALL_SUBJECT_FACULTY': return 'All Subject Faculty';
    case 'ALL_ASSISTANT_FACULTY': return 'All Assistant Faculty';
    case 'PRINCIPAL': return 'Principal Office';
    case 'SPECIFIC_FACULTY': return 'Specific Faculty';
    default: return n.targetScope || 'Notice';
  }
}

export default function NoticeWorkspace({ viewerRole = 'principal' }) {
  const { user } = useAuth();
  const isPrincipal = viewerRole === 'principal';
  const isAssistant = viewerRole === 'assistant';
  const isFaculty = viewerRole === 'faculty';

  const [notices, setNotices] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  // Filters & Tabs
  const [boxTab, setBoxTab] = useState('all');
  const [senderFilter, setSenderFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Composer Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeError, setComposeError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientRoleFilter, setRecipientRoleFilter] = useState('ALL');

  const defaultScope = isPrincipal ? 'ALL_FACULTY' : 'PRINCIPAL';
  const [form, setForm] = useState({
    type: 'General',
    title: '',
    targetScope: defaultScope,
    recipients: [],
    message: '',
    attachments: [],
  });
  const noticeTitleRef = useRef(null);
  const noticeMessageRef = useRef(null);

  // Preview Modals
  const [viewingNotice, setViewingNotice] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null); // { url, fileName }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [noticesRes, dirRes] = await Promise.all([
        noticeApi.getNotices({
          viewerRole,
          viewerId: user?.id || user?._id || '',
          viewerEmpCode: user?.empCode || '',
          viewerEmail: user?.email || '',
          box: boxTab,
          senderRole: senderFilter,
          type: typeFilter,
          search: searchQuery.trim() || undefined,
        }),
        noticeApi.getRecipients().catch(() => []),
      ]);
      setNotices(Array.isArray(noticesRes) ? noticesRes : []);
      setDirectory(Array.isArray(dirRes) ? dirRes : []);
    } catch (err) {
      setBanner({ kind: 'danger', text: err.message || 'Failed to load notices.' });
    } finally {
      setLoading(false);
    }
  }, [viewerRole, user, boxTab, senderFilter, typeFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    window.addEventListener('focus', loadData);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', loadData);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadData]);

  // Exclude self from selectable directory
  const selectableDirectory = useMemo(() => {
    const myId = String(user?.id || user?._id || '').trim();
    const myCode = String(user?.empCode || '').trim().toUpperCase();
    const myEmail = String(user?.email || '').trim().toLowerCase();

    const filtered = directory.filter((f) => {
      if (myId && f.id === myId) return false;
      if (myCode && String(f.empCode || '').toUpperCase() === myCode) return false;
      if (myEmail && String(f.email || '').toLowerCase() === myEmail) return false;
      if (recipientRoleFilter !== 'ALL' && f.role !== recipientRoleFilter) return false;
      if (recipientSearch.trim()) {
        const q = recipientSearch.trim().toLowerCase();
        const hay = `${f.name} ${f.empCode} ${f.subject} ${f.role}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return filtered;
  }, [directory, user, recipientRoleFilter, recipientSearch]);

  const toggleRecipient = (staff) => {
    setForm((prev) => {
      const exists = prev.recipients.some(
        (r) => r.facultyId === staff.id || (r.empCode && r.empCode === staff.empCode)
      );
      if (exists) {
        return {
          ...prev,
          recipients: prev.recipients.filter(
            (r) => r.facultyId !== staff.id && r.empCode !== staff.empCode
          ),
        };
      }
      return {
        ...prev,
        recipients: [
          ...prev.recipients,
          {
            facultyId: staff.id,
            empCode: staff.empCode,
            email: staff.email,
            name: staff.name,
            role: staff.role,
            subject: staff.subject,
          },
        ],
      };
    });
  };

  const handleSelectAllVisibleRecipients = () => {
    setForm((prev) => {
      const next = [...prev.recipients];
      selectableDirectory.forEach((staff) => {
        const exists = next.some(
          (r) => r.facultyId === staff.id || (r.empCode && r.empCode === staff.empCode)
        );
        if (!exists) {
          next.push({
            facultyId: staff.id,
            empCode: staff.empCode,
            email: staff.email,
            name: staff.name,
            role: staff.role,
            subject: staff.subject,
          });
        }
      });
      return { ...prev, recipients: next };
    });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    if (form.attachments.length + files.length > 3) {
      setComposeError('You can attach at most 3 files (Image or PDF) per notice.');
      return;
    }

    setComposeError(null);
    try {
      const payloads = await Promise.all(files.map((f) => readNoticeAttachmentAsPayload(f)));
      setForm((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...payloads.filter(Boolean)],
      }));
    } catch (err) {
      setComposeError(err.message || 'Failed to read selected file.');
    }
  };

  const handleRemovePendingAttachment = (idx) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== idx),
    }));
  };

  const handleSendNotice = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) {
      setComposeError('Please enter a notice message.');
      return;
    }
    if (form.targetScope === 'SPECIFIC_FACULTY' && form.recipients.length === 0) {
      setComposeError('Please select at least one faculty or assistant faculty member.');
      return;
    }

    setSubmitting(true);
    setComposeError(null);
    try {
      await noticeApi.createNotice({
        title: form.title.trim(),
        type: form.type,
        targetScope: form.targetScope,
        recipients: form.targetScope === 'SPECIFIC_FACULTY' ? form.recipients : [],
        message: form.message.trim(),
        senderId: user?.id || user?._id || '',
        senderEmpCode: user?.empCode || '',
        senderEmail: user?.email || '',
        senderName:
          user?.name ||
          (isPrincipal ? 'Principal' : isAssistant ? 'Assistant Faculty' : 'Subject Faculty'),
        senderRole: isPrincipal
          ? 'PRINCIPAL'
          : isAssistant
          ? 'ASSISTANT_FACULTY'
          : 'SUBJECT_FACULTY',
        senderSubject: user?.subject || '',
        attachments: form.attachments.map((a) => ({
          fileName: a.fileName,
          mimeType: a.mimeType,
          base64Data: a.base64Data,
        })),
      });

      setIsComposeOpen(false);
      setForm({
        type: 'General',
        title: '',
        targetScope: defaultScope,
        recipients: [],
        message: '',
        attachments: [],
      });
      setRecipientSearch('');
      setBanner({
        kind: 'success',
        text: 'Notice sent successfully and delivered to selected recipients!',
      });
      await loadData();
    } catch (err) {
      setComposeError(err.message || 'Failed to publish notice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id) => {
    if (!window.confirm('Delete this notice permanently?')) return;
    try {
      await noticeApi.deleteNotice(id);
      setNotices((prev) => prev.filter((n) => (n.id || n._id) !== id));
      if (viewingNotice && (viewingNotice.id || viewingNotice._id) === id) setViewingNotice(null);
      setBanner({ kind: 'success', text: 'Notice deleted.' });
    } catch (err) {
      setBanner({ kind: 'danger', text: err.message || 'Failed to delete notice.' });
    }
  };

  const canDeleteNotice = (n) => {
    if (isPrincipal) return true;
    const myId = String(user?.id || user?._id || '').trim();
    const myCode = String(user?.empCode || '').trim().toUpperCase();
    const myEmail = String(user?.email || '').trim().toLowerCase();
    if (myId && n.senderId === myId) return true;
    if (myCode && n.senderEmpCode === myCode) return true;
    if (myEmail && n.senderEmail === myEmail) return true;
    return false;
  };

  const safePage = Math.min(page, Math.max(1, Math.ceil(notices.length / PAGE_SIZE)));
  const paginatedNotices = notices.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const tabOptions = isPrincipal
    ? [
        { id: 'all', label: 'All Notices' },
        { id: 'broadcast', label: 'Sent to All' },
        { id: 'specific', label: 'Sent to Specific Faculty' },
        { id: 'inbox', label: 'From Faculty & Assistant' },
      ]
    : [
        { id: 'all', label: 'All Notices' },
        { id: 'inbox', label: 'Received Inbox' },
        { id: 'sent', label: 'Sent by Me' },
      ];

  const scopeOptions = isPrincipal
    ? [
        { value: 'ALL_FACULTY', label: 'All Faculty (Subject & Assistant)' },
        { value: 'SPECIFIC_FACULTY', label: 'Specific Faculty / Assistant (Select from list)' },
        { value: 'ALL_SUBJECT_FACULTY', label: 'All Subject Faculty Only' },
        { value: 'ALL_ASSISTANT_FACULTY', label: 'All Assistant Faculty Only' },
        { value: 'ALL', label: 'All Students & Faculty' },
        { value: 'ALL_STUDENTS', label: 'All Students Only' },
      ]
    : [
        { value: 'PRINCIPAL', label: 'Principal Office' },
        { value: 'SPECIFIC_FACULTY', label: 'Specific Subject / Assistant Faculty (Select from list)' },
        { value: 'ALL_FACULTY', label: 'All Faculty & Assistant Faculty' },
        { value: 'ALL_SUBJECT_FACULTY', label: 'All Subject Faculty' },
        { value: 'ALL_ASSISTANT_FACULTY', label: 'All Assistant Faculty' },
      ];

  return (
    <>
      {banner && (
        <div
          className={`banner ${banner.kind === 'success' ? 'banner-success' : 'banner-danger'}`}
          style={{ marginBottom: 14, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{banner.text}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBanner(null)}>✕</button>
        </div>
      )}

      {/* Header Controls: Tabs + Compose Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {tabOptions.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab-btn ${boxTab === t.id ? 'is-active' : ''}`}
              onClick={() => {
                setBoxTab(t.id);
                setPage(1);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setComposeError(null);
            setIsComposeOpen(true);
          }}
        >
          + {isPrincipal ? 'Compose New Notice' : 'Send Notice'}
        </button>
      </div>

      {/* Filters Card */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div className="lt-filters-grid">
          <input
            type="text"
            className="field-input"
            placeholder="Search notice message, sender, recipient..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
          <select
            className="filter-select"
            value={senderFilter}
            onChange={(e) => { setSenderFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Senders</option>
            <option value="PRINCIPAL">Principal</option>
            <option value="SUBJECT_FACULTY">Subject Faculty</option>
            <option value="ASSISTANT_FACULTY">Assistant Faculty</option>
          </select>
          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Notice Types</option>
            <option value="General">General</option>
            <option value="Urgent Circular">Urgent Circular</option>
            <option value="Direct Message">Direct Message</option>
            <option value="Exam / Academic">Exam / Academic</option>
            <option value="Staff Meeting">Staff Meeting</option>
          </select>
        </div>
      </div>

      {/* Notice Feed */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="card__head"
          style={{ padding: '16px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}
        >
          <div>
            <div className="card__title">Notice Board ({notices.length})</div>
            <div className="card__desc">
              {isPrincipal
                ? 'Circulars sent to all or specific faculty, plus messages received from staff'
                : 'Messages from Principal, Subject Faculty, and Assistant Faculty'}
            </div>
          </div>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>Loading notices...</div>
          ) : paginatedNotices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)' }}>
              No notices found in this view. Click <strong>+ {isPrincipal ? 'Compose New Notice' : 'Send Notice'}</strong> to send one.
            </div>
          ) : (
            paginatedNotices.map((n) => {
              const id = n.id || n._id;
              const sBadge = getSenderRoleBadge(n.senderRole);
              const attachments = n.attachments || [];
              return (
                <div
                  key={id}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 12,
                    border: '1px solid var(--line)',
                    background: '#FAFBFD',
                  }}
                >
                  {/* Top Metadata Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="chip chip-neutral">{n.type || 'General'}</span>
                      <span className={`chip ${sBadge.cls}`}>
                        From: {n.senderName} ({sBadge.label})
                      </span>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 99,
                          fontSize: 12,
                          fontWeight: 700,
                          background: '#E8F1F8',
                          color: '#123B5D',
                        }}
                      >
                        To: {getScopeLabel(n)}
                      </span>
                    </div>
                    <span className="num text-slate" style={{ fontSize: 12 }}>
                      #{n.srNo} · {formatDateTime(n.date || n.createdAt)}
                    </span>
                  </div>

                  {/* Title if present */}
                  {n.title && (
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: '#123B5D', marginBottom: 6 }}>
                      {n.title}
                    </div>
                  )}

                  {/* Message Body */}
                  <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {n.message}
                  </p>

                  {/* Specific Recipient Chips */}
                  {n.targetScope === 'SPECIFIC_FACULTY' && Array.isArray(n.recipients) && n.recipients.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 11.5, color: 'var(--slate)', fontWeight: 700 }}>Recipients:</span>
                      {n.recipients.map((r, ri) => (
                        <span key={ri} className="chip chip-neutral" style={{ fontSize: 11.5 }}>
                          {r.name} ({r.role === 'Assistant Faculty' ? 'Assistant' : r.subject || r.role})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Attachments Preview Strip (Images & PDFs) */}
                  {attachments.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-soft)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {attachments.map((att) => {
                        const viewUrl = getNoticeAttachmentUrl(id, att.attachmentId, false);
                        const downloadUrl = getNoticeAttachmentUrl(id, att.attachmentId, true);
                        if (att.fileType === 'IMAGE') {
                          return (
                            <div
                              key={att.attachmentId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: 8,
                                borderRadius: 10,
                                border: '1px solid #D1DDE8',
                                background: '#fff',
                              }}
                            >
                              <img
                                src={viewUrl}
                                alt={att.fileName}
                                onClick={() => setLightboxImage({ url: viewUrl, downloadUrl, fileName: att.fileName })}
                                style={{
                                  width: 56,
                                  height: 56,
                                  objectFit: 'cover',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  border: '1px solid var(--line-soft)',
                                }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {att.fileName}
                                </div>
                                <div className="num" style={{ fontSize: 11, color: 'var(--slate)' }}>
                                  Image · {formatFileSize(att.size)}
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '2px 8px', fontSize: 11.5 }}
                                    onClick={() => setLightboxImage({ url: viewUrl, downloadUrl, fileName: att.fileName })}
                                  >
                                    Preview
                                  </button>
                                  <a
                                    href={downloadUrl}
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '2px 8px', fontSize: 11.5 }}
                                  >
                                    Download
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={att.attachmentId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: '1px solid #D1DDE8',
                              background: '#fff',
                            }}
                          >
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 8,
                                background: '#FDEAE8',
                                color: '#E0473D',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 12,
                              }}
                            >
                              PDF
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {att.fileName}
                              </div>
                              <div className="num" style={{ fontSize: 11, color: 'var(--slate)' }}>
                                PDF Document · {formatFileSize(att.size)}
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                <a
                                  href={viewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '2px 8px', fontSize: 11.5 }}
                                >
                                  Open PDF
                                </a>
                                <a
                                  href={downloadUrl}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '2px 8px', fontSize: 11.5 }}
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setViewingNotice(n)}
                    >
                      View Full
                    </button>
                    {canDeleteNotice(n) && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleDeleteNotice(id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <PaginationBar
          currentPage={safePage}
          totalItems={notices.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemLabel="notices"
        />
      </div>

      {/* COMPOSER MODAL */}
      {isComposeOpen && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setIsComposeOpen(false);
          }}
        >
          <div
            className="modal-box"
            style={{
              maxWidth: 640,
              padding: 0,
              borderRadius: 16,
              overflow: 'hidden',
              maxHeight: '92dvh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ background: '#123B5D', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 11, color: '#BEDBFF', fontWeight: 700, textTransform: 'uppercase' }}>
                  G.G. Zadafiya Vidhyalaya Communication
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  {isPrincipal ? 'Broadcast / Send Notice' : 'Send Notice to Staff or Principal'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSendNotice}
              style={{
                padding: '18px 20px',
                background: '#fff',
                overflowY: 'auto',
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {composeError && (
                <div className="banner banner-danger" style={{ marginBottom: 0 }}>
                  <span>{composeError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div>
                  <label className="field-label">Notice Type</label>
                  <select
                    className="filter-select w-full"
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  >
                    <option value="General">General</option>
                    <option value="Urgent Circular">Urgent Circular</option>
                    <option value="Direct Message">Direct Message</option>
                    <option value="Exam / Academic">Exam / Academic</option>
                    <option value="Staff Meeting">Staff Meeting</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Subject / Title (વિષય / શીર્ષક)</label>
                  <input
                    type="text"
                    ref={noticeTitleRef}
                    className="field-input w-full"
                    placeholder="e.g. Lab Schedule / Circular / પરિપત્ર શીર્ષક"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  />
                  <VoiceInputControl
                    value={form.title}
                    onChange={(val) => setForm((p) => ({ ...p, title: val }))}
                    inputRef={noticeTitleRef}
                    compact
                    defaultLang="gu-IN"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Send To (Target Audience) *</label>
                <select
                  className="filter-select w-full"
                  value={form.targetScope}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, targetScope: e.target.value }))
                  }
                >
                  {scopeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Specific Faculty Multi-Select Checklist */}
              {form.targetScope === 'SPECIFIC_FACULTY' && (
                <div
                  style={{
                    border: '1px solid #C8DDF0',
                    borderRadius: 12,
                    padding: 12,
                    background: '#F4F7FB',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#123B5D' }}>
                      Select Faculty / Assistant Recipients ({form.recipients.length} selected)
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleSelectAllVisibleRecipients}
                      >
                        Select Visible
                      </button>
                      {form.recipients.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setForm((p) => ({ ...p, recipients: [] }))}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selected Recipient Pills */}
                  {form.recipients.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {form.recipients.map((r) => (
                        <span
                          key={r.facultyId || r.empCode}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 10px',
                            borderRadius: 99,
                            background: '#123B5D',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {r.name}
                          <button
                            type="button"
                            onClick={() => toggleRecipient({ id: r.facultyId, empCode: r.empCode })}
                            style={{ background: 'none', border: 'none', color: '#BEDBFF', cursor: 'pointer', padding: 0, fontWeight: 800 }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search & Role Filter inside Directory */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <input
                      type="text"
                      className="field-input"
                      style={{ flex: '1 1 160px', padding: '7px 10px', fontSize: 13 }}
                      placeholder="Search faculty name, subject, code..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                    />
                    <select
                      className="filter-select"
                      style={{ padding: '7px 10px', fontSize: 13 }}
                      value={recipientRoleFilter}
                      onChange={(e) => setRecipientRoleFilter(e.target.value)}
                    >
                      <option value="ALL">All Staff Roles</option>
                      <option value="Subject Faculty">Subject Faculty</option>
                      <option value="Assistant Faculty">Assistant Faculty</option>
                    </select>
                  </div>

                  {/* Scrollable Staff Checkboxes */}
                  <div style={{ maxHeight: 190, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectableDirectory.length === 0 ? (
                      <div style={{ padding: 14, textAlign: 'center', fontSize: 12.5, color: 'var(--slate)' }}>
                        No faculty members match the search.
                      </div>
                    ) : (
                      selectableDirectory.map((staff) => {
                        const checked = form.recipients.some(
                          (r) =>
                            r.facultyId === staff.id ||
                            (r.empCode && r.empCode === staff.empCode)
                        );
                        return (
                          <label
                            key={staff.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: checked ? '#E8F1F8' : '#fff',
                              border: checked ? '1.5px solid #123B5D' : '1px solid var(--line-soft)',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRecipient(staff)}
                                style={{ width: 16, height: 16, accentColor: '#123B5D' }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
                                  {staff.name}
                                </div>
                                <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                                  {staff.subject} · <span className="num">{staff.empCode}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`chip ${staff.role === 'Assistant Faculty' ? 'chip-warning' : 'chip-neutral'}`} style={{ fontSize: 11 }}>
                              {staff.role === 'Assistant Faculty' ? 'Assistant' : 'Faculty'}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="field-label">Notice Message (પરિપત્ર સંદેશ) *</label>
                <textarea
                  ref={noticeMessageRef}
                  className="field-input w-full"
                  rows={4}
                  placeholder="Write your notice message or speak in Gujarati/English..."
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  required
                />
                <VoiceInputControl
                  value={form.message}
                  onChange={(val) => setForm((p) => ({ ...p, message: val }))}
                  inputRef={noticeMessageRef}
                  defaultLang="gu-IN"
                />
              </div>

              {/* Image & PDF Upload Section */}
              <div style={{ padding: 12, borderRadius: 10, border: '1px dashed #9EB5CC', background: '#FAFBFD' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#123B5D' }}>
                      Attach Image or PDF File (Optional)
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                      Supports PNG, JPG, WEBP images and PDF circulars (up to 3 files, 10 MB each)
                    </div>
                  </div>
                  <label
                    className="btn btn-ghost btn-sm"
                    style={{ cursor: 'pointer', border: '1px solid #123B5D', color: '#123B5D' }}
                  >
                    + Upload Image / PDF
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp,image/gif"
                      multiple
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {form.attachments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {form.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: '#fff',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          {att.fileType === 'IMAGE' ? (
                            <img
                              src={att.base64Data}
                              alt={att.fileName}
                              style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 6 }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 6,
                                background: '#FDEAE8',
                                color: '#E0473D',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 11,
                              }}
                            >
                              PDF
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {att.fileName}
                            </div>
                            <div className="num" style={{ fontSize: 11, color: 'var(--slate)' }}>
                              {att.fileType} · {formatFileSize(att.size)}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleRemovePendingAttachment(idx)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsComposeOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW FULL NOTICE MODAL */}
      {viewingNotice && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setViewingNotice(null);
          }}
        >
          <div className="modal-box" style={{ maxWidth: 620, padding: 0, borderRadius: 16, overflow: 'hidden', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#123B5D', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 11, color: '#BEDBFF', fontWeight: 700, textTransform: 'uppercase' }}>
                  Notice #{viewingNotice.srNo} · {viewingNotice.type}
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  {viewingNotice.title || `From ${viewingNotice.senderName}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingNotice(null)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '18px 20px', background: '#fff', overflowY: 'auto', flex: '1 1 auto' }}>
              <div className="detail-panel__row">
                <span>Date</span>
                <span className="num">{formatDateTime(viewingNotice.date || viewingNotice.createdAt)}</span>
              </div>
              <div className="detail-panel__row">
                <span>Sent By</span>
                <span>{viewingNotice.senderName} ({getSenderRoleBadge(viewingNotice.senderRole).label})</span>
              </div>
              <div className="detail-panel__row">
                <span>Audience</span>
                <span>{getScopeLabel(viewingNotice)}</span>
              </div>

              {Array.isArray(viewingNotice.recipients) && viewingNotice.recipients.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)', marginBottom: 6 }}>SELECTED RECIPIENTS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {viewingNotice.recipients.map((r, i) => (
                      <span key={i} className="chip chip-neutral" style={{ fontSize: 12 }}>
                        {r.name} ({r.subject || r.role})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)', marginBottom: 6 }}>MESSAGE</div>
                <p style={{ fontSize: 14.2, lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: 0 }}>
                  {viewingNotice.message}
                </p>
              </div>

              {Array.isArray(viewingNotice.attachments) && viewingNotice.attachments.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)', marginBottom: 8 }}>ATTACHMENTS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {viewingNotice.attachments.map((att) => {
                      const nid = viewingNotice.id || viewingNotice._id;
                      const viewUrl = getNoticeAttachmentUrl(nid, att.attachmentId, false);
                      const dlUrl = getNoticeAttachmentUrl(nid, att.attachmentId, true);
                      return (
                        <div key={att.attachmentId} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)', background: '#FAFBFD' }}>
                          {att.fileType === 'IMAGE' && (
                            <img
                              src={viewUrl}
                              alt={att.fileName}
                              style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, display: 'block', marginBottom: 8 }}
                            />
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{att.fileName}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                                Open in Tab
                              </a>
                              <a href={dlUrl} className="btn btn-primary btn-sm">
                                Download
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', background: '#FAFBFD' }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setViewingNotice(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setLightboxImage(null);
          }}
        >
          <div className="modal-box" style={{ maxWidth: 760, padding: 16, borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong style={{ fontSize: 14 }}>{lightboxImage.fileName}</strong>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={lightboxImage.downloadUrl} className="btn btn-primary btn-sm">
                  Download
                </a>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLightboxImage(null)}>
                  ✕
                </button>
              </div>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.fileName}
              style={{ maxWidth: '100%', maxHeight: '75vh', display: 'block', margin: '0 auto', borderRadius: 8 }}
            />
          </div>
        </div>
      )}
    </>
  );
}

