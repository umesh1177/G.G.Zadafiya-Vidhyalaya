import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { examApi } from '../../services/examApi';
import PaginationBar from '../../components/common/PaginationBar';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatExamTypeLabel(t) {
  const map = {
    BOARD: 'Board',
    GUJCET: 'GUJCET',
    JEE: 'JEE',
    NEET: 'NEET',
    WEEKLY: 'Weekly',
    ANNUAL: 'Annual',
    OTHER: 'Other',
  };
  return map[String(t || '').toUpperCase()] || t || 'Board';
}

export default function ExamAnalysis() {
  const { setHeader } = useOutletContext();

  useEffect(() => {
    setHeader({
      title: 'Exam Analysis',
      subtitle: 'Board · GUJCET · JEE · NEET — all metrics & exams',
    });
  }, [setHeader]);

  const [activeTab, setActiveTab] = useState('completed');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStandard, setFilterStandard] = useState('');
  const [filterDivision, setFilterDivision] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    board: 0,
    gujcet: 0,
    jee: 0,
    neet: 0,
    pending: 0,
    completed: 0,
  });
  const [completedExams, setCompletedExams] = useState([]);
  const [pendingExams, setPendingExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [completedPage, setCompletedPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const PAGE_SIZE = 8;

  const loadSummary = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setErrorMsg(null);
    }
    try {
      const data = await examApi.getExamAnalysisSummary({});
      setStats(
        data?.stats || {
          total: 0,
          board: 0,
          gujcet: 0,
          jee: 0,
          neet: 0,
          pending: 0,
          completed: 0,
        }
      );
      setCompletedExams(data?.completedExams || []);
      setPendingExams(data?.pendingExams || []);
    } catch (err) {
      if (!silent) setErrorMsg(err.message || 'Failed to load Exam Analysis');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary(false);
    const onFocus = () => loadSummary(true);
    const onVis = () => {
      if (document.visibilityState === 'visible') loadSummary(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadSummary]);

  const matchSubjectFilter = (exam, filterVal) => {
    if (!filterVal) return true;
    const f = filterVal.toLowerCase();
    const s = String(exam.subject || '').toLowerCase();
    const t = String(exam.examType || '').toUpperCase();
    if (f.includes('phys')) return s.includes('phys') || s.includes('pcm') || s.includes('pcb') || ['JEE', 'NEET', 'GUJCET'].includes(t);
    if (f.includes('chem')) return s.includes('chem') || s.includes('pcm') || s.includes('pcb') || ['JEE', 'NEET', 'GUJCET'].includes(t);
    if (f.includes('math')) return s.includes('math') || s.includes('pcm') || t === 'JEE' || t === 'GUJCET';
    if (f.includes('bio')) return s.includes('bio') || s.includes('pcb') || t === 'NEET' || t === 'GUJCET';
    return s.includes(f);
  };

  const applyFilters = (list) => {
    const q = searchTerm.trim().toLowerCase();
    return list.filter((e) => {
      const matchSearch =
        !q ||
        String(e.examNo || '').includes(q) ||
        String(e.subject || '').toLowerCase().includes(q) ||
        String(e.examType || '').toLowerCase().includes(q) ||
        String(e.unitSummary || '').toLowerCase().includes(q) ||
        String(e.marksEnteredByName || '').toLowerCase().includes(q);
      const matchSubj = matchSubjectFilter(e, filterSubject);
      const matchType = !filterType || e.examType === filterType.toUpperCase();
      const matchStd = !filterStandard || e.standard === filterStandard;
      const matchDiv = !filterDivision || e.division === 'ALL' || e.division === filterDivision;
      return matchSearch && matchSubj && matchType && matchStd && matchDiv;
    });
  };

  const filteredCompleted = applyFilters(completedExams);
  const filteredPending = applyFilters(pendingExams);

  const safeCompletedPage = Math.min(completedPage, Math.max(1, Math.ceil(filteredCompleted.length / PAGE_SIZE)));
  const paginatedCompleted = filteredCompleted.slice(
    (safeCompletedPage - 1) * PAGE_SIZE,
    safeCompletedPage * PAGE_SIZE
  );

  const safePendingPage = Math.min(pendingPage, Math.max(1, Math.ceil(filteredPending.length / PAGE_SIZE)));
  const paginatedPending = filteredPending.slice(
    (safePendingPage - 1) * PAGE_SIZE,
    safePendingPage * PAGE_SIZE
  );

  const resetFilters = () => {
    setSearchTerm('');
    setFilterSubject('');
    setFilterType('');
    setFilterStandard('');
    setFilterDivision('');
    setCompletedPage(1);
    setPendingPage(1);
  };

  const avgChipClass = (pct) => {
    if (pct === null || pct === undefined) return 'chip-neutral';
    if (pct >= 75) return 'chip-success';
    if (pct >= 50) return 'chip-warning';
    return 'chip-danger';
  };

  return (
    <>
      {/* 5 KPI Cards (Photo 1 layout with responsive grid) */}
      <div className="kpi-grid-5">
        <div className="kpi-card">
          <div className="kpi-card__label">Total Exam</div>
          <div className="kpi-card__value num">{stats.total}</div>
          <div className="kpi-card__hint">All conducted &amp; scheduled</div>
        </div>
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Board Exam</div>
          <div className="kpi-card__value num">{stats.board}</div>
          <div className="kpi-card__hint">Single-subject board tests</div>
        </div>
        <div className="kpi-card is-warning">
          <div className="kpi-card__label">Gujcet Exam</div>
          <div className="kpi-card__value num">{stats.gujcet}</div>
          <div className="kpi-card__hint">PCM / PCB stream tests</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Jee Exam</div>
          <div className="kpi-card__value num">{stats.jee}</div>
          <div className="kpi-card__hint">Physics · Chemistry · Maths</div>
        </div>
        <div className="kpi-card is-danger">
          <div className="kpi-card__label">Neet Exam</div>
          <div className="kpi-card__value num">{stats.neet}</div>
          <div className="kpi-card__hint">Physics · Chemistry · Biology</div>
        </div>
      </div>

      {/* Action Required Banner */}
      {stats.pending > 0 && (
        <div className="banner banner-warning" style={{ marginBottom: 16 }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 20, height: 20, flexShrink: 0 }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <strong>Action Required:</strong> You have {stats.pending} exam record{stats.pending === 1 ? '' : 's'} awaiting completion or grade uploads.
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="banner banner-warning" style={{ marginBottom: 16 }}>
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* Structured 2-Row Filter Card (matches LtAnalysis cleanly & mobile-responsive) */}
      <div className="card lt-filters-card">
        <div className="lt-search-row">
          <span className="lt-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="field-input lt-search-input"
            placeholder="Search exam ledger by subject name, exam #, or units covered..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCompletedPage(1);
              setPendingPage(1);
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className="lt-search-clear"
              aria-label="Clear search"
              onClick={() => {
                setSearchTerm('');
                setCompletedPage(1);
                setPendingPage(1);
              }}
            >
              ✕
            </button>
          )}
        </div>

        <div className="lt-filters-grid">
          <div className="lt-filter-field">
            <label className="field-label" htmlFor="exam-filter-subject">Subject</label>
            <select
              id="exam-filter-subject"
              className="filter-select"
              value={filterSubject}
              onChange={(e) => {
                setFilterSubject(e.target.value);
                setCompletedPage(1);
                setPendingPage(1);
              }}
            >
              <option value="">All Subjects</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Biology">Biology</option>
            </select>
          </div>

          <div className="lt-filter-field">
            <label className="field-label" htmlFor="exam-filter-stream">Exam Stream / Type</label>
            <select
              id="exam-filter-stream"
              className="filter-select"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCompletedPage(1);
                setPendingPage(1);
              }}
            >
              <option value="">All Streams</option>
              <option value="BOARD">Board</option>
              <option value="GUJCET">GUJCET</option>
              <option value="JEE">JEE</option>
              <option value="NEET">NEET</option>
              <option value="WEEKLY">Weekly</option>
              <option value="ANNUAL">Annual</option>
            </select>
          </div>

          <div className="lt-filter-field">
            <label className="field-label" htmlFor="exam-filter-std">Standard</label>
            <select
              id="exam-filter-std"
              className="filter-select"
              value={filterStandard}
              onChange={(e) => {
                setFilterStandard(e.target.value);
                setCompletedPage(1);
                setPendingPage(1);
              }}
            >
              <option value="">All Standards</option>
              <option value="STD_11">Standard 11</option>
              <option value="STD_12">Standard 12</option>
            </select>
          </div>

          <div className="lt-filter-field">
            <label className="field-label" htmlFor="exam-filter-div">Division</label>
            <select
              id="exam-filter-div"
              className="filter-select"
              value={filterDivision}
              onChange={(e) => {
                setFilterDivision(e.target.value);
                setCompletedPage(1);
                setPendingPage(1);
              }}
            >
              <option value="">All Divisions</option>
              <option value="A">Division A</option>
              <option value="B">Division B</option>
              <option value="C">Division C</option>
              <option value="D">Division D</option>
            </select>
          </div>

          <div className="lt-filter-reset-wrap">
            {searchTerm || filterSubject || filterType || filterStandard || filterDivision ? (
              <button type="button" className="btn btn-ghost btn-sm w-full" onClick={resetFilters}>
                ↺ Reset Filters
              </button>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => loadSummary(false)}>
                ↻ Refresh ({activeTab === 'completed' ? filteredCompleted.length : filteredPending.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'completed' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Complete Exam ({filteredCompleted.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'pending' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Exam ({filteredPending.length})
        </button>
      </div>

      {/* Tab 1: Completed Exams Ledger (Paginated) */}
      {activeTab === 'completed' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-soft)' }}>
            <div className="card__title">Completed Exam</div>
            <div className="card__desc">Historical performance records of completed examinations with assistant-entered marks</div>
          </div>

          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>EXAM NO</th>
                  <th>SUBJECT</th>
                  <th>TYPE</th>
                  <th>STANDARD</th>
                  <th>EXAM DATE</th>
                  <th>UNITS COVERED</th>
                  <th>AVERAGE OF CLASS</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      Loading live examination analytics from database...
                    </td>
                  </tr>
                ) : filteredCompleted.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--slate)' }}>
                      No completed exams found matching your criteria. Once Assistant Faculty enters exam marks, they appear here immediately.
                    </td>
                  </tr>
                ) : (
                  paginatedCompleted.map((e) => (
                    <tr key={e.id}>
                      <td className="num"><strong>#{e.examNo}</strong></td>
                      <td><strong>{e.subject}</strong></td>
                      <td>
                        <span className="chip chip-neutral">{formatExamTypeLabel(e.examType)}</span>
                      </td>
                      <td>
                        <span className="chip chip-neutral">
                          {e.standardLabel}{e.division && e.division !== 'ALL' ? ` · Div ${e.division}` : ''}
                        </span>
                      </td>
                      <td className="num">{formatDate(e.examDate)}</td>
                      <td style={{ maxWidth: 230 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }} title={e.unitSummary}>
                          {e.unitSummary || '—'}
                        </div>
                      </td>
                      <td className="num">
                        {e.classAveragePercent !== null && e.classAveragePercent !== undefined ? (
                          <span className={`chip ${avgChipClass(e.classAveragePercent)}`}>
                            <strong>{e.classAveragePercent}%</strong>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/principal/exam-analysis/${e.id}`}
                          className="btn btn-primary btn-sm"
                        >
                          View Analysis
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            currentPage={safeCompletedPage}
            totalItems={filteredCompleted.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCompletedPage}
            itemLabel="completed exams"
          />
        </div>
      )}

      {/* Tab 2: Pending Exams Ledger (Paginated) */}
      {activeTab === 'pending' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-soft)' }}>
            <div className="card__title">Pending Exam Queue</div>
            <div className="card__desc">Scheduled or conducted examinations awaiting Assistant Faculty marks entry</div>
          </div>

          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>EXAM NO</th>
                  <th>SUBJECT</th>
                  <th>TYPE</th>
                  <th>STANDARD</th>
                  <th>EXAM DATE</th>
                  <th>UNITS COVERED</th>
                  <th>QUESTION PAPER</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      Loading pending examinations...
                    </td>
                  </tr>
                ) : filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--slate)' }}>
                      All examinations have marks entered and evaluated.
                    </td>
                  </tr>
                ) : (
                  paginatedPending.map((e) => (
                    <tr key={e.id}>
                      <td className="num"><strong>#{e.examNo}</strong></td>
                      <td><strong>{e.subject}</strong></td>
                      <td>
                        <span className="chip chip-neutral">{formatExamTypeLabel(e.examType)}</span>
                      </td>
                      <td>
                        <span className="chip chip-neutral">
                          {e.standardLabel}{e.division && e.division !== 'ALL' ? ` · Div ${e.division}` : ''}
                        </span>
                      </td>
                      <td className="num">{formatDate(e.examDate)}</td>
                      <td style={{ maxWidth: 230 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }} title={e.unitSummary}>
                          {e.unitSummary || '—'}
                        </div>
                      </td>
                      <td>
                        <span className={`chip ${e.questionPaperStatus === 'UPLOADED' ? 'chip-success' : 'chip-warning'}`}>
                          {e.questionPaperStatus === 'UPLOADED' ? 'Uploaded' : 'Pending Upload'}
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${e.status === 'CONDUCTED' ? 'chip-warning' : 'chip-neutral'}`}>
                          {e.status === 'CONDUCTED' ? 'Awaiting Marks' : 'Scheduled'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            currentPage={safePendingPage}
            totalItems={filteredPending.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPendingPage}
            itemLabel="pending exams"
          />
        </div>
      )}
    </>
  );
}
