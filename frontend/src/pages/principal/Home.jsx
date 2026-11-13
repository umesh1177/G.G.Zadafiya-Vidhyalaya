import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { studentApi } from '../../services/studentApi';
import { facultyApi } from '../../services/facultyApi';
import { syllabusApi } from '../../services/syllabusApi';
import { examApi } from '../../services/examApi';
import { disciplineApi } from '../../services/disciplineApi';
import { noticeApi } from '../../services/noticeApi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function PrincipalHome() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();
  const { principal } = useData();

  const [dynamicStats, setDynamicStats] = useState({
    loaded: false,
    totalStudents: 0,
    groupA: 0,
    groupB: 0,
    groupAB: 0,
    totalFaculty: 0,
    subjectFaculty: 0,
    assistantFaculty: 0,
    syllabusSubjects: null,
    examPendingCount: null,
    recentCompletedExams: null,
    recentDisciplineFlags: null,
    recentNotices: null,
  });

  useEffect(() => {
    setHeader({
      title: `Good morning, ${user?.name || principal.principal?.name || 'Principal'}`,
      subtitle: "Here's how the school is tracking today"
    });
  }, [setHeader, user, principal]);

  const fetchLiveCounts = useCallback(async () => {
    try {
      const [students, faculty, sylOverview, examSummary, discRemarks, noticesList] = await Promise.all([
        studentApi.getStudents({ status: 'ACTIVE' }).catch(() => null),
        facultyApi.getFaculty({ status: 'ACTIVE' }).catch(() => null),
        syllabusApi
          .getPrincipalOverview({ standard: 'ALL', division: 'ALL', subject: 'ALL', facultyId: 'ALL', day: 'all' })
          .catch(() => null),
        examApi.getExamAnalysisSummary({}).catch(() => null),
        disciplineApi.getAllRemarks({}).catch(() => null),
        noticeApi.getNotices({ viewerRole: 'principal', box: 'all' }).catch(() => null),
      ]);

      const activeStudents = Array.isArray(students) ? students.filter(s => s.status === 'ACTIVE') : [];
      const activeFaculty = Array.isArray(faculty) ? faculty.filter(f => f.status === 'ACTIVE') : [];
      const liveSubjects = Array.isArray(sylOverview?.subjectStats)
        ? sylOverview.subjectStats.map((s) => ({
            name: s.subject,
            completion: s.overallPercent,
          }))
        : null;
      const livePendingExams = examSummary?.stats?.pending ?? null;
      const liveCompletedExams = Array.isArray(examSummary?.completedExams)
        ? examSummary.completedExams.slice(0, 5).map((e) => ({
            subject: `${e.subject} (#${e.examNo})`,
            classAverage: e.classAveragePercent ?? 0,
          }))
        : null;

      setDynamicStats({
        loaded: Boolean(students || faculty),
        totalStudents: activeStudents.length,
        groupA: activeStudents.filter(s => s.streamGroup === 'GROUP_A').length,
        groupB: activeStudents.filter(s => s.streamGroup === 'GROUP_B').length,
        groupAB: activeStudents.filter(s => s.streamGroup === 'GROUP_AB').length,
        totalFaculty: activeFaculty.length,
        subjectFaculty: activeFaculty.filter(f => f.role === 'Subject Faculty').length,
        assistantFaculty: activeFaculty.filter(f => f.role === 'Assistant Faculty').length,
        syllabusSubjects: liveSubjects,
        examPendingCount: livePendingExams,
        recentCompletedExams: liveCompletedExams,
        recentDisciplineFlags: Array.isArray(discRemarks) ? discRemarks.slice(0, 5) : null,
        recentNotices: Array.isArray(noticesList) ? noticesList.slice(0, 4) : null,
      });
    } catch (err) {
      console.warn('Could not fetch dynamic stats for Principal dashboard:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchLiveCounts();
    const handleFocus = () => fetchLiveCounts();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchLiveCounts();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchLiveCounts]);

  const pendingExamCount =
    dynamicStats.examPendingCount !== null && dynamicStats.examPendingCount !== undefined
      ? dynamicStats.examPendingCount
      : (principal.examStats?.pending || 0);

  const completedExams =
    Array.isArray(dynamicStats.recentCompletedExams) && dynamicStats.recentCompletedExams.length > 0
      ? dynamicStats.recentCompletedExams
      : (principal.exams?.filter(e => e.status === 'completed').slice(0, 5) || []);
  const chartData = {
    labels: completedExams.map(e => e.subject),
    datasets: [{
      label: 'Class Average (%)',
      data: completedExams.map(e => e.classAverage),
      backgroundColor: '#123B5D',
      borderRadius: 6,
      maxBarThickness: 36
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: '#EEF0F8' },
        ticks: { font: { family: 'IBM Plex Mono', size: 11 } }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Manrope', size: 11, weight: 600 } }
      }
    }
  };

  const syllabusSubjects = dynamicStats.syllabusSubjects || principal.syllabus?.subjects || [];
  const avgSyllabus = syllabusSubjects.length
    ? Math.round(syllabusSubjects.reduce((a, s) => a + s.completion, 0) / syllabusSubjects.length)
    : 0;

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Total Students</div>
          <div className="kpi-card__value num">{dynamicStats.loaded ? dynamicStats.totalStudents : (principal.studentStats?.total || 0)}</div>
          <div className="kpi-card__hint">
            Group A {dynamicStats.groupA} · B {dynamicStats.groupB} · AB {dynamicStats.groupAB}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Total Faculty</div>
          <div className="kpi-card__value num">{dynamicStats.loaded ? dynamicStats.totalFaculty : (principal.facultyStats?.total || 0)}</div>
          <div className="kpi-card__hint">
            {dynamicStats.subjectFaculty} Subject · {dynamicStats.assistantFaculty} Assistant
          </div>
        </div>
        <div className="kpi-card is-warning">
          <div className="kpi-card__label">Pending Mark Entry</div>
          <div className="kpi-card__value num">{pendingExamCount}</div>
          <div className="kpi-card__hint">Exams completed, marks not yet entered</div>
        </div>
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Avg. Syllabus Completion</div>
          <div className="kpi-card__value num">{avgSyllabus}%</div>
          <div className="kpi-card__hint">Across Physics, Chemistry, Maths, Biology</div>
        </div>
      </div>

      {pendingExamCount > 0 && (
        <div className="banner banner-warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
            <path d="M12 9v4M12 16.5h.01"/>
            <path d="M10.3 3.9l-8 13.5A1.6 1.6 0 0 0 3.7 20h16.6a1.6 1.6 0 0 0 1.4-2.4l-8-13.5a1.6 1.6 0 0 0-2.8 0Z"/>
          </svg>
          <span>
            {pendingExamCount} exam(s) are marked complete or scheduled and awaiting marks entry — review in Exam Analysis.
          </span>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">This Week's Exam Performance</div>
              <div className="card__desc">Class average across all subjects tested this week</div>
            </div>
            <Link to="/principal/exam-analysis" className="btn btn-ghost btn-sm">View full analysis</Link>
          </div>
          <div className="chart-row">
            <div className="chart-box" style={{ height: 170, position: 'relative' }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
            <div className="legend-list" style={{ marginTop: 10 }}>
              {completedExams.map((e, idx) => (
                <div key={idx} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 4 }}>
                  <span className="legend-dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#123B5D' }}></span>
                  {e.subject} — <strong className="num">{e.classAverage}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Syllabus Progress</div>
              <div className="card__desc">% completed by subject</div>
            </div>
            <Link to="/principal/syllabus-tracking" className="btn btn-ghost btn-sm">Open</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {syllabusSubjects.map((s, idx) => (
              <div key={idx} className="progress-row">
                <div className="progress-row__label" style={{ fontSize: '13.4px', fontWeight: 600, marginBottom: 2 }}>{s.name}</div>
                <div className="progress-track" style={{ background: '#eef0f8', borderRadius: 4, height: 8, width: '100%', overflow: 'hidden', marginBottom: 4 }}>
                  <div className="progress-fill" style={{ width: `${s.completion}%`, background: '#123B5D', height: '100%', borderRadius: 4 }} />
                </div>
                <div className="progress-row__value num" style={{ fontSize: 12, textAlign: 'right', color: '#64748b' }}>{s.completion}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Recent Discipline Flags</div>
              <div className="card__desc">Latest noted incidents across all standards</div>
            </div>
            <Link to="/principal/discipline-remark" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Roll No</th><th>Name</th><th>Type</th><th>Date</th></tr>
              </thead>
              <tbody>
                {(dynamicStats.recentDisciplineFlags !== null ? dynamicStats.recentDisciplineFlags : (principal.discipline?.undisciplined || [])).length > 0 ? (
                  (dynamicStats.recentDisciplineFlags !== null ? dynamicStats.recentDisciplineFlags : principal.discipline.undisciplined).slice(0, 5).map((d, i) => (
                    <tr key={d.id || i}>
                      <td className="num">#{d.rollNo}</td>
                      <td>{d.studentName || d.name}</td>
                      <td><span className="chip chip-warning">{d.type}</span></td>
                      <td className="num">{d.date ? new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: '14px 0' }}>No recent disciplinary incidents recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Recent Notices</div>
              <div className="card__desc">Latest sent or received across staff &amp; students</div>
            </div>
            <Link to="/principal/notice-message" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {(dynamicStats.recentNotices !== null ? dynamicStats.recentNotices : (principal.notices || [])).length > 0 ? (
              (dynamicStats.recentNotices !== null ? dynamicStats.recentNotices : principal.notices).slice(0, 3).map((n, idx) => (
                <li key={n.id || idx} style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="flex items-center gap-8" style={{ marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className="chip chip-neutral">{n.type}</span>
                    {n.audienceLabel && <span style={{ fontSize: 11.5, fontWeight: 700, color: '#123B5D' }}>To: {n.audienceLabel}</span>}
                    <span className="text-slate num" style={{ fontSize: '11.5px' }}>
                      {n.date ? new Date(n.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', overflowWrap: 'anywhere' }}>
                    {n.message.length > 90 ? n.message.slice(0, 90) + '…' : n.message}
                  </div>
                </li>
              ))
            ) : (
              <li style={{ padding: '14px 0', textAlign: 'center', color: '#64748b' }}>No public notices or updates posted recently.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}

