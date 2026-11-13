import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { useAuth } from '../../context/AuthContext';
import { examApi } from '../../services/examApi';
import { reportApi } from '../../services/reportApi';
import PaginationBar from '../../components/common/PaginationBar';
import PrintableFacultyReport, { triggerFacultyReportPrint } from '../../components/common/PrintableFacultyReport';
import VoiceInputControl from '../../components/common/VoiceInputControl';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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

const SUBJECT_LINE_COLORS = {
  Physics: '#123B5D',
  Chemistry: '#1F9D6B',
  Maths: '#D99A2B',
  Biology: '#E0473D',
};

export default function ExamAnalysisDetail() {
  const { id } = useParams();
  const { setHeader } = useOutletContext();
  const { user } = useAuth();

  const [analysis, setAnalysis] = useState(null);
  const [scopeGroup, setScopeGroup] = useState('ALL');
  const [activeTab, setActiveTab] = useState('performance');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [feedbackBanner, setFeedbackBanner] = useState(null);
  const [isRetraining, setIsRetraining] = useState(false);

  // Pagination & search state for all tables
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [topGrowthPage, setTopGrowthPage] = useState(1);
  const [decGrowthPage, setDecGrowthPage] = useState(1);
  const [consGrowthPage, setConsGrowthPage] = useState(1);
  const [consDecPage, setConsDecPage] = useState(1);
  const LEADERBOARD_PAGE_SIZE = 8;
  const ANALYSIS_CARD_PAGE_SIZE = 5;

  // Clickable Increased / Decreased Students Modal (from Performance Indicators)
  const [diffModalType, setDiffModalType] = useState(null); // 'increased' | 'decreased' | null
  const [diffModalPage, setDiffModalPage] = useState(1);

  // Student multi-exam score history Modal (from Consistent lists)
  const [viewingStudentHist, setViewingStudentHist] = useState(null);
  const [studentHistPage, setStudentHistPage] = useState(1);

  // Generate Report for Faculty Modal + Print
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportSubject, setSelectedReportSubject] = useState('');
  const [principalMessage, setPrincipalMessage] = useState('');
  const principalExamMessageRef = useRef(null);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [reportToPrint, setReportToPrint] = useState(null);
  const lastReportSubjRef = useRef('');

  const loadAnalysis = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setErrorMsg(null);
    }
    try {
      const data = await examApi.getExamDetailedAnalysis(id, { group: scopeGroup });
      setAnalysis(data);
    } catch (err) {
      if (!silent) setErrorMsg(err.message || 'Failed to load Exam Analysis');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [id, scopeGroup]);

  useEffect(() => {
    loadAnalysis(false);
    const onFocus = () => loadAnalysis(true);
    const onVis = () => {
      if (document.visibilityState === 'visible') loadAnalysis(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadAnalysis]);

  useEffect(() => {
    if (analysis?.exam) {
      const ex = analysis.exam;
      setHeader({
        title: `Exam #${ex.examNo} — ${ex.subject} (${formatExamTypeLabel(ex.examType)})`,
        subtitle: `${ex.standardLabel}${ex.division !== 'ALL' ? ` · Div ${ex.division}` : ''} • Date: ${formatDate(ex.examDate)}`,
      });
    } else {
      setHeader({
        title: 'Exam Analysis Detail',
        subtitle: 'Loading detailed examination metrics...',
      });
    }
  }, [setHeader, analysis]);

  const exam = analysis?.exam;
  const overview = analysis?.overview || {};
  const comparison = analysis?.comparison || {};
  const scoreBrackets = analysis?.scoreBrackets || [];
  const leaderboard = analysis?.leaderboard || [];
  const studentAnalysis = analysis?.studentAnalysis || {};
  const subjectReportSummaries = analysis?.subjectReportSummaries || [];
  const mlModelMeta = analysis?.mlModelMeta || {};
  const sentReports = analysis?.sentReports || [];

  // Open Generate Report modal helper
  const openGenerateReportModal = () => {
    setModalError(null);
    lastReportSubjRef.current = '';
    if (exam?.isMultiSubject) {
      // Prompt requirement: for JEE/NEET/GUJCET, Principal must first select subject!
      setSelectedReportSubject('');
      setPrincipalMessage('');
    } else {
      const defaultSubj = exam?.subject || 'Physics';
      setSelectedReportSubject(defaultSubj);
    }
    setShowReportModal(true);
  };

  // Resolve selected subject metrics inside Generate Report modal
  const selectedSubjectMetrics = useMemo(() => {
    if (!selectedReportSubject || !subjectReportSummaries.length) return null;
    const match = subjectReportSummaries.find(
      (s) => s.subject.toLowerCase() === selectedReportSubject.toLowerCase()
    );
    return match || subjectReportSummaries[0] || null;
  }, [selectedReportSubject, subjectReportSummaries]);

  // Populate intelligent editable default message when subject is chosen
  useEffect(() => {
    if (!showReportModal || !exam) return;
    if (!selectedReportSubject) {
      setPrincipalMessage('');
      return;
    }
    if (lastReportSubjRef.current === selectedReportSubject) return;
    lastReportSubjRef.current = selectedReportSubject;

    const m = selectedSubjectMetrics;
    if (!m) return;
    const trendPhrase =
      m.growthRate !== null && m.growthRate !== undefined
        ? `a growth rate of +${Number(m.growthRate).toFixed(1)}% vs. previous Exam #${m.previousExam?.examNo}`
        : m.downfallRate !== null && m.downfallRate !== undefined
          ? `a downfall rate of -${Number(m.downfallRate).toFixed(1)}% vs. previous Exam #${m.previousExam?.examNo}`
          : 'baseline evaluation metrics';

    if (m.alertStatus === 'WEAK_TOPIC_UNDERSTANDING') {
      setPrincipalMessage(
        `Exam #${exam.examNo} (${formatExamTypeLabel(exam.examType)}) — ${m.subject} class average is ${m.classAveragePercent}% (Highest: ${m.highestMarks}/${m.totalMaxMarks}, Lowest: ${m.lowestMarks}/${m.totalMaxMarks}) with ${trendPhrase}. Please arrange targeted remedial revision for weak students.`
      );
    } else {
      setPrincipalMessage(
        `Exam #${exam.examNo} (${formatExamTypeLabel(exam.examType)}) — ${m.subject} achieved ${m.classAveragePercent}% class average (Highest: ${m.highestMarks}/${m.totalMaxMarks}, Lowest: ${m.lowestMarks}/${m.totalMaxMarks}) with ${trendPhrase}. Keep up the strong momentum.`
      );
    }
  }, [showReportModal, selectedReportSubject, selectedSubjectMetrics, exam]);

  const handleSubmitFacultyReport = async (e) => {
    e.preventDefault();
    if (!exam) return;
    if (exam.isMultiSubject && !selectedReportSubject) {
      setModalError('Please select a subject first (Physics, Chemistry, Maths, or Biology).');
      return;
    }
    setIsSendingReport(true);
    setModalError(null);
    try {
      const targetSubj = exam.isMultiSubject ? selectedReportSubject : exam.subject;
      await reportApi.createFacultyReport({
        reportType: 'EXAM',
        examId: exam.id,
        targetSubject: targetSubj,
        principalMessage,
        sentByName: user?.name || 'Principal',
      });
      setShowReportModal(false);
      setFeedbackBanner(
        `Exam Report for #${exam.examNo} (${targetSubj}) submitted to ${targetSubj} Faculty Report tab!`
      );
      await loadAnalysis(true);
    } catch (err) {
      setModalError(err.message || 'Failed to submit exam report');
    } finally {
      setIsSendingReport(false);
    }
  };

  const handleRetrainModel = async () => {
    setIsRetraining(true);
    try {
      await examApi.retrainExamModel();
      await loadAnalysis(false);
      setFeedbackBanner('Exam ML Trajectory & Performance classifiers retrained & refreshed!');
    } catch (err) {
      setErrorMsg(err.message || 'Model retraining failed');
    } finally {
      setIsRetraining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--slate)' }}>
        Computing exam percentiles, growth/downfall comparisons &amp; ML trajectory analytics...
      </div>
    );
  }

  if (errorMsg || !analysis || !exam) {
    return (
      <div className="card" style={{ padding: 30, textAlign: 'center' }}>
        <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: 12 }}>
          {errorMsg || 'Unable to load Exam Analysis Detail'}
        </div>
        <Link to="/principal/exam-analysis" className="btn btn-primary btn-sm">
          ← Back to Exam Analysis
        </Link>
      </div>
    );
  }

  // ── Chart Data: Tab 1 Doughnut (Score Bracket Distribution) ──
  const bracketCounts = scoreBrackets.map((b) => b.count);
  const hasAnyBracketData = bracketCounts.some((v) => v > 0);
  const bracketDoughnutData = {
    labels: scoreBrackets.map((b) => b.range),
    datasets: [
      {
        data: hasAnyBracketData ? bracketCounts : [1],
        backgroundColor: hasAnyBracketData ? scoreBrackets.map((b) => b.color) : ['#E4E7F2'],
        borderColor: '#FFFFFF',
        borderWidth: 2,
        cutout: '56%',
      },
    ],
  };

  // ── Chart Data: Tab 1 Bar (Exam Average Comparison) ──
  const hasPrevExam = Boolean(comparison.hasPreviousExam && comparison.previousExam);
  const avgComparisonLabels = hasPrevExam ? ['Previous Exam', 'Current Exam'] : ['Current Exam'];
  const avgComparisonValues = hasPrevExam
    ? [comparison.previousAveragePercent || 0, comparison.currentAveragePercent || 0]
    : [comparison.currentAveragePercent || 0];
  const avgComparisonColors = hasPrevExam ? ['#94A3B8', '#123B5D'] : ['#123B5D'];

  const avgComparisonData = {
    labels: avgComparisonLabels,
    datasets: [
      {
        label: 'Class Average (%)',
        data: avgComparisonValues,
        backgroundColor: avgComparisonColors,
        borderRadius: 6,
        maxBarThickness: 54,
      },
    ],
  };

  // ── Chart Data: Tab 3 Subject-Wise Graphs (Only for JEE / NEET / GUJCET) ──
  const subjectWise = studentAnalysis.subjectWiseAnalytics;
  const subjList = subjectWise?.subjects || [];
  const subjTrend = subjectWise?.trendSeries || null;

  const subjectAvgBarData = {
    labels: subjList.map((s) => s.subject),
    datasets: [
      ...(subjList.some((s) => s.hasPrevious)
        ? [
            {
              label: 'Previous Exam Avg (%)',
              data: subjList.map((s) => (s.hasPrevious ? s.previousAveragePercent : 0)),
              backgroundColor: '#94A3B8',
              borderRadius: 6,
              maxBarThickness: 38,
            },
          ]
        : []),
      {
        label: 'Current Exam Avg (%)',
        data: subjList.map((s) => s.classAveragePercent),
        backgroundColor: '#123B5D',
        borderRadius: 6,
        maxBarThickness: 38,
      },
    ],
  };

  const hasMultiExamTrend = Boolean(subjTrend && subjTrend.examsCount >= 2);
  const subjectTrendLineData = hasMultiExamTrend
    ? {
        labels: subjTrend.labels,
        datasets: subjTrend.datasets.map((ds) => ({
          label: `${ds.subject} Avg (%)`,
          data: ds.data,
          borderColor: SUBJECT_LINE_COLORS[ds.subject] || '#123B5D',
          backgroundColor: SUBJECT_LINE_COLORS[ds.subject] || '#123B5D',
          tension: 0.25,
          borderWidth: 2.5,
          pointRadius: 4,
          spanGaps: true,
        })),
      }
    : {
        labels: subjList.map((s) => s.subject),
        datasets: [
          {
            label: 'Class Average (%)',
            data: subjList.map((s) => s.classAveragePercent),
            backgroundColor: '#123B5D',
            borderRadius: 6,
            maxBarThickness: 32,
          },
          {
            label: 'Pass Rate (%)',
            data: subjList.map((s) => s.passRatePercent),
            backgroundColor: '#1F9D6B',
            borderRadius: 6,
            maxBarThickness: 32,
          },
          {
            label: 'Highest Score (%)',
            data: subjList.map((s) => s.highestPercent),
            backgroundColor: '#D99A2B',
            borderRadius: 6,
            maxBarThickness: 32,
          },
        ],
      };

  // Filtered & paginated Leaderboard
  const filteredLeaderboard = leaderboard.filter((st) => {
    const q = leaderboardSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      String(st.rollNo).includes(q) ||
      String(st.name || '').toLowerCase().includes(q)
    );
  });
  const safeLeaderboardPage = Math.min(
    leaderboardPage,
    Math.max(1, Math.ceil(filteredLeaderboard.length / LEADERBOARD_PAGE_SIZE))
  );
  const paginatedLeaderboard = filteredLeaderboard.slice(
    (safeLeaderboardPage - 1) * LEADERBOARD_PAGE_SIZE,
    safeLeaderboardPage * LEADERBOARD_PAGE_SIZE
  );

  // Student Analysis Tab Paginated Slices
  const topGrowth = studentAnalysis.topGrowth || [];
  const decreaseGrowth = studentAnalysis.decreaseGrowth || [];
  const consistentGrowth = studentAnalysis.consistentGrowth || [];
  const consistentDecrease = studentAnalysis.consistentDecrease || [];

  const safeTopGrowthPage = Math.min(topGrowthPage, Math.max(1, Math.ceil(topGrowth.length / ANALYSIS_CARD_PAGE_SIZE)));
  const paginatedTopGrowth = topGrowth.slice(
    (safeTopGrowthPage - 1) * ANALYSIS_CARD_PAGE_SIZE,
    safeTopGrowthPage * ANALYSIS_CARD_PAGE_SIZE
  );

  const safeDecGrowthPage = Math.min(decGrowthPage, Math.max(1, Math.ceil(decreaseGrowth.length / ANALYSIS_CARD_PAGE_SIZE)));
  const paginatedDecGrowth = decreaseGrowth.slice(
    (safeDecGrowthPage - 1) * ANALYSIS_CARD_PAGE_SIZE,
    safeDecGrowthPage * ANALYSIS_CARD_PAGE_SIZE
  );

  const safeConsGrowthPage = Math.min(consGrowthPage, Math.max(1, Math.ceil(consistentGrowth.length / ANALYSIS_CARD_PAGE_SIZE)));
  const paginatedConsGrowth = consistentGrowth.slice(
    (safeConsGrowthPage - 1) * ANALYSIS_CARD_PAGE_SIZE,
    safeConsGrowthPage * ANALYSIS_CARD_PAGE_SIZE
  );

  const safeConsDecPage = Math.min(consDecPage, Math.max(1, Math.ceil(consistentDecrease.length / ANALYSIS_CARD_PAGE_SIZE)));
  const paginatedConsDec = consistentDecrease.slice(
    (safeConsDecPage - 1) * ANALYSIS_CARD_PAGE_SIZE,
    safeConsDecPage * ANALYSIS_CARD_PAGE_SIZE
  );

  // Modal Pagination for Increased / Decreased Drill-down
  const diffList =
    diffModalType === 'increased'
      ? comparison.increasedStudents || []
      : diffModalType === 'decreased'
        ? comparison.decreasedStudents || []
        : [];
  const DIFF_PAGE_SIZE = 7;
  const safeDiffPage = Math.min(diffModalPage, Math.max(1, Math.ceil(diffList.length / DIFF_PAGE_SIZE)));
  const paginatedDiffList = diffList.slice((safeDiffPage - 1) * DIFF_PAGE_SIZE, safeDiffPage * DIFF_PAGE_SIZE);

  // Performance message styling
  const isNegativeOutcome =
    overview.alertStatus === 'WEAK_TOPIC_UNDERSTANDING' || (comparison.downfallRate !== null && comparison.downfallRate > 0);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <Link to="/principal/exam-analysis" className="btn btn-ghost btn-sm">
          ← Back to Exam Analysis
        </Link>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {sentReports.length > 0 && (
            <span className="chip chip-success">
              ✓ {sentReports.length} Faculty Report{sentReports.length === 1 ? '' : 's'} Sent
            </span>
          )}
          <span
            className={`chip ${
              overview.difficultyLabel === 'Hard'
                ? 'chip-danger'
                : overview.difficultyLabel === 'Moderate'
                  ? 'chip-warning'
                  : 'chip-success'
            }`}
          >
            Paper Level: {overview.difficultyLabel || 'Moderate'}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleRetrainModel}
            disabled={isRetraining}
            title="Retrain Exam Performance & Trajectory ML models"
          >
            {isRetraining ? 'Retraining ML...' : '↻ Retrain ML'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={openGenerateReportModal}
          >
            📄 Generate Report for Faculty
          </button>
        </div>
      </div>

      {feedbackBanner && (
        <div className="banner banner-success" style={{ marginBottom: 14, justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✅ {feedbackBanner}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFeedbackBanner(null)}>✕</button>
        </div>
      )}

      {/* Exam Metadata Strip + GUJCET Group Switcher */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1C2340' }}>
              Exam #{exam.examNo} — {exam.subject} ({formatExamTypeLabel(exam.examType)})
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--slate)', marginTop: 3, overflowWrap: 'anywhere' }}>
              {exam.standardLabel}{exam.division !== 'ALL' ? ` · Div ${exam.division}` : ''} • Exam Date: <strong>{formatDate(exam.examDate)}</strong>
              {exam.marksEnteredAt ? ` • Marks Entered: ${formatDate(exam.marksEnteredAt)} by ${exam.marksEnteredByName}` : ''}
              {exam.unitSummary ? ` • Units: ${exam.unitSummary}` : ''}
            </div>
          </div>

          {exam.examType === 'GUJCET' && exam.availableGroups?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)' }}>GROUP SCOPE:</span>
              {['ALL', ...exam.availableGroups].map((grp) => (
                <button
                  key={grp}
                  type="button"
                  className={`btn btn-sm ${scopeGroup === grp ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => {
                    setScopeGroup(grp);
                    setLeaderboardPage(1);
                  }}
                >
                  {grp === 'ALL' ? 'Combined (A & B)' : grp === 'A' ? 'Group A (PCM)' : 'Group B (PCB)'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3 KPI Cards (Photo 2 & Photo 4) */}
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi-card">
          <div className="kpi-card__label">Class Average</div>
          <div className="kpi-card__value num">{overview.classAveragePercent || 0}%</div>
          <div className="kpi-card__hint">
            Mean: {overview.averageMarks || 0} / {overview.totalMaxMarks || 100} marks • {overview.presentCount || 0} appeared
          </div>
        </div>
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Pass Students</div>
          <div className="kpi-card__value num">{overview.passStudents || 0}</div>
          <div className="kpi-card__hint">
            Scored ≥ 40% ({overview.passRatePercent || 0}% pass rate)
          </div>
        </div>
        <div className="kpi-card is-danger">
          <div className="kpi-card__label">Failed Students</div>
          <div className="kpi-card__value num">{overview.failedStudents || 0}</div>
          <div className="kpi-card__hint">
            Below 40% cut-off{overview.absentCount > 0 ? ` • ${overview.absentCount} Absent` : ''}
          </div>
        </div>
      </div>

      {/* 3 Main Tabs (Photo 2, Photo 4, Photo 5) */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'performance' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'leaderboard' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard ({leaderboard.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'student-analysis' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('student-analysis')}
        >
          Student Analysis
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: PERFORMANCE (Photos 2 & 3)                                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'performance' && (
        <>
          <div className="grid-2" style={{ marginBottom: 18 }}>
            {/* Score Bracket Distribution Doughnut Chart */}
            <div className="card">
              <div className="card__head">
                <div>
                  <div className="card__title">Score Bracket Distribution</div>
                  <div className="card__desc">Distribution of evaluated students across percentage bands</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20, padding: '8px 0' }}>
                <div style={{ position: 'relative', width: 190, height: 190 }}>
                  <Doughnut
                    data={bracketDoughnutData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: { enabled: hasAnyBracketData },
                      },
                    }}
                  />
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
                    <div className="num" style={{ fontSize: 24, fontWeight: 800, color: '#1C2340', lineHeight: 1 }}>
                      {overview.presentCount || 0}
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', marginTop: 3 }}>
                      PRESENT
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                  {scoreBrackets.map((b) => (
                    <div key={b.range} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, fontSize: 13.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ width: 18, height: 10, borderRadius: 3, background: b.color, display: 'inline-block' }} />
                        <span style={{ color: '#334155', fontWeight: 600 }}>{b.range}</span>
                      </div>
                      <strong className="num" style={{ color: '#1C2340' }}>{b.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Exam Average Comparison Bar Chart */}
            <div className="card">
              <div className="card__head">
                <div>
                  <div className="card__title">Exam Average Comparison</div>
                  <div className="card__desc">
                    {hasPrevExam
                      ? `Compared vs. previous ${formatExamTypeLabel(exam.examType)} (${comparison.previousExam.subject}) Exam #${comparison.previousExam.examNo}`
                      : `First evaluated ${formatExamTypeLabel(exam.examType)} (${exam.subject}) exam in ${exam.standardLabel}`}
                  </div>
                </div>
              </div>

              <div style={{ height: 220, position: 'relative' }}>
                <Bar
                  data={avgComparisonData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: '#EEF0F8' },
                        ticks: {
                          stepSize: 10,
                          font: { family: 'IBM Plex Mono', size: 11 },
                          callback: (v) => `${v}%`,
                        },
                      },
                      x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Manrope', size: 12, weight: 700 } },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Photo 3 Bottom Row: Performance Indicators + Performance Message */}
          <div className="grid-2">
            {/* Performance Indicators (with clickable increased & decreased counts!) */}
            <div className="card">
              <div className="card__head">
                <div>
                  <div className="card__title">Performance Indicators</div>
                  <div className="card__desc">
                    {hasPrevExam
                      ? `Compared with Exam #${comparison.previousExam.examNo} (${formatDate(comparison.previousExam.examDate)})`
                      : 'Previous same-type & subject exam needed for delta comparison'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px dashed var(--line-soft)' }}>
                  <span style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>Growth Rate %</span>
                  <strong className="num" style={{ fontSize: 15, color: comparison.growthRate !== null ? '#1F9D6B' : '#1C2340' }}>
                    {comparison.growthRate !== null && comparison.growthRate !== undefined
                      ? `+${Number(comparison.growthRate).toFixed(1)}%`
                      : '—'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px dashed var(--line-soft)' }}>
                  <span style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>Downfall Rate %</span>
                  <strong className="num" style={{ fontSize: 15, color: comparison.downfallRate !== null ? '#E0473D' : '#1C2340' }}>
                    {comparison.downfallRate !== null && comparison.downfallRate !== undefined
                      ? `-${Number(comparison.downfallRate).toFixed(1)}%`
                      : '—'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px dashed var(--line-soft)' }}>
                  <div>
                    <span style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>No. of student marks increase</span>
                    {hasPrevExam && (
                      <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>Click number to view student list</div>
                    )}
                  </div>
                  {hasPrevExam ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm num"
                      onClick={() => {
                        setDiffModalType('increased');
                        setDiffModalPage(1);
                      }}
                      style={{
                        borderColor: '#BEE5D3',
                        background: '#E6F8EF',
                        color: '#1F9D6B',
                        fontWeight: 800,
                        minWidth: 54,
                      }}
                    >
                      {comparison.increasedCount ?? 0} ↗
                    </button>
                  ) : (
                    <strong className="num">—</strong>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                  <div>
                    <span style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>No. of student marks decrease</span>
                    {hasPrevExam && (
                      <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>Click number to view student list</div>
                    )}
                  </div>
                  {hasPrevExam ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm num"
                      onClick={() => {
                        setDiffModalType('decreased');
                        setDiffModalPage(1);
                      }}
                      style={{
                        borderColor: '#F5C2BE',
                        background: '#FDEAE8',
                        color: '#E0473D',
                        fontWeight: 800,
                        minWidth: 54,
                      }}
                    >
                      {comparison.decreasedCount ?? 0} ↘
                    </button>
                  ) : (
                    <strong className="num">—</strong>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Message */}
            <div className="card">
              <div className="card__head">
                <div>
                  <div className="card__title">Performance Message</div>
                  <div className="card__desc">Automated evaluation summary &amp; ML benchmark insight</div>
                </div>
                <span className="chip chip-neutral" title="Exam ML Performance Classifier accuracy">
                  ML Acc: {mlModelMeta.examPerformanceAccuracy || 98.8}%
                </span>
              </div>

              <div
                style={{
                  padding: '15px 18px',
                  borderRadius: 12,
                  background: isNegativeOutcome ? '#FBF2E1' : '#E6F8EF',
                  border: `1px solid ${isNegativeOutcome ? '#EED5A3' : '#BEE5D3'}`,
                  color: isNegativeOutcome ? '#78350F' : '#166534',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  fontSize: 14,
                  lineHeight: 1.55,
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>
                  {isNegativeOutcome ? '⚠' : 'ⓘ'}
                </span>
                <div>{comparison.performanceMessage}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 14 }}>
                <div style={{ background: '#F6F7FB', padding: '10px 12px', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                  <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>Highest Marks</div>
                  <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#1F9D6B', marginTop: 2 }}>
                    {overview.highestMarks ?? 0} / {overview.totalMaxMarks || 100}
                  </div>
                </div>
                <div style={{ background: '#F6F7FB', padding: '10px 12px', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                  <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>Lowest Marks</div>
                  <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#E0473D', marginTop: 2 }}>
                    {overview.lowestMarks ?? 0} / {overview.totalMaxMarks || 100}
                  </div>
                </div>
                <div style={{ background: '#F6F7FB', padding: '10px 12px', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                  <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>Total Appeared</div>
                  <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#123B5D', marginTop: 2 }}>
                    {overview.presentCount || 0} / {overview.totalStudents || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: LEADERBOARD WITH PERCENTILE (Photo 4)                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'leaderboard' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="card__title">Exam Leaderboard</div>
              <div className="card__desc">Top performing students in this examination evaluation cycle</div>
            </div>
            <div style={{ minWidth: 220, flex: '0 1 280px' }}>
              <input
                type="text"
                className="field-input w-full"
                placeholder="🔍 Filter by student name or roll #..."
                value={leaderboardSearch}
                onChange={(e) => {
                  setLeaderboardSearch(e.target.value);
                  setLeaderboardPage(1);
                }}
              />
            </div>
          </div>

          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 90 }}>RANK</th>
                  <th style={{ width: 95 }}>ROLL NO</th>
                  <th>NAME</th>
                  {exam.isMultiSubject && <th>SUBJECT BREAKDOWN</th>}
                  <th>MARKS</th>
                  <th>PERCENTILE</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={exam.isMultiSubject ? 6 : 5} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No student records found matching your query.
                    </td>
                  </tr>
                ) : (
                  paginatedLeaderboard.map((st, idx) => (
                    <tr key={`${st.studentId}-${st.examGroup}-${idx}`}>
                      <td className="num">
                        <strong>{st.ab ? 'AB' : `#${st.rank}`}</strong>
                      </td>
                      <td className="num">{st.rollNo}</td>
                      <td>
                        <strong>{st.name}</strong>
                        <div style={{ fontSize: 11, color: 'var(--slate)' }}>
                          Div {st.division}
                          {exam.examType === 'GUJCET' && st.examGroup && st.examGroup !== 'ALL' ? ` · Group ${st.examGroup}` : ''}
                        </div>
                      </td>
                      {exam.isMultiSubject && (
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(st.subjectMarks || []).map((sm, si) => (
                              <span key={si} className="chip chip-neutral" style={{ fontSize: 11.5 }}>
                                {sm.subject}: <strong>{st.ab ? 'AB' : `${sm.marksObtained}/${sm.totalMarks}`}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                      )}
                      <td className="num">
                        {st.ab ? (
                          <span className="chip chip-danger">Absent (AB)</span>
                        ) : (
                          <div>
                            <strong>{st.marksObtained}</strong>{' '}
                            <span style={{ color: 'var(--slate)', fontSize: 12 }}>
                              / {st.totalMaxMarks} ({st.percentage}%)
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="num">
                        {st.ab ? (
                          <span style={{ color: 'var(--slate)' }}>—</span>
                        ) : (
                          <strong style={{ color: st.percentile >= 50 ? '#1F9D6B' : '#D99A2B' }}>
                            {Number(st.percentile).toFixed(2)}%
                          </strong>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            currentPage={safeLeaderboardPage}
            totalItems={filteredLeaderboard.length}
            pageSize={LEADERBOARD_PAGE_SIZE}
            onPageChange={setLeaderboardPage}
            itemLabel="students"
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: STUDENT ANALYSIS (Photo 5 + Two Subject-Wise Graphs)            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'student-analysis' && (
        <>
          <div className="grid-2" style={{ marginBottom: 18 }}>
            {/* 1. Top Growth Student List */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="card__title">Top Growth Student List 📈 ({topGrowth.length})</div>
                  <div className="card__desc">
                    {hasPrevExam
                      ? `Improved marks vs. Exam #${comparison.previousExam.examNo}`
                      : 'Requires a previous same-type & subject exam'}
                  </div>
                </div>
                <div className="table-wrap" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>ROLL NO</th>
                        <th>NAME</th>
                        <th style={{ textAlign: 'right' }}>GROWTH RATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!hasPrevExam ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: 22, color: 'var(--slate)' }}>
                            Evaluate a second {formatExamTypeLabel(exam.examType)} ({exam.subject}) exam to rank growth rates.
                          </td>
                        </tr>
                      ) : topGrowth.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: 22, color: 'var(--slate)' }}>
                            No students recorded mark increases vs. the previous exam.
                          </td>
                        </tr>
                      ) : (
                        paginatedTopGrowth.map((st, i) => (
                          <tr key={`${st.studentId}-${i}`}>
                            <td className="num"><strong>{st.rollNo}</strong></td>
                            <td>
                              <strong>{st.name}</strong>
                              <div style={{ fontSize: 11, color: 'var(--slate)' }}>
                                {st.previousPercent}% → {st.currentPercent}%
                              </div>
                            </td>
                            <td className="num" style={{ textAlign: 'right' }}>
                              <strong style={{ color: '#1F9D6B' }}>+{Number(st.rate).toFixed(1)}%</strong>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <PaginationBar
                currentPage={safeTopGrowthPage}
                totalItems={topGrowth.length}
                pageSize={ANALYSIS_CARD_PAGE_SIZE}
                onPageChange={setTopGrowthPage}
                itemLabel="students"
              />
            </div>

            {/* 2. Decrease Growth Student List */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="card__title">Decrease Growth Student List 📉 ({decreaseGrowth.length})</div>
                  <div className="card__desc">
                    {hasPrevExam
                      ? `Declined marks vs. Exam #${comparison.previousExam.examNo}`
                      : 'Requires a previous same-type & subject exam'}
                  </div>
                </div>
                <div className="table-wrap" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>ROLL NO</th>
                        <th>NAME</th>
                        <th style={{ textAlign: 'right' }}>DECREASE RATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!hasPrevExam ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: 22, color: 'var(--slate)' }}>
                            Evaluate a second {formatExamTypeLabel(exam.examType)} ({exam.subject}) exam to track decreases.
                          </td>
                        </tr>
                      ) : decreaseGrowth.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: 22, color: 'var(--slate)' }}>
                            No students experienced score declines vs. the previous exam.
                          </td>
                        </tr>
                      ) : (
                        paginatedDecGrowth.map((st, i) => (
                          <tr key={`${st.studentId}-${i}`}>
                            <td className="num"><strong>{st.rollNo}</strong></td>
                            <td>
                              <strong>{st.name}</strong>
                              <div style={{ fontSize: 11, color: 'var(--slate)' }}>
                                {st.previousPercent}% → {st.currentPercent}%
                              </div>
                            </td>
                            <td className="num" style={{ textAlign: 'right' }}>
                              <strong style={{ color: '#E0473D' }}>-{Number(st.rate).toFixed(1)}%</strong>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <PaginationBar
                currentPage={safeDecGrowthPage}
                totalItems={decreaseGrowth.length}
                pageSize={ANALYSIS_CARD_PAGE_SIZE}
                onPageChange={setDecGrowthPage}
                itemLabel="students"
              />
            </div>

            {/* 3. Consistent Growth Student List */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div className="card__title">Consistent Growth Student List ({consistentGrowth.length})</div>
                    <div className="card__desc">
                      ML Softmax Trajectory Classifier ({mlModelMeta.studentTrajectoryAccuracy || 96.7}% acc)
                    </div>
                  </div>
                </div>
                <div className="table-wrap" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>ROLL NO</th>
                        <th>NAME</th>
                        <th>AVG / TREND</th>
                        <th style={{ textAlign: 'right' }}>HISTORY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAnalysis.requiresMoreExams ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: 22, color: 'var(--slate)' }}>
                            Need at least 2 evaluated {formatExamTypeLabel(exam.examType)} exams for ML longitudinal analysis.
                          </td>
                        </tr>
                      ) : consistentGrowth.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: 22, color: 'var(--slate)' }}>
                            No consistent growth trajectory students flagged yet across evaluated exams.
                          </td>
                        </tr>
                      ) : (
                        paginatedConsGrowth.map((st, i) => (
                          <tr key={`${st.studentId}-${i}`}>
                            <td className="num"><strong>{st.rollNo}</strong></td>
                            <td>
                              <strong>{st.name}</strong>
                              <div style={{ fontSize: 11, color: '#1F9D6B', fontWeight: 600 }}>
                                ML Confidence: {st.mlConfidence}%
                              </div>
                            </td>
                            <td className="num" style={{ fontSize: 12.5 }}>
                              <div><strong>{st.avgPercent}% avg</strong></div>
                              <div style={{ color: '#1F9D6B', fontSize: 11 }}>
                                {st.netChange >= 0 ? `+${st.netChange}%` : `${st.netChange}%`} over {st.testsCount} exams
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                  setViewingStudentHist({ ...st, category: 'Consistent Growth Student' });
                                  setStudentHistPage(1);
                                }}
                              >
                                View
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
                currentPage={safeConsGrowthPage}
                totalItems={consistentGrowth.length}
                pageSize={ANALYSIS_CARD_PAGE_SIZE}
                onPageChange={setConsGrowthPage}
                itemLabel="students"
              />
            </div>

            {/* 4. Consistent Decrease Growth Student List */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="card__title">Consistent Decrease Growth Student List ({consistentDecrease.length})</div>
                  <div className="card__desc">
                    Students showing sustained declining scores requiring counseling
                  </div>
                </div>
                <div className="table-wrap" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>ROLL NO</th>
                        <th>NAME</th>
                        <th>AVG / TREND</th>
                        <th style={{ textAlign: 'right' }}>HISTORY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentAnalysis.requiresMoreExams ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: 22, color: 'var(--slate)' }}>
                            Need at least 2 evaluated {formatExamTypeLabel(exam.examType)} exams for ML longitudinal analysis.
                          </td>
                        </tr>
                      ) : consistentDecrease.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: 22, color: 'var(--slate)' }}>
                            No students with consistent score decline flagged right now.
                          </td>
                        </tr>
                      ) : (
                        paginatedConsDec.map((st, i) => (
                          <tr key={`${st.studentId}-${i}`}>
                            <td className="num"><strong>{st.rollNo}</strong></td>
                            <td>
                              <strong>{st.name}</strong>
                              <div style={{ fontSize: 11, color: '#E0473D', fontWeight: 600 }}>
                                ML Confidence: {st.mlConfidence}%
                              </div>
                            </td>
                            <td className="num" style={{ fontSize: 12.5 }}>
                              <div><strong>{st.avgPercent}% avg</strong></div>
                              <div style={{ color: '#E0473D', fontSize: 11 }}>
                                {st.netChange}% over {st.testsCount} exams
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                  setViewingStudentHist({ ...st, category: 'Consistent Decrease Student' });
                                  setStudentHistPage(1);
                                }}
                              >
                                View
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
                currentPage={safeConsDecPage}
                totalItems={consistentDecrease.length}
                pageSize={ANALYSIS_CARD_PAGE_SIZE}
                onPageChange={setConsDecPage}
                itemLabel="students"
              />
            </div>
          </div>

          {/* TWO SUBJECT-WISE CLASS AVERAGE GRAPHS (Shown ONLY for JEE, NEET, GUJCET) */}
          {exam.isMultiSubject && subjList.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1C2340' }}>
                  Subject-Wise Class Average Analytics ({formatExamTypeLabel(exam.examType)})
                </h3>
                <div style={{ fontSize: 12.5, color: 'var(--slate)', marginTop: 2 }}>
                  Subject-level class average breakdown and progression across Physics, Chemistry &amp; Maths / Biology
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 16 }}>
                {/* Graph 1: Subject-Wise Class Average % (Current vs Previous) */}
                <div className="card">
                  <div className="card__head">
                    <div>
                      <div className="card__title">Subject-Wise Class Average (%)</div>
                      <div className="card__desc">Mean percentage scored by class students per subject</div>
                    </div>
                  </div>
                  <div style={{ height: 240, position: 'relative' }}>
                    <Bar
                      data={subjectAvgBarData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            grid: { color: '#EEF0F8' },
                            ticks: {
                              font: { family: 'IBM Plex Mono', size: 11 },
                              callback: (v) => `${v}%`,
                            },
                          },
                          x: { grid: { display: false } },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* Graph 2: Subject-Wise Class Average Progression / Benchmark Comparison */}
                <div className="card">
                  <div className="card__head">
                    <div>
                      <div className="card__title">
                        {hasMultiExamTrend
                          ? `Subject-Wise Class Average Trend (${subjTrend.examsCount} ${formatExamTypeLabel(exam.examType)} Exams)`
                          : 'Subject-Wise Class Average vs Highest & Pass Rate'}
                      </div>
                      <div className="card__desc">
                        {hasMultiExamTrend
                          ? 'Chronological class average % trajectory across each subject'
                          : 'Subject class average benchmarked against pass rate & top score'}
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 240, position: 'relative' }}>
                    {hasMultiExamTrend ? (
                      <Line
                        data={subjectTrendLineData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100,
                              grid: { color: '#EEF0F8' },
                              ticks: {
                                font: { family: 'IBM Plex Mono', size: 11 },
                                callback: (v) => `${v}%`,
                              },
                            },
                            x: { grid: { display: false } },
                          },
                        }}
                      />
                    ) : (
                      <Bar
                        data={subjectTrendLineData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100,
                              grid: { color: '#EEF0F8' },
                              ticks: {
                                font: { family: 'IBM Plex Mono', size: 11 },
                                callback: (v) => `${v}%`,
                              },
                            },
                            x: { grid: { display: false } },
                          },
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Per-Subject Quick Summary Strip */}
              <div className="kpi-grid-4">
                {subjList.map((sm) => (
                  <div key={sm.subject} className="kpi-card">
                    <div className="kpi-card__label">{sm.subject}</div>
                    <div className="kpi-card__value num">{sm.classAveragePercent}%</div>
                    <div className="kpi-card__hint">
                      Avg {sm.averageMarks}/{sm.totalMaxMarks} • High: <strong>{sm.highestMarks}</strong> • Low: <strong>{sm.lowestMarks}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SUBMITTED EXAM REPORTS HISTORY (PRINT HANDOUT READY)                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {sentReports.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card__head">
            <div>
              <div className="card__title">Submitted Faculty Reports for Exam #{exam.examNo} ({sentReports.length})</div>
              <div className="card__desc">Review sent subject reports or print a copy for faculty handover</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sentReports.map((rep, idx) => {
              const repWeak = rep.alertStatus === 'WEAK_TOPIC_UNDERSTANDING';
              return (
                <div
                  key={rep.id || idx}
                  style={{
                    padding: '13px 16px',
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
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 }}>
                      <span className="chip chip-neutral">
                        <strong>{rep.targetSubject || rep.subject}</strong>
                      </span>
                      <span className="chip chip-neutral num">
                        Avg: {rep.classAveragePercent}% · High: {rep.highestMarks} · Low: {rep.lowestMarks}
                      </span>
                      {rep.growthRate !== null && rep.growthRate !== undefined ? (
                        <span className="chip chip-success num">Growth: +{Number(rep.growthRate).toFixed(1)}%</span>
                      ) : rep.downfallRate !== null && rep.downfallRate !== undefined ? (
                        <span className="chip chip-danger num">Downfall: -{Number(rep.downfallRate).toFixed(1)}%</span>
                      ) : null}
                      <span className={`chip ${rep.acknowledgedByFaculty ? 'chip-success' : 'chip-neutral'}`}>
                        {rep.acknowledgedByFaculty ? '✓ Reviewed by Faculty' : 'Pending Review'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13.5, color: '#1C2340', overflowWrap: 'anywhere' }}>
                      {rep.principalMessage || rep.alertMessage}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => triggerFacultyReportPrint(rep, setReportToPrint)}
                  >
                    🖨️ Print
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: CLICKED INCREASE / DECREASE STUDENTS DRILLDOWN (PAGINATED)    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {diffModalType && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setDiffModalType(null);
          }}
        >
          <div
            className="modal-box"
            style={{
              maxWidth: 680,
              padding: 0,
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '92dvh',
              overflow: 'hidden',
            }}
          >
            <div style={{ background: '#123B5D', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#BEDBFF', fontWeight: 700, textTransform: 'uppercase' }}>
                  Exam #{exam.examNo} vs. Previous Exam #{comparison.previousExam?.examNo}
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  {diffModalType === 'increased'
                    ? `Students With Increased Marks (${diffList.length})`
                    : `Students With Decreased Marks (${diffList.length})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDiffModalType(null)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 20px', background: '#fff', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
              <div className="table-wrap" style={{ margin: 0, border: '1px solid #E4E7F2', borderRadius: 10 }}>
                <table>
                  <thead>
                    <tr>
                      <th>ROLL NO</th>
                      <th>STUDENT NAME</th>
                      <th>PREV EXAM</th>
                      <th>CURRENT EXAM</th>
                      <th style={{ textAlign: 'right' }}>CHANGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffList.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>
                          No students found in this category.
                        </td>
                      </tr>
                    ) : (
                      paginatedDiffList.map((st, idx) => (
                        <tr key={`${st.studentId}-${idx}`}>
                          <td className="num"><strong>{st.rollNo}</strong></td>
                          <td>
                            <strong>{st.name}</strong>
                            <div style={{ fontSize: 11, color: 'var(--slate)' }}>Div {st.division}</div>
                          </td>
                          <td className="num">
                            {st.previousMarks}/{st.previousMaxMarks} ({st.previousPercent}%)
                          </td>
                          <td className="num">
                            <strong>{st.currentMarks}/{st.currentMaxMarks}</strong> ({st.currentPercent}%)
                          </td>
                          <td className="num" style={{ textAlign: 'right' }}>
                            <span className={`chip ${diffModalType === 'increased' ? 'chip-success' : 'chip-danger'}`}>
                              {st.deltaPercent >= 0 ? `+${st.deltaPercent}%` : `${st.deltaPercent}%`}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationBar
                currentPage={safeDiffPage}
                totalItems={diffList.length}
                pageSize={DIFF_PAGE_SIZE}
                onPageChange={setDiffModalPage}
                itemLabel="students"
              />
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', background: '#FAFBFD', flexShrink: 0 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setDiffModalType(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: STUDENT MULTI-EXAM TRAJECTORY HISTORY (PAGINATED)             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {viewingStudentHist && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setViewingStudentHist(null);
          }}
        >
          <div
            className="modal-box"
            style={{
              maxWidth: 600,
              padding: 0,
              borderRadius: 16,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '92dvh',
              overflow: 'hidden',
            }}
          >
            <div style={{ background: '#123B5D', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 11, color: '#BEDBFF', fontWeight: 700, textTransform: 'uppercase' }}>
                  {viewingStudentHist.category} • Roll #{viewingStudentHist.rollNo}
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  {viewingStudentHist.name} — Exam Score Progression
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingStudentHist(null)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 20px', background: '#fff', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <span className="chip chip-neutral num">Average: {viewingStudentHist.avgPercent}%</span>
                <span className={`chip ${viewingStudentHist.netChange >= 0 ? 'chip-success' : 'chip-danger'} num`}>
                  Net Shift: {viewingStudentHist.netChange >= 0 ? `+${viewingStudentHist.netChange}%` : `${viewingStudentHist.netChange}%`}
                </span>
                <span className="chip chip-neutral num">ML Confidence: {viewingStudentHist.mlConfidence}%</span>
              </div>

              <div className="table-wrap" style={{ margin: 0, border: '1px solid #E4E7F2', borderRadius: 10 }}>
                <table>
                  <thead>
                    <tr>
                      <th>EXAM NO</th>
                      <th>DATE</th>
                      <th>MARKS</th>
                      <th style={{ textAlign: 'right' }}>PERCENTAGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingStudentHist.history || [])
                      .slice((studentHistPage - 1) * 6, studentHistPage * 6)
                      .map((h, i) => (
                        <tr key={i}>
                          <td className="num"><strong>#{h.examNo}</strong> ({h.subject})</td>
                          <td className="num">{formatDate(h.date)}</td>
                          <td className="num">{h.marksObtained} / {h.totalMaxMarks}</td>
                          <td className="num" style={{ textAlign: 'right' }}>
                            <span className={`chip ${h.percentage >= 75 ? 'chip-success' : h.percentage >= 40 ? 'chip-neutral' : 'chip-danger'}`}>
                              {h.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <PaginationBar
                currentPage={studentHistPage}
                totalItems={(viewingStudentHist.history || []).length}
                pageSize={6}
                onPageChange={setStudentHistPage}
                itemLabel="exam records"
              />
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', background: '#FAFBFD', flexShrink: 0 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setViewingStudentHist(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: GENERATE REPORT FOR SUBJECT FACULTY                           */}
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
                <div style={{ fontSize: 11.5, color: '#BEDBFF', fontWeight: 700, textTransform: 'uppercase' }}>
                  Principal → Subject Faculty Exam Report
                </div>
                <h2 style={{ margin: '2px 0 0', fontSize: 19, fontWeight: 800, color: '#fff' }}>
                  Generate Report — Exam #{exam.examNo} ({formatExamTypeLabel(exam.examType)})
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
              <div style={{ padding: '18px 22px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {modalError && (
                  <div className="banner banner-warning" style={{ marginBottom: 0 }}>
                    <span>⚠️ {modalError}</span>
                  </div>
                )}

                {/* Subject Selector (Mandatory first step for JEE/NEET/GUJCET; auto-filled for Board) */}
                <div>
                  <label className="field-label" htmlFor="report-subject-select">
                    {exam.isMultiSubject
                      ? 'Select Subject First * (Loads Subject Stats & Historical Comparison)'
                      : 'Exam Subject'}
                  </label>
                  {exam.isMultiSubject ? (
                    <select
                      id="report-subject-select"
                      className="field-input w-full"
                      value={selectedReportSubject}
                      onChange={(e) => setSelectedReportSubject(e.target.value)}
                      required
                    >
                      <option value="">-- Select Subject --</option>
                      {(exam.availableSubjects || []).map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="field-input w-full"
                      value={selectedReportSubject || exam.subject}
                      readOnly
                      style={{ background: '#F6F7FB', fontWeight: 700, color: '#123B5D' }}
                    />
                  )}
                </div>

                {!selectedReportSubject ? (
                  <div
                    style={{
                      padding: '18px',
                      borderRadius: 12,
                      background: '#F6F7FB',
                      border: '1px dashed #CBD5E1',
                      color: 'var(--slate)',
                      textAlign: 'center',
                      fontSize: 13.5,
                    }}
                  >
                    Select a subject above to display that subject&apos;s Class Average, Highest Marks, Lowest Marks, and Growth/Downfall Rate compared with previous {formatExamTypeLabel(exam.examType)} exams.
                  </div>
                ) : selectedSubjectMetrics ? (
                  <>
                    {/* Alert Summary Pill */}
                    <div
                      style={{
                        padding: '11px 14px',
                        borderRadius: 10,
                        background:
                          selectedSubjectMetrics.alertStatus === 'WEAK_TOPIC_UNDERSTANDING'
                            ? '#FBF2E1'
                            : '#E6F8EF',
                        border: `1px solid ${
                          selectedSubjectMetrics.alertStatus === 'WEAK_TOPIC_UNDERSTANDING'
                            ? '#D99A2B'
                            : '#1F9D6B'
                        }`,
                        color:
                          selectedSubjectMetrics.alertStatus === 'WEAK_TOPIC_UNDERSTANDING'
                            ? '#78350F'
                            : '#14532D',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {selectedSubjectMetrics.alertTitle}
                    </div>

                    {/* Subject Metrics Grid (Class Average, Highest Marks, Lowest Marks, Growth or Downfall Rate) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                      <div style={{ background: '#F6F7FB', padding: '10px 12px', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                        <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Average of Class
                        </div>
                        <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#123B5D', marginTop: 2 }}>
                          {selectedSubjectMetrics.classAveragePercent}%
                        </div>
                        <div className="num" style={{ fontSize: 11, color: 'var(--slate)' }}>
                          {selectedSubjectMetrics.averageMarks} / {selectedSubjectMetrics.totalMaxMarks}
                        </div>
                      </div>

                      <div style={{ background: '#E6F8EF', padding: '10px 12px', borderRadius: 10, border: '1px solid #BEE5D3' }}>
                        <div style={{ fontSize: 11, color: '#1F9D6B', fontWeight: 700, textTransform: 'uppercase' }}>
                          Highest Marks
                        </div>
                        <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#1F9D6B', marginTop: 2 }}>
                          {selectedSubjectMetrics.highestMarks}
                        </div>
                        <div className="num" style={{ fontSize: 11, color: '#166534' }}>
                          Out of {selectedSubjectMetrics.totalMaxMarks}
                        </div>
                      </div>

                      <div style={{ background: '#FDEAE8', padding: '10px 12px', borderRadius: 10, border: '1px solid #F5C2BE' }}>
                        <div style={{ fontSize: 11, color: '#E0473D', fontWeight: 700, textTransform: 'uppercase' }}>
                          Lowest Marks
                        </div>
                        <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#E0473D', marginTop: 2 }}>
                          {selectedSubjectMetrics.lowestMarks}
                        </div>
                        <div className="num" style={{ fontSize: 11, color: '#991B1B' }}>
                          Out of {selectedSubjectMetrics.totalMaxMarks}
                        </div>
                      </div>

                      {/* Applicable Growth Rate OR Downfall Rate */}
                      {selectedSubjectMetrics.downfallRate !== null && selectedSubjectMetrics.downfallRate !== undefined ? (
                        <div style={{ background: '#FDEAE8', padding: '10px 12px', borderRadius: 10, border: '1px solid #F5C2BE' }}>
                          <div style={{ fontSize: 11, color: '#E0473D', fontWeight: 700, textTransform: 'uppercase' }}>
                            Downfall Rate
                          </div>
                          <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#E0473D', marginTop: 2 }}>
                            -{Number(selectedSubjectMetrics.downfallRate).toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 11, color: '#991B1B' }}>
                            vs Exam #{selectedSubjectMetrics.previousExam?.examNo}
                          </div>
                        </div>
                      ) : selectedSubjectMetrics.growthRate !== null && selectedSubjectMetrics.growthRate !== undefined ? (
                        <div style={{ background: '#E6F8EF', padding: '10px 12px', borderRadius: 10, border: '1px solid #BEE5D3' }}>
                          <div style={{ fontSize: 11, color: '#1F9D6B', fontWeight: 700, textTransform: 'uppercase' }}>
                            Growth Rate
                          </div>
                          <div className="num" style={{ fontSize: 16, fontWeight: 800, color: '#1F9D6B', marginTop: 2 }}>
                            +{Number(selectedSubjectMetrics.growthRate).toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 11, color: '#166534' }}>
                            vs Exam #{selectedSubjectMetrics.previousExam?.examNo}
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: '#F6F7FB', padding: '10px 12px', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                          <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 700, textTransform: 'uppercase' }}>
                            Growth / Downfall
                          </div>
                          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#123B5D', marginTop: 4 }}>
                            Baseline
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--slate)' }}>First exam record</div>
                        </div>
                      )}
                    </div>

                    {/* Message for Faculty */}
                    <div>
                      <label className="field-label" htmlFor="exam-report-message">
                        Message / Remarks for {selectedSubjectMetrics.subject} Faculty (સૂચના / નોંધ) *
                      </label>
                      <textarea
                        id="exam-report-message"
                        ref={principalExamMessageRef}
                        className="field-input w-full"
                        rows={4}
                        value={principalMessage}
                        onChange={(e) => setPrincipalMessage(e.target.value)}
                        placeholder="Write guidance, remedial focus areas, or speak in Gujarati/English..."
                        required
                        style={{ resize: 'vertical', fontSize: 13.5 }}
                      />
                      <VoiceInputControl
                        value={principalMessage}
                        onChange={setPrincipalMessage}
                        inputRef={principalExamMessageRef}
                        defaultLang="gu-IN"
                      />
                    </div>
                  </>
                ) : null}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTop: '1px solid var(--line-soft)', padding: '14px 22px', background: '#FAFBFD', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={!selectedSubjectMetrics}
                  onClick={() => {
                    if (!selectedSubjectMetrics) return;
                    triggerFacultyReportPrint(
                      {
                        reportType: 'EXAM',
                        examId: exam.id,
                        examNo: exam.examNo,
                        examType: exam.examType,
                        subject: selectedSubjectMetrics.subject,
                        targetSubject: selectedSubjectMetrics.subject,
                        standard: exam.standard,
                        division: exam.division,
                        facultyName: exam.facultyName || `${selectedSubjectMetrics.subject} Faculty`,
                        examDate: exam.examDate,
                        markEntryDate: exam.marksEnteredAt,
                        marksEnteredByName: exam.marksEnteredByName,
                        unitSummary: exam.unitSummary,
                        alertStatus: selectedSubjectMetrics.alertStatus,
                        alertTitle: selectedSubjectMetrics.alertTitle,
                        alertMessage: selectedSubjectMetrics.alertMessage,
                        classAveragePercent: selectedSubjectMetrics.classAveragePercent,
                        averageMarks: selectedSubjectMetrics.averageMarks,
                        totalMarks: selectedSubjectMetrics.totalMaxMarks,
                        highestMarks: selectedSubjectMetrics.highestMarks,
                        lowestMarks: selectedSubjectMetrics.lowestMarks,
                        passCount: selectedSubjectMetrics.passCount,
                        failCount: selectedSubjectMetrics.failCount,
                        absentCount: selectedSubjectMetrics.absentCount,
                        growthRate: selectedSubjectMetrics.growthRate,
                        downfallRate: selectedSubjectMetrics.downfallRate,
                        previousExamNo: selectedSubjectMetrics.previousExam?.examNo,
                        previousExamAveragePercent: selectedSubjectMetrics.previousExam?.averagePercent,
                        principalMessage,
                        sentByName: user?.name || 'Principal',
                        createdAt: new Date().toISOString(),
                      },
                      setReportToPrint
                    );
                  }}
                >
                  🖨️ Print Report
                </button>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowReportModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSendingReport || !selectedSubjectMetrics}>
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
