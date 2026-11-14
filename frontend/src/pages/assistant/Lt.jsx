import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ltApi } from '../../services/ltApi';
import { studentApi } from '../../services/studentApi';
import PaginationBar from '../../components/common/PaginationBar';
import ViewFullLtModal from '../../components/common/ViewFullLtModal';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Timer,
  Pause,
  Play,
  Clock,
  Check,
  Eye,
  Pencil,
} from 'lucide-react';

export default function AssistantLt() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();

  useEffect(() => {
    setHeader({
      title: 'LT & Timer',
      subtitle: "Daily Lecture Test — set timer, view today's LTs, review history, enter pending marks"
    });
  }, [setHeader]);

  // Active Top Tab: 'today' | 'history' | 'pending'
  const [activeTab, setActiveTab] = useState('today');

  // Dynamic LTs & Active Students from MongoDB
  const [allLts, setAllLts] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Pagination States for Every Table
  const [todayPage, setTodayPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [pendingListPage, setPendingListPage] = useState(1);
  const [studentPageByLt, setStudentPageByLt] = useState({});
  const LT_PAGE_SIZE = 5;
  const STUDENT_PAGE_SIZE = 8;

  // View Full LT Modal State
  const [viewingLt, setViewingLt] = useState(null);

  // Set Timer Modal State (opens first when clicking Set LT Timer or row Start LT Timer)
  const [timerModalLt, setTimerModalLt] = useState(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [inputMinutes, setInputMinutes] = useState(15);
  const [inputSeconds, setInputSeconds] = useState(0);

  // Fullscreen Projector Timer State
  const [projectorLt, setProjectorLt] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [projEditMin, setProjEditMin] = useState(15);
  const [projEditSec, setProjEditSec] = useState(0);

  // Pending LT Enter Marks Dropdown State
  const [expandedPendingLts, setExpandedPendingLts] = useState({});
  const [marksDraftByLt, setMarksDraftByLt] = useState({});
  const [savingLtId, setSavingLtId] = useState(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [lts, students] = await Promise.all([
        ltApi.getAllLts().catch(() => null),
        studentApi.getStudents({ status: 'ACTIVE' }).catch(() => null),
      ]);
      if (Array.isArray(lts)) setAllLts(lts);
      if (Array.isArray(students)) setAllStudents(students.filter(s => s.status === 'ACTIVE'));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleRefresh = () => {
      if (document.visibilityState === 'visible') loadData(true);
    };
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
  }, [loadData]);

  // Countdown Interval for Projector Timer
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining]);

  const formatClock = (totalSecs) => {
    const safe = Math.max(0, totalSecs);
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatStd = (std) => (std === 'STD_11' || std === 'Standard 11' ? 'Standard 11' : 'Standard 12');

  const normalizeGrade = (g) => {
    const up = String(g || '').trim().toUpperCase();
    if (up === 'EXCELLENT') return 'Excellent';
    if (up === 'BETTER') return 'Better';
    if (up === 'GOOD' || up === 'POOR') return 'Good';
    if (up === 'AB' || up === 'ABSENT') return 'AB';
    return 'Better';
  };

  const getMatchingStudents = (lt) => {
    const targetStd = lt.standard === 'STD_11' || lt.standard === 'Standard 11' ? 'STD_11' : 'STD_12';
    return allStudents.filter(s => {
      if (s.standard && s.standard !== targetStd) return false;
      if (lt.division && lt.division !== 'ALL' && s.division && s.division !== lt.division) return false;
      return true;
    });
  };

  // Open Set Timer Modal First (when clicking row "Start LT Timer" or top "Set LT Timer")
  const openSetTimerForLt = (lt = null) => {
    setTimerModalLt(lt);
    const m = lt?.duration !== undefined ? lt.duration : 15;
    const s = lt?.durationSeconds !== undefined ? lt.durationSeconds : 0;
    setInputMinutes(m);
    setInputSeconds(s);
    setShowTimerModal(true);
  };

  // Save Time Only or Launch Full Projector Screen
  const handleConfirmTimerModal = async (launchProjector = true) => {
    const m = Math.max(0, Number(inputMinutes) || 0);
    const s = Math.max(0, Math.min(59, Number(inputSeconds) || 0));
    const totalSecs = m * 60 + s;
    if (totalSecs <= 0) {
      setErrorMsg('Please set a valid duration greater than 0 seconds.');
      return;
    }

    setErrorMsg(null);
    if (timerModalLt) {
      try {
        const ltId = timerModalLt.id || timerModalLt._id;
        const updated = await ltApi.updateLt(ltId, { duration: m, durationSeconds: s });
        setAllLts(prev => prev.map(x => ((x.id || x._id) === ltId ? updated : x)));
        setProjectorLt(updated);
        await loadData(true);
      } catch (e) {
        setProjectorLt({ ...timerModalLt, duration: m, durationSeconds: s });
      }
    } else {
      setProjectorLt(todayLts[0] || null);
    }

    setSecondsRemaining(totalSecs);
    setProjEditMin(m);
    setProjEditSec(s);
    setShowTimerModal(false);

    if (launchProjector) {
      setIsTimerRunning(true);
      setIsFullscreen(true);
    } else {
      setBannerMsg(`Timer updated to ${m} min ${String(s).padStart(2, '0')} sec.`);
      setTimeout(() => setBannerMsg(null), 3000);
    }
  };

  // Update Minutes & Seconds directly inside Fullscreen Projector
  const handleProjectorTimeUpdate = async () => {
    const m = Math.max(0, Number(projEditMin) || 0);
    const s = Math.max(0, Math.min(59, Number(projEditSec) || 0));
    const total = m * 60 + s;
    if (total <= 0) return;
    setSecondsRemaining(total);

    if (projectorLt) {
      const ltId = projectorLt.id || projectorLt._id;
      try {
        const updated = await ltApi.updateLt(ltId, { duration: m, durationSeconds: s });
        setAllLts(prev => prev.map(x => ((x.id || x._id) === ltId ? updated : x)));
        setProjectorLt(updated);
        await loadData(true);
      } catch (e) {
        console.warn('Could not persist projector time update:', e.message);
      }
    }
  };

  // Finish LT in Today's table -> moves to Pending LT (status: 'CONDUCTED')
  const handleFinishLt = async (lt) => {
    const ltId = lt.id || lt._id;
    setErrorMsg(null);
    try {
      const updated = await ltApi.updateLt(ltId, { status: 'CONDUCTED' });
      setAllLts(prev => prev.map(x => ((x.id || x._id) === ltId ? updated : x)));
      await loadData(true);
      setBannerMsg(`LT #${lt.ltNo} (${lt.subject}) marked Finish and moved to Pending LT for marks entry.`);
      setTimeout(() => setBannerMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to finish LT');
    }
  };

  const loadMarksDraftForLt = async (lt) => {
    const ltId = lt.id || lt._id;
    const matching = getMatchingStudents(lt);
    let existingMarks = [];
    try {
      existingMarks = await ltApi.getLtMarks(ltId);
    } catch (e) {
      existingMarks = [];
    }
    const existingMap = new Map();
    (existingMarks || []).forEach(m => {
      const sid = m.studentId?._id || m.studentId;
      if (sid) existingMap.set(String(sid), m.grade);
      if (m.rollNo) existingMap.set(`roll-${m.rollNo}`, m.grade);
    });

    const initialDraft = {};
    matching.forEach(s => {
      const sid = s.id || s._id;
      const existing = existingMap.get(String(sid)) || existingMap.get(`roll-${s.rollNo}`);
      initialDraft[sid] = existing ? normalizeGrade(existing) : 'Better';
    });
    setMarksDraftByLt(prev => ({ ...prev, [ltId]: initialDraft }));
  };

  // Toggle Enter Marks Dropdown inside Pending LT (Syllabus-chapter accordion style)
  const togglePendingMarksDropdown = async (lt) => {
    const ltId = lt.id || lt._id;
    const isOpening = !expandedPendingLts[ltId];
    setExpandedPendingLts(prev => ({ ...prev, [ltId]: isOpening }));

    if (isOpening) {
      await loadMarksDraftForLt(lt);
    }
  };

  const handleSetStudentGrade = (ltId, studentId, grade) => {
    setMarksDraftByLt(prev => ({
      ...prev,
      [ltId]: {
        ...(prev[ltId] || {}),
        [studentId]: grade,
      },
    }));
  };

  const handleSavePendingMarks = async (lt) => {
    const ltId = lt.id || lt._id;
    const matching = getMatchingStudents(lt);
    const draft = marksDraftByLt[ltId] || {};

    if (matching.length === 0) {
      setErrorMsg('No active students found matching this Standard & Division.');
      return;
    }

    setErrorMsg(null);
    setSavingLtId(ltId);
    try {
      const payload = matching.map(s => {
        const sid = s.id || s._id;
        return {
          studentId: sid,
          rollNo: s.rollNo,
          studentName: s.fullName || s.name,
          mark: draft[sid] || 'Better',
        };
      });

      await ltApi.saveLtMarks(
        ltId,
        payload,
        user?.id || user?._id,
        user?.name || user?.fullName || 'Assistant Faculty'
      );
      setAllLts(prev =>
        prev.map(x =>
          (x.id || x._id) === ltId
            ? {
                ...x,
                status: 'EVALUATED',
                marksEnteredAt: new Date().toISOString(),
                marksEnteredByName: user?.name || user?.fullName || 'Assistant Faculty',
              }
            : x
        )
      );
      setMarksDraftByLt(prev => {
        const next = { ...prev };
        delete next[ltId];
        return next;
      });
      setExpandedPendingLts(prev => ({ ...prev, [ltId]: false, [`edit-${ltId}`]: false }));
      await loadData(true);
      setBannerMsg(`LT #${lt.ltNo} marks saved successfully!`);
      setTimeout(() => setBannerMsg(null), 4500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save LT marks');
    } finally {
      setSavingLtId(null);
    }
  };

  // Filtered Lists by Tab
  const todayLts = allLts.filter(lt => lt.status === 'SCHEDULED');
  const pendingLts = allLts.filter(lt => lt.status === 'CONDUCTED');
  const historyLts = allLts.filter(lt => lt.status === 'EVALUATED');

  // Clamp pagination safely if lists shrink after Finish / Save Marks
  const safeTodayPage = Math.min(todayPage, Math.max(1, Math.ceil(todayLts.length / LT_PAGE_SIZE)));
  const safePendingListPage = Math.min(pendingListPage, Math.max(1, Math.ceil(pendingLts.length / LT_PAGE_SIZE)));
  const safeHistoryPage = Math.min(historyPage, Math.max(1, Math.ceil(historyLts.length / LT_PAGE_SIZE)));

  // Paginated Slices
  const paginatedToday = todayLts.slice((safeTodayPage - 1) * LT_PAGE_SIZE, safeTodayPage * LT_PAGE_SIZE);
  const paginatedPending = pendingLts.slice((safePendingListPage - 1) * LT_PAGE_SIZE, safePendingListPage * LT_PAGE_SIZE);
  const paginatedHistory = historyLts.slice((safeHistoryPage - 1) * LT_PAGE_SIZE, safeHistoryPage * LT_PAGE_SIZE);

  // Grade pill colors matching Photo 3 & STS theme
  const getGradePillStyle = (grade, isSelected) => {
    if (!isSelected) {
      return {
        padding: '5px 14px',
        borderRadius: 20,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer',
        background: '#FFFFFF',
        color: '#3A4262',
        border: '1.5px solid #D1DDE8',
        transition: 'all 0.15s ease',
      };
    }
    if (grade === 'Excellent') {
      return {
        padding: '5px 14px',
        borderRadius: 20,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer',
        background: '#E6F8EF',
        color: '#1F9D6B',
        border: '1.5px solid #1F9D6B',
      };
    }
    if (grade === 'Better') {
      return {
        padding: '5px 14px',
        borderRadius: 20,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer',
        background: '#E8F1F8',
        color: '#123B5D',
        border: '1.5px solid #123B5D',
      };
    }
    if (grade === 'Good') {
      return {
        padding: '5px 14px',
        borderRadius: 20,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer',
        background: '#FBF2E1',
        color: '#B45309',
        border: '1.5px solid #D99A2B',
      };
    }
    // AB (Absent)
    return {
      padding: '5px 14px',
      borderRadius: 20,
      fontSize: 12.5,
      fontWeight: 700,
      cursor: 'pointer',
      background: '#FDEAE8',
      color: '#E0473D',
      border: '1.5px solid #E0473D',
    };
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Feedback Banners */}
      {bannerMsg && (
        <div className="banner banner-success" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} />
            <span>{bannerMsg}</span>
          </span>
          <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => setBannerMsg(null)} aria-label="Dismiss banner">
            <X size={14} />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="banner banner-danger" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </span>
          <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => setErrorMsg(null)} aria-label="Dismiss banner">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FULLSCREEN PROJECTOR OVERLAY (CENTER BIG QUESTIONS + SIDE SMALL TIMER)  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isFullscreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(155deg, #0E2F4B 0%, #091B2C 100%)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            color: '#fff',
            padding: 'clamp(14px, 3vw, 28px)',
            overflowY: 'auto',
          }}
        >
          {/* Top Header Bar: Subject Name, Date & Exit Button */}
          <div className="projector-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', minWidth: 0 }}>
              <div style={{
                background: 'rgba(142, 197, 255, 0.16)',
                border: '1px solid rgba(142, 197, 255, 0.35)',
                color: '#8EC5FF',
                padding: '6px 14px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                {projectorLt ? projectorLt.subject : 'Classroom LT'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="projector-header-title" style={{ lineHeight: 1.2 }}>
                  {projectorLt
                    ? `Lecture Test #${projectorLt.ltNo} — ${formatStd(projectorLt.standard)}`
                    : 'Classroom Lecture Test'}
                </div>
                <div style={{ fontSize: 'clamp(13px, 1.5vw, 16px)', color: '#BEDBFF', marginTop: 3, fontWeight: 600 }}>
                  Date: <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{projectorLt ? formatDate(projectorLt.takenDate || projectorLt.examDate) : formatDate(new Date())}</span>
                  {projectorLt?.facultyName ? ` • Faculty: ${projectorLt.facultyName}` : ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.28)',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <X size={15} />
              <span>Exit Fullscreen</span>
            </button>
          </div>

          {/* Main Stage: Center BIG Questions + Side SMALL Timer */}
          <div className="projector-stage">
            {/* CENTER STAGE: QUESTIONS IN BIG FONT SIZE */}
            <div className="projector-questions" style={{ gap: 16 }}>
              <div style={{
                textAlign: 'center',
                marginBottom: 4,
              }}>
                <span style={{
                  fontSize: 13.5,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#8EC5FF',
                }}>
                  {projectorLt?.questions?.length
                    ? `Test Questions (${projectorLt.questions.length})`
                    : 'Projected Test Topics'}
                </span>
              </div>

              {projectorLt?.questions?.length > 0 ? (
                projectorLt.questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="projector-q-card"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                      flexWrap: 'wrap',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    }}
                  >
                    <span
                      style={{
                        background: '#8EC5FF',
                        color: '#091B2C',
                        borderRadius: 10,
                        padding: '5px 12px',
                        fontSize: 'clamp(14px, 1.8vw, 18px)',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      Q{q.questionNo || idx + 1}
                    </span>
                    <div className="projector-q-text" style={{ flex: '1 1 220px', minWidth: 0 }}>
                      {q.questionText}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="projector-q-card"
                  style={{
                    textAlign: 'center',
                    fontSize: 'clamp(16px, 2vw, 24px)',
                    color: '#CBD5E1',
                  }}
                >
                  No specific questions listed — follow faculty lecture test instructions.
                </div>
              )}
            </div>

            {/* RIGHT SIDE PANEL: SMALL COMPACT TIMER WIDGET */}
            <div
              className="projector-timer-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#8EC5FF', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Timer size={14} />
                <span>Time Remaining</span>
              </div>

              <div
                style={{
                  fontSize: 'clamp(36px, 5vw, 44px)',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: secondsRemaining === 0 ? '#E0473D' : secondsRemaining <= 60 ? '#FBBF24' : '#FFFFFF',
                  letterSpacing: '0.02em',
                  lineHeight: 1.05,
                }}
              >
                {formatClock(secondsRemaining)}
              </div>

              {secondsRemaining === 0 && (
                <div style={{
                  background: '#E0473D',
                  color: '#FFFFFF',
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 11.5,
                  textAlign: 'center',
                }}>
                  Time Up! Collect sheets.
                </div>
              )}

              {/* Compact Playback Controls */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  style={{
                    width: '100%',
                    background: isTimerRunning ? '#D99A2B' : '#1F9D6B',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '7px 12px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause size={14} />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="currentColor" />
                      <span>Start / Resume</span>
                    </>
                  )}
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 5 }}>
                  <button
                    type="button"
                    onClick={() => setSecondsRemaining(prev => prev + 60)}
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '5px 4px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    +1m
                  </button>
                  <button
                    type="button"
                    onClick={() => setSecondsRemaining(prev => prev + 30)}
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '5px 4px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    +30s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      const m = projectorLt?.duration !== undefined ? projectorLt.duration : 15;
                      const s = projectorLt?.durationSeconds || 0;
                      setSecondsRemaining(m * 60 + s);
                    }}
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '5px 4px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ↺ Reset
                  </button>
                </div>
              </div>

              {/* Compact Side Min/Sec Updater */}
              <div style={{
                width: '100%',
                borderTop: '1px solid rgba(255,255,255,0.14)',
                paddingTop: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                <div style={{ fontSize: 11, color: '#BEDBFF', fontWeight: 700 }}>Update Timer (Min : Sec)</div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={projEditMin}
                    onChange={(e) => setProjEditMin(Number(e.target.value))}
                    style={{ width: 52, padding: '4px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.28)', background: '#091B2C', color: '#fff', fontSize: 12.5, fontWeight: 700, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 11, color: '#CBD5E1' }}>m</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={projEditSec}
                    onChange={(e) => setProjEditSec(Number(e.target.value))}
                    style={{ width: 52, padding: '4px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.28)', background: '#091B2C', color: '#fff', fontSize: 12.5, fontWeight: 700, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 11, color: '#CBD5E1' }}>s</span>
                  <button
                    type="button"
                    onClick={handleProjectorTimeUpdate}
                    style={{ flex: '1 1 56px', background: '#8EC5FF', color: '#0E2F4B', border: 'none', borderRadius: 6, padding: '5px 8px', fontWeight: 800, fontSize: 11.5, cursor: 'pointer' }}
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingTop: 10 }}>
            Science Academic Portal • Classroom Projector Mode
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TOP TABS: TODAY | LT HISTORY | PENDING LT                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'today' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          Today ({todayLts.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'history' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          LT History ({historyLts.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'pending' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending LT ({pendingLts.length})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: TODAY'S LECTURE TESTS                                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'today' && (
        <>
          {/* Header Bar Card matching Screenshot 1 in STS Theme */}
          <div
            className="card"
            style={{
              marginBottom: 16,
              padding: '18px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h2 className="card__title" style={{ margin: 0, fontSize: 18 }}>
                Today&apos;s Lecture Tests
              </h2>
              <div className="card__desc" style={{ marginTop: 3 }}>
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • {todayLts.length} scheduled tests
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openSetTimerForLt(todayLts[0] || null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Clock size={15} />
              <span>Set LT Timer</span>
            </button>
          </div>

          {/* Today's LT Table with Start LT Timer, View Full LT & Finish in EVERY row */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>SUBJECT</th>
                    <th>STANDARD</th>
                    <th>DATE</th>
                    <th>TYPE</th>
                    <th>TOPIC / QUESTIONS</th>
                    <th>DURATION</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                        Loading scheduled Lecture Tests...
                      </td>
                    </tr>
                  ) : todayLts.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--slate)' }}>
                        No active Lecture Tests in Today&apos;s queue. When Subject Faculty creates an LT in <strong>Set LT</strong>, it appears here immediately.
                      </td>
                    </tr>
                  ) : (
                    paginatedToday.map((lt, idx) => {
                      const rowNo = (safeTodayPage - 1) * LT_PAGE_SIZE + idx + 1;
                      const mins = lt.duration !== undefined ? lt.duration : 15;
                      const secs = lt.durationSeconds || 0;
                      const topicSummary =
                        lt.questions && lt.questions.length > 0
                          ? lt.questions.map((q, i) => `Q${q.questionNo || i + 1}: ${q.questionText}`).join(' | ')
                          : (lt.topicsCovered || []).join(', ') || 'Diagnostic LT';

                      return (
                        <tr key={lt.id || lt._id}>
                          <td className="num" style={{ fontWeight: 700 }}>{lt.ltNo || rowNo}</td>
                          <td><strong>{lt.subject}</strong></td>
                          <td>
                            <span className="chip chip-neutral">{formatStd(lt.standard)}</span>
                          </td>
                          <td className="num">{formatDate(lt.examDate)}</td>
                          <td>
                            <span
                              style={{
                                background: '#E8F1F8',
                                color: '#123B5D',
                                border: '1px solid #C8DBED',
                                borderRadius: 20,
                                padding: '3px 10px',
                                fontSize: 11.5,
                                fontWeight: 700,
                              }}
                            >
                              Daily LT
                            </span>
                          </td>
                          <td style={{ maxWidth: 300 }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13.5 }} title={topicSummary}>
                              {topicSummary}
                            </div>
                          </td>
                          <td className="num">
                            {secs > 0 ? `${mins}m ${String(secs).padStart(2, '0')}s` : `${mins} min`}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => openSetTimerForLt(lt)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                              >
                                <Play size={13} fill="currentColor" />
                                <span>Start LT Timer</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setViewingLt(lt)}
                              >
                                View Full LT
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                  background: '#E6F8EF',
                                  color: '#1F9D6B',
                                  border: '1.5px solid #1F9D6B',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                }}
                                onClick={() => handleFinishLt(lt)}
                              >
                                <Check size={14} />
                                <span>Finish</span>
                              </button>
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
              currentPage={safeTodayPage}
              totalItems={todayLts.length}
              pageSize={LT_PAGE_SIZE}
              onPageChange={setTodayPage}
              itemLabel="today LTs"
            />
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: LT HISTORY (WITH INLINE UPDATE MARKS + DATES + PAGINATION)      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-soft)' }}>
            <div className="card__title">LT History — Evaluated Lecture Tests</div>
            <div className="card__desc">View submitted marksheets or click <strong>Update Marks ▼</strong> to modify student grades anytime</div>
          </div>

          <div className="table-wrap" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>LT No</th>
                  <th>Subject</th>
                  <th>Standard</th>
                  <th>Taken Date</th>
                  <th>Mark Entry Date</th>
                  <th>Entered By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyLts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No evaluated Lecture Tests yet. Finish an LT in <strong>Today</strong> and submit marks in <strong>Pending LT</strong>.
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((lt) => {
                    const ltId = lt.id || lt._id;
                    const isEditOpen = !!expandedPendingLts[`edit-${ltId}`];
                    const matchingStudents = getMatchingStudents(lt);
                    const curStdPage = studentPageByLt[`edit-${ltId}`] || 1;
                    const paginatedStudents = matchingStudents.slice(
                      (curStdPage - 1) * STUDENT_PAGE_SIZE,
                      curStdPage * STUDENT_PAGE_SIZE
                    );
                    const draft = marksDraftByLt[ltId] || {};

                    return (
                      <React.Fragment key={ltId}>
                        <tr>
                          <td className="num"><strong>LT #{lt.ltNo}</strong></td>
                          <td><strong>{lt.subject}</strong></td>
                          <td><span className="chip chip-neutral">{formatStd(lt.standard)}</span></td>
                          <td className="num">{formatDate(lt.takenDate || lt.examDate)}</td>
                          <td className="num">{formatDate(lt.marksEnteredAt || lt.updatedAt)}</td>
                          <td>{lt.marksEnteredByName || lt.marksEnteredBy?.fullName || 'Assistant Faculty'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setViewingLt(lt)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                              >
                                <Eye size={14} />
                                <span>View Full LT</span>
                              </button>
                              <Link to={`/assistant/lt/history/${ltId}`} className="btn btn-ghost btn-sm">
                                View Marksheet
                              </Link>
                              <button
                                type="button"
                                className={isEditOpen ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                onClick={async () => {
                                  const nextOpen = !isEditOpen;
                                  setExpandedPendingLts(prev => ({ ...prev, [`edit-${ltId}`]: nextOpen }));
                                  if (nextOpen) {
                                    await loadMarksDraftForLt(lt);
                                  }
                                }}
                              >
                                {isEditOpen ? (
                                  <span>Close Update ▲</span>
                                ) : (
                                  <>
                                    <Pencil size={13} />
                                    <span>Update Marks ▼</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isEditOpen && (
                          <tr>
                            <td colSpan={7} style={{ padding: '14px 18px', background: '#FAFBFD', borderBottom: '2px solid #D1DDE8' }}>
                              <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E4E7F2', overflow: 'hidden' }}>
                                <div className="table-wrap" style={{ margin: 0 }}>
                                  <table>
                                    <thead>
                                      <tr>
                                        <th style={{ width: 90 }}>ROLL NO</th>
                                        <th>NAME</th>
                                        <th style={{ width: 130 }}>STANDARD</th>
                                        <th>MARKS</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {paginatedStudents.map((st) => {
                                        const sid = st.id || st._id;
                                        const currentGrade = draft[sid] || 'Better';
                                        return (
                                          <tr key={sid}>
                                            <td className="num" style={{ fontWeight: 700 }}>{st.rollNo}</td>
                                            <td><strong>{st.fullName || st.name}</strong></td>
                                            <td>
                                              <span className="chip chip-neutral">
                                                {st.standard === 'STD_11' ? 'Standard 11' : 'Standard 12'}
                                                {st.division ? ` - ${st.division}` : ''}
                                              </span>
                                            </td>
                                            <td>
                                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {['Excellent', 'Better', 'Good', 'AB'].map((gradeOption) => (
                                                  <button
                                                    key={gradeOption}
                                                    type="button"
                                                    style={getGradePillStyle(gradeOption, currentGrade === gradeOption)}
                                                    onClick={() => handleSetStudentGrade(ltId, sid, gradeOption)}
                                                  >
                                                    {gradeOption}
                                                  </button>
                                                ))}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                <PaginationBar
                                  currentPage={curStdPage}
                                  totalItems={matchingStudents.length}
                                  pageSize={STUDENT_PAGE_SIZE}
                                  onPageChange={(nextPage) => setStudentPageByLt(prev => ({ ...prev, [`edit-${ltId}`]: nextPage }))}
                                  itemLabel="students"
                                />
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
                                <span style={{ fontSize: 12, color: 'var(--slate)' }}>
                                  Updating marks refreshes Principal LT Analytics &amp; Mark Entry Date automatically.
                                </span>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setExpandedPendingLts(prev => ({ ...prev, [`edit-${ltId}`]: false }))}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    disabled={savingLtId === ltId}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                    onClick={async () => {
                                      await handleSavePendingMarks(lt);
                                      setExpandedPendingLts(prev => ({ ...prev, [`edit-${ltId}`]: false }));
                                    }}
                                  >
                                    {savingLtId === ltId ? (
                                      'Updating...'
                                    ) : (
                                      <>
                                        <Check size={14} />
                                        <span>Save Updated Marks</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            currentPage={safeHistoryPage}
            totalItems={historyLts.length}
            pageSize={LT_PAGE_SIZE}
            onPageChange={setHistoryPage}
            itemLabel="evaluated LTs"
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: PENDING LT (SYLLABUS-STYLE DROPDOWN + PHOTO 3 MARKS ENTRY)       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pending' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-soft)', background: '#FAFBFD' }}>
            <div className="card__title">Pending LT — Enter Student Marks ({pendingLts.length})</div>
            <div className="card__desc">Click <strong>Enter Marks ▼</strong> on any finished LT to open the student marksheet dropdown</div>
          </div>

          {pendingLts.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: 'var(--slate)' }}>
              No Pending LTs waiting for marks entry. Click <strong>Finish</strong> on any test in the <strong>Today</strong> tab to move it here.
            </div>
          ) : (
            <div>
              {paginatedPending.map((lt, idx) => {
                const ltId = lt.id || lt._id;
                const isOpen = !!expandedPendingLts[ltId];
                const matchingStudents = getMatchingStudents(lt);
                const curStdPage = studentPageByLt[ltId] || 1;
                const paginatedStudents = matchingStudents.slice(
                  (curStdPage - 1) * STUDENT_PAGE_SIZE,
                  curStdPage * STUDENT_PAGE_SIZE
                );
                const draft = marksDraftByLt[ltId] || {};

                return (
                  <div
                    key={ltId}
                    style={{
                      borderBottom: idx < paginatedPending.length - 1 ? '2px solid #E4E7F2' : 'none',
                    }}
                  >
                    {/* Accordion Header (Syllabus-chapter style) */}
                    <div
                      onClick={() => togglePendingMarksDropdown(lt)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '15px 20px',
                        background: isOpen ? '#F1F6FB' : '#FFFFFF',
                        cursor: 'pointer',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 220px', minWidth: 0 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: '#123B5D',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          #{lt.ltNo}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#1C2340', overflowWrap: 'break-word', wordBreak: 'normal' }}>
                            LT #{lt.ltNo} — {lt.subject} ({formatStd(lt.standard)})
                          </div>
                          <div style={{ fontSize: 12, color: '#6B7290', marginTop: 2 }}>
                            Date: {formatDate(lt.examDate)} • {lt.questions?.length || 0} Questions • {matchingStudents.length} Students
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setViewingLt(lt)}
                        >
                          View Full LT
                        </button>
                        <button
                          type="button"
                          className={isOpen ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}
                          onClick={() => togglePendingMarksDropdown(lt)}
                        >
                          <span>Enter Marks</span>
                          <span style={{ marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Marks Entry Table Dropdown (Exact Photo 3 UI!) */}
                    {isOpen && (
                      <div style={{ padding: '16px 20px', background: '#FAFBFD', borderTop: '1px solid #E4E7F2' }}>
                        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E4E7F2', overflow: 'hidden' }}>
                          <div className="table-wrap" style={{ margin: 0 }}>
                            <table>
                              <thead>
                                <tr>
                                  <th style={{ width: 90 }}>ROLL NO</th>
                                  <th>NAME</th>
                                  <th style={{ width: 130 }}>STANDARD</th>
                                  <th>MARKS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {matchingStudents.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>
                                      No active students found matching {formatStd(lt.standard)}.
                                    </td>
                                  </tr>
                                ) : (
                                  paginatedStudents.map((st) => {
                                    const sid = st.id || st._id;
                                    const currentGrade = draft[sid] || 'Better';
                                    return (
                                      <tr key={sid}>
                                        <td className="num" style={{ fontWeight: 700 }}>{st.rollNo}</td>
                                        <td><strong>{st.fullName || st.name}</strong></td>
                                        <td>
                                          <span className="chip chip-neutral">
                                            {st.standard === 'STD_11' ? 'Standard 11' : 'Standard 12'}
                                            {st.division ? ` - ${st.division}` : ''}
                                          </span>
                                        </td>
                                        <td>
                                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {['Excellent', 'Better', 'Good', 'AB'].map((gradeOption) => (
                                              <button
                                                key={gradeOption}
                                                type="button"
                                                style={getGradePillStyle(gradeOption, currentGrade === gradeOption)}
                                                onClick={() => handleSetStudentGrade(ltId, sid, gradeOption)}
                                              >
                                                {gradeOption}
                                              </button>
                                            ))}
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
                            currentPage={curStdPage}
                            totalItems={matchingStudents.length}
                            pageSize={STUDENT_PAGE_SIZE}
                            onPageChange={(nextPage) => setStudentPageByLt(prev => ({ ...prev, [ltId]: nextPage }))}
                            itemLabel="students"
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                          <div style={{ fontSize: 12.5, color: '#6B7290' }}>
                            Total Students: <strong>{matchingStudents.length}</strong> • Grades selected: Excellent / Better / Good / AB
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={savingLtId === ltId || matchingStudents.length === 0}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            onClick={() => handleSavePendingMarks(lt)}
                          >
                            {savingLtId === ltId ? (
                              'Saving Marks...'
                            ) : (
                              <>
                                <Check size={15} />
                                <span>Save &amp; Submit Marks</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <PaginationBar
                currentPage={safePendingListPage}
                totalItems={pendingLts.length}
                pageSize={LT_PAGE_SIZE}
                onPageChange={setPendingListPage}
                itemLabel="pending LTs"
              />
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SET LT TIMER MODAL (OPENS FIRST BEFORE PROJECTOR VIEW!)                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showTimerModal && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setShowTimerModal(false);
          }}
        >
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">Set LT Timer</div>
                <div className="card__desc">
                  {timerModalLt
                    ? `LT #${timerModalLt.ltNo} — ${timerModalLt.subject} (${formatStd(timerModalLt.standard)})`
                    : 'Configure classroom assessment duration'}
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowTimerModal(false)} aria-label="Close modal">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, margin: '18px 0' }}>
              {todayLts.length > 0 && (
                <div>
                  <label className="field-label">Select Lecture Test (LT)</label>
                  <select
                    className="filter-select w-full"
                    value={timerModalLt ? (timerModalLt.id || timerModalLt._id) : ''}
                    onChange={(e) => {
                      const picked = todayLts.find(x => (x.id || x._id) === e.target.value) || null;
                      setTimerModalLt(picked);
                      if (picked) {
                        setInputMinutes(picked.duration !== undefined ? picked.duration : 15);
                        setInputSeconds(picked.durationSeconds || 0);
                      }
                    }}
                  >
                    {todayLts.map(x => {
                      const xId = x.id || x._id;
                      return (
                        <option key={xId} value={xId}>
                          LT #{x.ltNo} — {x.subject} ({formatStd(x.standard)})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="form-grid-2">
                <div>
                  <label className="field-label">Minutes *</label>
                  <input
                    type="number"
                    className="field-input w-full"
                    min={0}
                    max={180}
                    value={inputMinutes}
                    onChange={(e) => setInputMinutes(Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div>
                  <label className="field-label">Seconds (0–59) *</label>
                  <input
                    type="number"
                    className="field-input w-full"
                    min={0}
                    max={59}
                    value={inputSeconds}
                    onChange={(e) => setInputSeconds(Math.max(0, Math.min(59, Number(e.target.value))))}
                  />
                </div>
              </div>

              {/* Quick Duration Presets */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#6B7290', marginBottom: 6 }}>Quick Presets</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[5, 10, 15, 20, 30].map(m => (
                    <button
                      key={m}
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setInputMinutes(m);
                        setInputSeconds(0);
                      }}
                    >
                      {m} min
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const total = Number(inputMinutes) * 60 + Number(inputSeconds) + 30;
                      setInputMinutes(Math.floor(total / 60));
                      setInputSeconds(total % 60);
                    }}
                  >
                    +30 sec
                  </button>
                </div>
              </div>

              {timerModalLt?.questions?.length > 0 && (
                <div style={{ background: '#F6F7FB', border: '1px solid #E4E7F2', borderRadius: 10, padding: '10px 12px', fontSize: 12.5 }}>
                  <strong style={{ color: '#123B5D' }}>Questions to display on Projector:</strong>
                  <div style={{ marginTop: 4, color: '#3A4262' }}>
                    {timerModalLt.questions.map((q, idx) => (
                      <div key={idx}>Q{q.questionNo || idx + 1}: {q.questionText}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderTop: '1px solid var(--line-soft)', paddingTop: 14, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => handleConfirmTimerModal(false)}
              >
                Update Time Only
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleConfirmTimerModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Play size={14} fill="currentColor" />
                <span>Start &amp; Open Full Projector</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ATTRACTIVE VIEW FULL LT MODAL                                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <ViewFullLtModal
        lt={viewingLt}
        onClose={() => setViewingLt(null)}
        onStartTimer={(lt) => openSetTimerForLt(lt)}
        onFinishLt={(lt) => handleFinishLt(lt)}
      />
    </div>
  );
}
