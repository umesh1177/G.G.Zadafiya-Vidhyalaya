import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { studentApi } from '../../services/studentApi';
import { ltApi } from '../../services/ltApi';
import { examApi } from '../../services/examApi';
import PaginationBar from '../../components/common/PaginationBar';
import ViewFullLtModal from '../../components/common/ViewFullLtModal';

export default function AssistantHome() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();
  const { assistant } = useData();

  const [activeStudentsTotal, setActiveStudentsTotal] = useState(0);
  const [liveLts, setLiveLts] = useState([]);
  const [liveExams, setLiveExams] = useState([]);
  const [ltPage, setLtPage] = useState(1);
  const [viewingLt, setViewingLt] = useState(null);
  const LT_PAGE_SIZE = 5;

  useEffect(() => {
    setHeader({
      title: `Good morning, ${user?.name || assistant.assistant?.name || 'Assistant Faculty'}`,
      subtitle: `${user?.name || assistant.assistant?.name || 'Assistant Faculty'} — Daily Operations & Marks Entry Hub`
    });
  }, [setHeader, user, assistant]);

  // Load dynamic students, LTs & Exams from MongoDB
  const fetchData = useCallback(async () => {
    try {
      const [students, lts, exams] = await Promise.all([
        studentApi.getStudents({ status: 'ACTIVE' }).catch(() => null),
        ltApi.getAllLts({}).catch(() => null),
        examApi.getAllExams({}).catch(() => null),
      ]);
      if (Array.isArray(students)) {
        setActiveStudentsTotal(students.filter(s => s.status === 'ACTIVE').length);
      }
      if (Array.isArray(lts)) {
        setLiveLts(lts);
      }
      if (Array.isArray(exams)) {
        setLiveExams(exams);
      }
    } catch (e) {
      console.warn('Could not fetch dashboard data for Assistant:', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const handleRefresh = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, [fetchData]);

  const scheduledLts = liveLts.filter(lt => lt.status === 'SCHEDULED');
  const conductedPendingLts = liveLts.filter(lt => lt.status === 'CONDUCTED');
  const activeQueueLts = liveLts.filter(lt => lt.status === 'SCHEDULED' || lt.status === 'CONDUCTED');
  const pendingExamMarksCount = liveExams.filter(ex => ex.status === 'CONDUCTED').length;

  const safeLtPage = Math.min(ltPage, Math.max(1, Math.ceil(activeQueueLts.length / LT_PAGE_SIZE)));
  const paginatedQueueLts = activeQueueLts.slice(
    (safeLtPage - 1) * LT_PAGE_SIZE,
    safeLtPage * LT_PAGE_SIZE
  );

  return (
    <>
      {/* ── KPI GRID (DYNAMIC METRICS) ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Today&apos;s Scheduled LTs</div>
          <div className="kpi-card__value num">{scheduledLts.length}</div>
          <div className="kpi-card__hint">Ready to run timer &amp; projector</div>
        </div>
        <div className="kpi-card is-warning">
          <div className="kpi-card__label">Pending LT Marks</div>
          <div className="kpi-card__value num">{conductedPendingLts.length}</div>
          <div className="kpi-card__hint">Finished LTs awaiting grade entry</div>
        </div>
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Students Under Evaluation</div>
          <div className="kpi-card__value num">{activeStudentsTotal || 0}</div>
          <div className="kpi-card__hint">Active Science students in roster</div>
        </div>
        <div className="kpi-card is-danger">
          <div className="kpi-card__label">Pending Exam Marks</div>
          <div className="kpi-card__value num">{pendingExamMarksCount}</div>
          <div className="kpi-card__hint">Exams awaiting marks entry</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        {/* Active LT Queue with Pagination */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card__head" style={{ padding: '16px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}>
              <div>
                <div className="card__title">Active Lecture Tests (LT) Queue ({activeQueueLts.length})</div>
                <div className="card__desc">Conduct tests with projector timer or grade pending marksheets</div>
              </div>
              <Link to="/assistant/lt" className="btn btn-primary btn-sm">Open LT &amp; Timer →</Link>
            </div>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>LT No</th>
                    <th>Subject &amp; Standard</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeQueueLts.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>
                        No pending or scheduled Lecture Tests right now.
                      </td>
                    </tr>
                  ) : (
                    paginatedQueueLts.map((lt) => {
                      const ltId = lt.id || lt._id;
                      return (
                        <tr key={ltId}>
                          <td className="num"><strong>LT #{lt.ltNo}</strong></td>
                          <td>
                            <div><strong>{lt.subject}</strong> ({lt.standard === 'STD_11' ? 'Std 11' : 'Std 12'})</div>
                            <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                              {lt.questions?.length || 0} Questions • {lt.examDate ? new Date(lt.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </div>
                          </td>
                          <td>
                            <span className={`chip ${lt.status === 'CONDUCTED' ? 'chip-neutral' : 'chip-warning'}`}>
                              {lt.status === 'CONDUCTED' ? 'Pending Marks' : 'Scheduled'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setViewingLt(lt)}
                              >
                                View LT
                              </button>
                              <Link
                                to={lt.status === 'CONDUCTED' ? `/assistant/lt/enter-marks/${ltId}` : '/assistant/lt'}
                                className="btn btn-primary btn-sm"
                              >
                                {lt.status === 'CONDUCTED' ? 'Enter Marks →' : 'Open Timer →'}
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationBar
            currentPage={safeLtPage}
            totalItems={activeQueueLts.length}
            pageSize={LT_PAGE_SIZE}
            onPageChange={setLtPage}
            itemLabel="active LTs"
          />
        </div>

        {/* Quick Operations Links */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Operations &amp; Tasks Quick Links</div>
              <div className="card__desc">Daily routines for laboratory assistants</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link to="/assistant/lt" className="btn btn-primary" style={{ justifyContent: 'center' }}>
              Open LT &amp; Timer Suite ({scheduledLts.length} Scheduled, {conductedPendingLts.length} Pending Marks)
            </Link>
            <Link to="/assistant/exam" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              Grade Exam Marks &amp; Assessments
            </Link>
            <Link to="/assistant/result" className="btn btn-ghost" style={{ justifyContent: 'center' }}>
              Generate Result Spreadsheets &amp; Transcripts
            </Link>
            <Link to="/assistant/hall-ticket" className="btn btn-ghost" style={{ justifyContent: 'center' }}>
              Dispatch &amp; Print Student Hall Tickets
            </Link>
            <Link to="/assistant/profile" className="btn btn-ghost" style={{ justifyContent: 'center' }}>
              View &amp; Edit My Profile ({user?.empCode || 'FAC102'})
            </Link>
          </div>
        </div>
      </div>

      <ViewFullLtModal
        lt={viewingLt}
        onClose={() => setViewingLt(null)}
      />
    </>
  );
}
