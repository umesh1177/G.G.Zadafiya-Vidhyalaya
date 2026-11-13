import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { disciplineApi } from '../../services/disciplineApi';
import { studentApi } from '../../services/studentApi';
import PaginationBar from '../../components/common/PaginationBar';
import VoiceInputControl from '../../components/common/VoiceInputControl';

const FREQUENT_PAGE_SIZE = 8;
const LOGS_PAGE_SIZE = 10;

function formatStdLabel(std) {
  return String(std || '').includes('12') ? 'Std 12' : 'Std 11';
}

function formatGroupLabel(group) {
  if (group === 'GROUP_A') return 'Group A (PCM)';
  if (group === 'GROUP_B') return 'Group B (PCB)';
  if (group === 'GROUP_AB') return 'Group AB';
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
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getRiskChip(riskLevel, count) {
  if (riskLevel === 'CRITICAL' || count >= 4) {
    return { cls: 'chip-danger', label: 'Critical Repeat' };
  }
  if (riskLevel === 'HIGH' || count === 3) {
    return { cls: 'chip-danger', label: 'High Priority' };
  }
  if (riskLevel === 'WATCH' || count === 2) {
    return { cls: 'chip-warning', label: 'Repeat Watch' };
  }
  return { cls: 'chip-neutral', label: 'Single Flag' };
}

export default function DisciplineRemark() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();

  useEffect(() => {
    setHeader({
      title: 'Discipline & Conduct Records',
      subtitle: 'Frequent undisciplined student tracking & behavioral logs across Std 11 & 12',
    });
  }, [setHeader]);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState('frequent'); // 'frequent' | 'logs'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStd, setFilterStd] = useState('ALL');
  const [filterDiv, setFilterDiv] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [minFlags, setMinFlags] = useState(2);

  // Pagination
  const [frequentPage, setFrequentPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);

  // Data
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [studentsCache, setStudentsCache] = useState([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentHistoryModal, setStudentHistoryModal] = useState(null);
  const [reviewRemarkModal, setReviewRemarkModal] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('REVIEWED');
  const [reviewNote, setReviewNote] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const principalRemarkTypeRef = useRef(null);
  const principalRemarkMessageRef = useRef(null);
  const principalReviewNoteRef = useRef(null);

  // Principal Add Incident Form (with Std + Div + Roll No Auto-fill & Datalist)
  const [formData, setFormData] = useState({
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
  const [lookupStatus, setLookupStatus] = useState('idle');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, students] = await Promise.all([
        disciplineApi.getPrincipalOverview({
          standard: filterStd,
          division: filterDiv,
          type: filterType,
          search: searchQuery.trim() || undefined,
          minFlags,
        }),
        studentApi.getStudents({ status: 'ACTIVE' }).catch(() => []),
      ]);
      setOverview(ov);
      if (Array.isArray(students)) setStudentsCache(students);
    } catch (err) {
      setBanner({ kind: 'danger', text: err.message || 'Failed to load discipline overview.' });
    } finally {
      setLoading(false);
    }
  }, [filterStd, filterDiv, filterType, searchQuery, minFlags]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadOverview();
    };
    window.addEventListener('focus', loadOverview);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', loadOverview);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadOverview]);

  // Student Auto-fill inside Principal "+ Record New Incident" modal
  useEffect(() => {
    if (!isAddModalOpen) return;
    const rollStr = String(formData.rollNo || '').trim();
    if (!rollStr || isNaN(Number(rollStr)) || Number(rollStr) < 1) {
      setLookupStatus('idle');
      setFormData((p) => ({ ...p, studentId: '', studentName: '', streamGroup: '', contactNo: '', email: '' }));
      return;
    }

    const rollNum = Number(rollStr);
    const localHit = studentsCache.find(
      (s) => s.standard === formData.standard && s.division === formData.division && Number(s.rollNo) === rollNum
    );
    if (localHit) {
      setLookupStatus('found');
      setFormData((p) => ({
        ...p,
        studentId: localHit.id || localHit._id || '',
        studentName: localHit.fullName || localHit.name || '',
        streamGroup: localHit.streamGroup || '',
        contactNo: localHit.contactNo || '',
        email: localHit.email || '',
      }));
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await disciplineApi.lookupStudent({
          standard: formData.standard,
          division: formData.division,
          rollNo: rollNum,
        });
        if (cancelled) return;
        if (res.found && res.student) {
          setLookupStatus('found');
          setFormData((p) => ({
            ...p,
            studentId: res.student.id || res.student._id || '',
            studentName: res.student.fullName || '',
            streamGroup: res.student.streamGroup || '',
            contactNo: res.student.contactNo || '',
            email: res.student.email || '',
          }));
        } else {
          setLookupStatus('not-found');
          setFormData((p) => ({ ...p, studentId: '', studentName: '', streamGroup: '', contactNo: '', email: '' }));
        }
      } catch {
        if (!cancelled && !localHit) setLookupStatus('not-found');
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isAddModalOpen, formData.standard, formData.division, formData.rollNo, studentsCache]);

  const handleCreateRemark = async (e) => {
    e.preventDefault();
    if (!formData.rollNo || Number(formData.rollNo) < 1 || !formData.studentName.trim()) {
      setFormError('Please select Standard & Division and enter a valid student Roll No.');
      return;
    }
    if (!formData.type.trim() || !formData.message.trim()) {
      setFormError('Please specify a Discipline Remark type and observation message.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await disciplineApi.createRemark({
        studentId: formData.studentId || undefined,
        rollNo: Number(formData.rollNo),
        studentName: formData.studentName.trim(),
        standard: formData.standard,
        division: formData.division,
        streamGroup: formData.streamGroup,
        contactNo: formData.contactNo,
        email: formData.email,
        type: formData.type.trim(),
        date: formData.date || getTodayIso(),
        message: formData.message.trim(),
        notedBy: user?.name || 'Principal Office',
        notedByRole: 'PRINCIPAL',
        notedById: user?.id || 'principal',
      });

      setIsAddModalOpen(false);
      setBanner({
        kind: 'success',
        text: res.addedNewType
          ? `Disciplinary remark recorded for ${formData.studentName} & "${formData.type.trim()}" added to suggestions.`
          : `Disciplinary remark recorded for ${formData.studentName} (Roll #${formData.rollNo}).`,
      });
      setFormData({
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
      setLookupStatus('idle');
      await loadOverview();
    } catch (err) {
      setFormError(err.message || 'Failed to save disciplinary record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewRemarkModal) return;
    setSavingReview(true);
    try {
      await disciplineApi.updateRemark(reviewRemarkModal.id || reviewRemarkModal._id, {
        status: reviewStatus,
        principalNote: reviewNote,
      });
      setReviewRemarkModal(null);
      setBanner({ kind: 'success', text: 'Discipline remark status & Principal note updated.' });
      await loadOverview();
    } catch (err) {
      setBanner({ kind: 'danger', text: err.message || 'Failed to update remark.' });
    } finally {
      setSavingReview(false);
    }
  };

  const handleDeleteRemark = async (id) => {
    if (!window.confirm('Delete this disciplinary remark permanently?')) return;
    try {
      await disciplineApi.deleteRemark(id);
      setBanner({ kind: 'success', text: 'Disciplinary entry deleted.' });
      if (studentHistoryModal) {
        setStudentHistoryModal(null);
      }
      await loadOverview();
    } catch (err) {
      setBanner({ kind: 'danger', text: err.message || 'Failed to delete entry.' });
    }
  };

  const stats = overview?.stats || {
    totalRemarks: 0,
    todayCount: 0,
    thisWeekCount: 0,
    openCount: 0,
    uniqueStudentsFlagged: 0,
    frequentOffendersCount: 0,
    criticalOffendersCount: 0,
    topInfractionType: { type: 'None', count: 0 },
  };
  const typeBreakdown = overview?.typeBreakdown || [];
  const frequentOffenders = overview?.frequentOffenders || [];
  const remarks = overview?.remarks || [];
  const types = overview?.types || [];

  const isCustomTypeInModal = useMemo(() => {
    const t = String(formData.type || '').trim().toLowerCase();
    if (!t) return false;
    return !types.some((item) => String(item.name || '').trim().toLowerCase() === t);
  }, [formData.type, types]);

  const safeFrequentPage = Math.min(frequentPage, Math.max(1, Math.ceil(frequentOffenders.length / FREQUENT_PAGE_SIZE)));
  const paginatedFrequent = frequentOffenders.slice(
    (safeFrequentPage - 1) * FREQUENT_PAGE_SIZE,
    safeFrequentPage * FREQUENT_PAGE_SIZE
  );

  const safeLogsPage = Math.min(logsPage, Math.max(1, Math.ceil(remarks.length / LOGS_PAGE_SIZE)));
  const paginatedRemarks = remarks.slice(
    (safeLogsPage - 1) * LOGS_PAGE_SIZE,
    safeLogsPage * LOGS_PAGE_SIZE
  );

  return (
    <>
      {banner && (
        <div
          className={`banner ${banner.kind === 'success' ? 'banner-success' : banner.kind === 'warning' ? 'banner-warning' : 'banner-danger'}`}
          style={{ marginBottom: 14, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{banner.text}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBanner(null)}>✕</button>
        </div>
      )}

      {/* Top 4 KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Total Discipline Flags</div>
          <div className="kpi-card__value num">{stats.totalRemarks}</div>
          <div className="kpi-card__hint">
            {stats.uniqueStudentsFlagged} students flagged · {stats.openCount} open
          </div>
        </div>

        <div className="kpi-card is-danger">
          <div className="kpi-card__label">Frequent Offenders (2+)</div>
          <div className="kpi-card__value num">{stats.frequentOffendersCount}</div>
          <div className="kpi-card__hint">
            {stats.criticalOffendersCount} critical (3+ flags)
          </div>
        </div>

        <div className="kpi-card is-warning">
          <div className="kpi-card__label">This Week / Today</div>
          <div className="kpi-card__value num">{stats.thisWeekCount}</div>
          <div className="kpi-card__hint">{stats.todayCount} logged today</div>
        </div>

        <div className="kpi-card is-success">
          <div className="kpi-card__label">Top Remark Type</div>
          <div className="kpi-card__value" style={{ fontSize: 18, lineHeight: 1.3 }}>
            {stats.topInfractionType?.type || 'None'}
          </div>
          <div className="kpi-card__hint num">
            {stats.topInfractionType?.count || 0} occurrences
          </div>
        </div>
      </div>

      {/* Critical Alert Banner when repeat offenders >= 3 exist */}
      {stats.criticalOffendersCount > 0 && (
        <div
          className="banner banner-danger"
          style={{ marginBottom: 16, justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}
        >
          <span>
            <strong>Attention Required:</strong> {stats.criticalOffendersCount} student(s) have accumulated <strong>3 or more</strong> discipline flags and may require parent consultation.
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setActiveTab('frequent');
              setMinFlags(3);
              setFrequentPage(1);
            }}
          >
            View Critical Students →
          </button>
        </div>
      )}

      {/* Breakdown Strip by Remark Type */}
      {typeBreakdown.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card__head">
            <div>
              <div className="card__title">Discipline Remark Breakdown</div>
              <div className="card__desc">Click any category chip to filter logs &amp; frequent offenders</div>
            </div>
            {filterType !== 'ALL' && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilterType('ALL')}>
                Reset Type Filter
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
            {typeBreakdown.slice(0, 6).map((tb) => {
              const active = filterType.toLowerCase() === tb.type.toLowerCase();
              return (
                <div
                  key={tb.type}
                  onClick={() => {
                    setFilterType(active ? 'ALL' : tb.type);
                    setFrequentPage(1);
                    setLogsPage(1);
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: active ? '1.5px solid #123B5D' : '1px solid var(--line-soft)',
                    background: active ? '#E8F1F8' : '#FAFBFD',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    <span>{tb.type}</span>
                    <span className="num" style={{ color: '#123B5D' }}>{tb.count} ({tb.percent}%)</span>
                  </div>
                  <div style={{ background: '#E4EAF2', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${tb.percent}%`, background: '#123B5D', height: '100%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Row: Tabs + Record New Incident Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'frequent' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('frequent')}
          >
            Frequent Undisciplined Students ({frequentOffenders.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'logs' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            All Discipline Remarks ({remarks.length})
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setFormError(null);
            setIsAddModalOpen(true);
          }}
        >
          + Record New Incident
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div className="lt-filters-grid">
          <input
            type="text"
            className="field-input"
            placeholder="Search student, roll no, remark or staff..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setFrequentPage(1);
              setLogsPage(1);
            }}
          />
          <select
            className="filter-select"
            value={filterStd}
            onChange={(e) => {
              setFilterStd(e.target.value);
              setFrequentPage(1);
              setLogsPage(1);
            }}
          >
            <option value="ALL">All Standards</option>
            <option value="STD_11">Standard 11</option>
            <option value="STD_12">Standard 12</option>
          </select>
          <select
            className="filter-select"
            value={filterDiv}
            onChange={(e) => {
              setFilterDiv(e.target.value);
              setFrequentPage(1);
              setLogsPage(1);
            }}
          >
            <option value="ALL">All Divisions</option>
            <option value="A">Division A</option>
            <option value="B">Division B</option>
            <option value="C">Division C</option>
            <option value="D">Division D</option>
          </select>
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setFrequentPage(1);
              setLogsPage(1);
            }}
          >
            <option value="ALL">All Remark Types</option>
            {types.map((t) => (
              <option key={t.id || t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
          {activeTab === 'frequent' && (
            <select
              className="filter-select"
              value={minFlags}
              onChange={(e) => {
                setMinFlags(Number(e.target.value));
                setFrequentPage(1);
              }}
            >
              <option value={2}>Repeat Offenders (2+ Flags)</option>
              <option value={3}>Critical Only (3+ Flags)</option>
              <option value={1}>All Flagged Students (1+)</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: FREQUENT UNDISCIPLINED STUDENTS */}
      {activeTab === 'frequent' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="card__head"
            style={{ padding: '16px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}
          >
            <div>
              <div className="card__title">Frequent Undisciplined Students ({frequentOffenders.length})</div>
              <div className="card__desc">
                Students ranked by repeated behavioral remarks — click View History for parent follow-up &amp; full timeline
              </div>
            </div>
          </div>

          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Risk</th>
                  <th>Student &amp; Class</th>
                  <th>Parent Contact</th>
                  <th>Total Flags</th>
                  <th>Violation Pattern</th>
                  <th>Latest Remark</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      Analyzing frequent undisciplined students...
                    </td>
                  </tr>
                ) : paginatedFrequent.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No students match the selected flag threshold ({minFlags}+ flags). Try lowering filter to <strong>All Flagged Students (1+)</strong> or clearing filters.
                    </td>
                  </tr>
                ) : (
                  paginatedFrequent.map((fo) => {
                    const risk = getRiskChip(fo.riskLevel, fo.count);
                    return (
                      <tr key={fo.studentKey}>
                        <td>
                          <span className={`chip ${risk.cls}`}>{risk.label}</span>
                        </td>
                        <td>
                          <div>
                            <strong>{fo.studentName}</strong>
                            <span className="num" style={{ marginLeft: 6, color: '#123B5D', fontWeight: 700 }}>
                              #{fo.rollNo}
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                            {formatStdLabel(fo.standard)} · Div {fo.division}
                            {fo.streamGroup ? ` · ${formatGroupLabel(fo.streamGroup)}` : ''}
                          </div>
                        </td>
                        <td className="num" style={{ fontSize: 12.5 }}>
                          {fo.contactNo ? (
                            <a href={`tel:${fo.contactNo}`} style={{ color: '#123B5D', fontWeight: 600 }}>
                              {fo.contactNo}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <span className={`chip ${fo.count >= 3 ? 'chip-danger' : 'chip-warning'} num`}>
                            {fo.count} Flags
                          </span>
                          {fo.openCount > 0 && (
                            <div style={{ fontSize: 11, color: '#E0473D', marginTop: 2, fontWeight: 600 }}>
                              {fo.openCount} pending review
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {(fo.typesSummary || []).map((ts) => (
                              <span key={ts.type} className="chip chip-neutral" style={{ fontSize: 11.5 }}>
                                {ts.type} ×{ts.count}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="num">{formatDate(fo.latestDate)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setStudentHistoryModal(fo)}
                          >
                            View History
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            currentPage={safeFrequentPage}
            totalItems={frequentOffenders.length}
            pageSize={FREQUENT_PAGE_SIZE}
            onPageChange={setFrequentPage}
            itemLabel="students"
          />
        </div>
      )}

      {/* TAB 2: ALL DISCIPLINE REMARKS */}
      {activeTab === 'logs' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="card__head"
            style={{ padding: '16px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}
          >
            <div>
              <div className="card__title">All Disciplinary Entries ({remarks.length})</div>
              <div className="card__desc">Complete record logged by Assistant Faculty &amp; Principal Office</div>
            </div>
          </div>

          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student &amp; Class</th>
                  <th>Remark Type</th>
                  <th>Noted By</th>
                  <th>Date</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      Loading discipline records...
                    </td>
                  </tr>
                ) : paginatedRemarks.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No disciplinary incidents recorded for this filter.
                    </td>
                  </tr>
                ) : (
                  paginatedRemarks.map((inc) => {
                    const id = inc.id || inc._id;
                    return (
                      <tr key={id}>
                        <td className="num"><strong>#{inc.rollNo}</strong></td>
                        <td>
                          <strong>{inc.studentName || inc.name}</strong>
                          <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                            {formatStdLabel(inc.standard)} · Div {inc.division}
                          </div>
                        </td>
                        <td><span className="chip chip-warning">{inc.type}</span></td>
                        <td>
                          <div>{inc.notedBy}</div>
                          <div style={{ fontSize: 11, color: 'var(--slate)' }}>
                            {inc.notedByRole === 'PRINCIPAL' ? 'Principal' : 'Assistant'}
                          </div>
                        </td>
                        <td className="num">{formatDate(inc.date)}</td>
                        <td style={{ maxWidth: 240, overflowWrap: 'anywhere' }}>
                          {String(inc.message || inc.description || '').length > 65
                            ? `${String(inc.message || inc.description).slice(0, 65)}...`
                            : inc.message || inc.description}
                        </td>
                        <td>
                          <span className={`chip ${inc.status === 'RESOLVED' ? 'chip-success' : inc.status === 'REVIEWED' ? 'chip-neutral' : 'chip-danger'}`}>
                            {inc.status === 'RESOLVED' ? 'Resolved' : inc.status === 'REVIEWED' ? 'Reviewed' : 'Open'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setReviewRemarkModal(inc);
                                setReviewStatus(inc.status === 'RESOLVED' ? 'RESOLVED' : 'REVIEWED');
                                setReviewNote(inc.principalNote || '');
                              }}
                            >
                              Review
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
            currentPage={safeLogsPage}
            totalItems={remarks.length}
            pageSize={LOGS_PAGE_SIZE}
            onPageChange={setLogsPage}
            itemLabel="remarks"
          />
        </div>
      )}

      {/* MODAL 1: PRINCIPAL RECORD NEW INCIDENT (WITH AUTO-FILL & DATALIST) */}
      {isAddModalOpen && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setIsAddModalOpen(false);
          }}
        >
          <div
            className="modal-box"
            style={{ maxWidth: 560, padding: 0, borderRadius: 16, overflow: 'hidden', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ background: '#123B5D', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 11, color: '#BEDBFF', fontWeight: 700, textTransform: 'uppercase' }}>
                  Principal Discipline Office
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  Log Disciplinary Observation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateRemark}
              style={{ padding: '18px 20px', background: '#fff', overflowY: 'auto', flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {formError && <div className="banner banner-danger" style={{ marginBottom: 0 }}><span>{formError}</span></div>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                <div>
                  <label className="field-label">Standard *</label>
                  <select
                    className="filter-select w-full"
                    value={formData.standard}
                    onChange={(e) => setFormData((p) => ({ ...p, standard: e.target.value }))}
                  >
                    <option value="STD_11">Standard 11</option>
                    <option value="STD_12">Standard 12</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Division *</label>
                  <select
                    className="filter-select w-full"
                    value={formData.division}
                    onChange={(e) => setFormData((p) => ({ ...p, division: e.target.value }))}
                  >
                    <option value="A">Div A</option>
                    <option value="B">Div B</option>
                    <option value="C">Div C</option>
                    <option value="D">Div D</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Roll No *</label>
                  <input
                    type="number"
                    min={1}
                    className="field-input w-full num"
                    placeholder="e.g. 1"
                    value={formData.rollNo}
                    onChange={(e) => setFormData((p) => ({ ...p, rollNo: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {lookupStatus === 'not-found' && (
                <div style={{ fontSize: 12.5, color: '#E0473D', fontWeight: 600 }}>
                  No student found with Roll #{formData.rollNo} in {formatStdLabel(formData.standard)} Div {formData.division}.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <div>
                  <label className="field-label">Student Name (Auto-filled)</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    value={formData.studentName}
                    placeholder="Auto-filled from Roll No"
                    readOnly
                    style={{ background: '#F8FAFC', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label className="field-label">Contact No (Auto-filled)</label>
                  <input
                    type="text"
                    className="field-input w-full num"
                    value={formData.contactNo}
                    placeholder="Auto-filled"
                    readOnly
                    style={{ background: '#F8FAFC' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <div>
                  <label className="field-label">Remark Type (Datalist) *</label>
                  <input
                    type="text"
                    ref={principalRemarkTypeRef}
                    list="principal-discipline-datalist"
                    className="field-input w-full"
                    placeholder="Select, type or speak remark..."
                    value={formData.type}
                    onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
                    required
                    autoComplete="off"
                  />
                  <VoiceInputControl
                    value={formData.type}
                    onChange={(val) => setFormData((p) => ({ ...p, type: val }))}
                    inputRef={principalRemarkTypeRef}
                    compact
                    defaultLang="gu-IN"
                  />
                  <datalist id="principal-discipline-datalist">
                    {types.map((t) => (
                      <option key={t.id || t.name} value={t.name} />
                    ))}
                  </datalist>
                  {isCustomTypeInModal && (
                    <div style={{ fontSize: 11, color: '#1F9D6B', fontWeight: 600, marginTop: 4 }}>
                      New type will be saved to datalist automatically.
                    </div>
                  )}
                </div>

                <div>
                  <label className="field-label">Date</label>
                  <input
                    type="date"
                    className="field-input w-full num"
                    value={formData.date}
                    onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Detailed Observation &amp; Guidance (અવલોકન / માર્ગદર્શન) *</label>
                <textarea
                  ref={principalRemarkMessageRef}
                  className="field-input w-full"
                  rows={3}
                  placeholder="Enter details of infraction or speak in Gujarati/English..."
                  value={formData.message}
                  onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                  required
                />
                <VoiceInputControl
                  value={formData.message}
                  onChange={(val) => setFormData((p) => ({ ...p, message: val }))}
                  inputRef={principalRemarkMessageRef}
                  defaultLang="gu-IN"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Disciplinary Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STUDENT FREQUENT OFFENDER FULL HISTORY */}
      {studentHistoryModal && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setStudentHistoryModal(null);
          }}
        >
          <div
            className="modal-box"
            style={{ maxWidth: 680, padding: 0, borderRadius: 16, overflow: 'hidden', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ background: '#123B5D', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 11, color: '#BEDBFF', fontWeight: 700, textTransform: 'uppercase' }}>
                  Roll #{studentHistoryModal.rollNo} · {formatStdLabel(studentHistoryModal.standard)} Div {studentHistoryModal.division}
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  {studentHistoryModal.studentName} — Conduct History ({studentHistoryModal.count} Flags)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStudentHistoryModal(null)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 20px', background: '#fff', overflowY: 'auto', flex: '1 1 auto' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <span className="chip chip-danger num">{studentHistoryModal.count} Total Flags</span>
                <span className="chip chip-neutral">Top Issue: {studentHistoryModal.topType}</span>
                {studentHistoryModal.contactNo && (
                  <a href={`tel:${studentHistoryModal.contactNo}`} className="chip chip-neutral num">
                    Call Parent: {studentHistoryModal.contactNo}
                  </a>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(studentHistoryModal.history || []).map((h, i) => (
                  <div
                    key={h.id || i}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid #E4E7F2',
                      background: '#FAFBFD',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="chip chip-warning">{h.type}</span>
                        <span className={`chip ${h.status === 'RESOLVED' ? 'chip-success' : h.status === 'REVIEWED' ? 'chip-neutral' : 'chip-danger'}`}>
                          {h.status || 'OPEN'}
                        </span>
                      </div>
                      <span className="num text-slate" style={{ fontSize: 12 }}>
                        {formatDate(h.date)} · Noted by {h.notedBy}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13.4, color: 'var(--ink)', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                      {h.message}
                    </p>
                    {h.principalNote && (
                      <div style={{ marginTop: 8, fontSize: 12.5, color: '#123B5D', background: '#E8F1F8', padding: '6px 10px', borderRadius: 8 }}>
                        <strong>Principal Note:</strong> {h.principalNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', background: '#FAFBFD' }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setStudentHistoryModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REVIEW / RESOLVE INDIVIDUAL REMARK */}
      {reviewRemarkModal && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setReviewRemarkModal(null);
          }}
        >
          <div className="modal-box" style={{ maxWidth: 500, padding: 0, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ background: '#123B5D', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: '#BEDBFF', fontWeight: 700, textTransform: 'uppercase' }}>
                  {reviewRemarkModal.type} · {formatDate(reviewRemarkModal.date)}
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 800, color: '#fff' }}>
                  Review: {reviewRemarkModal.studentName} (#{reviewRemarkModal.rollNo})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewRemarkModal(null)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReview} style={{ padding: '18px 20px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 10, background: '#FAFBFD', border: '1px solid var(--line-soft)', fontSize: 13.5 }}>
                <div style={{ fontSize: 11.5, color: 'var(--slate)', fontWeight: 700, marginBottom: 4 }}>STAFF OBSERVATION</div>
                {reviewRemarkModal.message}
              </div>

              <div>
                <label className="field-label">Status</label>
                <select className="filter-select w-full" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                  <option value="OPEN">Open</option>
                  <option value="REVIEWED">Reviewed by Principal</option>
                  <option value="RESOLVED">Resolved / Parent Informed</option>
                </select>
              </div>

              <div>
                <label className="field-label">Principal Action Note (આચાર્ય નોંધ / માર્ગદર્શન)</label>
                <textarea
                  ref={principalReviewNoteRef}
                  className="field-input w-full"
                  rows={3}
                  placeholder="Add follow-up guidance, parent call summary, or speak in Gujarati/English..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
                <VoiceInputControl
                  value={reviewNote}
                  onChange={setReviewNote}
                  inputRef={principalReviewNoteRef}
                  defaultLang="gu-IN"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setReviewRemarkModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingReview}>
                  {savingReview ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
