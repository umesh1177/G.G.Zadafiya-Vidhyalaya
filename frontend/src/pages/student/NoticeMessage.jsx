import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { noticeApi, getNoticeAttachmentUrl } from '../../services/noticeApi';
import PaginationBar from '../../components/common/PaginationBar';

const PAGE_SIZE = 8;

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function StudentNoticeMessage() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();

  useEffect(() => {
    setHeader({ title: 'Notice Message', subtitle: 'Official circulars from your school' });
  }, [setHeader]);

  const [notices, setNotices] = useState([]);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [openModal, setOpenModal] = useState(null);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      const list = await noticeApi.getNotices({
        viewerRole: 'student',
        viewerId: user?.id || user?._id || '',
        viewerEmail: user?.email || '',
      });
      setNotices(Array.isArray(list) ? list : []);
    } catch {
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const filtered = useMemo(() => {
    if (typeFilter === 'ALL') return notices;
    return notices.filter((n) => String(n.type || '').toLowerCase() === typeFilter.toLowerCase());
  }, [notices, typeFilter]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="content">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="card__head"
          style={{ padding: '16px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}
        >
          <div className="card__title">Notice Inbox ({filtered.length})</div>
          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Types</option>
            <option value="General">General</option>
            <option value="Urgent Circular">Urgent Circular</option>
            <option value="Exam / Academic">Exam / Academic</option>
          </select>
        </div>

        <div className="table-wrap" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Sr No</th>
                <th>Date</th>
                <th>Type</th>
                <th>Message</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--slate)' }}>Loading notices...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--slate)' }}>No notices published yet.</td></tr>
              ) : (
                paginated.map((n, idx) => (
                  <tr key={n.id || n._id || idx}>
                    <td className="num">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="num">{formatDate(n.date || n.createdAt)}</td>
                    <td><span className="chip chip-neutral">{n.type || 'General'}</span></td>
                    <td style={{ overflowWrap: 'anywhere' }}>
                      {n.message.length > 70 ? `${n.message.slice(0, 70)}…` : n.message}
                      {Array.isArray(n.attachments) && n.attachments.length > 0 && (
                        <span className="chip chip-neutral" style={{ marginLeft: 8, fontSize: 11 }}>
                          {n.attachments.length} file(s)
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpenModal(n)}>
                        View Full Message
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          currentPage={safePage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemLabel="notices"
        />
      </div>

      {openModal && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setOpenModal(null);
          }}
        >
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">{openModal.title || `Notice #${openModal.srNo}`}</div>
                <div className="card__desc num">
                  {formatDate(openModal.date || openModal.createdAt)} · {openModal.senderName}
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setOpenModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <p style={{ fontSize: '13.6px', lineHeight: 1.6, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
              {openModal.message}
            </p>
            {Array.isArray(openModal.attachments) && openModal.attachments.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {openModal.attachments.map((att) => {
                  const nid = openModal.id || openModal._id;
                  const viewUrl = getNoticeAttachmentUrl(nid, att.attachmentId, false);
                  const dlUrl = getNoticeAttachmentUrl(nid, att.attachmentId, true);
                  return (
                    <div key={att.attachmentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, background: '#FAFBFD', borderRadius: 8, border: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{att.fileName}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Open</a>
                        <a href={dlUrl} className="btn btn-primary btn-sm">Download</a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
