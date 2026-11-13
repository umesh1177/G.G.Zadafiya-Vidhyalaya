import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { studentApi } from '../../services/studentApi';
import { syllabusApi } from '../../services/syllabusApi';
import { ltApi } from '../../services/ltApi';
import { calculateSyllabusCompletion } from '../../utils/syllabusUtils';
import PaginationBar from '../../components/common/PaginationBar';
import ViewFullLtModal from '../../components/common/ViewFullLtModal';

export default function FacultyHome() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();
  const { faculty } = useData();

  const [subjectStudentsCount, setSubjectStudentsCount] = useState(0);
  const [liveSyllabusStats, setLiveSyllabusStats] = useState(null);
  const [todayFinishedList, setTodayFinishedList] = useState([]);
  const [ltHistoryList, setLtHistoryList] = useState([]);

  // Pagination & Modal States
  const [finishedPage, setFinishedPage] = useState(1);
  const [ltPage, setLtPage] = useState(1);
  const [viewingLt, setViewingLt] = useState(null);
  const FINISHED_PAGE_SIZE = 5;
  const LT_PAGE_SIZE = 6;

  useEffect(() => {
    setHeader({
      title: `Good morning, ${user?.name || faculty.faculty?.name || 'Faculty Member'}`,
      subtitle: `${user?.subject || faculty.faculty?.subject || 'Physics'} Faculty — Today's teaching & LT overview`
    });
  }, [setHeader, user, faculty]);

  // Load dynamic students, today's finished syllabus topics, overall stats & LTs
  useEffect(() => {
    let isMounted = true;
    const fetchDashboardMetrics = async () => {
      try {
        const sub = user?.subject || faculty.faculty?.subject || 'Physics';
        const facultyId = user?.id || user?._id || user?.empCode || user?.username || 'faculty';
        const batchPairs = [
          { standard: 'Standard 12', division: 'Division A' },
          { standard: 'Standard 12', division: 'Division B' },
          { standard: 'Standard 11', division: 'Division A' },
          { standard: 'Standard 11', division: 'Division B' },
        ];

        const [students, todayFinished, lts, ...batchChapters] = await Promise.all([
          studentApi.getStudents({ status: 'ACTIVE' }).catch(() => []),
          syllabusApi.getTodayFinished({ subject: sub, facultyId, role: 'faculty' }).catch(() => []),
          ltApi.getAllLts({ subject: sub }).catch(() => []),
          ...batchPairs.map(bp =>
            syllabusApi
              .getSyllabus({ subject: sub, standard: bp.standard, division: bp.division, facultyId, role: 'faculty' })
              .catch(() => [])
          ),
        ]);

        if (!isMounted) return;

        if (Array.isArray(students)) {
          const active = students.filter(s => s.status === 'ACTIVE');
          const subLower = sub.toLowerCase();
          if (subLower.includes('math')) {
            setSubjectStudentsCount(active.filter(s => s.streamGroup === 'GROUP_A' || s.streamGroup === 'GROUP_AB').length);
          } else if (subLower.includes('bio')) {
            setSubjectStudentsCount(active.filter(s => s.streamGroup === 'GROUP_B' || s.streamGroup === 'GROUP_AB').length);
          } else {
            setSubjectStudentsCount(active.length);
          }
        }

        const mergedChapters = batchChapters.flat().filter(Boolean);
        if (mergedChapters.length > 0) {
          setLiveSyllabusStats(calculateSyllabusCompletion(mergedChapters));
        } else {
          setLiveSyllabusStats(null);
        }

        setTodayFinishedList(Array.isArray(todayFinished) ? todayFinished : []);
        setLtHistoryList(Array.isArray(lts) ? lts : []);
      } catch (e) {
        console.warn('Could not fetch live dashboard metrics:', e);
      }
    };
    fetchDashboardMetrics();
    const handleFocus = () => fetchDashboardMetrics();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchDashboardMetrics();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, faculty]);

  const f = faculty;
  const currentSubject = user?.subject || f.faculty?.subject || 'Physics';

  const safeFinishedPage = Math.min(finishedPage, Math.max(1, Math.ceil(todayFinishedList.length / FINISHED_PAGE_SIZE)));
  const paginatedFinished = todayFinishedList.slice(
    (safeFinishedPage - 1) * FINISHED_PAGE_SIZE,
    safeFinishedPage * FINISHED_PAGE_SIZE
  );

  const safeLtPage = Math.min(ltPage, Math.max(1, Math.ceil(ltHistoryList.length / LT_PAGE_SIZE)));
  const paginatedLts = ltHistoryList.slice(
    (safeLtPage - 1) * LT_PAGE_SIZE,
    safeLtPage * LT_PAGE_SIZE
  );

  return (
    <>
      {/* ── KPI GRID (DYNAMIC METRICS) ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Active Subject Students</div>
          <div className="kpi-card__value num">{subjectStudentsCount || 0}</div>
          <div className="kpi-card__hint">Std 11 &amp; 12 {currentSubject} batch</div>
        </div>
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Finished Today</div>
          <div className="kpi-card__value num">{todayFinishedList.length}</div>
          <div className="kpi-card__hint">Topics completed in lectures today</div>
        </div>
        <div className="kpi-card is-warning">
          <div className="kpi-card__label">Pending Chapters</div>
          <div className="kpi-card__value num">{liveSyllabusStats ? liveSyllabusStats.pendingChapters : 0}</div>
          <div className="kpi-card__hint">{liveSyllabusStats ? `${liveSyllabusStats.completedChapters} completed chapters` : 'In progress / remaining'}</div>
        </div>
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Overall Completion</div>
          <div className="kpi-card__value num">{liveSyllabusStats ? liveSyllabusStats.overallPercent : 0}%</div>
          <div className="kpi-card__hint">
            {liveSyllabusStats
              ? `${liveSyllabusStats.doneUnits}/${liveSyllabusStats.totalUnits} units finished`
              : 'Real-time syllabus pace'}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        {/* Today's Finished Topics (Dynamic from Syllabus Finish Action) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card__head" style={{ padding: '16px 18px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ minWidth: 0 }}>
                <div className="card__title">Today&apos;s Finished Topics</div>
                <div className="card__desc">Topics marked Finish today in Syllabus Tracker ({currentSubject})</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to="/faculty/syllabus" className="btn btn-ghost btn-sm">Update Tracker</Link>
                <Link to="/faculty/set-lt" className="btn btn-primary btn-sm">Set LT →</Link>
              </div>
            </div>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Sr No</th>
                    <th>Topic No</th>
                    <th>Topic Name</th>
                    <th>Chapter</th>
                  </tr>
                </thead>
                <tbody>
                  {todayFinishedList.length > 0 ? (
                    paginatedFinished.map((t, idx) => {
                      const srNo = (safeFinishedPage - 1) * FINISHED_PAGE_SIZE + idx + 1;
                      return (
                        <tr key={t.id || `${t.code}-${srNo}`}>
                          <td className="num">{srNo}</td>
                          <td className="num"><span className="chip chip-neutral">{t.code}</span></td>
                          <td>
                            <strong>{t.title}</strong>
                            {t.titleGujarati && t.titleGujarati !== t.title && (
                              <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>{t.titleGujarati}</div>
                            )}
                          </td>
                          <td>
                            Ch {t.chapterNo}: {t.chapterName}
                            <div style={{ fontSize: 11, color: 'var(--slate)' }}>{t.standard}</div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 22, color: 'var(--slate)' }}>
                        No topics marked Finish today yet. Go to <strong>Syllabus Tracker</strong> and click <strong>Finish</strong> on completed topics.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationBar
            currentPage={safeFinishedPage}
            totalItems={todayFinishedList.length}
            pageSize={FINISHED_PAGE_SIZE}
            onPageChange={setFinishedPage}
            itemLabel="finished topics"
          />
        </div>

        {/* Quick Actions & Tools */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Quick Actions &amp; Tools</div>
              <div className="card__desc">Daily tasks for subject faculty</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link to="/faculty/set-lt" className="btn btn-primary" style={{ textAlign: 'center', justifyContent: 'center' }}>
              + Schedule New Daily Lecture Test (LT)
            </Link>
            <Link to="/faculty/syllabus" className="btn btn-secondary" style={{ textAlign: 'center', justifyContent: 'center' }}>
              Open Syllabus Tracker (Mark Finish)
            </Link>
            <Link to="/faculty/exam-unit" className="btn btn-ghost" style={{ textAlign: 'center', justifyContent: 'center' }}>
              Manage Upcoming Exam Syllabus Units
            </Link>
            <Link to="/faculty/profile" className="btn btn-ghost" style={{ textAlign: 'center', justifyContent: 'center' }}>
              View &amp; Edit My Profile ({user?.empCode || 'FAC101'})
            </Link>
          </div>
        </div>
      </div>

      {/* Recent LT History */}
      <div className="card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
        <div className="card__head" style={{ padding: '16px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}>
          <div>
            <div className="card__title">Recent Lecture Test (LT) History ({ltHistoryList.length})</div>
            <div className="card__desc">Tests submitted to assistant faculty for evaluation</div>
          </div>
          <Link to="/faculty/set-lt" className="btn btn-ghost btn-sm">Open Set LT &amp; History →</Link>
        </div>
        <div className="table-wrap" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th>LT No</th>
                <th>Date</th>
                <th>Standard</th>
                <th>Subject</th>
                <th>Questions / Topics</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {ltHistoryList.length > 0 ? (
                paginatedLts.map((lt) => (
                  <tr key={lt.id || lt._id}>
                    <td className="num"><strong>LT #{lt.ltNo}</strong></td>
                    <td className="num">{lt.examDate ? new Date(lt.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td>{lt.standard === 'STD_11' ? 'Standard 11' : 'Standard 12'}</td>
                    <td><strong>{lt.subject}</strong></td>
                    <td>{lt.questions?.length || lt.topicsCovered?.length || 0} Questions</td>
                    <td>
                      <span className={`chip ${
                        lt.status === 'EVALUATED' ? 'chip-success' :
                        lt.status === 'CONDUCTED' ? 'chip-neutral' : 'chip-warning'
                      }`}>
                        {lt.status === 'EVALUATED' ? 'Evaluated' : lt.status === 'CONDUCTED' ? 'Pending Marks' : 'Scheduled'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setViewingLt(lt)}
                      >
                        👁️ View LT
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--slate)' }}>
                    No Lecture Tests scheduled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          currentPage={safeLtPage}
          totalItems={ltHistoryList.length}
          pageSize={LT_PAGE_SIZE}
          onPageChange={setLtPage}
          itemLabel="lecture tests"
        />
      </div>

      <ViewFullLtModal
        lt={viewingLt}
        onClose={() => setViewingLt(null)}
      />
    </>
  );
}
