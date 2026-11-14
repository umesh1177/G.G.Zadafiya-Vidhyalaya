import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { disciplineApi } from '../../services/disciplineApi';
import { studentApi } from '../../services/studentApi';
import PaginationBar from '../../components/common/PaginationBar';
import VoiceInputControl from '../../components/common/VoiceInputControl';
import { X } from 'lucide-react';

const PAGE_SIZE = 8;

function formatStdLabel(std) {
  return String(std || '').includes('12') ? 'Std 12' : 'Std 11';
}

function formatGroupLabel(group) {
  if (group === 'GROUP_A') return 'Group A (PCM)';
  if (group === 'GROUP_B') return 'Group B (PCB)';
  if (group === 'GROUP_AB') return 'Group AB (PCM+B)';
  return group || '—';
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AssistantDiscipline() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();

  useEffect(() => {
    setHeader({
      title: 'Discipline Remark',
      subtitle: 'Auto-fill student details by Standard, Division & Roll No and log behavioral remarks',
    });
  }, [setHeader]);

  const notedByDefault = user?.name || 'Assistant Faculty';

  const [form, setForm] = useState({
    standard: 'STD_11',
    division: 'A',
    rollNo: '',
    studentId: '',
    studentName: '',
    streamGroup: '',
    contactNo: '',
    email: '',
    type: '',
    date: getTodayIso(),
    message: '',
  });

  const remarkTypeRef = useRef(null);
  const remarkMessageRef = useRef(null);

  const [studentsCache, setStudentsCache] = useState([]);
  const [matchedStudent, setMatchedStudent] = useState(null);
  const [lookupStatus, setLookupStatus] = useState('idle'); // 'idle' | 'searching' | 'found' | 'not-found'

  const [types, setTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [banner, setBanner] = useState(null); // { kind: 'success' | 'danger' | 'warning', text }
  const [openModal, setOpenModal] = useState(null);

  // History Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStd, setFilterStd] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [page, setPage] = useState(1);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [remarksRes, typesRes, studentsRes] = await Promise.all([
        disciplineApi.getAllRemarks().catch(() => []),
        disciplineApi.getTypes().catch(() => []),
        studentApi.getStudents({ status: 'ACTIVE' }).catch(() => []),
      ]);
      setHistory(Array.isArray(remarksRes) ? remarksRes : []);
      setTypes(Array.isArray(typesRes) ? typesRes : []);
      setStudentsCache(Array.isArray(studentsRes) ? studentsRes : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const handleFocus = () => {
      if (document.visibilityState === 'visible') loadAll();
    };
    window.addEventListener('focus', loadAll);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', loadAll);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [loadAll]);

  // Auto-fill student details whenever standard, division, or rollNo changes
  useEffect(() => {
    const rollStr = String(form.rollNo || '').trim();
    if (!rollStr || isNaN(Number(rollStr)) || Number(rollStr) < 1) {
      setMatchedStudent(null);
      setLookupStatus('idle');
      setForm((prev) => ({
        ...prev,
        studentId: '',
        studentName: '',
        streamGroup: '',
        contactNo: '',
        email: '',
      }));
      return;
    }

    const rollNum = Number(rollStr);

    // 1. Instant local cache match if loaded
    const localHit = studentsCache.find(
      (s) =>
        s.standard === form.standard &&
        s.division === form.division &&
        Number(s.rollNo) === rollNum
    );

    if (localHit) {
      const resolvedName =
        localHit.fullName ||
        localHit.name ||
        [localHit.firstName, localHit.middleName, localHit.lastName].filter(Boolean).join(' ');
      setMatchedStudent(localHit);
      setLookupStatus('found');
      setForm((prev) => ({
        ...prev,
        studentId: localHit.id || localHit._id || '',
        studentName: resolvedName,
        streamGroup: localHit.streamGroup || '',
        contactNo: localHit.contactNo || '',
        email: localHit.email || '',
      }));
    } else {
      setLookupStatus('searching');
    }

    // 2. Authoritative MongoDB lookup (also retrieves priorFlagsCount)
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await disciplineApi.lookupStudent({
          standard: form.standard,
          division: form.division,
          rollNo: rollNum,
        });
        if (cancelled) return;
        if (res.found && res.student) {
          setMatchedStudent(res.student);
          setLookupStatus('found');
          setForm((prev) => ({
            ...prev,
            studentId: res.student.id || res.student._id || '',
            studentName: res.student.fullName || '',
            streamGroup: res.student.streamGroup || '',
            contactNo: res.student.contactNo || '',
            email: res.student.email || '',
          }));
        } else {
          setMatchedStudent(null);
          setLookupStatus('not-found');
          setForm((prev) => ({
            ...prev,
            studentId: '',
            studentName: '',
            streamGroup: '',
            contactNo: '',
            email: '',
          }));
        }
      } catch {
        if (!cancelled && !localHit) {
          setLookupStatus('not-found');
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.standard, form.division, form.rollNo, studentsCache]);

  const classRosterPreview = useMemo(() => {
    return studentsCache
      .filter((s) => s.standard === form.standard && s.division === form.division)
      .sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
  }, [studentsCache, form.standard, form.division]);

  const isCustomNewType = useMemo(() => {
    const t = String(form.type || '').trim().toLowerCase();
    if (!t) return false;
    return !types.some((item) => String(item.name || '').trim().toLowerCase() === t);
  }, [form.type, types]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rollNo || Number(form.rollNo) < 1) {
      setBanner({ kind: 'danger', text: 'Please enter a valid Roll No.' });
      return;
    }
    if (!form.studentName.trim()) {
      setBanner({
        kind: 'danger',
        text: `No student found for ${formatStdLabel(form.standard)} Div ${form.division} Roll #${form.rollNo}. Please verify Roll No.`,
      });
      return;
    }
    if (!form.type.trim()) {
      setBanner({ kind: 'danger', text: 'Please select or enter a Discipline Remark type.' });
      return;
    }
    if (!form.message.trim()) {
      setBanner({ kind: 'danger', text: 'Please enter remark observation details.' });
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const res = await disciplineApi.createRemark({
        studentId: form.studentId || undefined,
        rollNo: Number(form.rollNo),
        studentName: form.studentName.trim(),
        standard: form.standard,
        division: form.division,
        streamGroup: form.streamGroup,
        contactNo: form.contactNo,
        email: form.email,
        type: form.type.trim(),
        date: form.date || getTodayIso(),
        message: form.message.trim(),
        notedBy: notedByDefault,
        notedByRole: 'ASSISTANT_FACULTY',
        notedById: user?.id || user?.empCode || '',
      });

      if (Array.isArray(res.types)) {
        setTypes(res.types);
      }
      if (res.data) {
        setHistory((prev) => [res.data, ...prev]);
      } else {
        await loadAll();
      }

      setBanner({
        kind: 'success',
        text: res.addedNewType
          ? `Remark logged for ${form.studentName} & "${form.type.trim()}" automatically added to remark suggestions!`
          : `Remark logged for ${form.studentName} (Roll #${form.rollNo}) and synced to Principal dashboard.`,
      });

      setForm((prev) => ({
        ...prev,
        rollNo: '',
        studentId: '',
        studentName: '',
        streamGroup: '',
        contactNo: '',
        email: '',
        type: '',
        date: getTodayIso(),
        message: '',
      }));
      setMatchedStudent(null);
      setLookupStatus('idle');
    } catch (err) {
      setBanner({ kind: 'danger', text: err.message || 'Failed to submit discipline remark.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRemark = async (id) => {
    if (!window.confirm('Delete this discipline remark entry permanently?')) return;
    try {
      await disciplineApi.deleteRemark(id);
      setHistory((prev) => prev.filter((item) => (item.id || item._id) !== id));
      if (openModal && (openModal.id || openModal._id) === id) setOpenModal(null);
    } catch (err) {
      setBanner({ kind: 'danger', text: err.message || 'Failed to delete remark.' });
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (filterStd !== 'ALL' && item.standard !== filterStd) return false;
      if (filterType !== 'ALL' && String(item.type || '').toLowerCase() !== filterType.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hit =
          String(item.studentName || item.name || '').toLowerCase().includes(q) ||
          String(item.rollNo || '').includes(q) ||
          String(item.type || '').toLowerCase().includes(q) ||
          String(item.message || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [history, filterStd, filterType, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedHistory = filteredHistory.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="content">
      {banner && (
        <div
          className={`banner ${banner.kind === 'success' ? 'banner-success' : banner.kind === 'warning' ? 'banner-warning' : 'banner-danger'}`}
          style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{banner.text}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBanner(null)} aria-label="Dismiss banner">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Discipline Entry Form */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card__head">
          <div>
            <div className="card__title">Log Discipline Remark</div>
            <div className="card__desc">
              Select Standard &amp; Division and enter Roll No to auto-fill student details
            </div>
          </div>
          {matchedStudent && (
            <span className={`chip ${matchedStudent.priorFlagsCount > 0 ? 'chip-danger' : 'chip-success'}`}>
              {matchedStudent.priorFlagsCount > 0
                ? `Prior Flags: ${matchedStudent.priorFlagsCount}`
                : 'Clean Record'}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Row 1: Student Lookup Key */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              padding: 14,
              borderRadius: 12,
              background: '#F4F7FB',
              border: '1px solid #D9E4EF',
              marginBottom: 14,
            }}
          >
            <div>
              <label className="field-label">1. Standard *</label>
              <select
                className="filter-select w-full"
                value={form.standard}
                onChange={(e) => setForm((p) => ({ ...p, standard: e.target.value }))}
              >
                <option value="STD_11">Standard 11</option>
                <option value="STD_12">Standard 12</option>
              </select>
            </div>

            <div>
              <label className="field-label">2. Division *</label>
              <select
                className="filter-select w-full"
                value={form.division}
                onChange={(e) => setForm((p) => ({ ...p, division: e.target.value }))}
              >
                <option value="A">Division A</option>
                <option value="B">Division B</option>
                <option value="C">Division C</option>
                <option value="D">Division D</option>
              </select>
            </div>

            <div>
              <label className="field-label">3. Roll No *</label>
              <input
                type="number"
                min={1}
                className="field-input w-full num"
                placeholder="Enter Roll No (e.g. 1)"
                value={form.rollNo}
                onChange={(e) => setForm((p) => ({ ...p, rollNo: e.target.value }))}
              />
            </div>
          </div>

          {/* Available Roll No quick helper if class has students */}
          {classRosterPreview.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 600 }}>
                {formatStdLabel(form.standard)} Div {form.division} Quick Pick:
              </span>
              {classRosterPreview.slice(0, 12).map((s) => {
                const active = Number(form.rollNo) === Number(s.rollNo);
                return (
                  <button
                    key={s.id || s.rollNo}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, rollNo: String(s.rollNo) }))}
                    style={{
                      padding: '3px 9px',
                      borderRadius: 99,
                      fontSize: 11.5,
                      fontWeight: 700,
                      border: active ? '1.5px solid #123B5D' : '1px solid #D1DDE8',
                      background: active ? '#123B5D' : '#fff',
                      color: active ? '#fff' : '#123B5D',
                      cursor: 'pointer',
                    }}
                  >
                    #{s.rollNo} {s.firstName || (s.fullName || '').split(' ')[0]}
                  </button>
                );
              })}
            </div>
          )}

          {/* Lookup Feedback Banner */}
          {lookupStatus === 'found' && matchedStudent && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#E6F8EF',
                border: '1px solid #A7E3C6',
                color: '#116140',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 14,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                Student Verified: <strong>{form.studentName}</strong> · {formatStdLabel(form.standard)}-{form.division} · {formatGroupLabel(form.streamGroup)}
              </span>
              <span className="num" style={{ fontSize: 12 }}>Contact: {form.contactNo || '—'}</span>
            </div>
          )}
          {lookupStatus === 'not-found' && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#FDEAE8',
                border: '1px solid #F5C2BE',
                color: '#9B221B',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 14,
              }}
            >
              No student found with Roll #{form.rollNo} in {formatStdLabel(form.standard)} Div {form.division}.
            </div>
          )}

          {/* Row 2: Auto-filled Student Fields */}
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div>
              <label className="field-label">Student Name (Auto-filled) *</label>
              <input
                type="text"
                className="field-input w-full"
                placeholder="Auto-fills on Std, Div & Roll No"
                value={form.studentName}
                readOnly
                style={{ background: '#F8FAFC', fontWeight: 600, color: '#123B5D' }}
              />
            </div>

            <div>
              <label className="field-label">Stream / Group (Auto-filled)</label>
              <input
                type="text"
                className="field-input w-full"
                placeholder="Auto-filled"
                value={form.streamGroup ? formatGroupLabel(form.streamGroup) : ''}
                readOnly
                style={{ background: '#F8FAFC' }}
              />
            </div>

            <div>
              <label className="field-label">Contact Number (Auto-filled)</label>
              <input
                type="text"
                className="field-input w-full num"
                placeholder="Auto-filled"
                value={form.contactNo}
                readOnly
                style={{ background: '#F8FAFC' }}
              />
            </div>

            <div>
              <label className="field-label">Noted By</label>
              <input
                type="text"
                className="field-input w-full"
                value={notedByDefault}
                readOnly
                style={{ background: '#F8FAFC' }}
              />
            </div>

            {/* Discipline Type with HTML5 Datalist (NOT select dropdown) */}
            <div>
              <label className="field-label">
                Discipline Remark Type (Select or Type Custom) *
              </label>
              <input
                type="text"
                ref={remarkTypeRef}
                list="discipline-remark-datalist"
                className="field-input w-full"
                placeholder="Type or pick remark (e.g. Come late, Long hair, મોડા આવ્યા)"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                autoComplete="off"
              />
              <VoiceInputControl
                value={form.type}
                onChange={(val) => setForm((p) => ({ ...p, type: val }))}
                inputRef={remarkTypeRef}
                compact
                defaultLang="gu-IN"
              />
              <datalist id="discipline-remark-datalist">
                {types.map((t) => (
                  <option key={t.id || t.name} value={t.name} />
                ))}
              </datalist>
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {isCustomNewType ? (
                  <span className="chip chip-success" style={{ fontSize: 11.5 }}>
                    New remark &quot;{form.type.trim()}&quot; will be added to suggestions on submit
                  </span>
                ) : (
                  <span style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                    Type or speak any custom remark if not listed — it saves automatically.
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="field-label">Date</label>
              <input
                type="date"
                className="field-input w-full num"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>

            <div className="span-2">
              <label className="field-label">Incident Message / Observation (અવલોકન / નોંધ) *</label>
              <textarea
                ref={remarkMessageRef}
                className="field-input w-full"
                rows={3}
                placeholder="Describe the behavioral observation or speak in Gujarati/English..."
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              />
              <VoiceInputControl
                value={form.message}
                onChange={(val) => setForm((p) => ({ ...p, message: val }))}
                inputRef={remarkMessageRef}
                defaultLang="gu-IN"
              />
            </div>
          </div>

          {/* Quick-fill remark suggestion chips for mobile touch */}
          {types.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {types.slice(0, 8).map((t) => {
                const selected = form.type.trim().toLowerCase() === String(t.name).toLowerCase();
                return (
                  <button
                    key={t.id || t.name}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, type: t.name }))}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 600,
                      border: selected ? '1.5px solid #123B5D' : '1px solid var(--line)',
                      background: selected ? '#E8F1F8' : '#FAFBFD',
                      color: selected ? '#123B5D' : 'var(--ink-soft)',
                      cursor: 'pointer',
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}

          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Submitting Remark...' : 'Submit Discipline Remark'}
          </button>
        </form>
      </div>

      {/* Discipline History Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="card__head"
          style={{ padding: '16px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}
        >
          <div>
            <div className="card__title">Discipline Remark History ({filteredHistory.length})</div>
            <div className="card__desc">Live records synced directly with Principal Office</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line-soft)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            className="field-input"
            style={{ flex: '1 1 200px', minWidth: 160 }}
            placeholder="Search student, roll no, remark..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
          <select
            className="filter-select"
            value={filterStd}
            onChange={(e) => { setFilterStd(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Standards</option>
            <option value="STD_11">Standard 11</option>
            <option value="STD_12">Standard 12</option>
          </select>
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Remark Types</option>
            {types.map((t) => (
              <option key={t.id || t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="table-wrap" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Std / Div</th>
                <th>Student Name</th>
                <th>Remark Type</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 26, color: 'var(--slate)' }}>
                    Loading discipline history...
                  </td>
                </tr>
              ) : paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 26, color: 'var(--slate)' }}>
                    No discipline remarks found for the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((d) => {
                  const id = d.id || d._id;
                  return (
                    <tr key={id}>
                      <td className="num"><strong>#{d.rollNo}</strong></td>
                      <td className="num">{formatStdLabel(d.standard)} · {d.division}</td>
                      <td>
                        <strong>{d.studentName || d.name}</strong>
                        <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>{d.notedBy}</div>
                      </td>
                      <td><span className="chip chip-warning">{d.type}</span></td>
                      <td className="num">{formatDate(d.date)}</td>
                      <td>
                        <span className={`chip ${d.status === 'RESOLVED' ? 'chip-success' : d.status === 'REVIEWED' ? 'chip-neutral' : 'chip-danger'}`}>
                          {d.status === 'RESOLVED' ? 'Resolved' : d.status === 'REVIEWED' ? 'Reviewed' : 'Open'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpenModal(d)}>
                            View Full
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDeleteRemark(id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          currentPage={safePage}
          totalItems={filteredHistory.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemLabel="remarks"
        />
      </div>

      {/* View Full Remark Modal */}
      {openModal && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setOpenModal(null);
          }}
        >
          <div className="modal-box" style={{ maxWidth: 520, padding: 0, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ background: '#123B5D', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: '#BEDBFF', fontWeight: 700, textTransform: 'uppercase' }}>
                  Roll #{openModal.rollNo} · {formatStdLabel(openModal.standard)} Div {openModal.division}
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  {openModal.studentName || openModal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(null)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '18px 20px', background: '#fff' }}>
              <div className="detail-panel__row"><span>Remark Type</span><span className="chip chip-warning">{openModal.type}</span></div>
              <div className="detail-panel__row"><span>Date</span><span className="num">{formatDate(openModal.date)}</span></div>
              <div className="detail-panel__row"><span>Stream</span><span>{formatGroupLabel(openModal.streamGroup)}</span></div>
              <div className="detail-panel__row"><span>Contact</span><span className="num">{openModal.contactNo || '—'}</span></div>
              <div className="detail-panel__row"><span>Noted By</span><span>{openModal.notedBy}</span></div>

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
                <div className="text-slate" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>OBSERVATION MESSAGE</div>
                <p style={{ fontSize: 13.8, lineHeight: 1.6, overflowWrap: 'break-word', wordBreak: 'normal', margin: 0 }}>
                  {openModal.message || openModal.description}
                </p>
              </div>

              {openModal.principalNote && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: '#E8F1F8', border: '1px solid #C8DDF0' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#123B5D', marginBottom: 4 }}>PRINCIPAL ACTION NOTE</div>
                  <div style={{ fontSize: 13, color: '#1C2340' }}>{openModal.principalNote}</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpenModal(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
