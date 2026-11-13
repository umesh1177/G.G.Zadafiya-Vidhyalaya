import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useAuth } from '../../context/AuthContext';
import { ltApi } from '../../services/ltApi';
import { reportApi } from '../../services/reportApi';
import PaginationBar from '../../components/common/PaginationBar';
import PrintableFacultyReport, { triggerFacultyReportPrint } from '../../components/common/PrintableFacultyReport';
import VoiceInputControl from '../../components/common/VoiceInputControl';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function LtAnalysisDetail() {
  const { id } = useParams();
  const { setHeader } = useOutletContext();
  const { user } = useAuth();

  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Active Tier Tab ('Excellent' | 'Better' | 'Good' | 'AB')
  const [activeTier, setActiveTier] = useState('Excellent');
  const [tierPage, setTierPage] = useState(1);
  const [incPage, setIncPage] = useState(1);
  const [decPage, setDecPage] = useState(1);
  const [consGoodPage, setConsGoodPage] = useState(1);
  const [consPoorPage, setConsPoorPage] = useState(1);
  const TABLE_PAGE_SIZE = 5;

  // Student Score History Modal (from Consistent Good / Poor "View Score")
  const [viewingStudentScore, setViewingStudentScore] = useState(null);
  const [studentHistPage, setStudentHistPage] = useState(1);

  // Generate Report for Faculty Modal + Print state
  const [showReportModal, setShowReportModal] = useState(false);
  const [principalMessage, setPrincipalMessage] = useState('');
  const principalMessageRef = useRef(null);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [isRetraining, setIsRetraining] = useState(false);
  const [reportToPrint, setReportToPrint] = useState(null);
  const messageInitializedRef = useRef(false);

  const loadAnalysis = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setErrorMsg(null);
    }
    try {
      const data = await ltApi.getLtAnalysisDetail(id);
      setAnalysis(data);
      if (!silent) {
        if (data?.distribution) {
          if (data.distribution.excellent > 0) setActiveTier('Excellent');
          else if (data.distribution.better > 0) setActiveTier('Better');
          else if (data.distribution.good > 0) setActiveTier('Good');
        }
      }
      if (!messageInitializedRef.current && data?.lt) {
        messageInitializedRef.current = true;
        if (data.alertStatus === 'WEAK_TOPIC_UNDERSTANDING') {
          setPrincipalMessage(
            `Class average for LT #${data.lt.ltNo} (${data.lt.subject}) evaluated into "${data.overallAverage}" tier. Please schedule a short revision session on this topic before the next assessment.`
          );
        } else {
          setPrincipalMessage(
            `Great classroom outcome in LT #${data.lt.ltNo} (${data.lt.subject}) with "${data.overallAverage}" class average. Continue supporting revision students.`
          );
        }
      }
    } catch (err) {
      if (!silent) setErrorMsg(err.message || 'Failed to load LT analytics');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    messageInitializedRef.current = false;
    loadAnalysis(false);
    const handleFocus = () => loadAnalysis(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadAnalysis(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadAnalysis]);

  useEffect(() => {
    if (analysis?.lt) {
      const lt = analysis.lt;
      const dateStr = lt.takenDate ? new Date(lt.takenDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
      const topicsText = (lt.topicsCovered || []).slice(0, 2).join(', ') || 'Lecture Assessment';
      setHeader({
        title: `${lt.subject} — LT #${lt.ltNo}`,
        subtitle: `Topic: ${topicsText} • Taken ${dateStr} • ${lt.standardLabel}`
      });
    } else {
      setHeader({
        title: 'LT Analysis Detail',
        subtitle: 'Loading Lecture Test diagnostic metrics...'
      });
    }
  }, [setHeader, analysis]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleSubmitFacultyReport = async (e) => {
    e.preventDefault();
    if (!analysis?.lt) return;
    setIsSendingReport(true);
    setModalError(null);
    try {
      await reportApi.createFacultyReport({
        ltId: analysis.lt.id,
        principalMessage,
        sentByName: user?.name || 'Principal',
      });
      setShowReportModal(false);
      setReportFeedback(
        `Report for LT #${analysis.lt.ltNo} (${analysis.lt.subject}) has been submitted to ${analysis.lt.subject} Faculty Report Section!`
      );
      await loadAnalysis(true);
    } catch (err) {
      setModalError(err.message || 'Failed to submit report');
    } finally {
      setIsSendingReport(false);
    }
  };

  const handleRetrainModel = async () => {
    setIsRetraining(true);
    try {
      await ltApi.retrainLtModel();
      await loadAnalysis(false);
      setReportFeedback('ML classification models retrained & analytics refreshed successfully!');
    } catch (err) {
      setErrorMsg(err.message || 'Model retraining failed');
    } finally {
      setIsRetraining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--slate)' }}>
        Computing statistical averages, previous LT shifts &amp; ML student consistency metrics...
      </div>
    );
  }

  if (errorMsg || !analysis) {
    return (
      <div className="card" style={{ padding: 30, textAlign: 'center' }}>
        <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: 12 }}>
          {errorMsg || 'Unable to load LT Analysis'}
        </div>
        <Link to="/principal/lt-analysis" className="btn btn-primary btn-sm">
          ← Back to LT Analysis
        </Link>
      </div>
    );
  }

  const {
    lt,
    distribution,
    overallAverage,
    classAverageScore,
    classAveragePercent,
    weakTopicProbability,
    alertStatus,
    alertTitle,
    alertMessage,
    excellentList = [],
    betterList = [],
    goodList = [],
    abList = [],
    trajectory = {},
    consistency = {},
    mlModelMeta = {},
    sentReports = [],
  } = analysis;

  const isWeakAlert = alertStatus === 'WEAK_TOPIC_UNDERSTANDING';

  // Tier Student List Pagination
  const tierStudents =
    activeTier === 'Excellent'
      ? excellentList
      : activeTier === 'Better'
        ? betterList
        : activeTier === 'Good'
          ? goodList
          : abList;

  const safeTierPage = Math.min(tierPage, Math.max(1, Math.ceil(tierStudents.length / TABLE_PAGE_SIZE)));
  const paginatedTierStudents = tierStudents.slice((safeTierPage - 1) * TABLE_PAGE_SIZE, safeTierPage * TABLE_PAGE_SIZE);

  // Trajectory Lists Pagination
  const incList = trajectory.increasedList || [];
  const decList = trajectory.decreasedList || [];
  const safeIncPage = Math.min(incPage, Math.max(1, Math.ceil(incList.length / TABLE_PAGE_SIZE)));
  const paginatedInc = incList.slice((safeIncPage - 1) * TABLE_PAGE_SIZE, safeIncPage * TABLE_PAGE_SIZE);
  const safeDecPage = Math.min(decPage, Math.max(1, Math.ceil(decList.length / TABLE_PAGE_SIZE)));
  const paginatedDec = decList.slice((safeDecPage - 1) * TABLE_PAGE_SIZE, safeDecPage * TABLE_PAGE_SIZE);

  // Consistency Lists Pagination
  const consGood = consistency.consistentGoodList || [];
  const consPoor = consistency.consistentPoorList || [];
  const safeConsGoodPage = Math.min(consGoodPage, Math.max(1, Math.ceil(consGood.length / TABLE_PAGE_SIZE)));
  const paginatedConsGood = consGood.slice((safeConsGoodPage - 1) * TABLE_PAGE_SIZE, safeConsGoodPage * TABLE_PAGE_SIZE);
  const safeConsPoorPage = Math.min(consPoorPage, Math.max(1, Math.ceil(consPoor.length / TABLE_PAGE_SIZE)));
  const paginatedConsPoor = consPoor.slice((safeConsPoorPage - 1) * TABLE_PAGE_SIZE, safeConsPoorPage * TABLE_PAGE_SIZE);

  // Doughnut Chart Data
  const donutLabels = distribution.ab > 0 ? ['Excellent', 'Better', 'Good', 'AB'] : ['Excellent', 'Better', 'Good'];
  const donutValues = distribution.ab > 0
    ? [distribution.excellent, distribution.better, distribution.good, distribution.ab]
    : [distribution.excellent, distribution.better, distribution.good];
  const donutColors = distribution.ab > 0
    ? ['#1F9D6B', '#123B5D', '#D99A2B', '#E0473D']
    : ['#1F9D6B', '#123B5D', '#D99A2B'];

  const doughnutData = {
    labels: donutLabels,
    datasets: [
      {
        data: donutValues.some(v => v > 0) ? donutValues : [1],
        backgroundColor: donutValues.some(v => v > 0) ? donutColors : ['#E4E7F2'],
        borderWidth: 2,
        borderColor: '#FFFFFF',
        cutout: '66%',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: donutValues.some(v => v > 0) },
    },
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Back + Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <Link to="/principal/lt-analysis" className="btn btn-ghost btn-sm">
          ← Back to LT Analysis
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {sentReports.length > 0 && (
            <span className="chip chip-success">
              ✓ {sentReports.length} Report Sent to {lt.subject} Faculty
            </span>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleRetrainModel}
            disabled={isRetraining}
            title="Retrain ML classifier weights"
          >
            {isRetraining ? 'Retraining ML...' : '↻ Retrain ML Model'}
          </button>
        </div>
      </div>

      {/* Submission Feedback Banner */}
      {reportFeedback && (
        <div className="banner banner-success" style={{ marginBottom: 14, justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✅ {reportFeedback}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReportFeedback(null)}>✕</button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TOP OF PAGE ALERT: GOOD vs WEAK TOPIC UNDERSTANDING + GENERATE REPORT  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          marginBottom: 18,
          padding: '16px 20px',
          borderRadius: 14,
          background: isWeakAlert ? '#FBF2E1' : '#E6F8EF',
          border: `1.5px solid ${isWeakAlert ? '#D99A2B' : '#1F9D6B'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span
              style={{
                background: isWeakAlert ? '#D99A2B' : '#1F9D6B',
                color: '#FFFFFF',
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11.5,
                fontWeight: 800,
              }}
            >
              {isWeakAlert ? '⚠️ WEAK TOPIC UNDERSTANDING ALERT' : '✅ GOOD CLASS PERFORMANCE'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#123B5D' }}>
              Evaluation Status: {overallAverage}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1C2340' }}>
            {alertTitle}
          </div>
          <div style={{ fontSize: 13, color: '#3A4262', marginTop: 3, lineHeight: 1.5 }}>
            {alertMessage}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setModalError(null);
            setShowReportModal(true);
          }}
          style={{ flexShrink: 0 }}
        >
          📄 Generate Report for Faculty
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PHOTO 3 TOP CARDS: TAKEN DATE | MARK ENTRY DATE | OVERALL AVERAGE      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi-card">
          <div className="kpi-card__label">Taken Date</div>
          <div className="kpi-card__value num" style={{ fontSize: 22 }}>{formatDate(lt.takenDate)}</div>
          <div className="kpi-card__hint">{lt.standardLabel} • LT #{lt.ltNo}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__label">Mark Entry Date</div>
          <div className="kpi-card__value num" style={{ fontSize: 22 }}>{formatDate(lt.marksEnteredAt)}</div>
          <div className="kpi-card__hint">Entered by: <strong>{lt.marksEnteredByName || 'Assistant Faculty'}</strong></div>
        </div>

        <div className={`kpi-card ${overallAverage === 'Excellent' ? 'is-success' : overallAverage === 'Good' ? 'is-warning' : ''}`}>
          <div className="kpi-card__label">Overall Average of Class</div>
          <div className="kpi-card__value num" style={{ fontSize: 22 }}>
            {overallAverage}
          </div>
          <div className="kpi-card__hint">
            Evaluated Rubric: {overallAverage} • {distribution.present} students graded
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SCORE DISTRIBUTION DONUT (NO WEAK TOPIC LIST PER USER INSTRUCTION!)    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid-2" style={{ marginBottom: 18 }}>
        {/* Left: Doughnut Score Distribution (Photo 3 Left Card) */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Score Distribution</div>
              <div className="card__desc">Evaluated student distribution across rubric bands</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20, padding: '8px 0' }}>
            <div style={{ position: 'relative', width: 175, height: 175 }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div className="num" style={{ fontSize: 26, fontWeight: 800, color: '#1C2340', lineHeight: 1 }}>
                  {distribution.total}
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', marginTop: 3 }}>
                  TOTAL
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1F9D6B' }} />
                <span>Excellent — <strong>{distribution.excellent}</strong> students</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#123B5D' }} />
                <span>Better — <strong>{distribution.better}</strong> students</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D99A2B' }} />
                <span>Good — <strong>{distribution.good}</strong> students</span>
              </div>
              {distribution.ab > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E0473D' }} />
                  <span>AB (Absent) — <strong>{distribution.ab}</strong> students</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: LT Questions / Covered Topics & ML Model Metrics (Replacing Weak Topic List!) */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">LT Questions &amp; Diagnostic Context</div>
              <div className="card__desc">
                {lt.facultyName ? `Set by ${lt.facultyName} • ` : ''}{lt.subject} ({lt.standardLabel})
              </div>
            </div>
            <span className="chip chip-neutral">
              ML Acc: {mlModelMeta.consistencyClassifierAccuracy || 98.6}%
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 205, overflowY: 'auto' }}>
            {lt.questions && lt.questions.length > 0 ? (
              lt.questions.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '9px 12px',
                    background: '#F6F7FB',
                    borderRadius: 8,
                    border: '1px solid #E4E7F2',
                    fontSize: 13,
                  }}
                >
                  <strong style={{ color: '#123B5D' }}>Q{q.questionNo || idx + 1}:</strong> {q.questionText}
                </div>
              ))
            ) : (
              (lt.topicsCovered || []).map((t, idx) => (
                <div key={idx} style={{ padding: '9px 12px', background: '#F6F7FB', borderRadius: 8, fontSize: 13 }}>
                  • {t}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TIER TABS (EXCELLENT / BETTER / GOOD / AB) + PAGINATED STUDENT TABLE   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTier === 'Excellent' ? 'is-active' : ''}`}
          onClick={() => { setActiveTier('Excellent'); setTierPage(1); }}
        >
          Excellent ({excellentList.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTier === 'Better' ? 'is-active' : ''}`}
          onClick={() => { setActiveTier('Better'); setTierPage(1); }}
        >
          Better ({betterList.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTier === 'Good' ? 'is-active' : ''}`}
          onClick={() => { setActiveTier('Good'); setTierPage(1); }}
        >
          Good ({goodList.length})
        </button>
        {abList.length > 0 && (
          <button
            type="button"
            className={`tab-btn ${activeTier === 'AB' ? 'is-active' : ''}`}
            onClick={() => { setActiveTier('AB'); setTierPage(1); }}
          >
            AB ({abList.length})
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
        <div className="table-wrap" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 110 }}>ROLL NO</th>
                <th>NAME</th>
                <th style={{ width: 150 }}>STANDARD</th>
                <th style={{ width: 130 }}>GRADE</th>
              </tr>
            </thead>
            <tbody>
              {tierStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>
                    No students in the {activeTier} tier for this Lecture Test.
                  </td>
                </tr>
              ) : (
                paginatedTierStudents.map((st, i) => (
                  <tr key={`${st.studentId}-${i}`}>
                    <td className="num" style={{ fontWeight: 700 }}>{st.rollNo}</td>
                    <td><strong>{st.name}</strong></td>
                    <td>
                      <span className="chip chip-neutral">
                        {st.standard}{st.division ? ` - ${st.division}` : ''}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`chip ${
                          st.grade === 'Excellent'
                            ? 'chip-success'
                            : st.grade === 'Better'
                              ? 'chip-neutral'
                              : st.grade === 'AB'
                                ? 'chip-danger'
                                : 'chip-warning'
                        }`}
                      >
                        {st.grade}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          currentPage={safeTierPage}
          totalItems={tierStudents.length}
          pageSize={TABLE_PAGE_SIZE}
          onPageChange={setTierPage}
          itemLabel={`${activeTier} students`}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PHOTO 4 ROW 1: SCORE INCREASED / DECREASED FROM PREVIOUS SAME-SUBJECT  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 8, fontSize: 12.5, color: 'var(--slate)', fontWeight: 600 }}>
        {trajectory.hasPreviousLt && trajectory.previousLt
          ? `Score Shift Comparison vs. Previous Same-Subject LT: LT #${trajectory.previousLt.ltNo} (${trajectory.previousLt.subject}, ${formatDate(trajectory.previousLt.takenDate)})`
          : `Score Shift Comparison: No prior evaluated ${lt.subject} (${lt.standardLabel}) LT exists yet to compare score progression.`}
      </div>

      <div className="grid-2" style={{ marginBottom: 18 }}>
        {/* List of Students Whose Score Increased */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <div className="card__title">List of Students Whose Score Increased ({incList.length})</div>
              <div className="card__desc">Improved compared to previous {lt.subject} LT</div>
            </div>
            <div style={{ padding: '8px 20px' }}>
              {!trajectory.hasPreviousLt ? (
                <div style={{ padding: '16px 0', color: 'var(--slate)', fontSize: 13 }}>
                  Evaluate a second {lt.subject} LT in {lt.standardLabel} to compute score increases.
                </div>
              ) : incList.length === 0 ? (
                <div style={{ padding: '16px 0', color: 'var(--slate)', fontSize: 13 }}>
                  No students increased their tier compared to the previous {lt.subject} LT.
                </div>
              ) : (
                paginatedInc.map((s) => (
                  <div
                    key={s.studentId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--line-soft)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        className="num"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: '#E6F8EF',
                          color: '#1F9D6B',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        {s.rollNo}
                      </span>
                      <strong style={{ fontSize: 14 }}>{s.name}</strong>
                    </div>
                    <span className="chip chip-success">
                      ↑ {s.previousGrade} → {s.currentGrade}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <PaginationBar
            currentPage={safeIncPage}
            totalItems={incList.length}
            pageSize={TABLE_PAGE_SIZE}
            onPageChange={setIncPage}
            itemLabel="improved"
          />
        </div>

        {/* List of Students Whose Score Decreased */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <div className="card__title">List of Students Whose Score Decreased ({decList.length})</div>
              <div className="card__desc">Declined compared to previous {lt.subject} LT</div>
            </div>
            <div style={{ padding: '8px 20px' }}>
              {!trajectory.hasPreviousLt ? (
                <div style={{ padding: '16px 0', color: 'var(--slate)', fontSize: 13 }}>
                  Evaluate a second {lt.subject} LT in {lt.standardLabel} to compute score decreases.
                </div>
              ) : decList.length === 0 ? (
                <div style={{ padding: '16px 0', color: 'var(--slate)', fontSize: 13 }}>
                  No students decreased their tier compared to the previous {lt.subject} LT.
                </div>
              ) : (
                paginatedDec.map((s) => (
                  <div
                    key={s.studentId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--line-soft)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        className="num"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: '#FDEAE8',
                          color: '#E0473D',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        {s.rollNo}
                      </span>
                      <strong style={{ fontSize: 14 }}>{s.name}</strong>
                    </div>
                    <span className="chip chip-danger">
                      ↓ {s.previousGrade} → {s.currentGrade}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <PaginationBar
            currentPage={safeDecPage}
            totalItems={decList.length}
            pageSize={TABLE_PAGE_SIZE}
            onPageChange={setDecPage}
            itemLabel="declined"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PHOTO 4 ROW 2: ML CONSISTENT GOOD & POOR PERFORMER TABLES             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 8, fontSize: 12.5, color: 'var(--slate)', fontWeight: 600 }}>
        Trained Softmax Consistency Classifier Scope: {consistency.scopeLabel || lt.standardLabel}
      </div>

      <div className="grid-2">
        {/* Consistent Good Performer List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <div className="card__title">Consistent Good Performer List ({consGood.length})</div>
              <div className="card__desc">Students consistently scoring top Excellent/Better marks across multiple LTs</div>
            </div>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>ROLL NO</th>
                    <th>NAME</th>
                    <th>RECORD</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {consistency.requiresMoreTests ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--slate)' }}>
                        Need at least 2 evaluated LTs in {lt.standardLabel} for ML consistency classification (currently {consistency.evaluatedLtsAnalyzed}).
                      </td>
                    </tr>
                  ) : consGood.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--slate)' }}>
                        No consistent top performers identified across evaluated LTs yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedConsGood.map((st) => (
                      <tr key={st.studentId}>
                        <td className="num" style={{ fontWeight: 700 }}>{st.rollNo}</td>
                        <td>
                          <strong>{st.name}</strong>
                          <div style={{ fontSize: 11, color: '#1F9D6B', fontWeight: 600 }}>
                            ML Confidence: {st.mlConfidence}%
                          </div>
                        </td>
                        <td className="num" style={{ fontSize: 12 }}>
                          {st.excellentCount}/{st.totalTests} Exc ({st.avgScore}/3.0)
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setViewingStudentScore({ ...st, category: 'Consistent Good Performer' });
                              setStudentHistPage(1);
                            }}
                          >
                            View Score
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationBar
            currentPage={safeConsGoodPage}
            totalItems={consGood.length}
            pageSize={TABLE_PAGE_SIZE}
            onPageChange={setConsGoodPage}
            itemLabel="students"
          />
        </div>

        {/* Consistent Poor Performer List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <div className="card__title">Consistent Poor Performer List ({consPoor.length})</div>
              <div className="card__desc">Students consistently scoring remedial Good/AB across multiple LTs</div>
            </div>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>ROLL NO</th>
                    <th>NAME</th>
                    <th>RECORD</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {consistency.requiresMoreTests ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--slate)' }}>
                        Need at least 2 evaluated LTs in {lt.standardLabel} for ML consistency classification (currently {consistency.evaluatedLtsAnalyzed}).
                      </td>
                    </tr>
                  ) : consPoor.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--slate)' }}>
                        No consistent poor performers flagged right now.
                      </td>
                    </tr>
                  ) : (
                    paginatedConsPoor.map((st) => (
                      <tr key={st.studentId}>
                        <td className="num" style={{ fontWeight: 700 }}>{st.rollNo}</td>
                        <td>
                          <strong>{st.name}</strong>
                          <div style={{ fontSize: 11, color: '#E0473D', fontWeight: 600 }}>
                            ML Confidence: {st.mlConfidence}%
                          </div>
                        </td>
                        <td className="num" style={{ fontSize: 12 }}>
                          {st.goodCount + st.abCount}/{st.totalTests} Weak/AB ({st.avgScore}/3.0)
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setViewingStudentScore({ ...st, category: 'Consistent Poor Performer' });
                              setStudentHistPage(1);
                            }}
                          >
                            View Score
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationBar
            currentPage={safeConsPoorPage}
            totalItems={consPoor.length}
            pageSize={TABLE_PAGE_SIZE}
            onPageChange={setConsPoorPage}
            itemLabel="students"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SUBMITTED REPORTS HISTORY + QUICK PRINT HANDOUT FOR FACULTY             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {sentReports.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card__head">
            <div>
              <div className="card__title">Submitted Reports to {lt.subject} Faculty ({sentReports.length})</div>
              <div className="card__desc">Print a copy to hand over directly to faculty or review acknowledgement status</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sentReports.map((rep, idx) => {
              const repQuestions = Array.isArray(rep.questions) && rep.questions.length > 0
                ? rep.questions
                : (lt.questions || []);
              const repWeak = rep.alertStatus === 'WEAK_TOPIC_UNDERSTANDING';
              const printPayload = {
                ...rep,
                ltNo: rep.ltNo || lt.ltNo,
                subject: rep.subject || lt.subject,
                standard: rep.standard || lt.standard,
                division: rep.division || lt.division,
                facultyName: rep.facultyName || lt.facultyName || `${lt.subject} Faculty`,
                ltDate: rep.ltDate || lt.takenDate,
                markEntryDate: rep.markEntryDate || lt.marksEnteredAt,
                marksEnteredByName: rep.marksEnteredByName || lt.marksEnteredByName || 'Assistant Faculty',
                classAverageLabel: rep.classAverageLabel || overallAverage,
                classAveragePercent: rep.classAveragePercent ?? classAveragePercent,
                classAverageScore: rep.classAverageScore ?? classAverageScore,
                counts: rep.counts || {
                  excellent: distribution.excellent,
                  better: distribution.better,
                  good: distribution.good,
                  ab: distribution.ab,
                  total: distribution.total,
                },
                topicsCovered: rep.topicsCovered?.length ? rep.topicsCovered : (lt.topicsCovered || []),
                questions: repQuestions,
              };
              return (
                <div
                  key={rep.id || rep._id || idx}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: '#FAFBFD',
                    border: '1px solid #E4E7F2',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                      <span className={`chip ${repWeak ? 'chip-warning' : 'chip-success'}`}>
                        {repWeak ? '⚠️ Weak Topic Alert' : '✅ Good Understanding'}
                      </span>
                      <span className={`chip ${rep.acknowledgedByFaculty ? 'chip-success' : 'chip-neutral'}`}>
                        {rep.acknowledgedByFaculty ? '✓ Acknowledged by Faculty' : 'Pending Faculty Acknowledgement'}
                      </span>
                      <span className="chip chip-neutral">
                        {repQuestions.length} Question{repQuestions.length === 1 ? '' : 's'}
                      </span>
                      <span className="num" style={{ fontSize: 12, color: 'var(--slate)' }}>
                        Sent {formatDate(rep.createdAt)} by {rep.sentByName || 'Principal'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13.5, color: '#1C2340', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                      {rep.principalMessage || 'No written note attached.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => triggerFacultyReportPrint(printPayload, setReportToPrint)}
                  >
                    🖨️ Print Report
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: VIEW STUDENT SCORE HISTORY (FROM "VIEW SCORE" BUTTON)         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {viewingStudentScore && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setViewingStudentScore(null);
          }}
        >
          <div
            className="modal-box"
            style={{
              maxWidth: 560,
              padding: 0,
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '92dvh',
              overflow: 'hidden',
            }}
          >
            <div style={{ background: '#123B5D', color: '#fff', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: '#8EC5FF', fontWeight: 700, textTransform: 'uppercase' }}>
                  {viewingStudentScore.category} • Roll #{viewingStudentScore.rollNo}
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  {viewingStudentScore.name} — Score History
                </h3>
              </div>
              <button className="modal-close" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: 'none' }} onClick={() => setViewingStudentScore(null)}>
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 20px', background: '#fff', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <span className="chip chip-success">Excellent: {viewingStudentScore.excellentCount}</span>
                <span className="chip chip-neutral">Better: {viewingStudentScore.betterCount}</span>
                <span className="chip chip-warning">Good (Weak): {viewingStudentScore.goodCount}</span>
                {viewingStudentScore.abCount > 0 && <span className="chip chip-danger">AB: {viewingStudentScore.abCount}</span>}
              </div>

              <div className="table-wrap" style={{ border: '1px solid #E4E7F2', borderRadius: 10 }}>
                <table>
                  <thead>
                    <tr>
                      <th>LT No</th>
                      <th>Subject</th>
                      <th>Date</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingStudentScore.history || [])
                      .slice((studentHistPage - 1) * 6, studentHistPage * 6)
                      .map((h, i) => (
                        <tr key={i}>
                          <td className="num"><strong>LT #{h.ltNo}</strong></td>
                          <td>{h.subject}</td>
                          <td className="num">{formatDate(h.date)}</td>
                          <td>
                            <span
                              className={`chip ${
                                h.grade === 'Excellent'
                                  ? 'chip-success'
                                  : h.grade === 'Better'
                                    ? 'chip-neutral'
                                    : h.grade === 'AB'
                                      ? 'chip-danger'
                                      : 'chip-warning'
                              }`}
                            >
                              {h.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <PaginationBar
                currentPage={studentHistPage}
                totalItems={(viewingStudentScore.history || []).length}
                pageSize={6}
                onPageChange={setStudentHistPage}
                itemLabel="LT records"
              />
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', background: '#FAFBFD', flexShrink: 0 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setViewingStudentScore(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: GENERATE REPORT FOR SUBJECT FACULTY (WITH QUESTIONS + PRINT)  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showReportModal && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setShowReportModal(false);
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
              overflow: 'hidden',
            }}
          >
            <div style={{ background: 'linear-gradient(135deg, #123B5D 0%, #1B4E78 100%)', color: '#fff', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: '#8EC5FF', fontWeight: 700, textTransform: 'uppercase' }}>
                  Principal → Subject Faculty Report
                </div>
                <h2 style={{ margin: '2px 0 0', fontSize: 19, fontWeight: 800, color: '#fff' }}>
                  Generate LT Report — {lt.subject} (LT #{lt.ltNo})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmitFacultyReport}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 auto',
                minHeight: 0,
                background: '#fff',
              }}
            >
              <div style={{ padding: '18px 22px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 15 }}>
                {modalError && (
                  <div className="banner banner-warning" style={{ marginBottom: 0 }}>
                    <span>⚠️ {modalError}</span>
                  </div>
                )}

                {/* Alert Summary Pill */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: isWeakAlert ? '#FBF2E1' : '#E6F8EF',
                    border: `1px solid ${isWeakAlert ? '#D99A2B' : '#1F9D6B'}`,
                    color: isWeakAlert ? '#78350F' : '#14532D',
                    fontSize: 13.5,
                    fontWeight: 700,
                  }}
                >
                  {isWeakAlert
                    ? '⚠️ Weak Topic Understanding Alert — Flagged for Subject Faculty Review'
                    : '✅ Good Topic Understanding Alert — Satisfactory Class Performance'}
                </div>

                {/* Metrics Preview Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                  <div style={{ background: '#F6F7FB', padding: '10px 12px', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                    <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>LT Date</div>
                    <div className="num" style={{ fontSize: 13.5, fontWeight: 800, color: '#1C2340', marginTop: 2 }}>{formatDate(lt.takenDate)}</div>
                  </div>
                  <div style={{ background: '#F6F7FB', padding: '10px 12px', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                    <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>Class Average</div>
                    <div className="num" style={{ fontSize: 13.5, fontWeight: 800, color: '#123B5D', marginTop: 2 }}>
                      {overallAverage}
                    </div>
                  </div>
                  <div style={{ background: '#E6F8EF', padding: '10px 12px', borderRadius: 10, border: '1px solid #BEE5D3' }}>
                    <div style={{ fontSize: 11, color: '#1F9D6B', fontWeight: 700, textTransform: 'uppercase' }}>Excellent Count</div>
                    <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#1F9D6B', marginTop: 2 }}>{distribution.excellent}</div>
                  </div>
                  <div style={{ background: '#E8F1F8', padding: '10px 12px', borderRadius: 10, border: '1px solid #C8DBED' }}>
                    <div style={{ fontSize: 11, color: '#123B5D', fontWeight: 700, textTransform: 'uppercase' }}>Better Count</div>
                    <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#123B5D', marginTop: 2 }}>{distribution.better}</div>
                  </div>
                  <div style={{ background: '#FBF2E1', padding: '10px 12px', borderRadius: 10, border: '1px solid #EED5A3' }}>
                    <div style={{ fontSize: 11, color: '#B45309', fontWeight: 700, textTransform: 'uppercase' }}>Good Count</div>
                    <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#B45309', marginTop: 2 }}>{distribution.good}</div>
                  </div>
                </div>

                {/* LT Questions Included in Report */}
                <div>
                  <label className="field-label">
                    LT Questions Included in Report ({lt.questions?.length || 0})
                  </label>
                  {lt.questions && lt.questions.length > 0 ? (
                    <div
                      style={{
                        maxHeight: 190,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        padding: 10,
                        borderRadius: 10,
                        background: '#FAFBFD',
                        border: '1px solid #E4E7F2',
                      }}
                    >
                      {lt.questions.map((q, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            fontSize: 13,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                            <strong style={{ color: '#123B5D' }}>Q{q.questionNo || idx + 1}</strong>
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
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FAFBFD', border: '1px solid #E4E7F2', fontSize: 12.5, color: 'var(--slate)' }}>
                      {lt.topicsCovered && lt.topicsCovered.length > 0 ? (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {lt.topicsCovered.map((t, i) => (
                            <span key={i} className="chip chip-neutral">{t}</span>
                          ))}
                        </div>
                      ) : (
                        'No individual questions attached to this LT.'
                      )}
                    </div>
                  )}
                </div>

                {/* Message for Faculty */}
                <div>
                  <label className="field-label">Message / Remarks for {lt.subject} Faculty (સૂચના / નોંધ) *</label>
                  <textarea
                    ref={principalMessageRef}
                    className="field-input w-full"
                    rows={4}
                    value={principalMessage}
                    onChange={(e) => setPrincipalMessage(e.target.value)}
                    placeholder="Write feedback, topic revision guidance, or speak in Gujarati/English..."
                    required
                    style={{ resize: 'vertical', fontSize: 13.5 }}
                  />
                  <VoiceInputControl
                    value={principalMessage}
                    onChange={setPrincipalMessage}
                    inputRef={principalMessageRef}
                    defaultLang="gu-IN"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTop: '1px solid var(--line-soft)', padding: '14px 22px', background: '#FAFBFD', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    triggerFacultyReportPrint(
                      {
                        ltNo: lt.ltNo,
                        subject: lt.subject,
                        standard: lt.standard,
                        division: lt.division,
                        facultyName: lt.facultyName || `${lt.subject} Faculty`,
                        ltDate: lt.takenDate,
                        markEntryDate: lt.marksEnteredAt,
                        marksEnteredByName: lt.marksEnteredByName || 'Assistant Faculty',
                        alertStatus,
                        alertTitle,
                        alertMessage,
                        classAverageLabel: overallAverage,
                        classAveragePercent,
                        classAverageScore,
                        counts: {
                          excellent: distribution.excellent,
                          better: distribution.better,
                          good: distribution.good,
                          ab: distribution.ab,
                          total: distribution.total,
                        },
                        topicsCovered: lt.topicsCovered || [],
                        questions: lt.questions || [],
                        principalMessage,
                        sentByName: user?.name || 'Principal',
                        createdAt: new Date().toISOString(),
                      },
                      setReportToPrint
                    )
                  }
                >
                  🖨️ Print Report
                </button>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowReportModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSendingReport}>
                    {isSendingReport ? 'Submitting Report...' : '✓ Submit Report to Faculty'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <PrintableFacultyReport report={reportToPrint} onClose={() => setReportToPrint(null)} />
    </div>
  );
}
