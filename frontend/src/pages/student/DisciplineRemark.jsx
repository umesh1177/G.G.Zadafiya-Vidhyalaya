import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { disciplineApi } from '../../services/disciplineApi';
import PaginationBar from '../../components/common/PaginationBar';

const PAGE_SIZE = 8;

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function StudentDisciplineRemark() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();

  useEffect(() => {
    setHeader({ title: 'Discipline Remark', subtitle: 'Records noted by school staff' });
  }, [setHeader]);

  const [history, setHistory] = useState([]);
  const [types, setTypes] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [openModal, setOpenModal] = useState(null);

  const loadRemarks = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (user?.standard) filters.standard = user.standard;
      if (user?.division) filters.division = user.division;
      if (user?.rollNo) filters.rollNo = user.rollNo;
      const [remarksRes, typesRes] = await Promise.all([
        disciplineApi.getAllRemarks(filters).catch(() => []),
        disciplineApi.getTypes().catch(() => []),
      ]);
      // If logged-in student lacks rollNo in demo auth, filter by name cleanly
      let list = Array.isArray(remarksRes) ? remarksRes : [];
      if (!user?.rollNo && user?.name) {
        const lowerName = user.name.toLowerCase();
        list = list.filter((r) => String(r.studentName || r.name || '').toLowerCase().includes(lowerName));
      }
      setHistory(list);
      setTypes(Array.isArray(typesRes) ? typesRes : []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRemarks();
  }, [loadRemarks]);

  const filtered = useMemo(() => {
    if (filterType === 'ALL') return history;
    return history.filter((h) => String(h.type || '').toLowerCase() === filterType.toLowerCase());
  }, [history, filterType]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="content">
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="card__head"
          style={{ padding: '16px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}
        >
          <div className="card__title">Discipline History ({filtered.length})</div>
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Types</option>
            {types.map((t) => (
              <option key={t.id || t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="table-wrap" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Sr No</th>
                <th>Type</th>
                <th>Date</th>
                <th>Noted By</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--slate)' }}>Loading records...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--slate)', padding: 20 }}>No discipline records — keep it up!</td></tr>
              ) : (
                paginated.map((d, idx) => (
                  <tr key={d.id || d._id || idx}>
                    <td className="num">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td><span className="chip chip-warning">{d.type}</span></td>
                    <td className="num">{formatDate(d.date)}</td>
                    <td>{d.notedBy}</td>
                    <td>
                      <span className={`chip ${d.status === 'RESOLVED' ? 'chip-success' : 'chip-neutral'}`}>
                        {d.status || 'OPEN'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpenModal(d)}>
                        View Message
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
          itemLabel="remarks"
        />
      </div>

      {openModal && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setOpenModal(null);
          }}
        >
          <div className="modal-box">
            <div className="modal-box__head">
              <div>
                <div className="card__title">{openModal.type}</div>
                <div className="card__desc num">{formatDate(openModal.date)} · Noted by {openModal.notedBy}</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setOpenModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <p style={{ fontSize: '13.6px', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
              {openModal.message || openModal.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
