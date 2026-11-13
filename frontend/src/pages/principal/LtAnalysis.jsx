import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ltApi } from '../../services/ltApi';
import PaginationBar from '../../components/common/PaginationBar';
import LtReportsWorkspace from '../../components/principal/LtReportsWorkspace';

export default function LtAnalysis() {
  const { setHeader } = useOutletContext();

  useEffect(() => {
    setHeader({
      title: 'LT Analysis',
      subtitle: 'Daily Lecture Test tracking across all subjects, standards, and evaluators'
    });
  }, [setHeader]);

  const [activeTab, setActiveTab] = useState('completed');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStandard, setFilterStandard] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [filterAssistant, setFilterAssistant] = useState('');

  // Dynamic Backend Data
  const [stats, setStats] = useState({ totalConducted: 0, totalTopicsCovered: 0, totalPending: 0, weakAlertCount: 0 });
  const [evaluatedLts, setEvaluatedLts] = useState([]);
  const [pendingLts, setPendingLts] = useState([]);
  const [assistantsList, setAssistantsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [completedPage, setCompletedPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const PAGE_SIZE = 8;

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await ltApi.getAnalyticsOverview();
      setStats(data.stats || { totalConducted: 0, totalTopicsCovered: 0, totalPending: 0, weakAlertCount: 0 });
      setEvaluatedLts(data.evaluatedLts || []);
      setPendingLts(data.pendingLts || []);
      setAssistantsList(data.assistants || []);
    } catch (err) {
      console.error('Failed to load LT analytics overview:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview(false);
    const handleFocus = () => loadOverview(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadOverview(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadOverview]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const normalizeSubjMatch = (ltSubj, filterVal) => {
    if (!filterVal) return true;
    const a = String(ltSubj || '').toLowerCase();
    const b = String(filterVal || '').toLowerCase();
    if (b.startsWith('chem')) return a.includes('chem');
    if (b.startsWith('phys')) return a.includes('phys');
    if (b.startsWith('math')) return a.includes('math');
    if (b.startsWith('bio')) return a.includes('bio');
    return a === b;
  };

  const applyFilters = (list, isEvaluatedTab) => {
    return list.filter((l) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        String(l.ltNo || '').includes(q) ||
        (l.subject || '').toLowerCase().includes(q) ||
        (l.marksEnteredByName || '').toLowerCase().includes(q) ||
        (l.topicsCovered || []).some((t) => String(t).toLowerCase().includes(q));

      const matchSubject = normalizeSubjMatch(l.subject, filterSubject);
      const matchStandard = !filterStandard || l.standard === filterStandard;
      const matchOutcome = !isEvaluatedTab || !filterOutcome || l.overallAverage === filterOutcome;
      const matchAssistant =
        !isEvaluatedTab ||
        !filterAssistant ||
        String(l.marksEnteredByName || '').toLowerCase() === filterAssistant.toLowerCase();

      return matchSearch && matchSubject && matchStandard && matchOutcome && matchAssistant;
    });
  };

  const filteredCompleted = applyFilters(evaluatedLts, true);
  const filteredPending = applyFilters(pendingLts, false);

  const safeCompletedPage = Math.min(completedPage, Math.max(1, Math.ceil(filteredCompleted.length / PAGE_SIZE)));
  const paginatedCompleted = filteredCompleted.slice((safeCompletedPage - 1) * PAGE_SIZE, safeCompletedPage * PAGE_SIZE);

  const safePendingPage = Math.min(pendingPage, Math.max(1, Math.ceil(filteredPending.length / PAGE_SIZE)));
  const paginatedPending = filteredPending.slice((safePendingPage - 1) * PAGE_SIZE, safePendingPage * PAGE_SIZE);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterSubject('');
    setFilterStandard('');
    setFilterOutcome('');
    setFilterAssistant('');
    setCompletedPage(1);
    setPendingPage(1);
  };

  return (
    <>
      {/* ── KPI CARDS (Photo 1 layout with STS Navy theme) ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Total LT Conducted</div>
          <div className="kpi-card__value num">{stats.totalConducted}</div>
          <div className="kpi-card__hint">Evaluated lecture tests across batches</div>
        </div>
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Total Topics Covered</div>
          <div className="kpi-card__value num">{stats.totalTopicsCovered}</div>
          <div className="kpi-card__hint">Unique concepts assessed in LTs</div>
        </div>
        <div className="kpi-card is-warning">
          <div className="kpi-card__label">Total LT Pending</div>
          <div className="kpi-card__value num">{stats.totalPending}</div>
          <div className="kpi-card__hint">Awaiting timer finish or marks entry</div>
        </div>
      </div>

      {/* ── TABS (STS Navy .tabs style) ── */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'completed' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Evaluated Diagnostics ({filteredCompleted.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'pending' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Evaluation ({filteredPending.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'reports' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          LT Report
        </button>
      </div>

      {/* ── FILTERS CARD (Clean Structured 2-Row Toolbar) ── */}
      {activeTab !== 'reports' && (
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
            placeholder="Search by LT #, topic name, subject, or assistant..."
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
            <label className="field-label" htmlFor="lt-filter-subject">Subject</label>
            <select
              id="lt-filter-subject"
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
            <label className="field-label" htmlFor="lt-filter-standard">Standard</label>
            <select
              id="lt-filter-standard"
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

          {activeTab === 'completed' && (
            <>
              <div className="lt-filter-field">
                <label className="field-label" htmlFor="lt-filter-outcome">Outcome</label>
                <select
                  id="lt-filter-outcome"
                  className="filter-select"
                  value={filterOutcome}
                  onChange={(e) => {
                    setFilterOutcome(e.target.value);
                    setCompletedPage(1);
                  }}
                >
                  <option value="">All Outcomes</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Better">Better</option>
                  <option value="Good">Good (Weak Alert)</option>
                </select>
              </div>

              <div className="lt-filter-field">
                <label className="field-label" htmlFor="lt-filter-assistant">Marks Entered By</label>
                <select
                  id="lt-filter-assistant"
                  className="filter-select"
                  value={filterAssistant}
                  onChange={(e) => {
                    setFilterAssistant(e.target.value);
                    setCompletedPage(1);
                  }}
                >
                  <option value="">All Assistants</option>
                  {assistantsList.map((asst) => (
                    <option key={asst} value={asst}>
                      {asst}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="lt-filter-reset-wrap">
            {(searchTerm || filterSubject || filterStandard || filterOutcome || filterAssistant) ? (
              <button type="button" className="btn btn-ghost btn-sm w-full" onClick={resetFilters}>
                ↺ Reset Filters
              </button>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => loadOverview(false)}>
                ↻ Refresh ({activeTab === 'completed' ? filteredCompleted.length : filteredPending.length})
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── TAB 1: EVALUATED DIAGNOSTICS LEDGER (Photo 1 + Taken Date + Mark Entry Date + Standard + Assistant) ── */}
      {activeTab === 'completed' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-soft)' }}>
            <div className="card__title">Completed Diagnostics Ledger</div>
            <div className="card__desc">Daily tracking matrices for evaluated conceptual checks</div>
          </div>

          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>LT NO</th>
                  <th>SUBJECT</th>
                  <th>STANDARD</th>
                  <th>TAKEN DATE</th>
                  <th>MARK ENTRY DATE</th>
                  <th>MARKS ENTERED BY</th>
                  <th>OVERALL AVERAGE</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      Computing live LT analytics from MongoDB...
                    </td>
                  </tr>
                ) : filteredCompleted.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No evaluated lecture tests found matching your filters. Once Assistant Faculty saves LT marks, they appear here automatically.
                    </td>
                  </tr>
                ) : (
                  paginatedCompleted.map((l) => (
                    <tr key={l.id}>
                      <td className="num"><strong>#{l.ltNo}</strong></td>
                      <td><strong>{l.subject}</strong></td>
                      <td>
                        <span className="chip chip-neutral">{l.standardLabel}</span>
                      </td>
                      <td className="num">{formatDate(l.takenDate)}</td>
                      <td className="num">{formatDate(l.marksEnteredAt)}</td>
                      <td>{l.marksEnteredByName || 'Assistant Faculty'}</td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span className={`chip ${
                            l.overallAverage === 'Excellent' ? 'chip-success' :
                            l.overallAverage === 'Better' ? 'chip-neutral' : 'chip-warning'
                          }`}>
                            {l.overallAverage}
                          </span>
                          <span className="num" style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                            ({l.classAveragePercent}%)
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/principal/lt-analysis/${l.id}`} className="btn btn-primary btn-sm">
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
            itemLabel="evaluated LTs"
          />
        </div>
      )}

      {/* ── TAB 2: PENDING EVALUATION LEDGER (Photo 2) ── */}
      {activeTab === 'pending' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-soft)' }}>
            <div className="card__title">Awaiting Diagnostic Metrics</div>
            <div className="card__desc">Lecture tests conducted or scheduled that are awaiting student marksheet submission</div>
          </div>

          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>LT NO</th>
                  <th>SUBJECT</th>
                  <th>STANDARD</th>
                  <th>TAKEN DATE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTION LINK</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      Loading pending Lecture Tests...
                    </td>
                  </tr>
                ) : filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      All conducted Lecture Tests have been evaluated.
                    </td>
                  </tr>
                ) : (
                  paginatedPending.map((l) => (
                    <tr key={l.id}>
                      <td className="num"><strong>#{l.ltNo}</strong></td>
                      <td><strong>{l.subject}</strong></td>
                      <td>
                        <span className="chip chip-neutral">{l.standardLabel}</span>
                      </td>
                      <td className="num">{formatDate(l.takenDate)}</td>
                      <td>
                        <span className={`chip ${l.status === 'CONDUCTED' ? 'chip-warning' : 'chip-neutral'}`}>
                          {l.status === 'CONDUCTED' ? 'Awaiting Marks' : 'Scheduled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--slate)', fontSize: 13 }}>
                        {l.status === 'CONDUCTED' ? 'Assistant marks entry pending' : 'Waiting to be conducted'}
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
            itemLabel="pending LTs"
          />
        </div>
      )}

      {/* ── TAB 3: LT REPORTS & PERFORMANCE WORKSPACE ── */}
      {activeTab === 'reports' && <LtReportsWorkspace />}
    </>
  );
}
