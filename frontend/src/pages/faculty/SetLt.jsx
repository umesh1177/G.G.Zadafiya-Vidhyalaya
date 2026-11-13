import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { syllabusApi } from '../../services/syllabusApi';
import { ltApi } from '../../services/ltApi';
import PaginationBar from '../../components/common/PaginationBar';
import ViewFullLtModal from '../../components/common/ViewFullLtModal';
import VoiceInputControl from '../../components/common/VoiceInputControl';

export default function SetLt() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();
  const currentSubject = user?.subject || 'Physics';
  const facultyId = user?.id || user?._id || user?.empCode || user?.username || 'faculty';
  const defaultStdForSubj = 'STD_11';

  useEffect(() => {
    setHeader({
      title: 'Set LT',
      subtitle: "Pick a topic finished today and set tomorrow's Lecture Test"
    });
  }, [setHeader]);

  // Sub-tabs: 'set-lt' | 'history'
  const [activeTab, setActiveTab] = useState('set-lt');

  // Left Card: ONLY Today's Finished Topics
  const [todayFinished, setTodayFinished] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [topicsPage, setTopicsPage] = useState(1);
  const TOPICS_PAGE_SIZE = 5;

  // Right Card: LT Box State
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

  // History State (Persisted in MongoDB)
  const [ltHistory, setLtHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 6;

  // View Full LT Modal State (History tab)
  const [viewingLt, setViewingLt] = useState(null);

  // Sync subject/default standard if user updates
  useEffect(() => {
    setSubject(currentSubject);
    setStandard('STD_11');
  }, [currentSubject]);

  // Load Today's Finished Topics (strictly isolated to facultyId) & Subject LT History
  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoadingTopics(true);
      setIsLoadingHistory(true);
    }
    try {
      const [finished, allLts] = await Promise.all([
        syllabusApi.getTodayFinished({ subject: currentSubject, facultyId, role: 'faculty' }).catch(() => []),
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
  }, [currentSubject, facultyId]);

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

  // Toggle selection via `પસંદ કરો` button on Today's Finished Topic row
  const handleToggleSelectTopic = (topicItem) => {
    const existingIdx = questionsList.findIndex(q => q.sourceId === topicItem.id);
    if (existingIdx !== -1) {
      setQuestionsList(prev => prev.filter(q => q.sourceId !== topicItem.id));
    } else {
      const hasGuj = topicItem.titleGujarati && topicItem.titleGujarati.trim() && topicItem.titleGujarati.trim() !== (topicItem.title || '').trim();
      const topicLabel = hasGuj
        ? `${topicItem.code} ${topicItem.title} (${topicItem.titleGujarati})`
        : `${topicItem.code} ${topicItem.title}`;
      setQuestionsList(prev => [
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
    setQuestionsList(prev => [
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

  // Edit Question 1, Question 2 text inline
  const handleEditQuestionText = (idx, newText) => {
    setQuestionsList(prev =>
      prev.map((q, i) => (i === idx ? { ...q, questionText: newText } : q))
    );
  };

  // Remove a question
  const handleRemoveQuestion = (idx) => {
    setQuestionsList(prev => prev.filter((_, i) => i !== idx));
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
    const validQuestions = questionsList.filter(q => q.questionText && q.questionText.trim());
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
        topicsCovered: validQuestions.map(q => q.sourceTopicTitle || q.questionText),
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
        setLtHistory(prev => prev.map(lt => ((lt.id || lt._id) === editingLtId ? updated : lt)));
        setFeedbackMsg(`LT #${updated.ltNo} સફળતાપૂર્વક અપડેટ કરવામાં આવ્યો!`);
      } else {
        const created = await ltApi.createLt(payload);
        setLtHistory(prev => [created, ...prev]);
        setHistoryPage(1);
        setFeedbackMsg(`LT #${created.ltNo} (${created.subject}, ${created.standard === 'STD_11' ? 'Std 11' : 'Std 12'}) સફળતાપૂર્વક બનાવીને Assistant Faculty ને મોકલી દેવાયો છે!`);
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

  // Load existing LT into LT Box for Editing
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
      setLtHistory(prev => prev.filter(lt => (lt.id || lt._id) !== ltId));
      setFeedbackMsg('Lecture Test સફળતાપૂર્વક દૂર કરવામાં આવ્યો.');
      await loadData(true);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete LT');
    }
  };

  // Clamp pagination safely if lists change
  const safeTopicsPage = Math.min(topicsPage, Math.max(1, Math.ceil(todayFinished.length / TOPICS_PAGE_SIZE)));
  const safeHistoryPage = Math.min(historyPage, Math.max(1, Math.ceil(ltHistory.length / HISTORY_PAGE_SIZE)));

  // Paginated Slices
  const paginatedFinished = todayFinished.slice(
    (safeTopicsPage - 1) * TOPICS_PAGE_SIZE,
    safeTopicsPage * TOPICS_PAGE_SIZE
  );
  const paginatedHistory = ltHistory.slice(
    (safeHistoryPage - 1) * HISTORY_PAGE_SIZE,
    safeHistoryPage * HISTORY_PAGE_SIZE
  );

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="banner banner-success" style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✅ {feedbackMsg}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFeedbackMsg(null)}>✕</button>
        </div>
      )}
      {errorMsg && (
        <div className="banner banner-warning" style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {errorMsg}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setErrorMsg(null)}>✕</button>
        </div>
      )}

      {/* ── Top Tab Switcher (STS Navy Theme) ── */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'set-lt' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('set-lt')}
        >
          Set LT
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'history' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          LT History ({ltHistory.length})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: SET LT (2-COLUMN LAYOUT)                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'set-lt' && (
        <div className="set-lt-grid">
          {/* ── LEFT CARD: TODAY'S FINISHED TOPIC LIST ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 20px',
              borderBottom: '1px solid var(--line-soft)',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div>
                <h2 className="card__title" style={{ margin: 0 }}>
                  Today&apos;s Finished Topic List
                </h2>
                <div className="card__desc">
                  આજે પૂર્ણ કરેલા ટોપિક્સ ({todayFinished.length})
                </div>
              </div>
              <Link to="/faculty/syllabus" className="btn btn-ghost btn-sm">
                + Finish Topics in Syllabus
              </Link>
            </div>

            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 65 }}>SR NO</th>
                    <th>TOPIC NAME</th>
                    <th style={{ textAlign: 'right', width: 135 }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingTopics ? (
                    <tr>
                      <td colSpan={3} style={{ padding: 24, textAlign: 'center', color: 'var(--slate)' }}>
                        આજે પૂર્ણ કરેલા ટોપિક્સ લોડ થઈ રહ્યા છે...
                      </td>
                    </tr>
                  ) : todayFinished.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: 28, textAlign: 'center', color: 'var(--slate)' }}>
                        <div>આજે હજી કોઈ ટોપિક Finish કરેલ નથી.</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          <strong>Syllabus Tracker</strong> માં જઈને પૂર્ણ કરેલા ટોપિક પર <strong>Finish</strong> ક્લિક કરો.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedFinished.map((item, idx) => {
                      const srNo = (safeTopicsPage - 1) * TOPICS_PAGE_SIZE + idx + 1;
                      const isSelected = questionsList.some(q => q.sourceId === item.id);
                      return (
                        <tr
                          key={item.id || srNo}
                          style={{ background: isSelected ? 'var(--indigo-softer)' : '#FFFFFF' }}
                        >
                          <td className="num" style={{ fontWeight: 700 }}>{srNo}</td>
                          <td>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                              <span className="chip chip-neutral" style={{ marginRight: 6, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                                {item.code}
                              </span>
                              <span>{item.title}</span>
                            </div>
                            {item.titleGujarati && item.titleGujarati.trim() !== (item.title || '').trim() && (
                              <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>
                                {item.titleGujarati}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: 'var(--slate-light)', marginTop: 2 }}>
                              {item.standard} • Ch {item.chapterNo}: {item.chapterName}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleSelectTopic(item)}
                              className={isSelected ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                            >
                              {isSelected ? '✓ પસંદ કરેલ' : 'પસંદ કરો'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={safeTopicsPage}
              totalItems={todayFinished.length}
              pageSize={TOPICS_PAGE_SIZE}
              onPageChange={setTopicsPage}
              itemLabel="finished topics"
            />
          </div>

          {/* ── RIGHT CARD: LT BOX ── */}
          <div className="card" style={{ border: editingLtId ? '2px solid #123B5D' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 className="card__title" style={{ margin: 0 }}>
                {editingLtId ? 'Edit LT Box' : 'LT Box'}
              </h2>
              {editingLtId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-danger-ghost btn-sm"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitLt} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Selected Topics & Editable Questions Container */}
              <div style={{
                background: 'var(--indigo-softer)',
                borderRadius: 12,
                border: '1px solid var(--line)',
                padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#123B5D' }}>
                    Selected Topics / Questions ({questionsList.length})
                  </span>
                  {questionsList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuestionsList([])}
                      style={{ background: 'none', border: 'none', fontSize: 11.5, color: 'var(--danger)', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {questionsList.length === 0 ? (
                  <div style={{ color: 'var(--slate)', fontSize: 13, padding: '10px 0' }}>
                    None selected yet — click <strong>પસંદ કરો</strong> from Today&apos;s Finished Topic List or add a manual question below.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {questionsList.map((q, idx) => (
                      <div
                        key={q.id}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: 9,
                          border: '1px solid #D1DDE8',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            color: '#123B5D',
                            background: '#E8F1F8',
                            padding: '2px 8px',
                            borderRadius: 5,
                            border: '1px solid #C8DBED',
                          }}>
                            Question {idx + 1}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--slate)' }}>
                              {q.isManual ? 'Manual Entry' : `Topic: ${q.sourceTopicCode}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              style={{
                                background: 'var(--danger-soft)',
                                color: 'var(--danger)',
                                border: '1px solid #F6C3BF',
                                borderRadius: 4,
                                padding: '1px 6px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Remove question"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          className="field-input w-full"
                          value={q.questionText}
                          onChange={(e) => handleEditQuestionText(idx, e.target.value)}
                          placeholder={`Edit Question ${idx + 1} text...`}
                          style={{ fontSize: 13, background: '#FAFBFD', fontWeight: 500 }}
                          required
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual Question Entry Field */}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #CBD5E1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#123B5D', marginBottom: 6 }}>
                    Manually Set Question (લખીને અથવા બોલીને પ્રશ્ન ઉમેરો)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <input
                      type="text"
                      ref={manualQuestionInputRef}
                      className="field-input"
                      style={{ flex: '1 1 200px', minWidth: 0, fontSize: 13 }}
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
                      className="btn btn-ghost btn-sm"
                    >
                      + Add Question
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

              {/* Date, Subject, Standard & Duration Fields */}
              <div className="form-grid-2">
                <div>
                  <label className="field-label">Date *</label>
                  <input
                    type="date"
                    className="field-input w-full"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Subject *</label>
                  <div
                    className="filter-select w-full flex items-center justify-between"
                    style={{
                      background: '#f8fafc',
                      borderColor: '#cbd5e1',
                      color: '#0f172a',
                      fontWeight: 600,
                      cursor: 'not-allowed',
                      padding: '8px 12px',
                    }}
                    title="Subject Faculty is locked to their assigned subject"
                  >
                    <span>🔒 {currentSubject}</span>
                    <span style={{ fontSize: '11px', color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                      Assigned Subject
                    </span>
                  </div>
                </div>

                <div>
                  <label className="field-label">Standard *</label>
                  <select
                    className="filter-select w-full"
                    value={standard}
                    onChange={(e) => setStandard(e.target.value)}
                    required
                  >
                    <option value="STD_12">Standard 12</option>
                    <option value="STD_11">Standard 11</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Division &amp; Duration</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <select
                      className="filter-select"
                      style={{ flex: '1 1 110px', minWidth: 0 }}
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                    >
                      <option value="ALL">All Div</option>
                      <option value="A">Div A</option>
                      <option value="B">Div B</option>
                    </select>
                    <input
                      type="number"
                      className="field-input"
                      style={{ width: 76 }}
                      min={1}
                      max={90}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      title="Duration in minutes"
                    />
                  </div>
                </div>
              </div>

              {/* Submit LT Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '11px 18px', fontSize: 14.5 }}
              >
                {isSubmitting ? 'Saving...' : editingLtId ? 'Update LT' : 'Submit LT'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: LT HISTORY (WITH VIEW LT, EDIT, DELETE & PAGINATION)            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-soft)' }}>
            <div className="card__title">Scheduled &amp; Past Lecture Tests (LT History)</div>
            <div className="card__desc">Synchronized directly with Assistant Faculty LT Evaluation Portal</div>
          </div>

          <div className="table-wrap" style={{ margin: 0 }}>
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
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>
                      Loading LT history...
                    </td>
                  </tr>
                ) : ltHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No Lecture Tests scheduled yet. Switch to <strong>Set LT</strong> tab to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((lt) => (
                    <tr key={lt.id || lt._id}>
                      <td className="num"><strong>LT #{lt.ltNo}</strong></td>
                      <td className="num">
                        {lt.examDate
                          ? new Date(lt.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td>
                        {lt.standard === 'STD_11' ? 'Standard 11' : 'Standard 12'}
                        {lt.division && lt.division !== 'ALL' ? ` - Div ${lt.division}` : ''}
                      </td>
                      <td><strong>{lt.subject}</strong></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {(lt.questions || []).map((q, idx) => (
                            <div key={idx} style={{ fontSize: 12.5 }}>
                              <strong style={{ color: '#123B5D' }}>Question {q.questionNo || idx + 1}:</strong>{' '}
                              <span>{q.questionText}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`chip ${
                          lt.status === 'EVALUATED' ? 'chip-success' :
                          lt.status === 'CONDUCTED' ? 'chip-neutral' : 'chip-warning'
                        }`}>
                          {lt.status === 'EVALUATED' ? 'Evaluated' : lt.status === 'CONDUCTED' ? 'Pending Marks' : 'Scheduled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ marginRight: 6 }}
                          onClick={() => setViewingLt(lt)}
                        >
                          👁️ View LT
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ marginRight: 6 }}
                          onClick={() => handleStartEditLt(lt)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => handleDeleteLt(lt.id || lt._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            currentPage={safeHistoryPage}
            totalItems={ltHistory.length}
            pageSize={HISTORY_PAGE_SIZE}
            onPageChange={setHistoryPage}
            itemLabel="lecture tests"
          />
        </div>
      )}

      {/* ── VIEW FULL LT MODAL IN SUBJECT FACULTY HISTORY TAB ── */}
      <ViewFullLtModal
        lt={viewingLt}
        onClose={() => setViewingLt(null)}
        footerExtra={
          viewingLt && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const ltToEdit = viewingLt;
                setViewingLt(null);
                handleStartEditLt(ltToEdit);
              }}
            >
              ✏️ Edit This LT
            </button>
          )
        }
      />
    </div>
  );
}
