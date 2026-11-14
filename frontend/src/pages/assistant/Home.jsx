import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { studentApi } from '../../services/studentApi';
import { ltApi } from '../../services/ltApi';
import { examApi } from '../../services/examApi';
import { API_ROOT } from '../../services/apiConfig';
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

  // Student Login Control States
  const [studentLoginEnabled, setStudentLoginEnabled] = useState(true);
  const [isTogglingLogin, setIsTogglingLogin] = useState(false);
  const [loginStatusMessage, setLoginStatusMessage] = useState(null);

  useEffect(() => {
    setHeader({
      title: `Good morning, ${user?.name || assistant.assistant?.name || 'Assistant Faculty'}`,
      subtitle: `${user?.name || assistant.assistant?.name || 'Assistant Faculty'} — Daily Operations & Marks Entry Hub`
    });
  }, [setHeader, user, assistant]);

  // Load dynamic students, LTs, Exams & Login Status
  const fetchData = useCallback(async () => {
    try {
      const [students, lts, exams, statusRes] = await Promise.all([
        studentApi.getStudents({ status: 'ACTIVE' }).catch(() => null),
        ltApi.getAllLts({}).catch(() => null),
        examApi.getAllExams({}).catch(() => null),
        fetch(`${API_ROOT}/api/auth/student-login-status`, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => null),
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
      if (statusRes && typeof statusRes.enabled === 'boolean') {
        setStudentLoginEnabled(statusRes.enabled);
      }
    } catch (e) {
      console.warn('Could not fetch dashboard data for Assistant:', e);
    }
  }, []);

  const handleToggleStudentLogin = async (newStatus) => {
    if (!newStatus) {
      const confirmed = window.confirm(
        '⚠️ Are you sure you want to DISABLE student login?\n\n' +
        '• All currently logged-in students will be immediately logged out.\n' +
        '• No student will be able to log in to their dashboard or CBT exams until you re-enable it.'
      );
      if (!confirmed) return;
    }

    setIsTogglingLogin(true);
    setLoginStatusMessage(null);
    try {
      const res = await fetch(`${API_ROOT}/api/auth/student-login-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStudentLoginEnabled(data.enabled);
        setLoginStatusMessage(
          data.enabled
            ? '✓ Student login is now ENABLED. Students can log in to their dashboard and CBT exams.'
            : '✓ Student login is now DISABLED. All active students have been logged out and cannot log in.'
        );
      } else {
        setLoginStatusMessage('Failed to update student login status: ' + (data.message || 'Server error'));
      }
    } catch (err) {
      setLoginStatusMessage('Network error updating student login status');
    } finally {
      setIsTogglingLogin(false);
    }
  };

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
      {/* ── STUDENT LOGIN ACCESS CONTROL BANNER ── */}
      <div
        className="card"
        style={{
          marginBottom: 20,
          background: studentLoginEnabled
            ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
            : 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)',
          border: studentLoginEnabled ? '1.5px solid #86efac' : '1.5px solid #fca5a5',
          padding: '18px 24px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: studentLoginEnabled ? '#dcfce7' : '#fee2e2',
                color: studentLoginEnabled ? '#15803d' : '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              {studentLoginEnabled ? '🔓' : '🔒'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>
                  Student Portal Access Control
                </h3>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 12px',
                    borderRadius: 9999,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: studentLoginEnabled ? '#dcfce7' : '#fee2e2',
                    color: studentLoginEnabled ? '#15803d' : '#b91c1c',
                    border: studentLoginEnabled ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: studentLoginEnabled ? '#16a34a' : '#dc2626',
                      display: 'inline-block',
                      animation: studentLoginEnabled ? 'pulse 2s infinite' : 'none',
                    }}
                  />
                  {studentLoginEnabled ? 'Student Login: ENABLED (Allowed)' : 'Student Login: DISABLED (Blocked)'}
                </span>
              </div>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.84rem', color: '#475569' }}>
                {studentLoginEnabled
                  ? 'Students can sign in to their portal and attempt CBT exams. Disabling will immediately log out all currently active students.'
                  : 'Student logins are strictly blocked and all students have been logged out. Re-enable when ready for exams or portal access.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {studentLoginEnabled ? (
              <button
                type="button"
                className="btn"
                disabled={isTogglingLogin}
                onClick={() => handleToggleStudentLogin(false)}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 22px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  borderRadius: 8,
                  cursor: isTogglingLogin ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
                }}
              >
                <span>🚫</span>
                <span>{isTogglingLogin ? 'Disabling...' : 'Disable Student Login'}</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                disabled={isTogglingLogin}
                onClick={() => handleToggleStudentLogin(true)}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 22px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  borderRadius: 8,
                  cursor: isTogglingLogin ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                }}
              >
                <span>✅</span>
                <span>{isTogglingLogin ? 'Enabling...' : 'Enable Student Login'}</span>
              </button>
            )}
          </div>
        </div>

        {loginStatusMessage && (
          <div
            style={{
              marginTop: 12,
              padding: '9px 14px',
              borderRadius: 6,
              fontSize: '0.82rem',
              fontWeight: 600,
              background: studentLoginEnabled ? '#f0fdf4' : '#fef2f2',
              color: studentLoginEnabled ? '#166534' : '#991b1b',
              border: studentLoginEnabled ? '1px solid #bbf7d0' : '1px solid #fecaca',
            }}
          >
            {loginStatusMessage}
          </div>
        )}
      </div>

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
