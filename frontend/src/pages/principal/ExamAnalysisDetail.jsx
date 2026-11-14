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
import {
  Clock,
  HelpCircle,
  Award,
  Send,
  ArrowLeft,
  Gauge,
  Scale,
  TrendingDown,
  TrendingUp,
  Hourglass,
  CheckCircle2,
  SkipForward,
  ListOrdered,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  ShieldAlert,
  BarChart3,
  BookOpen,
  Printer,
  Sparkles,
  Search,
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [feedbackBanner, setFeedbackBanner] = useState(null);
  const [isRetraining, setIsRetraining] = useState(false);

  // New sub-tabs and filters for CBT Analysis, Subject Wise & Faculty Report
  const [selectedSubjectTab, setSelectedSubjectTab] = useState('Physics');
  const [facultyReportSubjFilter, setFacultyReportSubjFilter] = useState('ALL');
  const [questionsSearch, setQuestionsSearch] = useState('');
  const [facultyQuestionsSearch, setFacultyQuestionsSearch] = useState('');
  const [subjectStudentSearch, setSubjectStudentSearch] = useState('');
  const [questionsPage, setQuestionsPage] = useState(1);
  const [facultyQuestionsPage, setFacultyQuestionsPage] = useState(1);
  const [subjectStudentPage, setSubjectStudentPage] = useState(1);
  const QUESTIONS_PAGE_SIZE = 10;
  const SUBJ_STUDENT_PAGE_SIZE = 8;

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

  // CBT Analysis Data (Photo 1, Subject-Wise, Faculty Report)
  const cbtAnalysis = analysis?.cbtAnalysis;
  const cbtExam = cbtAnalysis?.exam || exam;
  const cbtStats = cbtAnalysis?.analytics || {};
  const cbtStudents =
    cbtAnalysis?.students && cbtAnalysis.students.length > 0
      ? cbtAnalysis.students
      : (leaderboard || []);
  const cbtQuestions = cbtAnalysis?.questions || [];
  const subjectWiseMetrics = cbtAnalysis?.subjectWiseMetrics || {};
  const questionWiseReport =
    cbtAnalysis?.questionWiseReport && cbtAnalysis.questionWiseReport.length > 0
      ? cbtAnalysis.questionWiseReport
      : (cbtQuestions || []);

  const formatSeconds = (sec) => {
    if (!sec) return '00m 00s';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // Available subjects for the Subject-Wise tab
  const availableSubjectKeys = useMemo(() => {
    const keys = Object.keys(subjectWiseMetrics || {});
    if (keys.length > 0) return keys;
    if (cbtExam?.subjects && cbtExam.subjects.length > 0) return cbtExam.subjects;
    if (exam?.examType === 'JEE') return ['Physics', 'Chemistry', 'Maths'];
    if (exam?.examType === 'NEET') return ['Physics', 'Chemistry', 'Biology'];
    if (exam?.examType === 'GUJCET') return ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
    return [exam?.subject || 'Physics'];
  }, [subjectWiseMetrics, cbtExam, exam]);

  useEffect(() => {
    if (availableSubjectKeys.length > 0 && !availableSubjectKeys.includes(selectedSubjectTab)) {
      setSelectedSubjectTab(availableSubjectKeys[0]);
    }
  }, [availableSubjectKeys, selectedSubjectTab]);

  // Active subject metrics for Subject-Wise tab
  const activeSubjectData = useMemo(() => {
    if (subjectWiseMetrics && subjectWiseMetrics[selectedSubjectTab]) {
      return subjectWiseMetrics[selectedSubjectTab];
    }
    const matchedKey = Object.keys(subjectWiseMetrics || {}).find(
      (k) => k.toLowerCase() === selectedSubjectTab.toLowerCase()
    );
    if (matchedKey && subjectWiseMetrics[matchedKey]) return subjectWiseMetrics[matchedKey];

    // Fallback computed from students
    const subStudents = cbtStudents.map((st) => {
      const sm = (st.subjectMarks || []).find(
        (s) => s.subject.toLowerCase() === selectedSubjectTab.toLowerCase()
      );
      const marks = sm
        ? sm.marksObtained
        : Math.round(((st.score || st.marksObtained || 0) / (availableSubjectKeys.length || 1)) * 10) / 10;
      const maxM = sm
        ? sm.totalMarks
        : Math.round((cbtExam.totalMarks || 100) / (availableSubjectKeys.length || 1));
      const pct = maxM > 0 ? Math.round((marks / maxM) * 100 * 10) / 10 : 0;
      return {
        rollNo: st.rollNo,
        name: st.name,
        marks,
        maxMarks: maxM,
        percentage: pct,
        accuracy: pct,
        timeSpentSeconds: Math.round((st.timeSpentSeconds || 3600) / (availableSubjectKeys.length || 1)),
        status: st.status || (st.ab ? 'ABSENT' : 'SUBMITTED'),
      };
    });

    const marksList = subStudents.map((s) => s.marks);
    const avgScore =
      marksList.length > 0 ? Math.round((marksList.reduce((a, b) => a + b, 0) / marksList.length) * 10) / 10 : 0;
    const maxMarks = Math.round((cbtExam.totalMarks || 100) / (availableSubjectKeys.length || 1));
    const avgPct = maxMarks > 0 ? Math.round((avgScore / maxMarks) * 100 * 10) / 10 : 0;

    return {
      subject: selectedSubjectTab,
      totalQuestions: Math.round((cbtExam.totalMarks || 100) / ((availableSubjectKeys.length || 1) * 4)),
      maxMarks,
      averageScore: avgScore,
      averagePercentage: avgPct,
      highestScore: marksList.length > 0 ? Math.max(...marksList) : 0,
      lowestScore: marksList.length > 0 ? Math.min(...marksList) : 0,
      overallAccuracy: avgPct,
      avgResponseTimeSeconds: 65,
      growthRate: comparison.growthRate || 0,
      isGrowth: (comparison.growthRate || 0) >= 0,
      previousExamAverage: comparison.previousAveragePercent || avgPct,
      studentList: subStudents,
    };
  }, [subjectWiseMetrics, selectedSubjectTab, cbtStudents, availableSubjectKeys, cbtExam, comparison]);

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

  // ── CBT Overview Chart Data (Photo 1) ──
  const statusCounts = cbtStats.statusCounts || {
    submitted:
      cbtStudents.filter((s) => s.status === 'SUBMITTED').length || overview.presentCount || 0,
    disqualified: cbtStudents.filter((s) => s.status === 'DISQUALIFIED').length,
    started: cbtStudents.filter((s) => s.status === 'IN_PROGRESS').length,
    absent:
      overview.absentCount ||
      cbtStudents.filter((s) => s.status === 'ABSENT' || s.ab).length ||
      0,
  };

  const totalCbtTakers =
    (statusCounts.submitted || 0) +
    (statusCounts.disqualified || 0) +
    (statusCounts.started || 0) +
    (statusCounts.absent || 0);

  const cbtDonutData = {
    labels: ['Submitted', 'Disqualified', 'Started', 'Absent'],
    datasets: [
      {
        data: [
          statusCounts.submitted || 0,
          statusCounts.disqualified || 0,
          statusCounts.started || 0,
          statusCounts.absent || 0,
        ],
        backgroundColor: ['#10B981', '#EF4444', '#F59E0B', '#9CA3AF'],
        hoverBackgroundColor: ['#059669', '#DC2626', '#D97706', '#6B7280'],
        borderWidth: 2,
        cutout: '72%',
      },
    ],
  };

  const cbtDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.raw} students`,
        },
      },
    },
  };

  const cbtScoreDistribution = cbtStats.scoreDistribution || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const maxHistVal = Math.max(...cbtScoreDistribution, 5);

  const cbtHistData = {
    labels: ['0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'],
    datasets: [
      {
        label: 'Number of Students',
        data: cbtScoreDistribution,
        backgroundColor: '#0F2850',
        borderRadius: 4,
        barPercentage: 0.8,
      },
    ],
  };

  const cbtHistOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw} Students`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: Math.ceil(maxHistVal * 1.2),
        ticks: { stepSize: Math.max(1, Math.ceil(maxHistVal / 4)), color: '#64748B', font: { size: 11 } },
        grid: { color: '#E2E8F0', drawBorder: false },
        title: {
          display: true,
          text: 'Number of Students',
          color: '#64748B',
          font: { size: 11 },
        },
      },
      x: {
        ticks: { color: '#64748B', font: { size: 10 } },
        grid: { display: false },
        title: {
          display: true,
          text: 'Score Range',
          color: '#64748B',
          font: { size: 11 },
        },
      },
    },
  };

  // Print Handler for Faculty Diagnostic Report
  const handlePrintFacultyReport = () => {
    const questionsToPrint =
      facultyReportSubjFilter === 'ALL'
        ? questionWiseReport
        : questionWiseReport.filter(
            (q) => q.subject && q.subject.toLowerCase() === facultyReportSubjFilter.toLowerCase()
          );

    const facultyReportPayload = {
      reportType: 'EXAM',
      examId: exam.id || exam._id,
      examNo: exam.examNo,
      examType: exam.examType,
      subject: exam.subject,
      targetSubject: facultyReportSubjFilter === 'ALL' ? exam.subject : facultyReportSubjFilter,
      standard: exam.standard,
      standardLabel: exam.standardLabel,
      division: exam.division,
      examDate: exam.examDate,
      durationMinutes: cbtExam.durationMinutes || 60,
      totalMarks: cbtExam.totalMarks || exam.totalMarks || 100,
      classAveragePercent:
        cbtStats.averageScore !== undefined ? cbtStats.averageScore : overview.classAveragePercent || 0,
      averageMarks:
        overview.averageMarks ||
        Math.round(((cbtStats.averageScore || 0) * (exam.totalMarks || 100)) / 100),
      highestMarks:
        cbtStats.highestScore !== undefined
          ? Math.round((cbtStats.highestScore / 100) * (exam.totalMarks || 100))
          : overview.highestMarks,
      lowestMarks:
        cbtStats.lowestScore !== undefined
          ? Math.round((cbtStats.lowestScore / 100) * (exam.totalMarks || 100))
          : overview.lowestMarks,
      growthRate: comparison.growthRate,
      downfallRate: comparison.downfallRate,
      previousExamNo: comparison.previousExam?.examNo,
      previousExamAveragePercent: comparison.previousAveragePercent,
      questions: questionsToPrint,
      principalMessage:
        principalMessage ||
        `Diagnostic analysis and question report for Exam #${exam.examNo} (${formatExamTypeLabel(exam.examType)}).`,
      sentByName: user?.name || 'Principal',
      createdAt: new Date(),
    };

    triggerFacultyReportPrint(facultyReportPayload, setReportToPrint);
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

      {/* Photo 1 Header Card */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A' }}>
              Exam #{exam.examNo} — {exam.subject}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <span className="cbt-meta-chip">
                <Clock size={14} className="text-slate-500" />
                <span>{cbtExam.durationMinutes || exam.durationMinutes || 60} Minutes</span>
              </span>
              <span className="cbt-meta-chip">
                <HelpCircle size={14} className="text-slate-500" />
                <span>{questionWiseReport.length || cbtExam.questionsCount || 45} Questions</span>
              </span>
              <span className="cbt-meta-chip">
                <Award size={14} className="text-slate-500" />
                <span>{cbtExam.totalMarks || exam.totalMarks || 100} Marks</span>
              </span>
              <span className="cbt-meta-chip">
                <span className="font-semibold text-slate-700">Type:</span>
                <span>{formatExamTypeLabel(exam.examType)}</span>
              </span>
              <span className="cbt-meta-chip">
                <span className="font-semibold text-slate-700">Class:</span>
                <span>{exam.standardLabel}{exam.division !== 'ALL' ? ` · Div ${exam.division}` : ''}</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="cbt-result-published-badge">
              <Send size={13} />
              <span>Result Published</span>
            </span>
          </div>
        </div>
      </div>

      {/* 6 Tabs Bar */}
      <div className="tabs" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 6 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={15} style={{ marginRight: 6, display: 'inline' }} />
          Overview
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'leaderboard' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <Users size={15} style={{ marginRight: 6, display: 'inline' }} />
          Students ({cbtStudents.length || leaderboard.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'questions' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          <HelpCircle size={15} style={{ marginRight: 6, display: 'inline' }} />
          Questions Analysis ({questionWiseReport.length || cbtQuestions.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'subject-wise' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('subject-wise')}
        >
          <BookOpen size={15} style={{ marginRight: 6, display: 'inline' }} />
          Subject Wise Analysis
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'faculty-report' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('faculty-report')}
        >
          <FileSpreadsheet size={15} style={{ marginRight: 6, display: 'inline' }} />
          Generate Report for Faculty
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'performance' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          <TrendingUp size={15} style={{ marginRight: 6, display: 'inline' }} />
          Performance &amp; Tracking
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: OVERVIEW (Photo 1 exact layout)                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top 4 Score Metric Cards matching Photo 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Average Score */}
            <div className="cbt-kpi-card">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Average Score</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#059669', background: '#ecfdf5' }}>
                  <Gauge size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-emerald-600">
                {cbtStats.averageScore !== undefined
                  ? `${cbtStats.averageScore}%`
                  : `${overview.classAveragePercent || 0}%`}
              </div>
              <div className="cbt-kpi-subtext">Class average percentage</div>
            </div>

            {/* Median Score */}
            <div className="cbt-kpi-card">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Median Score</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#059669', background: '#ecfdf5' }}>
                  <Scale size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-emerald-600">
                {cbtStats.medianScore !== undefined ? `${cbtStats.medianScore}%` : `${overview.classAveragePercent || 0}%`}
              </div>
              <div className="cbt-kpi-subtext">Typical score of a student</div>
            </div>

            {/* Lowest Score */}
            <div className="cbt-kpi-card">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Lowest Score</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#059669', background: '#ecfdf5' }}>
                  <TrendingDown size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-emerald-600">
                {cbtStats.lowestScore !== undefined
                  ? `${cbtStats.lowestScore}%`
                  : overview.lowestMarks !== undefined
                    ? `${Math.round(((overview.lowestMarks) / (overview.totalMaxMarks || 100)) * 100)}%`
                    : '0%'}
              </div>
              <div className="cbt-kpi-subtext">Lowest score obtained by a student</div>
            </div>

            {/* Highest Score */}
            <div className="cbt-kpi-card">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Highest Score</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#059669', background: '#ecfdf5' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-emerald-600">
                {cbtStats.highestScore !== undefined
                  ? `${cbtStats.highestScore}%`
                  : overview.highestMarks !== undefined
                    ? `${Math.round(((overview.highestMarks) / (overview.totalMaxMarks || 100)) * 100)}%`
                    : '0%'}
              </div>
              <div className="cbt-kpi-subtext">Highest score obtained by a student</div>
            </div>
          </div>

          {/* Middle Section: Donut Chart on Left, Histogram on Right (Photo 1) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Donut Chart (Left, 4 columns) */}
            <div className="lg:col-span-4 cbt-chart-box">
              <div className="cbt-donut-wrap">
                <Doughnut data={cbtDonutData} options={cbtDonutOptions} />
                <div className="cbt-donut-center">
                  <div className="cbt-donut-center-num">{totalCbtTakers}</div>
                  <div className="cbt-donut-center-lbl">Students</div>
                </div>
              </div>

              {/* Donut Legend matching Photo 1 */}
              <div className="cbt-donut-legend">
                <div className="cbt-legend-item">
                  <span className="cbt-legend-dot" style={{ backgroundColor: '#10B981' }}></span>
                  <span>Submitted ({statusCounts.submitted || 0})</span>
                </div>
                <div className="cbt-legend-item">
                  <span className="cbt-legend-dot" style={{ backgroundColor: '#EF4444' }}></span>
                  <span>Disqualified ({statusCounts.disqualified || 0})</span>
                </div>
                <div className="cbt-legend-item">
                  <span className="cbt-legend-dot" style={{ backgroundColor: '#F59E0B' }}></span>
                  <span>Started ({statusCounts.started || 0})</span>
                </div>
                <div className="cbt-legend-item">
                  <span className="cbt-legend-dot" style={{ backgroundColor: '#9CA3AF' }}></span>
                  <span>Absent ({statusCounts.absent || 0})</span>
                </div>
              </div>
            </div>

            {/* Histogram Bar Chart (Right, 8 columns) */}
            <div className="lg:col-span-8 cbt-chart-box relative">
              <div className="h-64 md:h-72">
                <Bar data={cbtHistData} options={cbtHistOptions} />
              </div>
              {/* Mean and Median Marker Badges */}
              <div className="cbt-histogram-marker-labels">
                <span className="cbt-marker-mean">
                  Mean: {cbtStats.averageScore ?? overview.classAveragePercent ?? 0}%
                </span>
                <span className="cbt-marker-median">
                  Median: {cbtStats.medianScore ?? overview.classAveragePercent ?? 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Time Statistics Row matching Photo 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Average Time */}
            <div className="cbt-kpi-card cbt-kpi-card-blue">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Average Time</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#2563eb', background: '#eff6ff' }}>
                  <Clock size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-blue-600">
                {formatSeconds(cbtStats.averageTimeSeconds || (exam.durationMinutes || 60) * 45)}
              </div>
              <div className="cbt-kpi-subtext">Average completion time</div>
            </div>

            {/* Median Time */}
            <div className="cbt-kpi-card cbt-kpi-card-blue">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Median Time</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#2563eb', background: '#eff6ff' }}>
                  <Hourglass size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-blue-600">
                {formatSeconds(cbtStats.medianTimeSeconds || (exam.durationMinutes || 60) * 40)}
              </div>
              <div className="cbt-kpi-subtext">Typical time taken by a student</div>
            </div>

            {/* Time Utilization */}
            <div className="cbt-kpi-card cbt-kpi-card-blue">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Time Utilization</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#2563eb', background: '#eff6ff' }}>
                  <Gauge size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-blue-600">
                {cbtStats.timeUtilization !== undefined ? `${cbtStats.timeUtilization}%` : '85%'}
              </div>
              <div className="cbt-kpi-subtext">Percentage of allotted time used</div>
            </div>
          </div>

          {/* Attempt & Skipping Statistics Row matching Photo 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Avg Questions Attempted */}
            <div className="cbt-kpi-card">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Avg Questions Attempted</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#4f46e5', background: '#eef2ff' }}>
                  <ListOrdered size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-indigo-700">
                {cbtStats.avgQuestionsAttempted || Math.round((exam.totalMarks || 100) / 4)} /{' '}
                {questionWiseReport.length || cbtExam.questionsCount || Math.round((exam.totalMarks || 100) / 4)}
              </div>
              <div className="cbt-kpi-subtext">Average number of questions attempted</div>
            </div>

            {/* Full Completion Rate */}
            <div className="cbt-kpi-card cbt-kpi-card-amber">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Full Completion Rate</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#d97706', background: '#fffbeb' }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-amber-600">
                {cbtStats.fullCompletionRate !== undefined ? `${cbtStats.fullCompletionRate}%` : `${overview.passRatePercent || 80}%`}
              </div>
              <div className="cbt-kpi-subtext">Students who attempted all questions</div>
            </div>

            {/* Skipped Question Rate */}
            <div className="cbt-kpi-card cbt-kpi-card-emerald">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Skipped Question Rate</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#059669', background: '#ecfdf5' }}>
                  <SkipForward size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-emerald-600">
                {cbtStats.skippedQuestionRate !== undefined ? `${cbtStats.skippedQuestionRate}%` : '4.5%'}
              </div>
              <div className="cbt-kpi-subtext">Percentage of questions left unanswered</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: QUESTIONS ANALYSIS (Photo 1 Questions Tab)                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'questions' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="card__title">Question-by-Question Deep Analysis</div>
              <div className="card__desc">Attended count, skipped count, right answers, wrong answers, and accuracy per question</div>
            </div>
            <div style={{ minWidth: 220, flex: '0 1 280px' }}>
              <input
                type="text"
                className="field-input w-full"
                placeholder="🔍 Search question statement..."
                value={questionsSearch}
                onChange={(e) => {
                  setQuestionsSearch(e.target.value);
                  setQuestionsPage(1);
                }}
              />
            </div>
          </div>

          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Q. NO</th>
                  <th style={{ width: 95 }}>SUBJECT</th>
                  <th>QUESTION STATEMENT</th>
                  <th style={{ textAlign: 'center' }}>ATTENDED</th>
                  <th style={{ textAlign: 'center' }}>NOT ATTENDED (SKIPPED)</th>
                  <th style={{ textAlign: 'center' }}>RIGHT ANSWER</th>
                  <th style={{ textAlign: 'center' }}>WRONG ANSWER</th>
                  <th style={{ textAlign: 'right' }}>ACCURACY</th>
                </tr>
              </thead>
              <tbody>
                {questionWiseReport.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No question-level analysis records available. Questions will be extracted automatically upon CBT exam evaluation.
                    </td>
                  </tr>
                ) : (
                  questionWiseReport
                    .filter((q) => {
                      if (!questionsSearch) return true;
                      const term = questionsSearch.toLowerCase();
                      return (
                        String(q.questionNo || '').includes(term) ||
                        String(q.questionText || '').toLowerCase().includes(term) ||
                        String(q.subject || '').toLowerCase().includes(term)
                      );
                    })
                    .slice((questionsPage - 1) * QUESTIONS_PAGE_SIZE, questionsPage * QUESTIONS_PAGE_SIZE)
                    .map((q, idx) => {
                      const acc = q.accuracy !== undefined ? q.accuracy : 0;
                      return (
                        <tr key={q.id || idx}>
                          <td className="num font-bold">Q{q.questionNo || idx + 1}</td>
                          <td>
                            <span className="cbt-subject-tag text-xs font-semibold">{q.subject}</span>
                          </td>
                          <td style={{ maxWidth: 360 }}>
                            <div style={{ fontWeight: 600, color: '#1E293B', fontSize: 13, marginBottom: 2 }}>
                              {q.questionText}
                            </div>
                            {q.questionTextGujarati && (
                              <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>{q.questionTextGujarati}</div>
                            )}
                          </td>
                          <td className="num font-semibold" style={{ textAlign: 'center' }}>{q.attemptCount || 0}</td>
                          <td className="num" style={{ textAlign: 'center', color: '#64748B' }}>{q.skipCount || 0}</td>
                          <td className="num font-bold" style={{ textAlign: 'center', color: '#059669' }}>
                            ✓ {q.correctCount || 0}
                          </td>
                          <td className="num font-bold" style={{ textAlign: 'center', color: '#DC2626' }}>
                            ✕ {q.wrongCount || 0}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span className="font-bold text-xs num">{acc}%</span>
                              <div style={{ width: 48, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${acc}%`,
                                    height: '100%',
                                    backgroundColor: acc >= 70 ? '#10B981' : acc >= 40 ? '#F59E0B' : '#EF4444',
                                  }}
                                />
                              </div>
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
            currentPage={questionsPage}
            totalItems={
              questionWiseReport.filter((q) => {
                if (!questionsSearch) return true;
                const term = questionsSearch.toLowerCase();
                return (
                  String(q.questionNo || '').includes(term) ||
                  String(q.questionText || '').toLowerCase().includes(term) ||
                  String(q.subject || '').toLowerCase().includes(term)
                );
              }).length
            }
            pageSize={QUESTIONS_PAGE_SIZE}
            onPageChange={setQuestionsPage}
            itemLabel="questions"
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: SUBJECT WISE ANALYSIS (Requirement 1)                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'subject-wise' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Subject Selector Bar */}
          <div className="card" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase' }}>
                  SELECT SUBJECT FOR DEEP DRILL-DOWN:
                </span>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1C2340', marginTop: 2 }}>
                  Class Analytics &amp; Accuracy for {selectedSubjectTab}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {availableSubjectKeys.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    className={`btn btn-sm ${selectedSubjectTab.toLowerCase() === sub.toLowerCase() ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => {
                      setSelectedSubjectTab(sub);
                      setSubjectStudentPage(1);
                    }}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subject Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Subject Average */}
            <div className="cbt-kpi-card">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Class Average ({selectedSubjectTab})</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#059669', background: '#ecfdf5' }}>
                  <Gauge size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-emerald-600">
                {activeSubjectData.averagePercentage}%
              </div>
              <div className="cbt-kpi-subtext">
                Mean: {activeSubjectData.averageScore} / {activeSubjectData.maxMarks} marks
              </div>
            </div>

            {/* Highest Marks */}
            <div className="cbt-kpi-card">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Highest Score ({selectedSubjectTab})</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#059669', background: '#ecfdf5' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-emerald-600">
                {activeSubjectData.highestScore} <span className="text-xs font-normal text-slate-400">/ {activeSubjectData.maxMarks}</span>
              </div>
              <div className="cbt-kpi-subtext">Highest marks achieved in {selectedSubjectTab}</div>
            </div>

            {/* Lowest Marks */}
            <div className="cbt-kpi-card">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Lowest Score ({selectedSubjectTab})</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#dc2626', background: '#fef2f2' }}>
                  <TrendingDown size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-red-600">
                {activeSubjectData.lowestScore} <span className="text-xs font-normal text-slate-400">/ {activeSubjectData.maxMarks}</span>
              </div>
              <div className="cbt-kpi-subtext">Lowest marks obtained in {selectedSubjectTab}</div>
            </div>

            {/* Comparison vs Previous Week / Exam */}
            <div className="cbt-kpi-card">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Vs Previous Week Result</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#2563eb', background: '#eff6ff' }}>
                  <Scale size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value">
                {activeSubjectData.growthRate >= 0 ? (
                  <span className="text-emerald-600">+{activeSubjectData.growthRate}%</span>
                ) : (
                  <span className="text-red-600">{activeSubjectData.growthRate}%</span>
                )}
              </div>
              <div className="cbt-kpi-subtext">
                {activeSubjectData.isGrowth ? 'Growth rate vs previous exam' : 'Downfall rate vs previous exam'} (Prev: {activeSubjectData.previousExamAverage}%)
              </div>
            </div>
          </div>

          {/* Timing & Accuracy Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="cbt-kpi-card cbt-kpi-card-blue">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Average Response Time ({selectedSubjectTab})</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#2563eb', background: '#eff6ff' }}>
                  <Clock size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-blue-600">
                {formatSeconds(activeSubjectData.avgResponseTimeSeconds)}
              </div>
              <div className="cbt-kpi-subtext">Average time spent per question in {selectedSubjectTab}</div>
            </div>

            <div className="cbt-kpi-card cbt-kpi-card-emerald">
              <div className="cbt-kpi-top">
                <span className="cbt-kpi-label">Overall Subject Accuracy ({selectedSubjectTab})</span>
                <div className="cbt-kpi-icon-wrap" style={{ color: '#059669', background: '#ecfdf5' }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="cbt-kpi-value text-emerald-600">
                {activeSubjectData.overallAccuracy}%
              </div>
              <div className="cbt-kpi-subtext">Percentage of attended questions answered correctly</div>
            </div>
          </div>

          {/* Student List for this Subject */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="card__title">Student Scores &amp; Accuracy — {selectedSubjectTab}</div>
                <div className="card__desc">Individual student performance and accuracy in {selectedSubjectTab}</div>
              </div>
              <div style={{ minWidth: 220, flex: '0 1 260px' }}>
                <input
                  type="text"
                  className="field-input w-full"
                  placeholder={`Search ${selectedSubjectTab} students...`}
                  value={subjectStudentSearch}
                  onChange={(e) => {
                    setSubjectStudentSearch(e.target.value);
                    setSubjectStudentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>RANK</th>
                    <th style={{ width: 85 }}>ROLL NO</th>
                    <th>STUDENT NAME</th>
                    <th>MARKS ({selectedSubjectTab})</th>
                    <th>PERCENTAGE</th>
                    <th>ACCURACY</th>
                    <th>TIME SPENT</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeSubjectData.studentList || [])
                    .filter((st) => {
                      if (!subjectStudentSearch) return true;
                      const q = subjectStudentSearch.toLowerCase();
                      return String(st.rollNo).includes(q) || String(st.name || '').toLowerCase().includes(q);
                    })
                    .slice((subjectStudentPage - 1) * SUBJ_STUDENT_PAGE_SIZE, subjectStudentPage * SUBJ_STUDENT_PAGE_SIZE)
                    .map((st, i) => (
                      <tr key={i}>
                        <td className="num font-bold">#{(subjectStudentPage - 1) * SUBJ_STUDENT_PAGE_SIZE + i + 1}</td>
                        <td className="num font-semibold">#{st.rollNo}</td>
                        <td>
                          <strong>{st.name}</strong>
                        </td>
                        <td className="num">
                          <strong className="text-blue-700">{st.marks}</strong>{' '}
                          <span style={{ fontSize: 11.5, color: 'var(--slate)' }}>/ {st.maxMarks}</span>
                        </td>
                        <td className="num font-bold">{st.percentage}%</td>
                        <td>
                          <span
                            className={`chip ${
                              st.accuracy >= 70
                                ? 'chip-success'
                                : st.accuracy >= 40
                                  ? 'chip-warning'
                                  : 'chip-danger'
                            }`}
                          >
                            {st.accuracy}%
                          </span>
                        </td>
                        <td className="num" style={{ fontSize: 12 }}>{formatSeconds(st.timeSpentSeconds)}</td>
                        <td>
                          <span className={`chip ${st.status === 'SUBMITTED' ? 'chip-success' : st.status === 'DISQUALIFIED' ? 'chip-danger' : 'chip-neutral'}`}>
                            {st.status || 'SUBMITTED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={subjectStudentPage}
              totalItems={
                (activeSubjectData.studentList || []).filter((st) => {
                  if (!subjectStudentSearch) return true;
                  const q = subjectStudentSearch.toLowerCase();
                  return String(st.rollNo).includes(q) || String(st.name || '').toLowerCase().includes(q);
                }).length
              }
              pageSize={SUBJ_STUDENT_PAGE_SIZE}
              onPageChange={setSubjectStudentPage}
              itemLabel="students"
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: GENERATE REPORT FOR FACULTY (Requirement 2)                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'faculty-report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Action Bar */}
          <div className="card" style={{ padding: '16px 20px', background: '#F8FAFC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1C2340' }}>
                  Faculty Examination Handover &amp; Diagnostic Report
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--slate)', marginTop: 2 }}>
                  Official evaluation report containing question statements, options A-D, right answer keys, attendance, and response time
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                  onClick={handlePrintFacultyReport}
                >
                  <Printer size={15} />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={openGenerateReportModal}
                >
                  ✉️ Send to Faculty Handover Tab
                </button>
              </div>
            </div>
          </div>

          {/* Exam Details & Summary Card */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 pb-4 border-b border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Exam Name &amp; No:</span>
                <strong className="text-slate-800 text-sm">Exam #{exam.examNo} — {exam.subject}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Exam Code:</span>
                <strong className="text-slate-800 text-sm">{cbtExam.examCode || `EXAM-${exam.examNo}`}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Standard &amp; Division:</span>
                <strong className="text-slate-800 text-sm">{exam.standardLabel} · {exam.division !== 'ALL' ? `Div ${exam.division}` : 'All Divisions'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Exam Stream / Type:</span>
                <strong className="text-slate-800 text-sm">{formatExamTypeLabel(exam.examType)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Conducted Date:</span>
                <strong className="text-slate-800 text-sm">{formatDate(exam.examDate)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Duration:</span>
                <strong className="text-slate-800 text-sm">{cbtExam.durationMinutes || exam.durationMinutes || 60} Minutes</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Total Questions:</span>
                <strong className="text-slate-800 text-sm">{questionWiseReport.length || cbtExam.questionsCount || 45} Questions</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Total Max Marks:</span>
                <strong className="text-slate-800 text-sm">{cbtExam.totalMarks || exam.totalMarks || 100} Marks</strong>
              </div>
            </div>

            {/* Class Average & Growth / Downfall Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-emerald-800 font-semibold text-xs">CLASS AVERAGE MARKS</div>
                  <div className="text-2xl font-black text-emerald-700 mt-0.5">
                    {cbtStats.averageScore !== undefined ? `${cbtStats.averageScore}%` : `${overview.classAveragePercent || 0}%`}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">
                    Mean Score: {overview.averageMarks || Math.round(((cbtStats.averageScore || 0) * (exam.totalMarks || 100)) / 100)} marks ({overview.presentCount || cbtStudents.length} appeared)
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Gauge size={22} />
                </div>
              </div>

              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-blue-800 font-semibold text-xs">COMPARISON WITH PREVIOUS EXAM</div>
                  <div className="text-2xl font-black text-blue-700 mt-0.5">
                    {comparison.growthRate !== null && comparison.growthRate !== undefined ? (
                      <span className="text-emerald-700">+{Number(comparison.growthRate).toFixed(1)}% Growth</span>
                    ) : comparison.downfallRate !== null && comparison.downfallRate !== undefined ? (
                      <span className="text-red-600">-{Number(comparison.downfallRate).toFixed(1)}% Downfall</span>
                    ) : (
                      <span className="text-slate-600 text-base">Baseline Examination</span>
                    )}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {comparison.previousExam
                      ? `Compared vs Exam #${comparison.previousExam.examNo} (Avg: ${comparison.previousAveragePercent}%)`
                      : 'First evaluated exam in this series'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                  <Scale size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* Subject Filter Pills & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--slate)', marginRight: 4 }}>FILTER SUBJECT:</span>
              <button
                type="button"
                className={`btn btn-sm ${facultyReportSubjFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFacultyReportSubjFilter('ALL')}
              >
                All Subjects
              </button>
              {availableSubjectKeys.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  className={`btn btn-sm ${facultyReportSubjFilter.toLowerCase() === sub.toLowerCase() ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setFacultyReportSubjFilter(sub)}
                >
                  {sub}
                </button>
              ))}
            </div>

            <div style={{ minWidth: 220, flex: '0 1 260px' }}>
              <input
                type="text"
                className="field-input w-full"
                placeholder="Search question statement..."
                value={facultyQuestionsSearch}
                onChange={(e) => setFacultyQuestionsSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Question-Wise Diagnostic Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {questionWiseReport
              .filter((q) => {
                if (facultyReportSubjFilter !== 'ALL') {
                  const qSubj = String(q.subject || '').toLowerCase();
                  const fSubj = facultyReportSubjFilter.toLowerCase();
                  if (!qSubj.includes(fSubj) && !fSubj.includes(qSubj)) return false;
                }
                if (facultyQuestionsSearch) {
                  const term = facultyQuestionsSearch.toLowerCase();
                  return (
                    String(q.questionNo || '').includes(term) ||
                    String(q.questionText || '').toLowerCase().includes(term) ||
                    String(q.subject || '').toLowerCase().includes(term)
                  );
                }
                return true;
              })
              .map((q, idx) => {
                const optLetters = ['A', 'B', 'C', 'D'];
                const opts = Array.isArray(q.options) && q.options.length > 0 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'];

                return (
                  <div key={q.id || idx} className="card" style={{ padding: '20px 22px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 13.5, color: '#0F172A', background: '#F1F5F9', padding: '4px 10px', borderRadius: 6 }}>
                          Question #{q.questionNo || idx + 1}
                        </span>
                        <span className="cbt-subject-tag text-xs font-semibold">{q.subject}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)' }}>
                        Marks: <strong style={{ color: '#059669' }}>+{q.marks || 4}</strong> / <strong style={{ color: '#DC2626' }}>-{q.negativeMarks !== undefined ? q.negativeMarks : 1}</strong>
                      </span>
                    </div>

                    {/* Question Statement */}
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', lineHeight: 1.6, margin: 0 }}>
                        {q.questionText}
                      </p>
                      {q.questionTextGujarati && (
                        <p style={{ fontSize: 12.5, color: 'var(--slate)', fontWeight: 500, marginTop: 4, lineHeight: 1.5, margin: '4px 0 0' }}>
                          {q.questionTextGujarati}
                        </p>
                      )}
                    </div>

                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
                      {opts.slice(0, 4).map((opt, oi) => {
                        const letter = optLetters[oi];
                        const isRight =
                          String(q.correctAnswer || '').toUpperCase() === letter ||
                          String(opt || '').toUpperCase().startsWith(letter);

                        const cleanText =
                          typeof opt === 'string'
                            ? opt.replace(/^(?:\(?([A-Da-dઅબકડ])[\.\)\:\-]|\b([A-Da-dઅબકડ])[\.\)])\s*/, '').trim()
                            : String(opt || '');

                        return (
                          <div
                            key={oi}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 8,
                              border: isRight ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                              background: isRight ? '#ECFDF5' : '#F8FAFC',
                              color: isRight ? '#065F46' : '#334155',
                              fontWeight: isRight ? 700 : 500,
                              fontSize: 12.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: 11.5,
                                  background: isRight ? '#059669' : '#FFFFFF',
                                  color: isRight ? '#FFFFFF' : '#475569',
                                  border: isRight ? 'none' : '1px solid #CBD5E1',
                                }}
                              >
                                {letter}
                              </span>
                              <span>{cleanText}</span>
                            </div>
                            {isRight && (
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#047857', background: '#D1FAE5', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle2 size={13} /> Right Answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Analysis Counts Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-3 border-t border-slate-100 text-xs">
                      <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ color: 'var(--slate)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={12} className="text-blue-500" /> Attended Count
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', marginTop: 2 }}>
                          {q.attemptCount || 0} students
                        </div>
                      </div>

                      <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ color: 'var(--slate)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <SkipForward size={12} className="text-amber-500" /> Skip Count
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', marginTop: 2 }}>
                          {q.skipCount || 0} students
                        </div>
                      </div>

                      <div style={{ background: '#F0FDF4', padding: '10px 12px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                        <div style={{ color: '#166534', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} className="text-emerald-600" /> Correct Count
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#166534', marginTop: 2 }}>
                          {q.correctCount || 0} students
                        </div>
                      </div>

                      <div style={{ background: '#FEF2F2', padding: '10px 12px', borderRadius: 8, border: '1px solid #FECACA' }}>
                        <div style={{ color: '#991B1B', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <XCircle size={12} className="text-red-600" /> Wrong Count
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#991B1B', marginTop: 2 }}>
                          {q.wrongCount || 0} students
                        </div>
                      </div>

                      <div style={{ background: '#EFF6FF', padding: '10px 12px', borderRadius: 8, border: '1px solid #BFDBFE' }}>
                        <div style={{ color: '#1E40AF', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} className="text-blue-600" /> Avg Response Time
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#1E40AF', marginTop: 2 }}>
                          {q.avgResponseTimeSeconds || 0}s
                        </div>
                      </div>

                      <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                        <div style={{ color: 'var(--slate)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Gauge size={12} className="text-indigo-500" /> Accuracy
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', marginTop: 2 }}>
                          {q.accuracy || 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
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
                  <th style={{ width: 80 }}>RANK</th>
                  <th style={{ width: 90 }}>ROLL NO</th>
                  <th>STUDENT NAME</th>
                  <th>SCORE / TOTAL</th>
                  <th>PERCENTAGE</th>
                  <th>PERCENTILE</th>
                  <th>CORRECT / WRONG</th>
                  <th>TIME TAKEN</th>
                  <th>STATUS</th>
                  <th>KIOSK WARNINGS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No student records found matching your query.
                    </td>
                  </tr>
                ) : (
                  paginatedLeaderboard.map((st, idx) => {
                    const cbtMatch = cbtStudents.find(
                      (cs) => cs.rollNo === st.rollNo || String(cs._id) === String(st.studentId)
                    );
                    const rankNum =
                      st.rank ||
                      cbtMatch?.rank ||
                      (safeLeaderboardPage - 1) * LEADERBOARD_PAGE_SIZE + idx + 1;
                    const correctC =
                      cbtMatch?.correctCount ?? Math.round((st.marksObtained || 0) / 4);
                    const wrongC = cbtMatch?.wrongCount ?? 0;
                    const skipC = cbtMatch?.unansweredCount ?? 0;
                    const timeSec =
                      cbtMatch?.timeSpentSeconds || (exam.durationMinutes || 60) * 45;
                    const statusStr =
                      cbtMatch?.status || (st.ab ? 'ABSENT' : 'SUBMITTED');
                    const warnings = cbtMatch?.violationsCount || 0;

                    return (
                      <tr
                        key={`${st.studentId || idx}-${st.examGroup || 'A'}`}
                        className={statusStr === 'DISQUALIFIED' ? 'bg-red-50/40' : ''}
                      >
                        <td className="num font-bold">
                          {rankNum === 1 ? (
                            <span className="cbt-rank-medal cbt-rank-1">🥇 #1</span>
                          ) : rankNum === 2 ? (
                            <span className="cbt-rank-medal cbt-rank-2">🥈 #2</span>
                          ) : rankNum === 3 ? (
                            <span className="cbt-rank-medal cbt-rank-3">🥉 #3</span>
                          ) : st.ab ? (
                            <span className="chip chip-danger">AB</span>
                          ) : (
                            `#${rankNum}`
                          )}
                        </td>
                        <td className="num font-semibold">#{st.rollNo}</td>
                        <td>
                          <strong>{st.name}</strong>
                          <div style={{ fontSize: 11, color: 'var(--slate)' }}>
                            Div {st.division}
                            {exam.examType === 'GUJCET' && st.examGroup && st.examGroup !== 'ALL'
                              ? ` · Group ${st.examGroup}`
                              : ''}
                          </div>
                        </td>
                        <td className="num">
                          {st.ab ? (
                            <span className="chip chip-danger">Absent (AB)</span>
                          ) : (
                            <div>
                              <strong className="text-blue-700">
                                {st.marksObtained ?? cbtMatch?.score}
                              </strong>{' '}
                              <span style={{ color: 'var(--slate)', fontSize: 11.5 }}>
                                / {st.totalMaxMarks ?? cbtMatch?.totalMarks}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="num font-bold">
                          {st.ab ? '—' : `${st.percentage}%`}
                        </td>
                        <td className="num">
                          {st.ab ? (
                            <span style={{ color: 'var(--slate)' }}>—</span>
                          ) : (
                            <span className="cbt-percentile-pill">
                              {st.percentile !== undefined
                                ? `${Number(st.percentile).toFixed(1)}%ile`
                                : '—'}
                            </span>
                          )}
                        </td>
                        <td>
                          {st.ab ? (
                            <span style={{ color: 'var(--slate)', fontSize: 12 }}>—</span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <span className="text-emerald-700 font-bold">+{correctC}</span>
                              <span className="text-slate-300">/</span>
                              <span className="text-red-600 font-bold">-{wrongC}</span>
                              <span className="text-slate-300">/</span>
                              <span className="text-slate-400">{skipC} skip</span>
                            </div>
                          )}
                        </td>
                        <td className="num text-xs" style={{ color: 'var(--slate)' }}>
                          {st.ab ? '—' : formatSeconds(timeSec)}
                        </td>
                        <td>
                          {statusStr === 'SUBMITTED' ? (
                            <span className="cbt-status-pill cbt-status-submitted">Submitted</span>
                          ) : statusStr === 'DISQUALIFIED' ? (
                            <span className="cbt-status-pill cbt-status-disqualified">Disqualified</span>
                          ) : st.ab ? (
                            <span className="chip chip-danger">Absent</span>
                          ) : (
                            <span className="cbt-status-pill cbt-status-started">In Progress</span>
                          )}
                        </td>
                        <td>
                          {warnings > 0 ? (
                            <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                              <AlertTriangle size={13} /> {warnings} Warnings
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 flex items-center gap-1 font-semibold">
                              <CheckCircle size={13} /> Clean
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
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
      {/* PERFORMANCE & TRACKING TAB: COMBINES SCORE BRACKETS & STUDENT LISTS     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'performance' && (
        <>
          {/* 3 KPI Cards (Class Average, Pass, Fail) */}
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

          {/* Score Bracket Doughnut & Exam Average Comparison */}
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

          {/* Performance Indicators & Performance Message */}
          <div className="grid-2" style={{ marginBottom: 18 }}>
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
