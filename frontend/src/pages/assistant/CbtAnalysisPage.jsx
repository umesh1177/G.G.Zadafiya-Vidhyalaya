import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { fetchCbtAnalysis } from '../../services/cbtService';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function CbtAnalysisPage({ userRole = 'assistant' }) {
  const { id: examId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'students', 'questions', 'analysis'
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);

  const backUrl = userRole === 'student' ? '/student/cbt-exam' : '/assistant/cbt-exam';

  useEffect(() => {
    async function loadData() {
      if (!examId) return;
      try {
        setLoading(true);
        const res = await fetchCbtAnalysis(examId);
        if (res.success) {
          setAnalysisData(res);
        } else {
          setError(res.message || 'Failed to load analysis data');
        }
      } catch (err) {
        console.error('Error fetching CBT analysis:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [examId]);

  const exam = analysisData?.exam || {};
  const stats = analysisData?.analytics || {};
  const students = analysisData?.students || [];
  const questions = analysisData?.questions || [];

  // Dynamic status counts derived from actual data
  const statusCounts = stats.statusCounts || {
    submitted: students.filter((s) => s.status === 'SUBMITTED').length,
    disqualified: students.filter((s) => s.status === 'DISQUALIFIED').length,
    started: students.filter((s) => s.status === 'IN_PROGRESS').length,
    absent: 0,
  };

  const totalTakers =
    (statusCounts.submitted || 0) +
    (statusCounts.disqualified || 0) +
    (statusCounts.started || 0) +
    (statusCounts.absent || 0);

  // Donut chart configuration for Students Status (Photo 1 middle left)
  const donutData = {
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

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw} students`,
        },
      },
    },
  };

  // Bar chart configuration for Score Range Distribution (Photo 1 middle right)
  const scoreDistribution = stats.scoreDistribution || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const maxBarValue = Math.max(...scoreDistribution, 5);

  const barData = {
    labels: ['0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'],
    datasets: [
      {
        label: 'Number of Students',
        data: scoreDistribution,
        backgroundColor: '#0F2850',
        borderRadius: 4,
        barPercentage: 0.8,
      },
    ],
  };

  const barOptions = {
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
        suggestedMax: Math.ceil(maxBarValue * 1.2),
        ticks: { stepSize: Math.max(1, Math.ceil(maxBarValue / 4)), color: '#64748B', font: { size: 11 } },
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

  const formatSeconds = (sec) => {
    if (!sec) return '00m 00s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  if (loading) {
    return (
      <div className="cbt-analysis-full-page p-6">
        <button
          className="cbt-btn-back flex items-center gap-1.5 mb-6 text-sm font-semibold text-slate-600 hover:text-blue-600"
          onClick={() => navigate(backUrl)}
        >
          <ArrowLeft size={16} />
          <span>Back to CBT Exams</span>
        </button>
        <div className="cbt-loading-state" style={{ minHeight: '60vh' }}>
          <div className="cbt-spinner" style={{ width: 40, height: 40 }}></div>
          <p className="mt-4 font-medium text-slate-600">Calculating real-time CBT analysis and leaderboard metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !analysisData) {
    return (
      <div className="cbt-analysis-full-page p-6">
        <button
          className="cbt-btn-back flex items-center gap-1.5 mb-6 text-sm font-semibold text-slate-600 hover:text-blue-600"
          onClick={() => navigate(backUrl)}
        >
          <ArrowLeft size={16} />
          <span>Back to CBT Exams</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-700">
          <AlertTriangle size={36} className="mx-auto mb-3 text-red-500" />
          <h3 className="font-bold text-lg mb-1">Failed to Load Analysis</h3>
          <p className="text-sm">{error || 'Exam not found or no data available.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cbt-analysis-full-page p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation Back Button */}
      <div className="flex items-center justify-between">
        <button
          className="cbt-btn-back-pill"
          onClick={() => navigate(backUrl)}
          title="Return to CBT Examination Portal"
        >
          <ArrowLeft size={16} />
          <span>Back to CBT Exams</span>
        </button>

        <span className="text-xs text-slate-500 font-medium">
          Exam Code: <strong>{exam.examCode}</strong> • {exam.standard?.replace('_', ' ')}
        </span>
      </div>

      {/* Main Analysis Card Container */}
      <div className="cbt-analysis-main-card">
        {/* Header Section matching Photo 1 */}
        <div className="cbt-analysis-header">
          <div>
            <h1 className="cbt-analysis-title">{exam.title}</h1>
            <div className="cbt-analysis-meta-chips">
              <span className="cbt-meta-chip">
                <Clock size={14} className="text-slate-500" />
                <span>{exam.durationMinutes} Minutes</span>
              </span>
              <span className="cbt-meta-chip">
                <HelpCircle size={14} className="text-slate-500" />
                <span>{exam.questionsCount} Questions</span>
              </span>
              <span className="cbt-meta-chip">
                <Award size={14} className="text-slate-500" />
                <span>{exam.totalMarks} Marks</span>
              </span>
              <span className="cbt-meta-chip">
                <span className="font-semibold text-slate-700">Type:</span>
                <span>{exam.examType}</span>
              </span>
            </div>
          </div>

          <div className="cbt-header-badge-wrap">
            <span className="cbt-result-published-badge">
              <Send size={13} />
              <span>Result Published</span>
            </span>
          </div>
        </div>

        {/* Tab Navigation matching Photo 1 */}
        <div className="cbt-analysis-tabs-bar">
          <button
            className={`cbt-analysis-tab ${activeTab === 'overview' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 size={15} />
            <span>Overview</span>
          </button>
          <button
            className={`cbt-analysis-tab ${activeTab === 'students' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <Users size={15} />
            <span>Students ({students.length})</span>
          </button>
          <button
            className={`cbt-analysis-tab ${activeTab === 'questions' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            <HelpCircle size={15} />
            <span>Questions ({questions.length})</span>
          </button>
          <button
            className={`cbt-analysis-tab ${activeTab === 'analysis' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            <BookOpen size={15} />
            <span>Analysis</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW (Photo 1) */}
        {activeTab === 'overview' && (
          <div className="cbt-tab-content-wrap space-y-6">
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
                  {stats.averageScore !== undefined ? `${stats.averageScore}%` : '0%'}
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
                  {stats.medianScore !== undefined ? `${stats.medianScore}%` : '0%'}
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
                  {stats.lowestScore !== undefined ? `${stats.lowestScore}%` : '0%'}
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
                  {stats.highestScore !== undefined ? `${stats.highestScore}%` : '0%'}
                </div>
                <div className="cbt-kpi-subtext">Highest score obtained by a student</div>
              </div>
            </div>

            {/* Middle Section: Donut Chart on Left, Histogram on Right (Photo 1) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Donut Chart (Left, 4 columns) */}
              <div className="lg:col-span-4 cbt-chart-box">
                <div className="cbt-donut-wrap">
                  <Doughnut data={donutData} options={donutOptions} />
                  <div className="cbt-donut-center">
                    <div className="cbt-donut-center-num">{totalTakers}</div>
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
                  <Bar data={barData} options={barOptions} />
                </div>
                {/* Mean and Median Marker Badges */}
                <div className="cbt-histogram-marker-labels">
                  <span className="cbt-marker-mean">
                    Mean: {stats.averageScore ? `${stats.averageScore}%` : 'N/A'}
                  </span>
                  <span className="cbt-marker-median">
                    Median: {stats.medianScore ? `${stats.medianScore}%` : 'N/A'}
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
                  {formatSeconds(stats.averageTimeSeconds)}
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
                  {formatSeconds(stats.medianTimeSeconds)}
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
                  {stats.timeUtilization !== undefined ? `${stats.timeUtilization}%` : '0%'}
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
                  {stats.avgQuestionsAttempted || 0} / {exam.questionsCount}
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
                  {stats.fullCompletionRate !== undefined ? `${stats.fullCompletionRate}%` : '0%'}
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
                  {stats.skippedQuestionRate !== undefined ? `${stats.skippedQuestionRate}%` : '0%'}
                </div>
                <div className="cbt-kpi-subtext">Percentage of questions left unanswered</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STUDENTS LEADERBOARD */}
        {activeTab === 'students' && (
          <div className="cbt-tab-content-wrap">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Students Leaderboard & Performance</h3>
                <p className="text-xs text-slate-500">
                  Ranked by overall score, percentile, and negative mark deduction
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                Total Submissions: {students.length}
              </span>
            </div>

            {students.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No student submissions recorded yet for this exam.
              </div>
            ) : (
              <div className="cbt-table-responsive border border-slate-200 rounded-lg overflow-hidden">
                <table className="cbt-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Rank</th>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Score / Total</th>
                      <th>Percentage</th>
                      <th>Percentile</th>
                      <th>Correct / Wrong</th>
                      <th>Time Taken</th>
                      <th>Status</th>
                      <th>Kiosk Warnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st) => (
                      <tr key={st._id || st.rollNo} className={st.status === 'DISQUALIFIED' ? 'bg-red-50/40' : ''}>
                        <td className="font-bold text-slate-900">
                          {st.rank === 1 ? (
                            <span className="cbt-rank-medal cbt-rank-1">🥇 #1</span>
                          ) : st.rank === 2 ? (
                            <span className="cbt-rank-medal cbt-rank-2">🥈 #2</span>
                          ) : st.rank === 3 ? (
                            <span className="cbt-rank-medal cbt-rank-3">🥉 #3</span>
                          ) : (
                            `#${st.rank}`
                          )}
                        </td>
                        <td className="font-semibold text-slate-700">#{st.rollNo}</td>
                        <td>
                          <div className="font-bold text-slate-800">{st.name}</div>
                          <div className="text-[11px] text-gray-400">
                            {st.standard?.replace('_', ' ')} • Div {st.division}
                          </div>
                        </td>
                        <td>
                          <div className="font-extrabold text-blue-700">
                            {st.score} <span className="text-xs font-normal text-slate-400">/ {st.totalMarks}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-bold text-slate-800">{st.percentage}%</span>
                        </td>
                        <td>
                          <span className="cbt-percentile-pill">
                            {st.percentile !== undefined ? `${st.percentile}%ile` : '-'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <span className="text-emerald-700 font-bold">+{st.correctCount}</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-red-600 font-bold">-{st.wrongCount}</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-400">{st.unansweredCount} skip</span>
                          </div>
                        </td>
                        <td className="text-xs text-slate-600">
                          {formatSeconds(st.timeSpentSeconds)}
                        </td>
                        <td>
                          {st.status === 'SUBMITTED' ? (
                            <span className="cbt-status-pill cbt-status-submitted">Submitted</span>
                          ) : st.status === 'DISQUALIFIED' ? (
                            <span className="cbt-status-pill cbt-status-disqualified">Disqualified</span>
                          ) : (
                            <span className="cbt-status-pill cbt-status-started">In Progress</span>
                          )}
                        </td>
                        <td>
                          {st.violationsCount > 0 ? (
                            <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                              <AlertTriangle size={13} /> {st.violationsCount} Warnings
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle size={13} /> Clean
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: QUESTIONS ANALYSIS */}
        {/* User Description: "in third tab you have to show question analysis means you have to question in second column no student attend that question , not attend question , no student gave right answer ,no of student give wrong answer" */}
        {activeTab === 'questions' && (
          <div className="cbt-tab-content-wrap">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Question-by-Question Deep Analysis</h3>
                <p className="text-xs text-slate-500">
                  Attended count, skipped count, right answers, wrong answers, and overall question accuracy
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                {questions.length} Questions Evaluated
              </span>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No question analysis data available for this exam.
              </div>
            ) : (
              <div className="cbt-table-responsive border border-slate-200 rounded-lg overflow-hidden">
                <table className="cbt-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Q. No</th>
                      <th>Subject</th>
                      <th>Question Description</th>
                      <th>Attended</th>
                      <th>Not Attended (Skipped)</th>
                      <th>Right Answer</th>
                      <th>Wrong Answer</th>
                      <th>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, idx) => {
                      const att = q.attendedCount || 0;
                      const skip = q.skippedCount || 0;
                      const right = q.rightCount || 0;
                      const wrong = q.wrongCount || 0;
                      const acc = q.accuracy !== undefined ? q.accuracy : att > 0 ? Math.round((right / att) * 100) : 0;

                      return (
                        <tr key={idx}>
                          <td className="font-bold text-slate-900">Q{q.questionNo || idx + 1}</td>
                          <td>
                            <span className="cbt-subject-tag text-xs">{q.subject}</span>
                          </td>
                          <td className="max-w-md">
                            <p className="text-xs text-slate-800 font-medium line-clamp-2">
                              {q.questionText}
                            </p>
                          </td>
                          <td className="font-semibold text-slate-800">{att}</td>
                          <td className="text-slate-500 font-medium">{skip}</td>
                          <td className="font-bold text-emerald-600">
                            <div className="flex items-center gap-1">
                              <CheckCircle2 size={13} /> {right}
                            </div>
                          </td>
                          <td className="font-bold text-red-600">
                            <div className="flex items-center gap-1">
                              <XCircle size={13} /> {wrong}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-800">{acc}%</span>
                              <div className="cbt-accuracy-track" style={{ width: 60, height: 6 }}>
                                <div
                                  className="cbt-accuracy-fill"
                                  style={{
                                    width: `${acc}%`,
                                    backgroundColor: acc >= 70 ? '#10B981' : acc >= 40 ? '#F59E0B' : '#EF4444',
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SUBJECT ANALYSIS */}
        {activeTab === 'analysis' && (
          <div className="cbt-tab-content-wrap space-y-6">
            <div>
              <h3 className="font-bold text-slate-800 text-base mb-1">Subject-Wise Performance Breakdown</h3>
              <p className="text-xs text-slate-500">
                Comparative accuracy and question strength across Physics, Chemistry, and Mathematics / Biology
              </p>
            </div>

            {/* Subject Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Physics', 'Chemistry', exam.streamGroup === 'GROUP_B' ? 'Biology' : 'Mathematics'].map((subject) => {
                const subQuestions = questions.filter((q) => q.subject === subject);
                const subAttended = subQuestions.reduce((acc, q) => acc + (q.attendedCount || 0), 0);
                const subRight = subQuestions.reduce((acc, q) => acc + (q.rightCount || 0), 0);
                const subAccuracy = subAttended > 0 ? Math.round((subRight / subAttended) * 100) : 0;

                return (
                  <div key={subject} className="cbt-stat-card flex-col items-start p-5 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between w-full mb-3">
                      <span className="cbt-subject-tag text-sm font-bold">{subject}</span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {subQuestions.length} Questions
                      </span>
                    </div>

                    <div className="w-full space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span>Subject Accuracy</span>
                          <span className="font-bold text-blue-700">{subAccuracy}%</span>
                        </div>
                        <div className="cbt-accuracy-track" style={{ height: 8 }}>
                          <div
                            className="cbt-accuracy-fill"
                            style={{
                              width: `${subAccuracy}%`,
                              backgroundColor: subAccuracy >= 70 ? '#10B981' : subAccuracy >= 40 ? '#2563EB' : '#EF4444',
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                        <div className="bg-slate-50 p-2 rounded">
                          <span className="text-gray-500 block">Total Solved:</span>
                          <strong className="text-slate-800">{subAttended} attempts</strong>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded text-emerald-800">
                          <span className="text-emerald-600 block">Correct Answers:</span>
                          <strong>{subRight} correct</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

