import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { syllabusApi } from '../../services/syllabusApi';
import { ltApi } from '../../services/ltApi';
import PaginationBar from '../../components/common/PaginationBar';
import ViewFullLtModal from '../../components/common/ViewFullLtModal';
import VoiceInputControl from '../../components/common/VoiceInputControl';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  BookOpen,
  FileText,
  Plus,
  Layers,
  HelpCircle,
  Sparkles,
  BarChart3,
  Check,
} from 'lucide-react';

export default function SetLt() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();
  const currentSubject = user?.subject || 'Physics';
  const facultyId = user?.id || user?._id || user?.empCode || user?.username || 'faculty';
  const defaultStdForSubj = 'STD_11';

  useEffect(() => {
    setHeader({
      title: 'Set LT',
      subtitle: "Pick a topic finished today and set tomorrow's Lecture Test",
    });
  }, [setHeader]);

  // Sub-tabs: 'set-lt' | 'history'
  const [activeTab, setActiveTab] = useState('set-lt');

  // Left Section: ONLY Today's Finished Topics
  const [todayFinished, setTodayFinished] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [topicsPage, setTopicsPage] = useState(1);
  const TOPICS_PAGE_SIZE = 5;

  // LT Box State
  const [editingLtId, setEditingLtId] = useState(null);
  const [questionsList, setQuestionsList] = useState([]);
  const [manualQuestionInput, setManualQuestionInput] = useState('');
  const manualQuestionInputRef = useRef(null);

  const getDefaultDateStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [examDate, setExamDate] = useState(getDefaultDateStr());
  const [subject, setSubject] = useState(currentSubject);
  const [standard, setStandard] = useState(defaultStdForSubj);
  const [division, setDivision] = useState('ALL');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // History State
  const [ltHistory, setLtHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilterStd, setHistoryFilterStd] = useState('ALL');
  const HISTORY_PAGE_SIZE = 6;

  // View Full LT Modal State
  const [viewingLt, setViewingLt] = useState(null);

  // Sync subject/default standard if user updates
  useEffect(() => {
    setSubject(currentSubject);
    setStandard('STD_11');
  }, [currentSubject]);

  // Load Today's Finished Topics & Subject LT History
  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoadingTopics(true);
        setIsLoadingHistory(true);
      }
      try {
        const [finished, allLts] = await Promise.all([
          syllabusApi
            .getTodayFinished({ subject: currentSubject, facultyId, role: 'faculty' })
            .catch(() => []),
          ltApi.getAllLts({ subject: currentSubject }).catch(() => []),
        ]);
        setTodayFinished(Array.isArray(finished) ? finished : []);
        setLtHistory(Array.isArray(allLts) ? allLts : []);
      } finally {
        if (!silent) {
          setIsLoadingTopics(false);
          setIsLoadingHistory(false);
        }
      }
    },
    [currentSubject, facultyId]
  );

  useEffect(() => {
    loadData(false);
    const handleFocus = () => loadData(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadData]);

  // Overview Statistics
  const stats = useMemo(() => {
    const total = ltHistory.length;
    const evaluated = ltHistory.filter((l) => l.status === 'EVALUATED').length;
    const pending = total - evaluated;
    const finishedToday = todayFinished.length;
    return { total, evaluated, pending, finishedToday };
  }, [ltHistory, todayFinished]);

  // Toggle selection on Today's Finished Topic row
  const handleToggleSelectTopic = (topicItem) => {
    const existingIdx = questionsList.findIndex((q) => q.sourceId === topicItem.id);
    if (existingIdx !== -1) {
      setQuestionsList((prev) => prev.filter((q) => q.sourceId !== topicItem.id));
    } else {
      const hasGuj =
        topicItem.titleGujarati &&
        topicItem.titleGujarati.trim() &&
        topicItem.titleGujarati.trim() !== (topicItem.title || '').trim();
      const topicLabel = hasGuj
        ? `${topicItem.code} ${topicItem.title} (${topicItem.titleGujarati})`
        : `${topicItem.code} ${topicItem.title}`;
      setQuestionsList((prev) => [
        ...prev,
        {
          id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sourceId: topicItem.id,
          sourceTopicCode: topicItem.code,
          sourceTopicTitle: topicLabel,
          questionText: topicLabel,
          isManual: false,
        },
      ]);
    }
  };

  // Add manual question input
  const handleAddManualQuestion = () => {
    const text = manualQuestionInput.trim();
    if (!text) return;
    setQuestionsList((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sourceId: null,
        sourceTopicCode: 'MANUAL',
        sourceTopicTitle: 'Manual Question',
        questionText: text,
        isManual: true,
      },
    ]);
    setManualQuestionInput('');
  };

  // Edit Question text inline
  const handleEditQuestionText = (idx, newText) => {
    setQuestionsList((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, questionText: newText } : q))
    );
  };

  // Remove a question
  const handleRemoveQuestion = (idx) => {
    setQuestionsList((prev) => prev.filter((_, i) => i !== idx));
  };

  // Reset form
  const resetForm = () => {
    setEditingLtId(null);
    setQuestionsList([]);
    setManualQuestionInput('');
    setExamDate(getDefaultDateStr());
    setSubject(currentSubject);
    setStandard(defaultStdForSubj);
    setDivision('ALL');
    setDurationMinutes(15);
  };

  // Submit or Update LT into MongoDB
  const handleSubmitLt = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    const validQuestions = questionsList.filter((q) => q.questionText && q.questionText.trim());
    if (validQuestions.length === 0) {
      setErrorMsg('કૃપા કરીને ઓછામાં ઓછો એક ટોપિક પસંદ કરો અથવા મેન્યુઅલ પ્રશ્ન ઉમેરો.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        subject: currentSubject,
        standard,
        division,
        examDate,
        duration: Number(durationMinutes) || 15,
        facultyName: user?.name || 'Subject Faculty',
        subjectFacultyId: user?.id || user?._id,
        topicsCovered: validQuestions.map((q) => q.sourceTopicTitle || q.questionText),
        questions: validQuestions.map((q, idx) => ({
          questionNo: idx + 1,
          questionText: q.questionText.trim(),
          sourceTopicCode: q.sourceTopicCode || '',
          sourceTopicTitle: q.sourceTopicTitle || '',
          marks: 2,
        })),
      };

      if (editingLtId) {
        const updated = await ltApi.updateLt(editingLtId, payload);
        setLtHistory((prev) =>
          prev.map((lt) => ((lt.id || lt._id) === editingLtId ? updated : lt))
        );
        setFeedbackMsg(`LT #${updated.ltNo} સફળતાપૂર્વક અપડેટ કરવામાં આવ્યો!`);
      } else {
        const created = await ltApi.createLt(payload);
        setLtHistory((prev) => [created, ...prev]);
        setHistoryPage(1);
        setFeedbackMsg(
          `LT #${created.ltNo} (${created.subject}, ${
            created.standard === 'STD_11' ? 'Std 11' : 'Std 12'
          }) સફળતાપૂર્વક બનાવીને Assistant Faculty ને મોકલી દેવાયો છે!`
        );
      }

      resetForm();
      await loadData(true);
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err) {
      setErrorMsg(err.message || 'LT સેવ કરવામાં નિષ્ફળતા.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load existing LT for Editing
  const handleStartEditLt = (lt) => {
    setEditingLtId(lt.id || lt._id);
    setSubject(lt.subject || currentSubject);
    setStandard(lt.standard || 'STD_12');
    setDivision(lt.division || 'ALL');
    setDurationMinutes(lt.duration || 15);
    if (lt.examDate) {
      const dt = new Date(lt.examDate);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      setExamDate(`${y}-${m}-${d}`);
    }
    const qs = (lt.questions || []).map((q, idx) => ({
      id: `edit-q-${idx}-${Date.now()}`,
      sourceId: null,
      sourceTopicCode: q.sourceTopicCode || '',
      sourceTopicTitle: q.sourceTopicTitle || '',
      questionText: q.questionText,
      isManual: q.sourceTopicCode === 'MANUAL' || !q.sourceTopicCode,
    }));
    setQuestionsList(qs);
    setActiveTab('set-lt');
  };

  const handleDeleteLt = async (ltId) => {
    if (!window.confirm('શું તમે ખરેખર આ Lecture Test કાઢી નાખવા માંગો છો?')) return;
    setErrorMsg(null);
    try {
      await ltApi.deleteLt(ltId);
      setLtHistory((prev) => prev.filter((lt) => (lt.id || lt._id) !== ltId));
      setFeedbackMsg('Lecture Test સફળતાપૂર્વક દૂર કરવામાં આવ્યો.');
      await loadData(true);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete LT');
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (historyFilterStd === 'ALL') return ltHistory;
    return ltHistory.filter((lt) => lt.standard === historyFilterStd);
  }, [ltHistory, historyFilterStd]);

  // Pagination
  const safeTopicsPage = Math.min(
    topicsPage,
    Math.max(1, Math.ceil(todayFinished.length / TOPICS_PAGE_SIZE))
  );
  const safeHistoryPage = Math.min(
    historyPage,
    Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE))
  );

  const paginatedFinished = todayFinished.slice(
    (safeTopicsPage - 1) * TOPICS_PAGE_SIZE,
    safeTopicsPage * TOPICS_PAGE_SIZE
  );
  const paginatedHistory = filteredHistory.slice(
    (safeHistoryPage - 1) * HISTORY_PAGE_SIZE,
    safeHistoryPage * HISTORY_PAGE_SIZE
  );

  return (
    <div className="module-container" style={{ paddingBottom: 40 }}>
      {/* ── Feedback Banners ── */}
      {feedbackMsg && (
        <div
          className="banner banner-success"
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} />
            <span>{feedbackMsg}</span>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setFeedbackMsg(null)}
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {errorMsg && (
        <div
          className="banner banner-warning"
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setErrorMsg(null)}
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Overview Statistics Cards ── */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-card__title">Total Tests Set</div>
          <div className="kpi-card__value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{stats.total}</span>
            <FileText size={18} style={{ color: '#123B5D', opacity: 0.6 }} />
          </div>
          <div className="kpi-card__sub">{currentSubject} Lecture Tests</div>
        </div>

        <div className="kpi-card is-success">
          <div className="kpi-card__title">Evaluated by Asst.</div>
          <div className="kpi-card__value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{stats.evaluated}</span>
            <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div className="kpi-card__sub">Marks entered &amp; evaluated</div>
        </div>

        <div className="kpi-card is-warning">
          <div className="kpi-card__title">Pending Evaluation</div>
          <div className="kpi-card__value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{stats.pending}</span>
            <Clock size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="kpi-card__sub">Scheduled or in progress</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__title">Finished Today</div>
          <div className="kpi-card__value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{stats.finishedToday}</span>
            <Sparkles size={18} style={{ color: '#F59E0B' }} />
          </div>
          <div className="kpi-card__sub">Topics ready for test creation</div>
        </div>
      </div>

      {/* ── Top Tab Switcher ── */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'set-lt' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('set-lt')}
        >
          <FileText size={14} style={{ marginRight: 6 }} />
          <span>{editingLtId ? 'Edit LT' : 'Set LT'}</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'history' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={14} style={{ marginRight: 6 }} />
          <span>LT History ({ltHistory.length})</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: SET LT (ORGANIZED INTO 3 LOGICAL SECTIONS)                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'set-lt' && (
        <form onSubmit={handleSubmitLt} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* ── SECTION 1: BASIC DETAILS ── */}
          <div className="card" style={{ borderLeft: '4px solid #123B5D' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              <div
                style={{
                  background: '#E8F1F8',
                  color: '#123B5D',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                1
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                  Basic Details / પરીક્ષા વિગતો
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                  Set date, standard, division, and duration for this test
                </p>
              </div>
            </div>

            <div className="form-grid-4" style={{ gap: 14 }}>
              {/* Date */}
              <div>
                <label className="field-label" style={{ fontWeight: 600 }}>
                  Date / તારીખ *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="field-input w-full"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    required
                    style={{ fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="field-label" style={{ fontWeight: 600 }}>
                  Subject / વિષય *
                </label>
                <div
                  className="filter-select w-full flex items-center justify-between"
                  style={{
                    background: '#F8FAFC',
                    borderColor: '#CBD5E1',
                    color: '#0F172A',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                    padding: '8px 12px',
                    fontSize: 13,
                  }}
                  title="Subject Faculty is locked to their assigned subject"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={13} style={{ color: '#64748B' }} />
                    <span>{currentSubject}</span>
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      color: '#2563EB',
                      background: '#EFF6FF',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      border: '1px solid #BFDBFE',
                      fontWeight: 700,
                    }}
                  >
                    Assigned
                  </span>
                </div>
              </div>

              {/* Standard */}
              <div>
                <label className="field-label" style={{ fontWeight: 600 }}>
                  Standard / ધોરણ *
                </label>
                <select
                  className="filter-select w-full"
                  value={standard}
                  onChange={(e) => setStandard(e.target.value)}
                  required
                  style={{ fontSize: 13 }}
                >
                  <option value="STD_12">Standard 12</option>
                  <option value="STD_11">Standard 11</option>
                </select>
              </div>

              {/* Division & Duration */}
              <div>
                <label className="field-label" style={{ fontWeight: 600 }}>
                  Division &amp; Duration
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="filter-select"
                    style={{ flex: 1, minWidth: 0, fontSize: 13 }}
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                  >
                    <option value="ALL">All Div</option>
                    <option value="A">Div A</option>
                    <option value="B">Div B</option>
                  </select>
                  <div style={{ position: 'relative', width: 90 }}>
                    <input
                      type="number"
                      className="field-input w-full"
                      min={1}
                      max={90}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      title="Duration in minutes"
                      style={{ fontSize: 13, paddingRight: 32 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 11,
                        color: '#64748B',
                        pointerEvents: 'none',
                      }}
                    >
                      min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: QUESTIONS & TOPIC SELECTION ── */}
          <div className="card" style={{ borderLeft: '4px solid #0284C7' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: '1px solid #E2E8F0',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    background: '#E0F2FE',
                    color: '#0284C7',
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  2
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                    Questions Selection / પ્રશ્નો પસંદગી
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                    Select finished syllabus topics or enter custom questions with Gujarati voice/typing
                  </p>
                </div>
              </div>

              <Link
                to="/faculty/syllabus"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <BookOpen size={13} />
                <span>Manage Syllabus</span>
              </Link>
            </div>

            {/* Finished Topics List */}
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  background: '#F1F5F9',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>
                  Today&apos;s Finished Topics / આજે પૂર્ણ કરેલા ટોપિક ({todayFinished.length})
                </div>
                <span style={{ fontSize: 11, color: '#64748B' }}>
                  Click &quot;પસંદ કરો&quot; to include in test
                </span>
              </div>

              {isLoadingTopics ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                  ટોપિક્સ લોડ થઈ રહ્યા છે...
                </div>
              ) : todayFinished.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                  <div>આજે હજી કોઈ ટોપિક Finish કરેલ નથી.</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    તમે નીચેથી <strong>Manually Set Question</strong> દ્વારા પ્રશ્નો ઉમેરી શકો છો, અથવા Syllabus Tracker માં જઈને ટોપિક પૂર્ણ કરો.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {paginatedFinished.map((item, idx) => {
                    const srNo = (safeTopicsPage - 1) * TOPICS_PAGE_SIZE + idx + 1;
                    const isSelected = questionsList.some((q) => q.sourceId === item.id);
                    return (
                      <div
                        key={item.id || srNo}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid #E2E8F0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          transition: 'background 0.15s ease',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                            <span
                              style={{
                                background: '#E2E8F0',
                                color: '#334155',
                                padding: '1px 6px',
                                borderRadius: 4,
                                fontSize: 11,
                                marginRight: 6,
                                fontFamily: 'monospace',
                              }}
                            >
                              {item.code}
                            </span>
                            <span>{item.title}</span>
                          </div>
                          {item.titleGujarati &&
                            item.titleGujarati.trim() !== (item.title || '').trim() && (
                              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                {item.titleGujarati}
                              </div>
                            )}
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                            {item.standard} • Ch {item.chapterNo}: {item.chapterName}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleSelectTopic(item)}
                          className={isSelected ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                          style={{
                            minWidth: 84,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}
                        >
                          {isSelected ? (
                            <>
                              <Check size={12} />
                              <span>પસંદ કરેલ</span>
                            </>
                          ) : (
                            <span>પસંદ કરો</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {todayFinished.length > TOPICS_PAGE_SIZE && (
                <div style={{ padding: '8px 12px', background: '#F8FAFC' }}>
                  <PaginationBar
                    currentPage={safeTopicsPage}
                    totalItems={todayFinished.length}
                    pageSize={TOPICS_PAGE_SIZE}
                    onPageChange={setTopicsPage}
                    itemLabel="finished topics"
                  />
                </div>
              )}
            </div>

            {/* Manual Question Entry Container */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 10,
                border: '1px solid #CBD5E1',
                padding: '14px 16px',
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#123B5D',
                  marginBottom: 8,
                }}
              >
                Manually Set Question (લખીને અથવા બોલીને પ્રશ્ન ઉમેરો)
              </label>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  ref={manualQuestionInputRef}
                  className="field-input"
                  style={{ flex: '1 1 240px', minWidth: 0, fontSize: 13 }}
                  placeholder="Type custom question or speak in Gujarati/English..."
                  value={manualQuestionInput}
                  onChange={(e) => setManualQuestionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddManualQuestion();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddManualQuestion}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={14} />
                  <span>Add Question</span>
                </button>
              </div>

              {/* Voice-to-Text & Gujarati Keyboard Controls */}
              <VoiceInputControl
                value={manualQuestionInput}
                onChange={setManualQuestionInput}
                inputRef={manualQuestionInputRef}
                defaultLang="gu-IN"
              />
            </div>
          </div>

          {/* ── SECTION 3: REVIEW & SUBMISSION ── */}
          <div className="card" style={{ borderLeft: '4px solid #16A34A' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: '1px solid #E2E8F0',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    background: '#DCFCE7',
                    color: '#16A34A',
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  3
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                    Review &amp; Submit / ચકાસણી અને સબમિશન
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                    Total Questions: <strong>{questionsList.length}</strong> (2 marks each)
                  </p>
                </div>
              </div>

              {questionsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuestionsList([])}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)', fontSize: 12 }}
                >
                  Clear All Questions
                </button>
              )}
            </div>

            {questionsList.length === 0 ? (
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 8,
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: 13,
                  border: '1px dashed #CBD5E1',
                  marginBottom: 16,
                }}
              >
                કોઈ પ્રશ્ન પસંદ કરેલ નથી. ઉપરથી ટોપિક પસંદ કરો અથવા નવો પ્રશ્ન લખો.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {questionsList.map((q, idx) => (
                  <div
                    key={q.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 8,
                      border: '1px solid #D1DDE8',
                      padding: '10px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#123B5D',
                          background: '#E8F1F8',
                          padding: '2px 8px',
                          borderRadius: 4,
                        }}
                      >
                        Question {idx + 1}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#64748B' }}>
                          {q.isManual ? 'Manual Entry' : `Topic: ${q.sourceTopicCode}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="btn btn-ghost btn-sm"
                          style={{
                            padding: '2px 6px',
                            color: 'var(--danger)',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          title="Remove question"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      className="field-input w-full"
                      value={q.questionText}
                      onChange={(e) => handleEditQuestionText(idx, e.target.value)}
                      placeholder={`Edit Question ${idx + 1} text...`}
                      style={{ fontSize: 13, fontWeight: 500 }}
                      required
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={isSubmitting || questionsList.length === 0}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: '12px 20px',
                  fontSize: 15,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={18} />
                <span>{isSubmitting ? 'Saving...' : editingLtId ? 'Update LT' : 'Submit LT'}</span>
              </button>

              {editingLtId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-ghost"
                  style={{ padding: '12px 18px', fontSize: 14 }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: LT HISTORY (WITH RESPONSIVE CARDS FOR MOBILE & TABLE ON DESKTOP) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div className="card__title">Scheduled &amp; Past Lecture Tests</div>
              <div className="card__desc">
                Synchronized directly with Assistant Faculty LT Evaluation Portal
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Standard:</label>
              <select
                className="filter-select"
                value={historyFilterStd}
                onChange={(e) => {
                  setHistoryFilterStd(e.target.value);
                  setHistoryPage(1);
                }}
                style={{ height: 34, fontSize: 12 }}
              >
                <option value="ALL">All Standards</option>
                <option value="STD_11">Standard 11</option>
                <option value="STD_12">Standard 12</option>
              </select>
            </div>
          </div>

          {isLoadingHistory ? (
            <div style={{ textAlign: 'center', padding: 36, color: '#64748B' }}>
              Loading LT history...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 36, color: '#64748B' }}>
              No Lecture Tests found. Switch to <strong>Set LT</strong> tab to create one.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="table-wrap desktop-only" style={{ margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>LT No</th>
                      <th>Date</th>
                      <th>Standard</th>
                      <th>Subject</th>
                      <th>Questions Included</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.map((lt) => (
                      <tr key={lt.id || lt._id}>
                        <td className="num">
                          <strong>LT #{lt.ltNo}</strong>
                        </td>
                        <td className="num">
                          {lt.examDate
                            ? new Date(lt.examDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td>
                          {lt.standard === 'STD_11' ? 'Standard 11' : 'Standard 12'}
                          {lt.division && lt.division !== 'ALL' ? ` - Div ${lt.division}` : ''}
                        </td>
                        <td>
                          <strong>{lt.subject}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {(lt.questions || []).map((q, idx) => (
                              <div key={idx} style={{ fontSize: 12.5 }}>
                                <strong style={{ color: '#123B5D' }}>
                                  Q{q.questionNo || idx + 1}:
                                </strong>{' '}
                                <span>{q.questionText}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`chip ${
                              lt.status === 'EVALUATED'
                                ? 'chip-success'
                                : lt.status === 'CONDUCTED'
                                ? 'chip-neutral'
                                : 'chip-warning'
                            }`}
                          >
                            {lt.status === 'EVALUATED'
                              ? 'Evaluated'
                              : lt.status === 'CONDUCTED'
                              ? 'Pending Marks'
                              : 'Scheduled'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{
                              marginRight: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            onClick={() => setViewingLt(lt)}
                          >
                            <Eye size={13} />
                            <span>View LT</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{
                              marginRight: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            onClick={() => handleStartEditLt(lt)}
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger-ghost btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            onClick={() => handleDeleteLt(lt.id || lt._id)}
                            title="Delete LT"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div
                className="mobile-only"
                style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}
              >
                {paginatedHistory.map((lt) => (
                  <div
                    key={lt.id || lt._id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      padding: 14,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#123B5D' }}>
                        LT #{lt.ltNo}
                      </span>
                      <span
                        className={`chip ${
                          lt.status === 'EVALUATED'
                            ? 'chip-success'
                            : lt.status === 'CONDUCTED'
                            ? 'chip-neutral'
                            : 'chip-warning'
                        }`}
                        style={{ fontSize: 11 }}
                      >
                        {lt.status === 'EVALUATED'
                          ? 'Evaluated'
                          : lt.status === 'CONDUCTED'
                          ? 'Pending Marks'
                          : 'Scheduled'}
                      </span>
                    </div>

                    <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 8 }}>
                      <div>
                        <strong>Date:</strong>{' '}
                        {lt.examDate
                          ? new Date(lt.examDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </div>
                      <div>
                        <strong>Class:</strong>{' '}
                        {lt.standard === 'STD_11' ? 'Std 11' : 'Std 12'}
                        {lt.division && lt.division !== 'ALL' ? ` (Div ${lt.division})` : ''}
                      </div>
                      <div>
                        <strong>Subject:</strong> {lt.subject}
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#F8FAFC',
                        borderRadius: 6,
                        padding: 8,
                        fontSize: 12,
                        marginBottom: 12,
                      }}
                    >
                      <strong style={{ color: '#123B5D', display: 'block', marginBottom: 4 }}>
                        Questions ({(lt.questions || []).length}):
                      </strong>
                      {(lt.questions || []).slice(0, 2).map((q, idx) => (
                        <div
                          key={idx}
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Q{q.questionNo || idx + 1}: {q.questionText}
                        </div>
                      ))}
                      {(lt.questions || []).length > 2 && (
                        <div style={{ color: '#64748B', fontStyle: 'italic', marginTop: 2 }}>
                          +{(lt.questions || []).length - 2} more question(s)...
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        onClick={() => setViewingLt(lt)}
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        onClick={() => handleStartEditLt(lt)}
                      >
                        <Pencil size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger-ghost btn-sm"
                        style={{ padding: '4px 10px' }}
                        onClick={() => handleDeleteLt(lt.id || lt._id)}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredHistory.length > HISTORY_PAGE_SIZE && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E8F0' }}>
                  <PaginationBar
                    currentPage={safeHistoryPage}
                    totalItems={filteredHistory.length}
                    pageSize={HISTORY_PAGE_SIZE}
                    onPageChange={setHistoryPage}
                    itemLabel="tests"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── View Full LT Modal ── */}
      {viewingLt && (
        <ViewFullLtModal
          isOpen={!!viewingLt}
          onClose={() => setViewingLt(null)}
          lt={viewingLt}
        />
      )}
    </div>
  );
}
