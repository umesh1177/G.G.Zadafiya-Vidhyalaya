import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { ltApi } from '../../services/ltApi';
import PrintableLtReport, { triggerLtReportPrint } from './PrintableLtReport';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const SUBJECT_COLORS = {
  Physics: { border: '#123B5D', background: 'rgba(18, 59, 93, 0.85)', light: 'rgba(18, 59, 93, 0.12)' },
  Chemistry: { border: '#059669', background: 'rgba(5, 150, 105, 0.85)', light: 'rgba(5, 150, 105, 0.12)' },
  Mathematics: { border: '#7C3AED', background: 'rgba(124, 58, 237, 0.85)', light: 'rgba(124, 58, 237, 0.12)' },
  Biology: { border: '#D97706', background: 'rgba(217, 119, 6, 0.85)', light: 'rgba(217, 119, 6, 0.12)' },
};

// Standardized Rubric Grade Scale Options for Chart.js
const GRADE_CHART_SCALES = {
  y: {
    min: 0.8,
    max: 3.2,
    ticks: {
      stepSize: 1,
      callback: (v) => {
        if (v === 1) return 'Good';
        if (v === 2) return 'Better';
        if (v === 3) return 'Excellent';
        return '';
      },
      font: { weight: 'bold', size: 11 },
    },
    grid: { color: '#E2E8F0' },
  },
  x: { grid: { display: false } },
};

function gradeScoreToLabel(v) {
  if (v >= 2.45) return 'Excellent';
  if (v < 1.8) return 'Good';
  return 'Better';
}

function getGradeBadgeClass(grade) {
  if (grade === 'Excellent') return 'chip chip-success';
  if (grade === 'Better') return 'chip chip-neutral';
  return 'chip chip-warning';
}

export default function LtReportsWorkspace() {
  const [subTab, setSubTab] = useState('weekly'); // 'weekly' | 'monthly' | 'student' | 'saved'

  // Common filters
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeekNo, setSelectedWeekNo] = useState('');
  const [selectedStandard, setSelectedStandard] = useState('ALL');
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');

  // Weekly data
  const [weeklyData, setWeeklyData] = useState(null);
  const [isWeeklyLoading, setIsWeeklyLoading] = useState(true);

  // Monthly data
  const [monthlyData, setMonthlyData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('May');
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);

  // Student performance data
  const [studentPerfData, setStudentPerfData] = useState(null);
  const [selectedStudentRoll, setSelectedStudentRoll] = useState('1');
  const [isStudentLoading, setIsStudentLoading] = useState(false);

  // Saved reports history
  const [savedReports, setSavedReports] = useState([]);
  const [isSavedLoading, setIsSavedLoading] = useState(false);

  // Printable state
  const [printPayload, setPrintPayload] = useState(null);
  const [printType, setPrintType] = useState('WEEKLY');

  // Load available weeks
  useEffect(() => {
    ltApi.getAvailableWeeks()
      .then((weeks) => {
        setAvailableWeeks(weeks);
        if (weeks && weeks.length > 0 && !selectedWeekNo) {
          setSelectedWeekNo(String(weeks[weeks.length - 1].weekNo));
        }
      })
      .catch((err) => console.error('Failed to load available weeks:', err));
  }, []);

  // 1. Fetch Weekly Report
  const loadWeeklyReport = useCallback(async () => {
    if (!selectedWeekNo) return;
    setIsWeeklyLoading(true);
    try {
      const data = await ltApi.getWeeklyReport({
        weekNo: selectedWeekNo,
        standard: selectedStandard,
        division: selectedDivision,
        subject: selectedSubject,
      });
      setWeeklyData(data);
    } catch (err) {
      console.error('Failed to load weekly report:', err);
    } finally {
      setIsWeeklyLoading(false);
    }
  }, [selectedWeekNo, selectedStandard, selectedDivision, selectedSubject]);

  useEffect(() => {
    if (subTab === 'weekly') {
      loadWeeklyReport();
    }
  }, [subTab, loadWeeklyReport]);

  // 2. Fetch Monthly Report
  const loadMonthlyReport = useCallback(async () => {
    setIsMonthlyLoading(true);
    try {
      const data = await ltApi.getMonthlyReport({
        month: selectedMonth,
        year: 2026,
        standard: selectedStandard,
        division: selectedDivision,
        subject: selectedSubject,
      });
      setMonthlyData(data);
    } catch (err) {
      console.error('Failed to load monthly report:', err);
    } finally {
      setIsMonthlyLoading(false);
    }
  }, [selectedMonth, selectedStandard, selectedDivision, selectedSubject]);

  useEffect(() => {
    if (subTab === 'monthly') {
      loadMonthlyReport();
    }
  }, [subTab, loadMonthlyReport]);

  // 3. Fetch Student Performance Report
  const loadStudentPerformance = useCallback(async () => {
    setIsStudentLoading(true);
    try {
      const data = await ltApi.getStudentPerformance({
        rollNo: selectedStudentRoll || '1',
        standard: selectedStandard === 'ALL' ? 'STD_11' : selectedStandard,
        division: selectedDivision === 'ALL' ? 'A' : selectedDivision,
        subject: selectedSubject,
        weekNo: selectedWeekNo,
      });
      setStudentPerfData(data);
    } catch (err) {
      console.error('Failed to load student performance:', err);
    } finally {
      setIsStudentLoading(false);
    }
  }, [selectedStudentRoll, selectedStandard, selectedDivision, selectedSubject, selectedWeekNo]);

  useEffect(() => {
    if (subTab === 'student') {
      loadStudentPerformance();
    }
  }, [subTab, loadStudentPerformance]);

  // 4. Fetch Saved Reports
  const loadSavedReports = useCallback(async () => {
    setIsSavedLoading(true);
    try {
      const list = await ltApi.getSavedReports();
      setSavedReports(list);
    } catch (err) {
      console.error('Failed to load saved reports:', err);
    } finally {
      setIsSavedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'saved') {
      loadSavedReports();
    }
  }, [subTab, loadSavedReports]);

  // Trigger print & save to ledger
  const handlePrint = async (type, dataToPrint) => {
    if (!dataToPrint) return;
    setPrintType(type);
    setPrintPayload(dataToPrint);

    try {
      let title = '';
      if (type === 'WEEKLY') {
        title = `Weekly Diagnostic Report — ${dataToPrint.weekInfo?.label || 'Week'}`;
      } else if (type === 'MONTHLY') {
        title = `Monthly Academic Performance — ${dataToPrint.monthLabel || 'Month'}`;
      } else {
        title = `Student Performance Dossier — ${dataToPrint.student?.fullName || 'Student'} (#${dataToPrint.student?.rollNo})`;
      }

      await ltApi.savePrintedReport({
        reportType: type,
        title,
        weekNo: dataToPrint.weekInfo?.weekNo || null,
        weekLabel: dataToPrint.weekInfo?.label || '',
        monthLabel: dataToPrint.monthLabel || '',
        standard: selectedStandard,
        division: selectedDivision,
        subject: selectedSubject,
        studentId: dataToPrint.student?.id || null,
        studentName: dataToPrint.student?.fullName || '',
        rollNo: dataToPrint.student?.rollNo || null,
        classAveragePercent: dataToPrint.kpis?.overallClassAverage || dataToPrint.monthAverage || dataToPrint.kpis?.studentWeeklyGrade || 'Better',
        classAverageGrade: dataToPrint.kpis?.overallClassAverage || dataToPrint.monthAverage || dataToPrint.kpis?.studentWeeklyGrade || 'Better',
        previousAveragePercent: dataToPrint.kpis?.previousWeekAverage || dataToPrint.previousMonthAverage || null,
        growthDownfallText: dataToPrint.kpis?.growthDownfallText || dataToPrint.growthDownfallText || '',
        weakQuestionsCount: dataToPrint.weakQuestions?.length || 0,
        topPerformersCount: dataToPrint.topPerformers?.length || 0,
        poorPerformersCount: dataToPrint.poorPerformers?.length || 0,
        printedBy: 'Principal',
        dataSnapshot: dataToPrint,
      });

      loadSavedReports();
    } catch (saveErr) {
      console.warn('Auto-save to reports ledger note:', saveErr);
    }

    triggerLtReportPrint(dataToPrint, type);
  };

  // -------------------------------------------------------------
  // CHART BUILDERS FOR WEEKLY REPORT
  // -------------------------------------------------------------
  const renderSingleSubjectChart = (subjName, subjData) => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // Map score (1.0 to 3.0) directly onto categorical Y-axis
    const dataVals = (subjData?.days || []).map((d) => (d.score !== null ? d.score : null));
    const colors = SUBJECT_COLORS[subjName] || SUBJECT_COLORS.Physics;

    const data = {
      labels,
      datasets: [
        {
          label: `${subjName} Class Avg`,
          data: dataVals,
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: 2.5,
          borderRadius: 6,
          pointBackgroundColor: colors.border,
          pointRadius: 5,
          fill: true,
          tension: 0.25,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const dayItem = subjData?.days?.[ctx.dataIndex];
              const grade = dayItem?.grade || gradeScoreToLabel(ctx.parsed.y);
              return `${subjName} Class Avg: ${grade}${dayItem?.ltNo ? ` (${dayItem.ltNo})` : ''}`;
            },
          },
        },
      },
      scales: GRADE_CHART_SCALES,
    };

    return (
      <div className="card" key={subjName} style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{subjName}</div>
            <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>Day vs Average of Class</div>
          </div>
          <span className={getGradeBadgeClass(subjData?.overallGrade || 'Better')} style={{ fontWeight: 800, fontSize: 12 }}>
            {subjData?.overallGrade || 'Better'} Avg
          </span>
        </div>
        <div style={{ height: '170px' }}>
          <Line data={data} options={options} />
        </div>
      </div>
    );
  };

  // Comparison Chart (Current Week vs Previous Week across Days)
  const comparisonChartData = useMemo(() => {
    if (!weeklyData || !weeklyData.comparisonDays) return null;
    const labels = weeklyData.comparisonDays.map((d) => d.dayShort);
    const curVals = weeklyData.comparisonDays.map((d) => d.currentScore);
    const prevVals = weeklyData.comparisonDays.map((d) => d.previousScore);

    return {
      labels,
      datasets: [
        {
          label: `${weeklyData.weekInfo?.shortLabel || 'Current Week'}`,
          data: curVals,
          backgroundColor: '#123B5D',
          borderRadius: 6,
        },
        {
          label: `${weeklyData.previousWeekInfo?.label ? 'Previous Week' : 'Prior Week'}`,
          data: prevVals,
          backgroundColor: '#94A3B8',
          borderRadius: 6,
        },
      ],
    };
  }, [weeklyData]);

  // Monthly Progression Chart (Weeks vs Grade)
  const monthlyProgressionChartData = useMemo(() => {
    if (!monthlyData || !monthlyData.weekSummaries) return null;
    const labels = monthlyData.weekSummaries.map((w) => `Week ${w.weekNo}`);
    const gradeToVal = (g) => (g === 'Excellent' ? 3 : g === 'Good' ? 1 : 2);
    const overallVals = monthlyData.weekSummaries.map((w) => gradeToVal(w.overallAverage));
    const physVals = monthlyData.weekSummaries.map((w) => gradeToVal(w.subjectAverages?.Physics));
    const chemVals = monthlyData.weekSummaries.map((w) => gradeToVal(w.subjectAverages?.Chemistry));
    const mathVals = monthlyData.weekSummaries.map((w) => gradeToVal(w.subjectAverages?.Mathematics));
    const bioVals = monthlyData.weekSummaries.map((w) => gradeToVal(w.subjectAverages?.Biology));

    return {
      labels,
      datasets: [
        {
          label: 'Class Overall Average',
          data: overallVals,
          borderColor: '#123B5D',
          backgroundColor: '#123B5D',
          borderWidth: 3,
          pointRadius: 6,
          tension: 0.2,
        },
        {
          label: 'Physics',
          data: physVals,
          borderColor: SUBJECT_COLORS.Physics.border,
          borderDash: [4, 4],
          pointRadius: 4,
          tension: 0.2,
        },
        {
          label: 'Chemistry',
          data: chemVals,
          borderColor: SUBJECT_COLORS.Chemistry.border,
          borderDash: [4, 4],
          pointRadius: 4,
          tension: 0.2,
        },
        {
          label: 'Mathematics',
          data: mathVals,
          borderColor: SUBJECT_COLORS.Mathematics.border,
          borderDash: [4, 4],
          pointRadius: 4,
          tension: 0.2,
        },
        {
          label: 'Biology',
          data: bioVals,
          borderColor: SUBJECT_COLORS.Biology.border,
          borderDash: [4, 4],
          pointRadius: 4,
          tension: 0.2,
        },
      ],
    };
  }, [monthlyData]);

  // Student vs Class Benchmark Bar Data (Strictly Grade-Based)
  const studentBenchmarkChartData = useMemo(() => {
    if (!studentPerfData || !studentPerfData.subjectBreakdown) return null;
    const labels = studentPerfData.subjectBreakdown.map((s) => s.subject);
    const studScores = studentPerfData.subjectBreakdown.map((s) => s.studentScore);
    const classScores = studentPerfData.subjectBreakdown.map((s) => s.classScore);

    return {
      labels,
      datasets: [
        {
          label: `${studentPerfData.student?.fullName || 'Student'} Grade`,
          data: studScores,
          backgroundColor: '#123B5D',
          borderRadius: 6,
        },
        {
          label: 'Class Benchmark Grade',
          data: classScores,
          backgroundColor: '#CBD5E1',
          borderRadius: 6,
        },
      ],
    };
  }, [studentPerfData]);

  // Student Daily Score Trajectory (Strictly Grade-Based)
  const studentTrajectoryChartData = useMemo(() => {
    if (!studentPerfData || !studentPerfData.dayComparison) return null;
    const labels = studentPerfData.dayComparison.map((d) => d.dayShort);
    const curScores = studentPerfData.dayComparison.map((d) => d.currentScore);
    const prevScores = studentPerfData.dayComparison.map((d) => d.previousScore);

    return {
      labels,
      datasets: [
        {
          label: 'This Week Grade',
          data: curScores,
          borderColor: '#123B5D',
          backgroundColor: 'rgba(18, 59, 93, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 6,
        },
        {
          label: 'Previous Week Grade',
          data: prevScores,
          borderColor: '#94A3B8',
          borderDash: [5, 5],
          pointRadius: 4,
        },
      ],
    };
  }, [studentPerfData]);

  return (
    <div className="lt-reports-workspace" style={{ marginTop: '16px' }}>
      {/* ── SECONDARY SUB-NAVIGATION TABS (STS Navy Pills) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div className="tabs" style={{ margin: 0 }}>
          <button
            type="button"
            className={`tab-btn ${subTab === 'weekly' ? 'is-active' : ''}`}
            onClick={() => setSubTab('weekly')}
          >
            📅 Weekly Report
          </button>
          <button
            type="button"
            className={`tab-btn ${subTab === 'monthly' ? 'is-active' : ''}`}
            onClick={() => setSubTab('monthly')}
          >
            🗓️ Monthly Report
          </button>
          <button
            type="button"
            className={`tab-btn ${subTab === 'student' ? 'is-active' : ''}`}
            onClick={() => setSubTab('student')}
          >
            👤 Student Performance
          </button>
          <button
            type="button"
            className={`tab-btn ${subTab === 'saved' ? 'is-active' : ''}`}
            onClick={() => setSubTab('saved')}
          >
            📑 Printed Reports ({savedReports.length})
          </button>
        </div>

        {/* Global Print Action button */}
        {subTab === 'weekly' && weeklyData && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handlePrint('WEEKLY', weeklyData)}
            title="Print professional weekly diagnostic report"
          >
            🖨️ Print Weekly Report
          </button>
        )}
        {subTab === 'monthly' && monthlyData && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handlePrint('MONTHLY', monthlyData)}
            title="Print monthly academic trajectory report"
          >
            🖨️ Print Monthly Report
          </button>
        )}
        {subTab === 'student' && studentPerfData && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handlePrint('STUDENT', studentPerfData)}
            title="Print student academic performance dossier"
          >
            🖨️ Print Student Dossier
          </button>
        )}
      </div>

      {/* ── FILTER TOOLBAR ── */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
          {/* Week Selector */}
          {(subTab === 'weekly' || subTab === 'student') && (
            <div>
              <label className="field-label" htmlFor="filter-week-select">Target Week</label>
              <select
                id="filter-week-select"
                className="filter-select"
                value={selectedWeekNo}
                onChange={(e) => setSelectedWeekNo(e.target.value)}
              >
                {availableWeeks.map((w) => (
                  <option key={w.weekNo} value={w.weekNo}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month Selector for Monthly */}
          {subTab === 'monthly' && (
            <div>
              <label className="field-label" htmlFor="filter-month-select">Target Month</label>
              <select
                id="filter-month-select"
                className="filter-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="May">May 2026</option>
                <option value="April">April 2026</option>
                <option value="June">June 2026</option>
              </select>
            </div>
          )}

          {/* Standard */}
          <div>
            <label className="field-label" htmlFor="filter-std-select">Standard</label>
            <select
              id="filter-std-select"
              className="filter-select"
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
            >
              <option value="ALL">All Standards</option>
              <option value="STD_11">Standard 11</option>
              <option value="STD_12">Standard 12</option>
            </select>
          </div>

          {/* Division */}
          <div>
            <label className="field-label" htmlFor="filter-div-select">Division</label>
            <select
              id="filter-div-select"
              className="filter-select"
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
            >
              <option value="ALL">All Divisions</option>
              <option value="A">Division A</option>
              <option value="B">Division B</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="field-label" htmlFor="filter-subj-select">Subject</label>
            <select
              id="filter-subj-select"
              className="filter-select"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="All Subjects">All Subjects (4 Graphs)</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Biology">Biology</option>
            </select>
          </div>

          {/* Student Selector for Student Performance Tab */}
          {subTab === 'student' && (
            <div>
              <label className="field-label" htmlFor="filter-student-roll">Select Student (Roll #)</label>
              <select
                id="filter-student-roll"
                className="filter-select"
                value={selectedStudentRoll}
                onChange={(e) => setSelectedStudentRoll(e.target.value)}
              >
                <option value="1">Roll 1 — Umesh Pal (Std 11 A)</option>
                <option value="2">Roll 2 — Soumil Shah (Std 11 A)</option>
                <option value="3">Roll 3 — Riya Patel (Std 11 A)</option>
                <option value="7">Roll 7 — Aarav Mehta (Std 11 B)</option>
                <option value="10">Roll 10 — Ananya Shukla (Std 11 B)</option>
                <option value="11">Roll 11 — Nirav Chauhan (Std 11 B)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ── SUB-TAB 1: WEEKLY REPORT ── */}
      {/* ========================================================= */}
      {subTab === 'weekly' && (
        <>
          {isWeeklyLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--slate)' }}>
              Computing weekly diagnostic rubric evaluation from MongoDB...
            </div>
          ) : !weeklyData ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--slate)' }}>
              No weekly lecture test data found for the selected parameters.
            </div>
          ) : (
            <>
              {/* Executive KPI Cards (Strictly Grade-Based, NO percentages or raw marks) */}
              <div className="kpi-grid" style={{ marginBottom: '18px' }}>
                <div className="kpi-card">
                  <div className="kpi-card__label">Total Tests in Week</div>
                  <div className="kpi-card__value num">{weeklyData.kpis.totalLtsConducted}</div>
                  <div className="kpi-card__hint">{weeklyData.weekInfo?.label}</div>
                </div>

                <div className="kpi-card is-success">
                  <div className="kpi-card__label">Class Overall Average</div>
                  <div className="kpi-card__value" style={{ fontSize: '26px' }}>
                    <span className={getGradeBadgeClass(weeklyData.kpis.overallClassAverage)}>
                      {weeklyData.kpis.overallClassAverage}
                    </span>
                  </div>
                  <div className="kpi-card__hint" style={{ marginTop: '6px' }}>
                    Prior Week: <strong>{weeklyData.kpis.previousWeekAverage}</strong>
                  </div>
                </div>

                <div className="kpi-card is-warning">
                  <div className="kpi-card__label">Weak Concept LTs</div>
                  <div className="kpi-card__value num">{weeklyData.kpis.weakQuestionsCount}</div>
                  <div className="kpi-card__hint">Lecture Tests requiring pedagogical reinforcement</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-card__label">High vs Low Cohort</div>
                  <div className="kpi-card__value num" style={{ fontSize: '20px' }}>
                    <span style={{ color: '#059669' }}>{weeklyData.kpis.topPerformersCount} Excellent</span>
                    <span style={{ color: '#64748B', margin: '0 6px' }}>/</span>
                    <span style={{ color: '#DC2626' }}>{weeklyData.kpis.poorPerformersCount} Needs Support</span>
                  </div>
                  <div className="kpi-card__hint">Ranked by rubric evaluations</div>
                </div>
              </div>

              {/* ── GRAPH SECTION 1: Day vs Average of Class Individual for Subject ── */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>
                      {selectedSubject === 'All Subjects'
                        ? '1. Day vs Average of Class — Subject-Wise Graphs (4 Subjects)'
                        : `1. Day vs Average of Class — ${selectedSubject}`}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--slate)' }}>
                      Daily progression for Monday through Saturday across evaluated Lecture Tests (Y-axis: Good, Better, Excellent)
                    </div>
                  </div>
                </div>

                {selectedSubject === 'All Subjects' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {renderSingleSubjectChart('Physics', weeklyData.subjectGraphs?.Physics)}
                    {renderSingleSubjectChart('Chemistry', weeklyData.subjectGraphs?.Chemistry)}
                    {renderSingleSubjectChart('Mathematics', weeklyData.subjectGraphs?.Mathematics)}
                    {renderSingleSubjectChart('Biology', weeklyData.subjectGraphs?.Biology)}
                  </div>
                ) : (
                  <div style={{ maxWidth: '720px' }}>
                    {renderSingleSubjectChart(selectedSubject, weeklyData.selectedSubjectDetail)}
                  </div>
                )}
              </div>

              {/* ── COMPARISON & EXECUTIVE TEXT-FORMAT GROWTH/DOWNFALL ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Comparison Graph with Previous Week */}
                <div className="card" style={{ padding: '18px 20px' }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
                      2. Comparison with Previous Week LT
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                      Daily class average benchmark: Current vs Previous Week (Good, Better, Excellent)
                    </div>
                  </div>
                  <div style={{ height: '220px' }}>
                    {comparisonChartData && (
                      <Bar
                        data={comparisonChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                            tooltip: {
                              callbacks: {
                                label: (ctx) => {
                                  const grade = gradeScoreToLabel(ctx.parsed.y);
                                  return `${ctx.dataset.label}: ${grade}`;
                                },
                              },
                            },
                          },
                          scales: GRADE_CHART_SCALES,
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Growth or Downfall in Direct Text Format (NO Graph) */}
                <div className="card" style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
                        3. Growth &amp; Downfall Performance Analysis
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                        Comparative variance summary versus previous week evaluation
                      </div>
                    </div>
                    <span
                      className={`chip ${
                        weeklyData.kpis.growthDownfallStatus === 'GROWTH'
                          ? 'chip-success'
                          : weeklyData.kpis.growthDownfallStatus === 'DOWNFALL'
                          ? 'chip-danger'
                          : 'chip-neutral'
                      }`}
                      style={{ fontWeight: 800 }}
                    >
                      {weeklyData.kpis.growthDownfallStatus}
                    </span>
                  </div>

                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#123B5D' }}>
                      📋 Executive Summary:
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--ink)', marginTop: '4px' }}>
                      {weeklyData.kpis.growthDownfallText}
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate)', marginBottom: '8px' }}>
                    Subject-Wise Performance Status:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {(weeklyData.subjectVarianceTextList || []).map((sv) => (
                      <div
                        key={sv.subject}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '8px 10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--ink)' }}>{sv.subject}</span>
                          <span
                            className={`chip ${
                              sv.status === 'GROWTH' ? 'chip-success' : sv.status === 'DOWNFALL' ? 'chip-danger' : 'chip-neutral'
                            }`}
                            style={{ fontSize: '10.5px', padding: '2px 6px' }}
                          >
                            {sv.currentGrade}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--slate)', marginTop: '3px' }}>
                          {sv.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── SECTION 4: WEAK LT QUESTIONS (ONLY: LT NO, SUBJECT, LT QUESTIONS LIST, CLASS AVG) ── */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#D97706' }}>⚠️</span>
                      Weak LT Questions (Attention Required)
                    </div>
                    <div className="card__desc">
                      Lecture Tests where class evaluated average is 'Good' or requires remedial practice (Filtered by active subject/stream)
                    </div>
                  </div>
                  <span className="chip chip-warning">
                    {weeklyData.weakQuestions.length} LTs Flagged
                  </span>
                </div>

                <div className="table-wrap" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '12%' }}>LT NO</th>
                        <th style={{ width: '18%' }}>SUBJECT</th>
                        <th style={{ width: '56%' }}>LT QUESTIONS LIST</th>
                        <th style={{ width: '14%' }}>CLASS AVG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyData.weakQuestions.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#059669', fontWeight: 600 }}>
                            ✓ Outstanding conceptual mastery! No weak Lecture Tests flagged for this selection.
                          </td>
                        </tr>
                      ) : (
                        weeklyData.weakQuestions.map((q, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong>LT #{q.ltNo}</strong>
                            </td>
                            <td>
                              <strong>{q.subject}</strong>
                            </td>
                            <td>
                              {q.questions && q.questions.length > 0 ? (
                                <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', lineHeight: 1.55 }}>
                                  {q.questions.map((qn) => (
                                    <li key={qn.questionNo} style={{ marginBottom: '4px' }}>
                                      {qn.questionText}
                                    </li>
                                  ))}
                                </ol>
                              ) : (
                                <span style={{ color: 'var(--slate)', fontSize: '12px' }}>
                                  Questions assessed in evaluation session
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={getGradeBadgeClass(q.classAvg)} style={{ fontWeight: 800 }}>
                                {q.classAvg}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── SECTION 5: TOP & POOR PERFORMER STUDENT LISTS (Strictly Grade-Based) ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px', marginBottom: '24px' }}>
                {/* Top Performers */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5, color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                      🏆 Top Performers of the Week
                    </div>
                    <span className="chip chip-success">{weeklyData.topPerformers.length} Students</span>
                  </div>
                  <div className="table-wrap" style={{ margin: 0 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>RANK</th>
                          <th>STUDENT NAME</th>
                          <th>ROLL</th>
                          <th>EVALUATION</th>
                          <th>GRADE BREAKDOWN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyData.topPerformers.map((tp) => (
                          <tr key={tp.rollNo}>
                            <td className="num"><strong>#{tp.rank}</strong></td>
                            <td><strong>{tp.studentName}</strong></td>
                            <td className="num">{tp.rollNo}</td>
                            <td>
                              <span className="chip chip-success" style={{ fontWeight: 800 }}>{tp.overallGrade}</span>
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              <span style={{ color: '#059669', fontWeight: 700 }}>{tp.excellentCount} Excellent</span>
                              {tp.betterCount > 0 && <span style={{ color: 'var(--slate)' }}> • {tp.betterCount} Better</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Poor Performers / Needs Attention */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                      ⚠️ Needs Academic Support / Low Tier
                    </div>
                    <span className="chip chip-warning">{weeklyData.poorPerformers.length} Students</span>
                  </div>
                  <div className="table-wrap" style={{ margin: 0 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>ROLL</th>
                          <th>STUDENT NAME</th>
                          <th>EVALUATION</th>
                          <th>SUPPORT COUNT</th>
                          <th>RECOMMENDED ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyData.poorPerformers.map((pp) => (
                          <tr key={pp.rollNo}>
                            <td className="num">{pp.rollNo}</td>
                            <td><strong>{pp.studentName}</strong></td>
                            <td>
                              <span className="chip chip-warning" style={{ fontWeight: 800 }}>{pp.overallGrade}</span>
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              <span style={{ color: '#DC2626', fontWeight: 700 }}>{pp.goodCount} Good</span>
                              {pp.betterCount > 0 && <span style={{ color: 'var(--slate)' }}> • {pp.betterCount} Better</span>}
                            </td>
                            <td style={{ fontSize: '11.5px', color: 'var(--slate)' }}>
                              Concept revision session with assistant faculty
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* ── SUB-TAB 2: MONTHLY REPORT ── */}
      {/* ========================================================= */}
      {subTab === 'monthly' && (
        <>
          {isMonthlyLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--slate)' }}>
              Computing monthly academic rubric trajectory...
            </div>
          ) : !monthlyData ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--slate)' }}>
              No monthly data available.
            </div>
          ) : (
            <>
              {/* Monthly KPI Overview (Strictly Grade-Based) */}
              <div className="kpi-grid" style={{ marginBottom: '18px' }}>
                <div className="kpi-card is-success">
                  <div className="kpi-card__label">Monthly Class Average</div>
                  <div className="kpi-card__value" style={{ fontSize: '26px' }}>
                    <span className={getGradeBadgeClass(monthlyData.monthAverage)}>
                      {monthlyData.monthAverage}
                    </span>
                  </div>
                  <div className="kpi-card__hint" style={{ marginTop: '6px' }}>
                    {monthlyData.growthDownfallText}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-card__label">Previous Month Benchmark</div>
                  <div className="kpi-card__value" style={{ fontSize: '26px' }}>
                    <span className={getGradeBadgeClass(monthlyData.previousMonthAverage)}>
                      {monthlyData.previousMonthAverage}
                    </span>
                  </div>
                  <div className="kpi-card__hint">{monthlyData.previousMonthLabel}</div>
                </div>

                <div className="kpi-card is-warning">
                  <div className="kpi-card__label">Weak Concept LTs in Month</div>
                  <div className="kpi-card__value num">{monthlyData.weakQuestions?.length || 0}</div>
                  <div className="kpi-card__hint">Requires scheduled revision lectures</div>
                </div>
              </div>

              {/* Monthly Progression Chart (Week vs Average) */}
              <div className="card" style={{ padding: '18px 20px', marginBottom: '24px' }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
                    Monthly Progression Trajectory ({monthlyData.monthLabel})
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                    Week-by-week average rubric progression for overall class and individual subjects
                  </div>
                </div>
                <div style={{ height: '240px' }}>
                  {monthlyProgressionChartData && (
                    <Line
                      data={monthlyProgressionChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: ${gradeScoreToLabel(ctx.parsed.y)}`,
                            },
                          },
                        },
                        scales: GRADE_CHART_SCALES,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Week-by-Week Trajectory Table (Strictly Grade-Based) */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="card__title">Monthly Progression Ledger (Week 1 through Week 4/5)</div>
                  <div className="card__desc">Subject-wise evaluated performance grades across each week of {monthlyData.monthLabel}</div>
                </div>

                <div className="table-wrap" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>WEEK NO</th>
                        <th>DATE RANGE</th>
                        <th>TESTS CONDUCTED</th>
                        <th>OVERALL GRADE</th>
                        <th>PHYSICS</th>
                        <th>CHEMISTRY</th>
                        <th>MATHEMATICS</th>
                        <th>BIOLOGY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(monthlyData.weekSummaries || []).map((ws) => (
                        <tr key={ws.weekNo}>
                          <td><strong>Week #{ws.weekNo}</strong></td>
                          <td>{ws.label}</td>
                          <td className="num">{ws.ltsConducted} LTs</td>
                          <td>
                            <span className={getGradeBadgeClass(ws.overallAverage)} style={{ fontWeight: 800 }}>
                              {ws.overallAverage}
                            </span>
                          </td>
                          <td><strong>{ws.subjectAverages?.Physics}</strong></td>
                          <td><strong>{ws.subjectAverages?.Chemistry}</strong></td>
                          <td><strong>{ws.subjectAverages?.Mathematics}</strong></td>
                          <td><strong>{ws.subjectAverages?.Biology}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Weak LT Questions (ONLY: LT NO, SUBJECT, LT QUESTIONS LIST, CLASS AVG) */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#D97706' }}>⚠️</span>
                      Monthly Weak LT Questions
                    </div>
                    <div className="card__desc">
                      Lecture Tests during {monthlyData.monthLabel} where class evaluated average is 'Good'
                    </div>
                  </div>
                  <span className="chip chip-warning">
                    {monthlyData.weakQuestions?.length || 0} LTs Flagged
                  </span>
                </div>

                <div className="table-wrap" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '12%' }}>LT NO</th>
                        <th style={{ width: '18%' }}>SUBJECT</th>
                        <th style={{ width: '56%' }}>LT QUESTIONS LIST</th>
                        <th style={{ width: '14%' }}>CLASS AVG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!monthlyData.weakQuestions || monthlyData.weakQuestions.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#059669', fontWeight: 600 }}>
                            ✓ No weak Lecture Tests flagged for this month.
                          </td>
                        </tr>
                      ) : (
                        monthlyData.weakQuestions.map((q, idx) => (
                          <tr key={idx}>
                            <td><strong>LT #{q.ltNo}</strong></td>
                            <td><strong>{q.subject}</strong></td>
                            <td>
                              {q.questions && q.questions.length > 0 ? (
                                <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', lineHeight: 1.55 }}>
                                  {q.questions.map((qn) => (
                                    <li key={qn.questionNo} style={{ marginBottom: '4px' }}>
                                      {qn.questionText}
                                    </li>
                                  ))}
                                </ol>
                              ) : (
                                <span style={{ color: 'var(--slate)', fontSize: '12px' }}>
                                  Questions assessed in evaluation session
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={getGradeBadgeClass(q.classAvg)} style={{ fontWeight: 800 }}>
                                {q.classAvg}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* ── SUB-TAB 3: STUDENT PERFORMANCE (STRICTLY GRADE-BASED, NO PERCENTAGES) ── */}
      {/* ========================================================= */}
      {subTab === 'student' && (
        <>
          {isStudentLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--slate)' }}>
              Loading individual student LT metrics and comparative evaluation...
            </div>
          ) : !studentPerfData ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--slate)' }}>
              Student not found.
            </div>
          ) : (
            <>
              {/* Student Header Profile Card */}
              <div className="card" style={{ padding: '18px 22px', marginBottom: '18px', background: 'linear-gradient(135deg, #FFFFFF, #F8FAFC)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: '#123B5D',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 18,
                      }}
                    >
                      {studentPerfData.student?.fullName?.substring(0, 2).toUpperCase() || 'ST'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
                        {studentPerfData.student?.fullName}
                      </h3>
                      <div style={{ fontSize: 12.5, color: 'var(--slate)', marginTop: 2 }}>
                        Roll #{studentPerfData.student?.rollNo} • {studentPerfData.student?.standard} • Division {studentPerfData.student?.division} • {studentPerfData.student?.streamGroup}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className={getGradeBadgeClass(studentPerfData.kpis?.studentWeeklyGrade)} style={{ fontSize: 13, padding: '6px 14px', fontWeight: 800 }}>
                      Evaluated Grade: {studentPerfData.kpis?.studentWeeklyGrade}
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handlePrint('STUDENT', studentPerfData)}
                    >
                      🖨️ Print Student Dossier
                    </button>
                  </div>
                </div>
              </div>

              {/* Student Performance KPIs (NO percentages) */}
              <div className="kpi-grid" style={{ marginBottom: '18px' }}>
                <div className="kpi-card is-success">
                  <div className="kpi-card__label">Student Weekly Grade</div>
                  <div className="kpi-card__value" style={{ fontSize: '26px' }}>
                    <span className={getGradeBadgeClass(studentPerfData.kpis?.studentWeeklyGrade)}>
                      {studentPerfData.kpis?.studentWeeklyGrade}
                    </span>
                  </div>
                  <div className="kpi-card__hint" style={{ marginTop: '6px' }}>
                    {studentPerfData.kpis?.growthDownfallText}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-card__label">Previous Week Grade</div>
                  <div className="kpi-card__value" style={{ fontSize: '26px' }}>
                    <span className={getGradeBadgeClass(studentPerfData.kpis?.previousWeekAverage || 'Better')}>
                      {studentPerfData.kpis?.previousWeekAverage || 'Better'}
                    </span>
                  </div>
                  <div className="kpi-card__hint">Prior week benchmark</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-card__label">Tests Attended</div>
                  <div className="kpi-card__value num">
                    {studentPerfData.kpis?.testsAttended} / {studentPerfData.kpis?.totalTestsScheduled}
                  </div>
                  <div className="kpi-card__hint">
                    {studentPerfData.kpis?.gradeCounts ? (
                      <span>
                        {studentPerfData.kpis.gradeCounts.excellent} Excellent • {studentPerfData.kpis.gradeCounts.better} Better • {studentPerfData.kpis.gradeCounts.good} Good
                      </span>
                    ) : (
                      'Evaluated via Daily LTs'
                    )}
                  </div>
                </div>
              </div>

              {/* ── GRAPHS FOR STUDENT PERFORMANCE (Y-AXIS: GOOD, BETTER, EXCELLENT) ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* 1. Growth / Downfall vs Previous Week Graph */}
                <div className="card" style={{ padding: '18px 20px' }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
                      1. Growth / Downfall Compared with Previous Week
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                      Daily test rubric evaluation comparison (This Week vs Previous Week)
                    </div>
                  </div>
                  <div style={{ height: '220px' }}>
                    {studentTrajectoryChartData && (
                      <Line
                        data={studentTrajectoryChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            tooltip: {
                              callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${gradeScoreToLabel(ctx.parsed.y)}`,
                              },
                            },
                          },
                          scales: GRADE_CHART_SCALES,
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* 2. Student vs Class Average Benchmark */}
                <div className="card" style={{ padding: '18px 20px' }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
                      2. Student Performance vs Class Average
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                      Subject-wise comparative rubric grades
                    </div>
                  </div>
                  <div style={{ height: '220px' }}>
                    {studentBenchmarkChartData && (
                      <Bar
                        data={studentBenchmarkChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                            tooltip: {
                              callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${gradeScoreToLabel(ctx.parsed.y)}`,
                              },
                            },
                          },
                          scales: GRADE_CHART_SCALES,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* ── DAILY LT RESULT TABLE (Day by Day, NO percentages or raw marks) ── */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="card__title">Daily LT Result Ledger (Day by Day with Every Subject)</div>
                  <div className="card__desc">Complete evaluation sheet with student grade, class benchmark grade, and faculty remarks</div>
                </div>

                <div className="table-wrap" style={{ margin: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>DATE &amp; DAY</th>
                        <th>SUBJECT</th>
                        <th>LT #</th>
                        <th>TOPIC ASSESSED</th>
                        <th>STUDENT GRADE</th>
                        <th>CLASS BENCHMARK</th>
                        <th>STATUS VS CLASS</th>
                        <th>FACULTY REMARKS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(studentPerfData.dailyResults || []).map((r, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{r.dayName}</strong>
                            <div style={{ fontSize: 11, color: 'var(--slate)' }}>
                              {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </div>
                          </td>
                          <td><strong>{r.subject}</strong></td>
                          <td><strong>LT #{r.ltNo}</strong></td>
                          <td style={{ fontSize: 12.5 }}>{r.topic}</td>
                          <td>
                            <span className={getGradeBadgeClass(r.studentGrade)} style={{ fontWeight: 800 }}>
                              {r.studentGrade}
                            </span>
                          </td>
                          <td>
                            <span className={getGradeBadgeClass(r.classAverageGrade)}>
                              {r.classAverageGrade}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`chip ${
                                r.statusVsClass === 'ABOVE_CLASS_AVERAGE'
                                  ? 'chip-success'
                                  : r.statusVsClass === 'BELOW_CLASS_AVERAGE'
                                  ? 'chip-warning'
                                  : 'chip-neutral'
                              }`}
                              style={{ fontSize: 11.5 }}
                            >
                              {r.statusVsClass === 'ABOVE_CLASS_AVERAGE'
                                ? '▲ Above Class'
                                : r.statusVsClass === 'BELOW_CLASS_AVERAGE'
                                ? '▼ Below Class'
                                : 'At Benchmark'}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--slate)' }}>{r.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* ── SUB-TAB 4: PRINTED & SAVED REPORTS HISTORY ── */}
      {/* ========================================================= */}
      {subTab === 'saved' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="card__title">Printed &amp; Saved Reports History</div>
              <div className="card__desc">Historical ledger of all reports printed by the principal for direct re-view and re-print</div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={loadSavedReports}
            >
              ↻ Refresh Ledger
            </button>
          </div>

          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>REPORT #</th>
                  <th>TYPE</th>
                  <th>TITLE &amp; SCOPE</th>
                  <th>STANDARD / DIV</th>
                  <th>SUBJECT</th>
                  <th>EVALUATED GRADE</th>
                  <th>WEAK QUESTIONS</th>
                  <th>PRINTED AT</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {isSavedLoading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      Loading saved reports...
                    </td>
                  </tr>
                ) : savedReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No reports printed yet. Whenever you click <strong>Print Weekly Report</strong>, <strong>Print Monthly Report</strong>, or <strong>Print Student Dossier</strong>, it gets saved here automatically.
                    </td>
                  </tr>
                ) : (
                  savedReports.map((sr) => (
                    <tr key={sr.id}>
                      <td className="num"><strong>#{sr.reportNo}</strong></td>
                      <td>
                        <span className={`chip ${sr.reportType === 'WEEKLY' ? 'chip-neutral' : sr.reportType === 'MONTHLY' ? 'chip-success' : 'chip-warning'}`}>
                          {sr.reportType}
                        </span>
                      </td>
                      <td>
                        <strong>{sr.title}</strong>
                        {sr.studentName && <div style={{ fontSize: 11, color: 'var(--slate)' }}>Student: {sr.studentName}</div>}
                      </td>
                      <td>{sr.standard} • {sr.division}</td>
                      <td>{sr.subject}</td>
                      <td>
                        <span className={getGradeBadgeClass(sr.classAverageGrade || sr.classAveragePercent || 'Better')} style={{ fontWeight: 800 }}>
                          {sr.classAverageGrade || sr.classAveragePercent || 'Better'}
                        </span>
                      </td>
                      <td>{sr.weakQuestionsCount}</td>
                      <td className="num" style={{ fontSize: 12 }}>
                        {new Date(sr.printedAt || sr.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ marginRight: 6 }}
                          onClick={() => {
                            if (sr.dataSnapshot) {
                              setPrintType(sr.reportType);
                              setPrintPayload(sr.dataSnapshot);
                              triggerLtReportPrint(sr.dataSnapshot, sr.reportType);
                            }
                          }}
                        >
                          🖨️ Re-Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PRINT COMPONENT PORTAL ── */}
      {printPayload && (
        <PrintableLtReport
          report={printPayload}
          reportType={printType}
          onClose={() => setPrintPayload(null)}
        />
      )}
    </div>
  );
}
