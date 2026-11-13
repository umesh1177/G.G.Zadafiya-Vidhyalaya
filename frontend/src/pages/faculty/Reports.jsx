import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { reportApi } from '../../services/reportApi';
import PaginationBar from '../../components/common/PaginationBar';
import PrintableFacultyReport, { triggerFacultyReportPrint } from '../../components/common/PrintableFacultyReport';

export default function FacultyReports() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();
  const currentSubject = user?.subject || 'Physics';

  useEffect(() => {
    setHeader({
      title: 'Principal Reports',
      subtitle: `${currentSubject} Faculty — LT & Exam diagnostic reports, alerts & Principal guidance`
    });
  }, [setHeader, currentSubject]);

  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStandard, setFilterStandard] = useState('');
  const [filterAlert, setFilterAlert] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [reportToPrint, setReportToPrint] = useState(null);
  const PAGE_SIZE = 7;

  const loadReports = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await reportApi.getFacultyReports({ subject: currentSubject });
      const list = Array.isArray(data) ? data : [];
      setReports(list);
      setSelectedReport((prev) => {
        if (!prev) return prev;
        const pid = prev.id || prev._id;
        return list.find((r) => (r.id || r._id) === pid) || prev;
      });
    } catch (err) {
      if (!silent) console.error('Failed to fetch faculty reports:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [currentSubject]);

  useEffect(() => {
    loadReports(false);
    const handleFocus = () => loadReports(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadReports(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadReports]);

  const handleAcknowledge = async (repId) => {
    setErrorMsg(null);
    try {
      const updated = await reportApi.acknowledgeFacultyReport(repId);
      setReports(prev => prev.map(r => ((r.id || r._id) === repId ? updated : r)));
      if (selectedReport && (selectedReport.id || selectedReport._id) === repId) {
        setSelectedReport(updated);
      }
      setFeedbackMsg('Report marked as reviewed.');
      await loadReports(true);
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to mark report as reviewed');
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatStd = (s) => (String(s).includes('11') ? 'Standard 11' : 'Standard 12');

  const isExamReport = (r) => r?.reportType === 'EXAM' || Boolean(r?.examId) || Boolean(r?.examNo);

  const filteredReports = reports.filter((r) => {
    const q = searchTerm.trim().toLowerCase();
    const isEx = isExamReport(r);
    const matchSearch =
      !q ||
      String(r.ltNo || r.examNo || '').includes(q) ||
      (r.examType || '').toLowerCase().includes(q) ||
      (r.subject || '').toLowerCase().includes(q) ||
      (r.principalMessage || '').toLowerCase().includes(q) ||
      (r.alertTitle || '').toLowerCase().includes(q) ||
      (r.unitSummary || '').toLowerCase().includes(q) ||
      (r.topicsCovered || []).some((t) => String(t).toLowerCase().includes(q));
    const matchType =
      !filterType ||
      (filterType === 'EXAM' && isEx) ||
      (filterType === 'LT' && !isEx);
    const matchStd = !filterStandard || r.standard === filterStandard;
    const matchAlert = !filterAlert || r.alertStatus === filterAlert;
    return matchSearch && matchType && matchStd && matchAlert;
  });

  const safePage = Math.min(currentPage, Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE)));
  const paginatedReports = filteredReports.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const weakCount = reports.filter(r => r.alertStatus === 'WEAK_TOPIC_UNDERSTANDING').length;
  const goodCount = reports.filter(r => r.alertStatus === 'GOOD_UNDERSTANDING').length;
  const unreadCount = reports.filter(r => !r.acknowledgedByFaculty).length;

  return (
    <div style={{ paddingBottom: 40 }}>
      {feedbackMsg && (
        <div className="banner banner-success" style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✅ {feedbackMsg}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFeedbackMsg(null)}>✕</button>
        </div>
      )}
      {errorMsg && (
        <div className="banner banner-warning" style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {errorMsg}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setErrorMsg(null)}>✕</button>
        </div>
      )}

      {/* KPI Summary */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Total Reports Received</div>
          <div className="kpi-card__value num">{reports.length}</div>
          <div className="kpi-card__hint">LT &amp; Exam reports for {currentSubject}</div>
        </div>
        <div className="kpi-card is-warning">
          <div className="kpi-card__label">Attention / Revision Alerts</div>
          <div className="kpi-card__value num">{weakCount}</div>
          <div className="kpi-card__hint">Flagged for topic / exam revision</div>
        </div>
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Good Understanding</div>
          <div className="kpi-card__value num">{goodCount}</div>
          <div className="kpi-card__hint">Assessments with strong mastery</div>
        </div>
        <div className="kpi-card is-danger">
          <div className="kpi-card__label">Pending Review</div>
          <div className="kpi-card__value num">{unreadCount}</div>
          <div className="kpi-card__hint">Reports awaiting faculty acknowledgement</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <input
              type="text"
              className="field-input w-full"
              placeholder="🔍 Search reports by LT/Exam #, type, topic, or Principal message..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Report Types</option>
            <option value="LT">Lecture Tests (LT)</option>
            <option value="EXAM">Unit / Board / JEE / NEET Exams</option>
          </select>

          <select
            className="filter-select"
            value={filterStandard}
            onChange={(e) => { setFilterStandard(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Standards</option>
            <option value="STD_11">Standard 11</option>
            <option value="STD_12">Standard 12</option>
          </select>

          <select
            className="filter-select"
            value={filterAlert}
            onChange={(e) => { setFilterAlert(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Alert Types</option>
            <option value="WEAK_TOPIC_UNDERSTANDING">⚠️ Revision / Attention Alert</option>
            <option value="GOOD_UNDERSTANDING">✅ Good Understanding</option>
          </select>
        </div>
      </div>

      {/* Reports Ledger Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-soft)' }}>
          <div className="card__title">Principal Assessment Reports ({filteredReports.length})</div>
          <div className="card__desc">Review class averages, highest/lowest exam marks, growth trends, and Principal guidance</div>
        </div>

        <div className="table-wrap" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th>ASSESSMENT</th>
                <th>DATE</th>
                <th>STANDARD</th>
                <th>CLASS AVERAGE</th>
                <th>KEY STATS / COUNTS</th>
                <th>ALERT</th>
                <th>PRINCIPAL MESSAGE</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                    Loading reports sent by Principal...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--slate)' }}>
                    No reports generated for <strong>{currentSubject}</strong> yet. When the Principal submits an LT or Exam report, it appears here immediately.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((r) => {
                  const rId = r.id || r._id;
                  const isEx = isExamReport(r);
                  const isWeak = r.alertStatus === 'WEAK_TOPIC_UNDERSTANDING';
                  return (
                    <tr key={rId} style={{ background: !r.acknowledgedByFaculty ? '#F9FBFF' : '#FFFFFF' }}>
                      <td className="num">
                        {isEx ? (
                          <div>
                            <strong>Exam #{r.examNo}</strong>
                            <div style={{ fontSize: 11, color: '#123B5D', fontWeight: 700 }}>
                              {r.examType || 'EXAM'} · {r.targetSubject || r.subject}
                            </div>
                          </div>
                        ) : (
                          <strong>LT #{r.ltNo}</strong>
                        )}
                        {!r.acknowledgedByFaculty && (
                          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#123B5D', marginTop: 2 }}>• NEW</div>
                        )}
                      </td>
                      <td className="num">{formatDate(isEx ? (r.examDate || r.ltDate) : r.ltDate)}</td>
                      <td>
                        <span className="chip chip-neutral">{formatStd(r.standard)}</span>
                      </td>
                      <td>
                        {isEx ? (
                          <span className={`chip ${r.classAveragePercent >= 75 ? 'chip-success' : r.classAveragePercent >= 50 ? 'chip-neutral' : 'chip-warning'}`}>
                            <strong>{r.classAveragePercent}%</strong> ({r.averageMarks}/{r.totalMarks || 100})
                          </span>
                        ) : (
                          <span
                            className={`chip ${
                              r.classAverageLabel === 'Excellent' ? 'chip-success' :
                              r.classAverageLabel === 'Better' ? 'chip-neutral' : 'chip-warning'
                            }`}
                          >
                            {r.classAverageLabel} ({r.classAveragePercent}%)
                          </span>
                        )}
                      </td>
                      <td className="num" style={{ fontSize: 12.5 }}>
                        {isEx ? (
                          <div>
                            <div>High: <strong>{r.highestMarks ?? 0}</strong> · Low: <strong>{r.lowestMarks ?? 0}</strong></div>
                            {r.growthRate !== null && r.growthRate !== undefined ? (
                              <span style={{ color: '#1F9D6B', fontWeight: 700 }}>Growth +{Number(r.growthRate).toFixed(1)}%</span>
                            ) : r.downfallRate !== null && r.downfallRate !== undefined ? (
                              <span style={{ color: '#E0473D', fontWeight: 700 }}>Downfall -{Number(r.downfallRate).toFixed(1)}%</span>
                            ) : (
                              <span style={{ color: 'var(--slate)' }}>Baseline exam</span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span style={{ color: '#1F9D6B', fontWeight: 700 }}>{r.counts?.excellent || 0}</span> /{' '}
                            <span style={{ color: '#123B5D', fontWeight: 700 }}>{r.counts?.better || 0}</span> /{' '}
                            <span style={{ color: '#B45309', fontWeight: 700 }}>{r.counts?.good || 0}</span>
                            {r.counts?.ab > 0 ? <span style={{ color: '#E0473D' }}> ({r.counts.ab} AB)</span> : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`chip ${isWeak ? 'chip-warning' : 'chip-success'}`}>
                          {isWeak ? (isEx ? '⚠️ Needs Revision' : '⚠️ Weak Topic') : '✅ Good'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 250 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }} title={r.principalMessage}>
                          {r.principalMessage || '—'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setSelectedReport(r)}
                          >
                            👁️ View Report
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => triggerFacultyReportPrint(r, setReportToPrint)}
                            title="Print Faculty Handover Report"
                          >
                            🖨️ Print
                          </button>
                          {!r.acknowledgedByFaculty ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleAcknowledge(rId)}
                            >
                              ✓ Mark Read
                            </button>
                          ) : (
                            <span className="chip chip-success" style={{ fontSize: 11 }}>Reviewed</span>
                          )}
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
          totalItems={filteredReports.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="reports"
        />
      </div>

      {/* Full Faculty Report View Modal (Supports BOTH LT & Exam Reports) */}
      {selectedReport && (() => {
        const isEx = isExamReport(selectedReport);
        return (
          <div
            className="modal-overlay is-open"
            onClick={(e) => {
              if (e.target.classList.contains('modal-overlay')) setSelectedReport(null);
            }}
          >
            <div
              className="modal-box"
              style={{
                maxWidth: 660,
                padding: 0,
                borderRadius: 18,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '92dvh',
              }}
            >
              <div style={{ background: 'linear-gradient(135deg, #123B5D 0%, #1B4E78 100%)', color: '#fff', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, borderRadius: '18px 18px 0 0', flexShrink: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, color: '#BEDBFF', fontWeight: 700, textTransform: 'uppercase' }}>
                    Official {isEx ? `${selectedReport.examType || 'Exam'} Diagnostic Report` : 'LT Diagnostic Report'} • Sent by {selectedReport.sentByName || 'Principal'}
                  </div>
                  <h2 style={{ margin: '3px 0 0', fontSize: 20, fontWeight: 800, color: '#fff', overflowWrap: 'anywhere' }}>
                    {isEx
                      ? `Exam #${selectedReport.examNo} — ${selectedReport.targetSubject || selectedReport.subject} (${formatStd(selectedReport.standard)})`
                      : `LT #${selectedReport.ltNo} — ${selectedReport.subject} (${formatStd(selectedReport.standard)})`}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '18px 22px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
                {/* Alert Banner */}
                <div
                  style={{
                    padding: '12px 15px',
                    borderRadius: 12,
                    background: selectedReport.alertStatus === 'WEAK_TOPIC_UNDERSTANDING' ? '#FBF2E1' : '#E6F8EF',
                    border: `1.5px solid ${selectedReport.alertStatus === 'WEAK_TOPIC_UNDERSTANDING' ? '#D99A2B' : '#1F9D6B'}`,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1C2340' }}>
                    {selectedReport.alertTitle || (selectedReport.alertStatus === 'WEAK_TOPIC_UNDERSTANDING'
                      ? '⚠️ Attention / Revision Alert'
                      : '✅ Good Performance Alert')}
                  </div>
                  <div style={{ fontSize: 13, color: '#3A4262', marginTop: 3 }}>
                    {selectedReport.alertMessage}
                  </div>
                </div>

                {/* Metrics Row */}
                {isEx ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                    <div style={{ background: '#F6F7FB', padding: '10px 12px', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                      <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>Exam Date</div>
                      <div className="num" style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{formatDate(selectedReport.examDate)}</div>
                    </div>
                    <div style={{ background: '#F6F7FB', padding: '10px 12px', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                      <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>Class Average</div>
                      <div className="num" style={{ fontSize: 14, fontWeight: 800, color: '#123B5D', marginTop: 2 }}>
                        {selectedReport.classAveragePercent}% ({selectedReport.averageMarks}/{selectedReport.totalMarks || 100})
                      </div>
                    </div>
                    <div style={{ background: '#E6F8EF', padding: '10px 12px', borderRadius: 10, border: '1px solid #BEE5D3' }}>
                      <div style={{ fontSize: 11, color: '#1F9D6B', fontWeight: 700, textTransform: 'uppercase' }}>Highest</div>
                      <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#1F9D6B', marginTop: 2 }}>{selectedReport.highestMarks ?? 0}</div>
                    </div>
                    <div style={{ background: '#FDEAE8', padding: '10px 12px', borderRadius: 10, border: '1px solid #F5C2BE' }}>
                      <div style={{ fontSize: 11, color: '#E0473D', fontWeight: 700, textTransform: 'uppercase' }}>Lowest</div>
                      <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#E0473D', marginTop: 2 }}>{selectedReport.lowestMarks ?? 0}</div>
                    </div>
                    <div style={{ background: '#F6F7FB', padding: '10px 12px', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                      <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {selectedReport.downfallRate !== null && selectedReport.downfallRate !== undefined ? 'Downfall' : 'Growth'}
                      </div>
                      <div
                        className="num"
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          marginTop: 2,
                          color: selectedReport.downfallRate !== null && selectedReport.downfallRate !== undefined
                            ? '#E0473D'
                            : selectedReport.growthRate !== null && selectedReport.growthRate !== undefined
                              ? '#1F9D6B'
                              : '#123B5D',
                        }}
                      >
                        {selectedReport.growthRate !== null && selectedReport.growthRate !== undefined
                          ? `+${Number(selectedReport.growthRate).toFixed(1)}%`
                          : selectedReport.downfallRate !== null && selectedReport.downfallRate !== undefined
                            ? `-${Number(selectedReport.downfallRate).toFixed(1)}%`
                            : 'Baseline'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                    <div style={{ background: '#F6F7FB', padding: '10px 12px', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                      <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>LT Date</div>
                      <div className="num" style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{formatDate(selectedReport.ltDate)}</div>
                    </div>
                    <div style={{ background: '#F6F7FB', padding: '10px 12px', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                      <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>Class Average</div>
                      <div className="num" style={{ fontSize: 14, fontWeight: 800, color: '#123B5D', marginTop: 2 }}>
                        {selectedReport.classAverageLabel} ({selectedReport.classAveragePercent}%)
                      </div>
                    </div>
                    <div style={{ background: '#E6F8EF', padding: '10px 12px', borderRadius: 10, border: '1px solid #BEE5D3' }}>
                      <div style={{ fontSize: 11, color: '#1F9D6B', fontWeight: 700, textTransform: 'uppercase' }}>Excellent</div>
                      <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#1F9D6B', marginTop: 2 }}>{selectedReport.counts?.excellent || 0}</div>
                    </div>
                    <div style={{ background: '#E8F1F8', padding: '10px 12px', borderRadius: 10, border: '1px solid #C8DBED' }}>
                      <div style={{ fontSize: 11, color: '#123B5D', fontWeight: 700, textTransform: 'uppercase' }}>Better</div>
                      <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#123B5D', marginTop: 2 }}>{selectedReport.counts?.better || 0}</div>
                    </div>
                    <div style={{ background: '#FBF2E1', padding: '10px 12px', borderRadius: 10, border: '1px solid #EED5A3' }}>
                      <div style={{ fontSize: 11, color: '#B45309', fontWeight: 700, textTransform: 'uppercase' }}>Good (Weak)</div>
                      <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#B45309', marginTop: 2 }}>{selectedReport.counts?.good || 0}</div>
                    </div>
                  </div>
                )}

                {/* Principal Message Box */}
                <div style={{ background: '#F6F7FB', border: '1px solid #D1DDE8', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#123B5D', textTransform: 'uppercase', marginBottom: 6 }}>
                    Principal&apos;s Message for You
                  </div>
                  <div style={{ fontSize: 14, color: '#1C2340', lineHeight: 1.55, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {selectedReport.principalMessage || 'No additional remarks provided.'}
                  </div>
                </div>

                {/* Units Covered for Exam OR LT Questions */}
                {isEx ? (
                  selectedReport.unitSummary && (
                    <div style={{ background: '#FAFBFD', border: '1px solid #E4E7F2', borderRadius: 12, padding: '12px 14px', fontSize: 13 }}>
                      <strong style={{ color: '#123B5D' }}>Syllabus / Units Covered:</strong>{' '}
                      <span style={{ color: '#334155' }}>{selectedReport.unitSummary}</span>
                    </div>
                  )
                ) : (
                  <div style={{ background: '#FAFBFD', border: '1px solid #E4E7F2', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#123B5D', textTransform: 'uppercase', marginBottom: 8 }}>
                      LT Questions ({selectedReport.questions?.length || 0})
                    </div>
                    {selectedReport.questions && selectedReport.questions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedReport.questions.map((q, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '9px 11px',
                              borderRadius: 8,
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              fontSize: 13,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                              <strong style={{ color: '#123B5D' }}>Question {q.questionNo || idx + 1}</strong>
                              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                                {q.sourceTopicCode ? `[${q.sourceTopicCode}] ` : ''}
                                {q.sourceTopicTitle || 'General'} · {q.marks || 2}M
                              </span>
                            </div>
                            <div style={{ color: '#1E293B', lineHeight: 1.45, overflowWrap: 'anywhere' }}>
                              {q.questionText || '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: 'var(--slate)' }}>
                        No individual questions attached to this report.
                      </div>
                    )}
                  </div>
                )}

                {!isEx && selectedReport.topicsCovered?.length > 0 && (
                  <div style={{ fontSize: 12.5, color: 'var(--slate)', overflowWrap: 'anywhere' }}>
                    <strong>Topics Assessed:</strong> {selectedReport.topicsCovered.join(' • ')}
                  </div>
                )}
              </div>

              <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line-soft)', background: '#FAFBFD', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, borderRadius: '0 0 18px 18px', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link to="/faculty/syllabus" className="btn btn-ghost btn-sm" onClick={() => setSelectedReport(null)}>
                    Open Syllabus Tracker
                  </Link>
                  <Link to={isEx ? '/faculty/exam-unit' : '/faculty/set-lt'} className="btn btn-ghost btn-sm" onClick={() => setSelectedReport(null)}>
                    {isEx ? 'Open Exam Unit' : 'Schedule Follow-Up LT'}
                  </Link>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => triggerFacultyReportPrint(selectedReport, setReportToPrint)}
                  >
                    🖨️ Print Report
                  </button>
                  {!selectedReport.acknowledgedByFaculty && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAcknowledge(selectedReport.id || selectedReport._id)}
                    >
                      ✓ Mark Report Reviewed
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedReport(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <PrintableFacultyReport report={reportToPrint} onClose={() => setReportToPrint(null)} />
    </div>
  );
}
