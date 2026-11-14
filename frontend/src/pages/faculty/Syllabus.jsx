import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { syllabusApi } from '../../services/syllabusApi';
import {
  collectChapterExamples,
  collectChapterExercises,
  calculateChapterCompletion,
  calculateSyllabusCompletion,
  compareSyllabusCodes,
  hasDistinctGujarati,
  isSubtopicCompleted,
  isTopicCompleted,
} from '../../utils/syllabusUtils';
import VoiceInputControl from '../../components/common/VoiceInputControl';
import { CheckCircle2, AlertTriangle, X, Eye, GraduationCap, Users, Lock, BookOpen, Lightbulb, FileText, Trophy, Check, Image as ImageIcon, HelpCircle, Search, Clock, Mic, ExternalLink } from 'lucide-react';

export default function FacultySyllabus() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();

  useEffect(() => {
    setHeader({
      title: 'અભ્યાસક્રમ ટ્રેકિંગ (Syllabus Tracker)',
      subtitle: `${user?.subject || 'Physics'} Faculty — Standard 11 & 12 Curriculum Management`
    });
  }, [setHeader, user]);

  // Standard & Division Selectors + Strict Faculty Identity for Isolated Progress
  const currentSubject = user?.subject || 'Physics';
  const facultyId = user?.id || user?._id || user?.empCode || user?.username || 'faculty';
  const [selectedStandard, setSelectedStandard] = useState('Standard 11');
  const [selectedDivision, setSelectedDivision] = useState('Division A');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSelectedStandard('Standard 11');
  }, [user?.subject]);

  // Syllabus Chapters State
  const [chapters, setChapters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Accordion & Dropdown Collapse States
  const [expandedChapters, setExpandedChapters] = useState({ 1: true });
  const [expandedTopics, setExpandedTopics] = useState({ '1.1': true });
  const [expandedExamplesDropdown, setExpandedExamplesDropdown] = useState({});
  const [expandedExercisesDropdown, setExpandedExercisesDropdown] = useState({});

  // Full View Modal State
  const [viewingItem, setViewingItem] = useState(null);

  // Add Modals
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);

  // Form: Add Chapter
  const [newChapterForm, setNewChapterForm] = useState({
    chapterNo: '',
    chapterName: '',
    chapterNameGujarati: '',
  });
  const newChapterGujRef = useRef(null);

  // Form: Add Topic / Subtopic / Sub-subtopic / Example / Swadhyay
  const [newTopicForm, setNewTopicForm] = useState({
    chapterId: '',
    chapterNo: '',
    entryType: 'SUBTOPIC', // 'TOPIC' | 'SUBTOPIC' | 'SUBSUBTOPIC' | 'EXAMPLE' | 'SWADHYAY'
    parentTopicNo: '1.1',
    parentSubtopicNo: '',
    number: '',
    title: '',
    titleGujarati: '',
  });
  const newTopicGujRef = useRef(null);

  // ─── Voice-to-Text Speech Recognition Setup ──────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTargetField, setRecordingTargetField] = useState(null);
  const recognitionRef = useRef(null);

  const startVoiceRecording = (targetField, targetForm, lang = 'gu-IN') => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('તમારા બ્રાઉઝરમાં વોઈસ-ટુ-ટેક્સ્ટ સપોર્ટેડ નથી. કૃપા કરીને Google Chrome અથવા Microsoft Edge નો ઉપયોગ કરો.');
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setRecordingTargetField(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setRecordingTargetField(targetField);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          if (targetForm === 'chapter') {
            setNewChapterForm(prev => ({ ...prev, [targetField]: transcript }));
          } else {
            setNewTopicForm(prev => ({ ...prev, [targetField]: transcript }));
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition warning:', event.error);
        setIsRecording(false);
        setRecordingTargetField(null);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setRecordingTargetField(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start voice recognition:', err);
      setIsRecording(false);
      setRecordingTargetField(null);
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTargetField(null);
  };

  // ─── Fetch Syllabus from Backend (Strictly Isolated to this Faculty) ─────────
  const loadSyllabus = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setErrorMsg(null);
    }
    try {
      const data = await syllabusApi.getSyllabus({
        standard: selectedStandard,
        division: selectedDivision,
        subject: currentSubject,
        facultyId,
        role: 'faculty',
      });
      setChapters(data || []);
      if (!silent && data && data.length > 0) {
        setExpandedChapters(prev => ({ ...prev, [data[0].chapterNo]: true }));
        if (data[0].topics && data[0].topics.length > 0) {
          setExpandedTopics(prev => ({ ...prev, [data[0].topics[0].topicNo]: true }));
        }
      }
    } catch (err) {
      console.error('Failed to load syllabus:', err.message);
      if (!silent) {
        setErrorMsg('સર્વર સાથે કનેક્ટ થઈ શક્યું નથી. કૃપા કરીને બેકએન્ડ સર્વર ચાલુ છે કે નહીં તે તપાસો.');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [selectedStandard, selectedDivision, currentSubject, facultyId]);

  useEffect(() => {
    loadSyllabus(false);
    const handleFocus = () => loadSyllabus(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadSyllabus(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadSyllabus]);

  // ─── Toggle Finish / Completion Status (Isolated per Faculty) ────────────────
  const handleToggleFinish = async (chapterId, itemNo, itemType, itemId = null, parentTopicNo = null) => {
    setErrorMsg(null);
    try {
      const updatedChapter = await syllabusApi.toggleStatus(
        chapterId,
        itemNo,
        itemType,
        itemId,
        parentTopicNo,
        {
          facultyId,
          facultyName: user?.name || 'Subject Faculty',
          facultyEmpCode: user?.empCode || '',
          facultySubject: currentSubject,
        }
      );
      setChapters(prev =>
        prev.map(ch => (ch.id === chapterId || ch._id === chapterId ? updatedChapter : ch))
      );

      // Update open view modal if currently inspecting this item
      if (viewingItem && viewingItem.chapterId === chapterId && (viewingItem.rawNo || viewingItem.code) === itemNo && viewingItem.itemType === itemType) {
        setViewingItem(prev => ({
          ...prev,
          status: prev.status === 'done' ? 'pending' : 'done',
          completedAt: prev.status === 'done' ? null : new Date().toISOString(),
        }));
      }

      await loadSyllabus(true);
    } catch (err) {
      // Optimistic fallback with cascade
      setChapters(prev =>
        prev.map(ch => {
          if (ch.id !== chapterId && ch._id !== chapterId) return ch;
          const now = new Date().toISOString();

          if (itemType === 'EXAMPLE') {
            const newChEx = (ch.examples || []).map(ex =>
              (itemId && ex._id === itemId) || ex.exampleNo === itemNo
                ? { ...ex, status: ex.status === 'done' ? 'pending' : 'done' }
                : ex
            );
            const newTopics = (ch.topics || []).map(t => ({
              ...t,
              examples: (t.examples || []).map(ex =>
                (itemId && ex._id === itemId) || (!parentTopicNo || t.topicNo === parentTopicNo) && ex.exampleNo === itemNo
                  ? { ...ex, status: ex.status === 'done' ? 'pending' : 'done' }
                  : ex
              ),
            }));
            return { ...ch, examples: newChEx, topics: newTopics };
          }

          if (itemType === 'SWADHYAY') {
            const newChSw = (ch.swadhyay || []).map(sw =>
              (itemId && sw._id === itemId) || sw.exerciseNo === itemNo
                ? { ...sw, status: sw.status === 'done' ? 'pending' : 'done' }
                : sw
            );
            const newTopics = (ch.topics || []).map(t => ({
              ...t,
              swadhyay: (t.swadhyay || []).map(sw =>
                (itemId && sw._id === itemId) || (!parentTopicNo || t.topicNo === parentTopicNo) && sw.exerciseNo === itemNo
                  ? { ...sw, status: sw.status === 'done' ? 'pending' : 'done' }
                  : sw
              ),
            }));
            return { ...ch, swadhyay: newChSw, topics: newTopics };
          }

          const newTopics = (ch.topics || []).map(t => {
            if (itemType === 'TOPIC' && t.topicNo === itemNo) {
              const nextStatus = isTopicCompleted(t) ? 'pending' : 'done';
              return {
                ...t,
                status: nextStatus,
                completedAt: nextStatus === 'done' ? now : null,
                subtopics: (t.subtopics || []).map(st => ({
                  ...st,
                  status: nextStatus,
                  completedAt: nextStatus === 'done' ? now : null,
                  subSubtopics: (st.subSubtopics || []).map(sst => ({
                    ...sst,
                    status: nextStatus,
                    completedAt: nextStatus === 'done' ? now : null,
                  })),
                })),
              };
            }

            if (itemType === 'SUBTOPIC') {
              const newSubtopics = (t.subtopics || []).map(st => {
                if (st.subtopicNo === itemNo) {
                  const nextStatus = isSubtopicCompleted(st) ? 'pending' : 'done';
                  return {
                    ...st,
                    status: nextStatus,
                    completedAt: nextStatus === 'done' ? now : null,
                    subSubtopics: (st.subSubtopics || []).map(sst => ({
                      ...sst,
                      status: nextStatus,
                      completedAt: nextStatus === 'done' ? now : null,
                    })),
                  };
                }
                return st;
              });
              const allDone = newSubtopics.length > 0 && newSubtopics.every(st => isSubtopicCompleted(st));
              return { ...t, subtopics: newSubtopics, status: allDone ? 'done' : 'pending' };
            }

            if (itemType === 'SUBSUBTOPIC') {
              const newSubtopics = (t.subtopics || []).map(st => {
                const newSst = (st.subSubtopics || []).map(sst =>
                  sst.subSubtopicNo === itemNo
                    ? { ...sst, status: sst.status === 'done' ? 'pending' : 'done', completedAt: sst.status === 'done' ? null : now }
                    : sst
                );
                const stDone = newSst.length > 0 ? newSst.every(x => x.status === 'done') : st.status === 'done';
                return { ...st, subSubtopics: newSst, status: stDone ? 'done' : 'pending' };
              });
              const allDone = newSubtopics.length > 0 && newSubtopics.every(st => isSubtopicCompleted(st));
              return { ...t, subtopics: newSubtopics, status: allDone ? 'done' : 'pending' };
            }

            return t;
          });

          return { ...ch, topics: newTopics };
        })
      );
    }
  };

  // ─── Collapse / Expand Handlers ────────────────────────────────────────────
  const toggleChapterExpand = (chapterNo) => {
    setExpandedChapters(prev => ({ ...prev, [chapterNo]: !prev[chapterNo] }));
  };

  const toggleTopicExpand = (topicNo) => {
    setExpandedTopics(prev => ({ ...prev, [topicNo]: !prev[topicNo] }));
  };

  const toggleExamplesDropdown = (chapterKey) => {
    setExpandedExamplesDropdown(prev => ({ ...prev, [chapterKey]: !prev[chapterKey] }));
  };

  const toggleExercisesDropdown = (chapterKey) => {
    setExpandedExercisesDropdown(prev => ({ ...prev, [chapterKey]: !prev[chapterKey] }));
  };

  // ─── Open Full View Modal ───────────────────────────────────────────────────
  const openFullView = ({
    itemType,
    code,
    title,
    titleGujarati,
    imageUrl,
    figureNote,
    status,
    completedAt,
    chapterId,
    chapterNo,
    chapterName,
    chapterNameGujarati,
    parentTopicNo,
    parentTopicTitle,
    parentSubtopicNo,
    itemId,
  }) => {
    setViewingItem({
      itemType,
      code,
      title,
      titleGujarati,
      imageUrl,
      figureNote,
      status,
      completedAt,
      chapterId,
      chapterNo,
      chapterName,
      chapterNameGujarati,
      parentTopicNo,
      parentTopicTitle,
      parentSubtopicNo,
      itemId,
    });
  };

  // ─── Add Chapter Submission ────────────────────────────────────────────────
  const handleAddChapterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!newChapterForm.chapterNo || !newChapterForm.chapterName) {
      setErrorMsg('કૃપા કરીને પ્રકરણ નંબર અને નામ દાખલ કરો.');
      return;
    }

    try {
      const payload = {
        standard: selectedStandard,
        division: selectedDivision,
        subject: currentSubject,
        chapterNo: Number(newChapterForm.chapterNo),
        chapterName: newChapterForm.chapterName.trim(),
        chapterNameGujarati: newChapterForm.chapterNameGujarati.trim(),
      };

      const created = await syllabusApi.addChapter(payload);
      setChapters(prev => {
        const next = [...prev, created];
        return next.sort((a, b) => a.chapterNo - b.chapterNo);
      });
      setExpandedChapters(prev => ({ ...prev, [created.chapterNo]: true }));
      setSuccessMsg(`પ્રકરણ ${payload.chapterNo}: ${payload.chapterName} સફળતાપૂર્વક ઉમેરવામાં આવ્યું!`);
      setShowAddChapterModal(false);
      setNewChapterForm({ chapterNo: '', chapterName: '', chapterNameGujarati: '' });
      await loadSyllabus(true);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'પ્રકરણ ઉમેરવામાં નિષ્ફળતા.');
    }
  };

  // ─── Add Topic / Subtopic / Sub-subtopic / Example / Swadhyay Submission ───
  const handleAddTopicSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!newTopicForm.title) {
      setErrorMsg('શીર્ષક / નામ જરૂરી છે.');
      return;
    }

    try {
      const targetCh = chapters.find(
        c => c.id === newTopicForm.chapterId || c._id === newTopicForm.chapterId || c.chapterNo === Number(newTopicForm.chapterNo)
      );
      const chKey = targetCh?.id || targetCh?._id || targetCh?.chapterNo;
      const payload = {
        chapterId: targetCh?.id || targetCh?._id,
        chapterNo: targetCh?.chapterNo,
        entryType: newTopicForm.entryType,
        parentTopicNo: newTopicForm.parentTopicNo,
        parentSubtopicNo: newTopicForm.parentSubtopicNo,
        number: newTopicForm.number.trim(),
        title: newTopicForm.title.trim(),
        titleGujarati: newTopicForm.titleGujarati.trim(),
        standard: selectedStandard,
        division: selectedDivision,
        subject: currentSubject,
        facultyId,
      };

      const updated = await syllabusApi.addTopic(payload);
      setChapters(prev =>
        prev.map(ch =>
          ch.id === updated.id || ch._id === updated.id || ch.chapterNo === updated.chapterNo ? updated : ch
        )
      );

      // Automatically open appropriate dropdown / accordion so the user sees the new entry
      setExpandedChapters(prev => ({ ...prev, [updated.chapterNo]: true }));
      if (newTopicForm.entryType === 'EXAMPLE') {
        setExpandedExamplesDropdown(prev => ({ ...prev, [chKey]: true }));
      } else if (newTopicForm.entryType === 'SWADHYAY') {
        setExpandedExercisesDropdown(prev => ({ ...prev, [chKey]: true }));
      } else if (newTopicForm.parentTopicNo) {
        setExpandedTopics(prev => ({ ...prev, [newTopicForm.parentTopicNo]: true }));
      }

      setSuccessMsg(`મુદ્દો '${payload.title}' સફળતાપૂર્વક ઉમેરવામાં આવ્યો!`);
      setShowAddTopicModal(false);
      setNewTopicForm({
        chapterId: '',
        chapterNo: '',
        entryType: 'SUBTOPIC',
        parentTopicNo: '1.1',
        parentSubtopicNo: '',
        number: '',
        title: '',
        titleGujarati: '',
      });
      await loadSyllabus(true);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'મુદ્દો ઉમેરવામાં નિષ્ફળતા.');
    }
  };

  // ─── Proper Syllabus Completion Algorithm (Hierarchical Leaf Counting) ──────
  const syllabusStats = useMemo(() => {
    return calculateSyllabusCompletion(chapters);
  }, [chapters]);

  // ─── Reusable Action Buttons Helper ─────────────────────────────────────────
  const FinishButton = ({ isDone, onClick, compact = false }) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        padding: compact ? '3px 9px' : '5px 12px',
        borderRadius: 7,
        fontSize: compact ? 11.5 : 12,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: isDone ? '#DCFCE7' : '#E8F1F8',
        color: isDone ? '#15803D' : '#123B5D',
        border: isDone ? '1.5px solid #86EFAC' : '1.5px solid #C8DBED',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
      title={isDone ? 'Completed — click to mark pending' : 'Click to mark completed by faculty'}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {isDone ? (
          <>
            <Check size={12} />
            <span>Finished</span>
          </>
        ) : (
          <span>Finish</span>
        )}
      </span>
    </button>
  );

  const ViewButton = ({ onClick, compact = false }) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        padding: compact ? '3px 9px' : '5px 11px',
        borderRadius: 7,
        fontSize: compact ? 11.5 : 12,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: '#F8FAFC',
        color: '#334155',
        border: '1.5px solid #CBD5E1',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
      title="View full text & details"
    >
      <Eye size={13} />
      <span>View</span>
    </button>
  );

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase().trim();
    return chapters.filter(ch => {
      if (ch.chapterName?.toLowerCase().includes(q) || ch.chapterNameGujarati?.toLowerCase().includes(q)) return true;
      if (String(ch.chapterNo).includes(q)) return true;
      return (ch.topics || []).some(t =>
        t.title?.toLowerCase().includes(q) ||
        t.titleGujarati?.toLowerCase().includes(q) ||
        t.topicNo?.toLowerCase().includes(q)
      );
    });
  }, [chapters, searchQuery]);

  return (
    <div className="module-container" style={{ width: '100%', paddingBottom: 40 }}>
      {/* ── Top Feedback Banners ── */}
      {successMsg && (
        <div className="banner banner-success" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSuccessMsg(null)} aria-label="Dismiss banner">
            <X size={14} />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="banner banner-warning" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setErrorMsg(null)} aria-label="Dismiss banner">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── 1. STANDARD, DIVISION & SYLLABUS COMPLETION ALGORITHM CARD ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 14,
        padding: '16px 18px',
        border: '1.5px solid #E2E8F0',
        marginBottom: 18,
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div className="filter-grid-4" style={{ alignItems: 'center', gap: 12 }}>
          {/* Standard Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <GraduationCap size={18} color="#123B5D" style={{ flexShrink: 0 }} />
            <select
              className="filter-select w-full"
              value={selectedStandard}
              onChange={e => setSelectedStandard(e.target.value)}
              style={{ height: 38, borderRadius: 8, fontWeight: 600, fontSize: 13 }}
            >
              <option value="Standard 12">Standard 12</option>
              <option value="Standard 11">Standard 11</option>
            </select>
          </div>

          {/* Subject Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
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
                height: 38,
              }}
              title="Assigned Subject"
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
                Subject
              </span>
            </div>
          </div>

          {/* Division Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Users size={18} color="#123B5D" style={{ flexShrink: 0 }} />
            <select
              className="filter-select w-full"
              value={selectedDivision}
              onChange={e => setSelectedDivision(e.target.value)}
              style={{ height: 38, borderRadius: 8, fontWeight: 600, fontSize: 13 }}
            >
              <option value="Division A">Division A</option>
              <option value="Division B">Division B</option>
            </select>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: 0 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            <input
              type="text"
              className="field-input w-full"
              style={{ height: 38, paddingLeft: 32, fontSize: 13 }}
              placeholder="Search topic or chapter..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Selected Class Chip & Weighted Completion Progress */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 10,
          borderTop: '1px solid #F1F5F9',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 6,
              background: '#E8F1F8',
              color: '#123B5D',
              padding: '5px 12px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              border: '1px solid #D1E1EF',
            }}>
              <span>પસંદ કરેલ વર્ગ:</span>
              <span>{selectedStandard === 'Standard 12' ? 'Std 12' : 'Std 11'}-{selectedDivision.replace('Division ', '')} ({currentSubject})</span>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: '#F0FDF4',
              color: '#166534',
              padding: '5px 10px',
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 700,
              border: '1px solid #BBF7D0',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Lock size={12} />
                <span>Personal Progress</span>
              </span>
              <span>• Isolated ({user?.name || currentSubject})</span>
            </div>
          </div>

          {/* Overall Progress Meter */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: '#334155' }}>કુલ અભ્યાસક્રમ પૂર્ણ (Overall):</span>
            <div style={{ width: 120, maxWidth: '100%', height: 9, background: '#E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                width: `${syllabusStats.overallPercent}%`,
                height: '100%',
                background: syllabusStats.overallPercent === 100 ? '#16A34A' : '#123B5D',
                borderRadius: 6,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <strong style={{ color: '#15803D', fontWeight: 800, fontSize: 14 }}>{syllabusStats.overallPercent}%</strong>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
              ({syllabusStats.doneUnits}/{syllabusStats.totalUnits} મુદ્દાઓ)
            </span>
          </div>
        </div>

        {/* Algorithm Category Breakdown Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <div style={{
            background: '#E8F1F8',
            border: '1px solid #C8DBED',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: '#123B5D',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <BookOpen size={14} />
            <span>ટોપિક્સ (Topics): {syllabusStats.topics.done}/{syllabusStats.topics.total} ({syllabusStats.topics.percent}%)</span>
          </div>
          <div style={{
            background: '#FAF5FF',
            border: '1px solid #E9D5FF',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: '#6B21A8',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Lightbulb size={14} />
            <span>ઉદાહરણો (Examples): {syllabusStats.examples.done}/{syllabusStats.examples.total} ({syllabusStats.examples.percent}%)</span>
          </div>
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: '#92400E',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <FileText size={14} />
            <span>સ્વાધ્યાય (Exercises): {syllabusStats.exercises.done}/{syllabusStats.exercises.total} ({syllabusStats.exercises.percent}%)</span>
          </div>
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: '#166534',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Trophy size={14} />
            <span>પૂર્ણ પ્રકરણો: {syllabusStats.completedChapters}/{chapters.length}</span>
          </div>
        </div>
      </div>

      {/* ── 2. ALL CHAPTERS INSIDE ONE SINGLE UNIFIED DIV ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1.5px solid #CBD5E1',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
      }}>
        {/* Unified Header Bar inside the single container */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: '#F8FAFC',
          borderBottom: '1.5px solid #CBD5E1',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 220px' }}>
            <BookOpen size={20} color="#123B5D" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0, overflowWrap: 'break-word', wordBreak: 'normal' }}>
                {selectedStandard === 'Standard 12' ? 'STD 12' : 'STD 11'} અભ્યાસક્રમનું માળખું ({currentSubject})
              </h2>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                પ્રકરણ → ટોપિક → સબ-ટોપિક → સબ-સબટોપિક • અંતે ઉદાહરણો અને સ્વાધ્યાય ડ્રોપડાઉન
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{
              background: '#123B5D',
              borderColor: '#123B5D',
              borderRadius: 10,
              padding: '9px 18px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13.5,
            }}
            onClick={() => {
              const nextNo = chapters.length + 1;
              setNewChapterForm({ chapterNo: String(nextNo), chapterName: '', chapterNameGujarati: '' });
              setShowAddChapterModal(true);
            }}
          >
            <span>+</span>
            <span>પ્રકરણ ઉમેરો (Add Chapter)</span>
          </button>
        </div>

        {/* Chapters Stack Inside This Same Unified Div */}
        {isLoading && chapters.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
            અભ્યાસક્રમ લોડ થઈ રહ્યો છે...
          </div>
        ) : chapters.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
            કોઈ પ્રકરણ મળ્યા નથી. '+ પ્રકરણ ઉમેરો' બટન પર ક્લિક કરીને અભ્યાસક્રમ શરૂ કરો.
          </div>
        ) : filteredChapters.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
            {searchQuery ? `"${searchQuery}" માટે કોઈ પરિણામ મળ્યું નથી.` : "કોઈ પ્રકરણ મળ્યા નથી."}
          </div>
        ) : (
          filteredChapters.map((chapter, chIndex) => {
            const chKey = chapter.id || chapter._id || chapter.chapterNo;
            const isChExpanded = expandedChapters[chapter.chapterNo] !== false;
            const chStats = syllabusStats.chapterMap[chKey] || calculateChapterCompletion(chapter);
            const chapterExamples = collectChapterExamples(chapter);
            const chapterExercises = collectChapterExercises(chapter);
            const isExamplesOpen = !!expandedExamplesDropdown[chKey];
            const isExercisesOpen = !!expandedExercisesDropdown[chKey];

            return (
              <div
                key={chKey}
                style={{
                  borderBottom: chIndex < chapters.length - 1 ? '2px solid #E2E8F0' : 'none',
                  background: '#FFFFFF',
                }}
              >
                {/* Chapter Header Row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px 20px',
                    background: isChExpanded ? '#F1F5F9' : '#FFFFFF',
                    borderBottom: isChExpanded ? '1px solid #E2E8F0' : 'none',
                    cursor: 'pointer',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                  onClick={() => toggleChapterExpand(chapter.chapterNo)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 200px', minWidth: 0 }}>
                    {/* Chapter Number Circle */}
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: chStats.percent === 100 ? '#16A34A' : '#123B5D',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 14,
                      flexShrink: 0,
                    }}>
                      {chStats.percent === 100 ? <Check size={16} /> : chapter.chapterNo}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A', overflowWrap: 'break-word', wordBreak: 'normal' }}>
                        {chapter.chapterName}
                        {hasDistinctGujarati(chapter.chapterName, chapter.chapterNameGujarati) && (
                          <span style={{ color: '#475569', fontWeight: 600, marginLeft: 8 }}>
                            ({chapter.chapterNameGujarati})
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>
                          {chapter.topics?.length || 0} ટોપિક્સ • {chapterExamples.length} ઉદાહરણો • {chapterExercises.length} સ્વાધ્યાય
                        </span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 70, height: 6, background: '#CBD5E1', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              width: `${chStats.percent}%`,
                              height: '100%',
                              background: chStats.percent === 100 ? '#16A34A' : '#123B5D',
                            }} />
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: chStats.percent === 100 ? '#15803D' : '#123B5D' }}>
                            {chStats.percent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#475569"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: isChExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {/* Right Action: + ટોપિક Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{
                        borderRadius: 8,
                        border: '1.5px solid #C8DBED',
                        background: '#E8F1F8',
                        color: '#123B5D',
                        fontWeight: 700,
                        fontSize: 12.5,
                        padding: '6px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      onClick={() => {
                        setNewTopicForm({
                          chapterId: chKey,
                          chapterNo: String(chapter.chapterNo),
                          entryType: 'TOPIC',
                          parentTopicNo: `${chapter.chapterNo}.1`,
                          parentSubtopicNo: '',
                          number: `${chapter.chapterNo}.${(chapter.topics?.length || 0) + 1}`,
                          title: '',
                          titleGujarati: '',
                        });
                        setShowAddTopicModal(true);
                      }}
                    >
                      <FileText size={13} />
                      <span>+ ટોપિક</span>
                    </button>
                  </div>
                </div>

                {/* Chapter Expanded Content */}
                {isChExpanded && (
                  <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 14, background: '#FAFBFD' }}>
                    {/* ─── A. ALL TOPICS (AND SUBTOPICS / SUB-SUBTOPICS) FIRST ─── */}
                    {chapter.topics && chapter.topics.length > 0 ? (
                      [...chapter.topics]
                        .sort((a, b) => compareSyllabusCodes(a.topicNo, b.topicNo))
                        .map(topic => {
                        const isTopicExpanded = expandedTopics[topic.topicNo] !== false;
                        const topicDone = isTopicCompleted(topic);

                        return (
                          <div
                            key={topic.topicNo}
                            style={{
                              background: '#FFFFFF',
                              borderRadius: 12,
                              border: topicDone ? '1.5px solid #86EFAC' : '1.5px solid #E2E8F0',
                              overflow: 'hidden',
                            }}
                          >
                            {/* Topic Header Row */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '11px 14px',
                                background: topicDone ? '#F0FDF4' : '#FFFFFF',
                                borderBottom: isTopicExpanded ? '1px solid #E2E8F0' : 'none',
                                cursor: 'pointer',
                                flexWrap: 'wrap',
                                gap: 10,
                              }}
                              onClick={() => toggleTopicExpand(topic.topicNo)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 180px', minWidth: 0 }}>
                                <span style={{
                                  padding: '3px 8px',
                                  background: topicDone ? '#DCFCE7' : '#E8F1F8',
                                  color: topicDone ? '#15803D' : '#123B5D',
                                  borderRadius: 6,
                                  fontWeight: 800,
                                  fontSize: 12,
                                  fontFamily: 'IBM Plex Mono, monospace',
                                  flexShrink: 0,
                                }}>
                                  {topic.topicNo}
                                </span>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', minWidth: 0, overflowWrap: 'break-word', wordBreak: 'normal' }}>
                                  <span>{topic.title}</span>
                                  {hasDistinctGujarati(topic.title, topic.titleGujarati) && (
                                    <span style={{ color: '#475569', fontWeight: 600, marginLeft: 6 }}>
                                      / {topic.titleGujarati}
                                    </span>
                                  )}
                                </div>
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#64748B"
                                  strokeWidth="2.2"
                                  style={{
                                    transform: isTopicExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                    flexShrink: 0,
                                  }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </div>

                              {/* Topic Buttons: + Subtopic, View, Finish */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  style={{
                                    fontSize: 11.5,
                                    padding: '4px 9px',
                                    borderRadius: 6,
                                    color: '#123B5D',
                                    border: '1px solid #C8DBED',
                                    background: '#E8F1F8',
                                    fontWeight: 700,
                                  }}
                                  onClick={() => {
                                    setNewTopicForm({
                                      chapterId: chKey,
                                      chapterNo: String(chapter.chapterNo),
                                      entryType: 'SUBTOPIC',
                                      parentTopicNo: topic.topicNo,
                                      parentSubtopicNo: '',
                                      number: `${topic.topicNo}.${(topic.subtopics?.length || 0) + 1}`,
                                      title: '',
                                      titleGujarati: '',
                                    });
                                    setShowAddTopicModal(true);
                                  }}
                                >
                                  + સબ-ટોપિક
                                </button>
                                <ViewButton
                                  compact
                                  onClick={() => openFullView({
                                    itemType: 'TOPIC',
                                    code: topic.topicNo,
                                    title: topic.title,
                                    titleGujarati: topic.titleGujarati,
                                    imageUrl: topic.imageUrl,
                                    figureNote: topic.figureNote,
                                    status: topicDone ? 'done' : 'pending',
                                    completedAt: topic.completedAt,
                                    chapterId: chKey,
                                    chapterNo: chapter.chapterNo,
                                    chapterName: chapter.chapterName,
                                    chapterNameGujarati: chapter.chapterNameGujarati,
                                  })}
                                />
                                <FinishButton
                                  compact
                                  isDone={topicDone}
                                  onClick={() => handleToggleFinish(chKey, topic.topicNo, 'TOPIC', topic._id)}
                                />
                              </div>
                            </div>

                            {/* Topic Subtopics List */}
                            {isTopicExpanded && (
                              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: '#FAFBFD' }}>
                                {topic.subtopics && topic.subtopics.length > 0 ? (
                                  [...topic.subtopics]
                                    .sort((a, b) => compareSyllabusCodes(a.subtopicNo, b.subtopicNo))
                                    .map(st => {
                                    const stDone = isSubtopicCompleted(st);
                                    const hasSubSub = st.subSubtopics && st.subSubtopics.length > 0;

                                    return (
                                      <div
                                        key={st.subtopicNo}
                                        style={{
                                          background: stDone ? '#F0FDF4' : '#FFFFFF',
                                          border: stDone ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                                          borderRadius: 9,
                                          overflow: 'hidden',
                                        }}
                                      >
                                        {/* Subtopic Row */}
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '8px 12px',
                                          gap: 10,
                                          flexWrap: 'wrap',
                                        }}>
                                           <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px', minWidth: 0 }}>
                                            <span style={{
                                              width: 20,
                                              height: 20,
                                              borderRadius: '50%',
                                              background: stDone ? '#16A34A' : '#E2E8F0',
                                              color: stDone ? '#FFFFFF' : '#64748B',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: 11,
                                              fontWeight: 800,
                                              flexShrink: 0,
                                            }}>
                                              {stDone ? <Check size={11} /> : '•'}
                                            </span>
                                            <span style={{
                                              padding: '2px 7px',
                                              background: '#E8F1F8',
                                              color: '#123B5D',
                                              borderRadius: 5,
                                              fontWeight: 800,
                                              fontSize: 11.5,
                                              fontFamily: 'IBM Plex Mono, monospace',
                                              flexShrink: 0,
                                            }}>
                                              {st.subtopicNo}
                                            </span>
                                            <div style={{ fontSize: 13.2, color: '#1E293B', fontWeight: 600, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'normal' }}>
                                              <span>{st.title}</span>
                                              {hasDistinctGujarati(st.title, st.titleGujarati) && (
                                                <span style={{ color: '#64748B', marginLeft: 6, fontSize: 12.2, fontWeight: 500 }}>
                                                  ({st.titleGujarati})
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Action Buttons: + Sub-subtopic, View, Finish */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <button
                                              type="button"
                                              style={{
                                                padding: '3px 8px',
                                                fontSize: 11,
                                                borderRadius: 6,
                                                border: '1px solid #CBD5E1',
                                                background: '#F8FAFC',
                                                color: '#475569',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                              }}
                                              title="Add Sub-subtopic"
                                              onClick={() => {
                                                const nextChar = String.fromCharCode(97 + (st.subSubtopics?.length || 0));
                                                setNewTopicForm({
                                                  chapterId: chKey,
                                                  chapterNo: String(chapter.chapterNo),
                                                  entryType: 'SUBSUBTOPIC',
                                                  parentTopicNo: topic.topicNo,
                                                  parentSubtopicNo: st.subtopicNo,
                                                  number: `${st.subtopicNo}.${nextChar}`,
                                                  title: '',
                                                  titleGujarati: '',
                                                });
                                                setShowAddTopicModal(true);
                                              }}
                                            >
                                              + સબ-સબટોપિક
                                            </button>
                                            <ViewButton
                                              compact
                                              onClick={() => openFullView({
                                                itemType: 'SUBTOPIC',
                                                code: st.subtopicNo,
                                                title: st.title,
                                                titleGujarati: st.titleGujarati,
                                                imageUrl: st.imageUrl,
                                                figureNote: st.figureNote,
                                                status: stDone ? 'done' : 'pending',
                                                completedAt: st.completedAt,
                                                chapterId: chKey,
                                                chapterNo: chapter.chapterNo,
                                                chapterName: chapter.chapterName,
                                                chapterNameGujarati: chapter.chapterNameGujarati,
                                                parentTopicNo: topic.topicNo,
                                                parentTopicTitle: topic.title,
                                              })}
                                            />
                                            <FinishButton
                                              compact
                                              isDone={stDone}
                                              onClick={() => handleToggleFinish(chKey, st.subtopicNo, 'SUBTOPIC', st._id, topic.topicNo)}
                                            />
                                          </div>
                                        </div>

                                        {/* Sub-subtopics (Level 4) indented beneath parent Subtopic */}
                                        {hasSubSub && (
                                          <div style={{
                                            borderTop: '1px dashed #E2E8F0',
                                            background: '#F8FAFC',
                                            padding: '8px 10px 8px 16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                          }}>
                                            {[...st.subSubtopics]
                                              .sort((a, b) => compareSyllabusCodes(a.subSubtopicNo, b.subSubtopicNo))
                                              .map(sst => {
                                              const sstDone = sst.status === 'done';
                                              return (
                                                <div
                                                  key={sst.subSubtopicNo}
                                                  style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '6px 10px',
                                                    background: sstDone ? '#F0FDF4' : '#FFFFFF',
                                                    border: sstDone ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                                                    borderRadius: 7,
                                                    gap: 8,
                                                    flexWrap: 'wrap',
                                                  }}
                                                >
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 150px', minWidth: 0 }}>
                                                    <span style={{ color: '#94A3B8', fontSize: 12 }}>↳</span>
                                                    <span style={{
                                                      padding: '1px 6px',
                                                      background: '#F1F5F9',
                                                      color: '#334155',
                                                      borderRadius: 4,
                                                      fontWeight: 700,
                                                      fontSize: 11,
                                                      fontFamily: 'IBM Plex Mono, monospace',
                                                      flexShrink: 0,
                                                    }}>
                                                      {sst.subSubtopicNo}
                                                    </span>
                                                    <div style={{ fontSize: 12.5, color: '#334155', fontWeight: 500, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'normal' }}>
                                                      <span>{sst.title}</span>
                                                      {hasDistinctGujarati(sst.title, sst.titleGujarati) && (
                                                        <span style={{ color: '#64748B', marginLeft: 5, fontSize: 11.8 }}>
                                                          ({sst.titleGujarati})
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>

                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <ViewButton
                                                      compact
                                                      onClick={() => openFullView({
                                                        itemType: 'SUBSUBTOPIC',
                                                        code: sst.subSubtopicNo,
                                                        title: sst.title,
                                                        titleGujarati: sst.titleGujarati,
                                                        imageUrl: sst.imageUrl,
                                                        figureNote: sst.figureNote,
                                                        status: sstDone ? 'done' : 'pending',
                                                        completedAt: sst.completedAt,
                                                        chapterId: chKey,
                                                        chapterNo: chapter.chapterNo,
                                                        chapterName: chapter.chapterName,
                                                        chapterNameGujarati: chapter.chapterNameGujarati,
                                                        parentTopicNo: topic.topicNo,
                                                        parentTopicTitle: topic.title,
                                                        parentSubtopicNo: st.subtopicNo,
                                                      })}
                                                    />
                                                    <FinishButton
                                                      compact
                                                      isDone={sstDone}
                                                      onClick={() => handleToggleFinish(chKey, sst.subSubtopicNo, 'SUBSUBTOPIC', sst._id, topic.topicNo)}
                                                    />
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div style={{ textAlign: 'center', padding: '10px', fontSize: 12.5, color: '#64748B' }}>
                                    કોઈ સબ-ટોપિક નથી. '+ સબ-ટોપિક' વડે ઉમેરો.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: 'center', padding: '16px', color: '#64748B', fontSize: 13 }}>
                        આ પ્રકરણમાં કોઈ ટોપિક ઉમેરેલા નથી. '+ ટોપિક' બટન પર ક્લિક કરીને નવો મુદ્દો ઉમેરો.
                      </div>
                    )}

                    {/* ─── B. EXAMPLES DROPDOWN (AFTER ALL TOPICS FINISH) ─── */}
                    <div style={{
                      background: '#FAF5FF',
                      border: '1.5px solid #E9D5FF',
                      borderRadius: 12,
                      overflow: 'hidden',
                      marginTop: 4,
                    }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '11px 16px',
                          cursor: 'pointer',
                          background: isExamplesOpen ? '#F3E8FF' : '#FAF5FF',
                          borderBottom: isExamplesOpen ? '1px solid #E9D5FF' : 'none',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                        onClick={() => toggleExamplesDropdown(chKey)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Lightbulb size={16} color="#6B21A8" />
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: '#6B21A8' }}>
                            ઉદાહરણો (EXAMPLES DROPDOWN)
                          </span>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: '#FFFFFF',
                            border: '1px solid #D8B4FE',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: '#7C3AED',
                          }}>
                            {chapterExamples.filter(e => e.status === 'done').length}/{chapterExamples.length} પૂર્ણ
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewTopicForm({
                                chapterId: chKey,
                                chapterNo: String(chapter.chapterNo),
                                entryType: 'EXAMPLE',
                                parentTopicNo: chapter.topics?.[0]?.topicNo || 'CHAPTER',
                                parentSubtopicNo: '',
                                number: `ઉદા. ${chapter.chapterNo}.${chapterExamples.length + 1}`,
                                title: '',
                                titleGujarati: '',
                              });
                              setShowAddTopicModal(true);
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: '1px solid #D8B4FE',
                              background: '#FFFFFF',
                              color: '#6B21A8',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            + ઉદાહરણ
                          </button>
                          <svg
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6B21A8"
                            strokeWidth="2.4"
                            style={{
                              transform: isExamplesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                            }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>

                      {isExamplesOpen && (
                        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {chapterExamples.length > 0 ? (
                            chapterExamples.map((ex, idx) => {
                              const exDone = ex.status === 'done';
                              return (
                                <div
                                  key={ex._id || `${ex.exampleNo}-${idx}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    background: exDone ? '#F0FDF4' : '#FFFFFF',
                                    border: exDone ? '1px solid #BBF7D0' : '1px solid #E9D5FF',
                                    borderRadius: 8,
                                    gap: 10,
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px', minWidth: 0 }}>
                                    <span style={{
                                      padding: '2px 8px',
                                      background: '#F3E8FF',
                                      color: '#7C3AED',
                                      borderRadius: 5,
                                      fontWeight: 800,
                                      fontSize: 11.5,
                                      flexShrink: 0,
                                    }}>
                                      {ex.exampleNo}
                                    </span>
                                    <div style={{ fontSize: 13, color: '#334155', fontWeight: 500, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'normal' }}>
                                      <span>{ex.title}</span>
                                      {hasDistinctGujarati(ex.title, ex.titleGujarati) && (
                                        <span style={{ color: '#7E22CE', marginLeft: 6, fontSize: 12 }}>
                                          ({ex.titleGujarati})
                                        </span>
                                      )}
                                      {ex.imageUrl && (
                                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openFullView({
                                                itemType: 'EXAMPLE',
                                                code: ex.exampleNo,
                                                title: ex.title,
                                                titleGujarati: ex.titleGujarati,
                                                imageUrl: ex.imageUrl,
                                                figureNote: ex.figureNote,
                                                status: exDone ? 'done' : 'pending',
                                                completedAt: ex.completedAt,
                                                chapterId: chKey,
                                                chapterNo: chapter.chapterNo,
                                                chapterName: chapter.chapterName,
                                                chapterNameGujarati: chapter.chapterNameGujarati,
                                                parentTopicNo: ex.parentTopicNo,
                                                parentTopicTitle: ex.parentTopicTitle,
                                                itemId: ex._id,
                                              });
                                            }}
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: 6,
                                              padding: '3px 8px',
                                              background: '#F0F9FF',
                                              border: '1px solid #BAE6FD',
                                              borderRadius: 6,
                                              fontSize: 11.5,
                                              fontWeight: 600,
                                              color: '#0369A1',
                                              cursor: 'pointer',
                                            }}
                                            title="આકૃતિ જોવા માટે ક્લિક કરો (Click to view figure)"
                                          >
                                            <img
                                              src={ex.imageUrl}
                                              alt={ex.figureNote || ex.exampleNo}
                                              style={{
                                                width: 26,
                                                height: 20,
                                                objectFit: 'contain',
                                                borderRadius: 3,
                                                background: '#fff',
                                                border: '1px solid #E0F2FE',
                                              }}
                                            />
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                              <ImageIcon size={12} />
                                              <span>{ex.figureNote || 'આકૃતિ જુઓ'}</span>
                                            </span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <ViewButton
                                      compact
                                      onClick={() => openFullView({
                                        itemType: 'EXAMPLE',
                                        code: ex.exampleNo,
                                        title: ex.title,
                                        titleGujarati: ex.titleGujarati,
                                        imageUrl: ex.imageUrl,
                                        figureNote: ex.figureNote,
                                        status: exDone ? 'done' : 'pending',
                                        completedAt: ex.completedAt,
                                        chapterId: chKey,
                                        chapterNo: chapter.chapterNo,
                                        chapterName: chapter.chapterName,
                                        chapterNameGujarati: chapter.chapterNameGujarati,
                                        parentTopicNo: ex.parentTopicNo,
                                        parentTopicTitle: ex.parentTopicTitle,
                                        itemId: ex._id,
                                      })}
                                    />
                                    <FinishButton
                                      compact
                                      isDone={exDone}
                                      onClick={() => handleToggleFinish(chKey, ex.exampleNo, 'EXAMPLE', ex._id, ex.parentTopicNo)}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ textAlign: 'center', padding: 12, fontSize: 12.5, color: '#7E22CE' }}>
                              આ પ્રકરણમાં હજી કોઈ ઉદાહરણ ઉમેરેલ નથી. '+ ઉદાહરણ' પર ક્લિક કરો.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ─── C. EXERCISES DROPDOWN (BELOW EXAMPLES DROPDOWN) ─── */}
                    <div style={{
                      background: '#FFFDF0',
                      border: '1.5px solid #FDE68A',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '11px 16px',
                          cursor: 'pointer',
                          background: isExercisesOpen ? '#FEF3C7' : '#FFFDF0',
                          borderBottom: isExercisesOpen ? '1px solid #FDE68A' : 'none',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                        onClick={() => toggleExercisesDropdown(chKey)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <HelpCircle size={16} color="#92400E" />
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: '#92400E' }}>
                            સ્વાધ્યાય (SWADHYAY EXERCISES DROPDOWN)
                          </span>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: '#FFFFFF',
                            border: '1px solid #FCD34D',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: '#B45309',
                          }}>
                            {chapterExercises.filter(s => s.status === 'done').length}/{chapterExercises.length} પૂર્ણ
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewTopicForm({
                                chapterId: chKey,
                                chapterNo: String(chapter.chapterNo),
                                entryType: 'SWADHYAY',
                                parentTopicNo: chapter.topics?.[0]?.topicNo || 'CHAPTER',
                                parentSubtopicNo: '',
                                number: `${chapterExercises.length + 1}`,
                                title: '',
                                titleGujarati: '',
                              });
                              setShowAddTopicModal(true);
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: '1px solid #FCD34D',
                              background: '#FFFFFF',
                              color: '#92400E',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            + સ્વાધ્યાય
                          </button>
                          <svg
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#92400E"
                            strokeWidth="2.4"
                            style={{
                              transform: isExercisesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                            }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>

                      {isExercisesOpen && (
                        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {chapterExercises.length > 0 ? (
                            chapterExercises.map((sw, idx) => {
                              const swDone = sw.status === 'done';
                              return (
                                <div
                                  key={sw._id || `${sw.exerciseNo}-${idx}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    background: swDone ? '#F0FDF4' : '#FFFFFF',
                                    border: swDone ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                                    borderRadius: 8,
                                    gap: 10,
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px', minWidth: 0 }}>
                                    <span style={{
                                      minWidth: 42,
                                      height: 24,
                                      padding: '2px 7px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: '#FEF08A',
                                      color: '#854D0E',
                                      borderRadius: 5,
                                      fontWeight: 800,
                                      fontSize: 12,
                                      fontFamily: 'IBM Plex Mono, monospace',
                                      flexShrink: 0,
                                    }}>
                                      {sw.exerciseNo}
                                    </span>
                                    <div style={{ fontSize: 13, color: '#451A03', fontWeight: 500, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'normal' }}>
                                      <span>{sw.title}</span>
                                      {hasDistinctGujarati(sw.title, sw.titleGujarati) && (
                                        <span style={{ color: '#78350F', marginLeft: 6, fontSize: 12 }}>
                                          ({sw.titleGujarati})
                                        </span>
                                      )}
                                      {sw.imageUrl && (
                                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openFullView({
                                                itemType: 'SWADHYAY',
                                                code: `પ્રશ્ન ${sw.exerciseNo}`,
                                                rawNo: sw.exerciseNo,
                                                title: sw.title,
                                                titleGujarati: sw.titleGujarati,
                                                imageUrl: sw.imageUrl,
                                                figureNote: sw.figureNote,
                                                status: swDone ? 'done' : 'pending',
                                                completedAt: sw.completedAt,
                                                chapterId: chKey,
                                                chapterNo: chapter.chapterNo,
                                                chapterName: chapter.chapterName,
                                                chapterNameGujarati: chapter.chapterNameGujarati,
                                                parentTopicNo: sw.parentTopicNo,
                                                parentTopicTitle: sw.parentTopicTitle,
                                                itemId: sw._id,
                                              });
                                            }}
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: 6,
                                              padding: '3px 8px',
                                              background: '#FEF3C7',
                                              border: '1px solid #FDE68A',
                                              borderRadius: 6,
                                              fontSize: 11.5,
                                              fontWeight: 600,
                                              color: '#92400E',
                                              cursor: 'pointer',
                                            }}
                                            title="આકૃતિ જોવા માટે ક્લિક કરો (Click to view figure)"
                                          >
                                            <img
                                              src={sw.imageUrl}
                                              alt={sw.figureNote || sw.exerciseNo}
                                              style={{
                                                width: 26,
                                                height: 20,
                                                objectFit: 'contain',
                                                borderRadius: 3,
                                                background: '#fff',
                                                border: '1px solid #FDE68A',
                                              }}
                                            />
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                              <ImageIcon size={12} />
                                              <span>{sw.figureNote || 'આકૃતિ જુઓ'}</span>
                                            </span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <ViewButton
                                      compact
                                      onClick={() => openFullView({
                                        itemType: 'SWADHYAY',
                                        code: `પ્રશ્ન ${sw.exerciseNo}`,
                                        rawNo: sw.exerciseNo,
                                        title: sw.title,
                                        titleGujarati: sw.titleGujarati,
                                        imageUrl: sw.imageUrl,
                                        figureNote: sw.figureNote,
                                        status: swDone ? 'done' : 'pending',
                                        completedAt: sw.completedAt,
                                        chapterId: chKey,
                                        chapterNo: chapter.chapterNo,
                                        chapterName: chapter.chapterName,
                                        chapterNameGujarati: chapter.chapterNameGujarati,
                                        parentTopicNo: sw.parentTopicNo,
                                        parentTopicTitle: sw.parentTopicTitle,
                                        itemId: sw._id,
                                      })}
                                    />
                                    <FinishButton
                                      compact
                                      isDone={swDone}
                                      onClick={() => handleToggleFinish(chKey, sw.exerciseNo, 'SWADHYAY', sw._id, sw.parentTopicNo)}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ textAlign: 'center', padding: 12, fontSize: 12.5, color: '#92400E' }}>
                              આ પ્રકરણમાં હજી કોઈ સ્વાધ્યાય પ્રશ્ન ઉમેરેલ નથી. '+ સ્વાધ્યાય' પર ક્લિક કરો.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── 3. FULL DETAIL VIEW MODAL (QUESTION / EXAMPLE / TOPIC / SUBTOPIC) ── */}
      {viewingItem && (
        <div className="modal-overlay is-open" onClick={e => { if (e.target.classList.contains('modal-overlay')) setViewingItem(null); }}>
          <div className="modal-box" style={{ maxWidth: 660 }}>
            <div className="modal-box__head">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    background:
                      viewingItem.itemType === 'EXAMPLE' ? '#F3E8FF' :
                      viewingItem.itemType === 'SWADHYAY' ? '#FEF3C7' : '#E8F1F8',
                    color:
                      viewingItem.itemType === 'EXAMPLE' ? '#7C3AED' :
                      viewingItem.itemType === 'SWADHYAY' ? '#92400E' : '#123B5D',
                  }}>
                    {viewingItem.itemType === 'TOPIC' && 'TOPIC / મુખ્ય ટોપિક'}
                    {viewingItem.itemType === 'SUBTOPIC' && 'SUBTOPIC / સબ-ટોપિક'}
                    {viewingItem.itemType === 'SUBSUBTOPIC' && 'SUB-SUBTOPIC / સબ-સબટોપિક'}
                    {viewingItem.itemType === 'EXAMPLE' && 'EXAMPLE / ઉદાહરણ'}
                    {viewingItem.itemType === 'SWADHYAY' && 'SWADHYAY EXERCISE / સ્વાધ્યાય પ્રશ્ન'}
                  </span>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 800,
                    background: '#F1F5F9',
                    color: '#0F172A',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}>
                    {viewingItem.code}
                  </span>
                </div>
                <div className="card__title">સંપૂર્ણ વિગત (Full Content View)</div>
              </div>
              <button className="modal-close" onClick={() => setViewingItem(null)} aria-label="Close modal">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '18px 0' }}>
              {/* Context Breadcrumb */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 12.5,
                color: '#475569',
                lineHeight: 1.5,
              }}>
                <div><strong>ધોરણ અને વિષય:</strong> {selectedStandard} • {selectedDivision} • {currentSubject}</div>
                <div>
                  <strong>પ્રકરણ {viewingItem.chapterNo}:</strong> {viewingItem.chapterName}
                  {hasDistinctGujarati(viewingItem.chapterName, viewingItem.chapterNameGujarati)
                    ? ` (${viewingItem.chapterNameGujarati})`
                    : ''}
                </div>
                {viewingItem.parentTopicNo && (
                  <div>
                    <strong>મુખ્ય ટોપિક {viewingItem.parentTopicNo}:</strong> {viewingItem.parentTopicTitle}
                  </div>
                )}
                {viewingItem.parentSubtopicNo && (
                  <div>
                    <strong>સબ-ટોપિક:</strong> {viewingItem.parentSubtopicNo}
                  </div>
                )}
              </div>

              {/* Full Content Text */}
              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                borderRadius: 10,
                padding: '14px 16px',
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', marginBottom: 6, textTransform: 'uppercase' }}>
                  {hasDistinctGujarati(viewingItem.title, viewingItem.titleGujarati)
                    ? 'Full Title / Question (English)'
                    : 'Full Title / Content (સંપૂર્ણ વિગત)'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'normal' }}>
                  {viewingItem.title}
                </div>
              </div>

              {/* Full Gujarati Text (only when distinct from primary text) */}
              {hasDistinctGujarati(viewingItem.title, viewingItem.titleGujarati) && (
                <div style={{
                  background: '#F8FAFC',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: 10,
                  padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    ગુજરાતીમાં સંપૂર્ણ વિગત (Gujarati)
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'normal' }}>
                    {viewingItem.titleGujarati}
                  </div>
                </div>
              )}

              {/* Full Figure / Diagram Section */}
              {viewingItem.imageUrl && (
                <div style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #BAE6FD',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #F0F9FF',
                    paddingBottom: 8,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0369A1', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <ImageIcon size={14} />
                        <span>પ્રશ્ન / કોયડા સાથેની આકૃતિ (Figure & Diagram)</span>
                      </span>
                      {viewingItem.figureNote && (
                        <span style={{
                          background: '#E0F2FE',
                          color: '#0369A1',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 800,
                        }}>
                          {viewingItem.figureNote}
                        </span>
                      )}
                    </div>
                    <a
                      href={viewingItem.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        color: '#0284C7',
                        textDecoration: 'none',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Search size={12} />
                      <><span>મોટી સાઈઝમાં ખોલો (Full Size)</span><ExternalLink size={11} style={{marginLeft:4}}/></>
                    </a>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    background: '#F8FAFC',
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                  }}>
                    <img
                      src={viewingItem.imageUrl}
                      alt={viewingItem.figureNote || viewingItem.title}
                      style={{
                        maxWidth: '100%',
                        maxHeight: 420,
                        objectFit: 'contain',
                        borderRadius: 6,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Status Strip */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                background: viewingItem.status === 'done' ? '#F0FDF4' : '#FFFBEB',
                border: viewingItem.status === 'done' ? '1px solid #86EFAC' : '1px solid #FDE68A',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: viewingItem.status === 'done' ? '#15803D' : '#92400E' }}>
                  {viewingItem.status === 'done' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Check size={14} />
                      <span>સ્થિતિ: ફેકલ્ટી દ્વારા પૂર્ણ (Finished)</span>
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={14} />
                      <span>સ્થિતિ: બાકી (Pending Completion)</span>
                    </span>
                  )}
                </div>
                <FinishButton
                  isDone={viewingItem.status === 'done'}
                  onClick={() => handleToggleFinish(
                    viewingItem.chapterId,
                    viewingItem.rawNo || viewingItem.code,
                    viewingItem.itemType,
                    viewingItem.itemId,
                    viewingItem.parentTopicNo
                  )}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
              <button type="button" className="btn btn-primary" onClick={() => setViewingItem(null)}>
                બંધ કરો (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. ADD CHAPTER MODAL (WITH VOICE-TO-TEXT!) ── */}
      {showAddChapterModal && (
        <div className="modal-overlay is-open" onClick={e => { if (e.target.classList.contains('modal-overlay')) setShowAddChapterModal(false); }}>
          <div className="modal-box" style={{ maxWidth: 580 }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">પ્રકરણ ઉમેરો (Add New Chapter)</div>
                <div className="card__desc">
                  {selectedStandard} • {selectedDivision} • {currentSubject}
                </div>
              </div>
              <button className="modal-close" onClick={() => { stopVoiceRecording(); setShowAddChapterModal(false); }} aria-label="Close modal">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddChapterSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, margin: '18px 0' }}>
                <div>
                  <label className="field-label">પ્રકરણ નંબર (Chapter No) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    className="field-input w-full"
                    placeholder="e.g. 1 or 2 (insert between any chapters)"
                    required
                    value={newChapterForm.chapterNo}
                    onChange={e => setNewChapterForm({ ...newChapterForm, chapterNo: e.target.value })}
                  />
                  <span style={{ fontSize: 11.5, color: '#64748B', marginTop: 4, display: 'block' }}>
                    તમે કોઈપણ પ્રકરણ વચ્ચે નવું પ્રકરણ મૂકી શકો છો.
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                    <label className="field-label" style={{ margin: 0 }}>Chapter Name (English) *</label>
                    <button
                      type="button"
                      onClick={() => startVoiceRecording('chapterName', 'chapter', 'en-IN')}
                      style={{
                        padding: '2px 8px',
                        fontSize: 11.5,
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        background: (isRecording && recordingTargetField === 'chapterName') ? '#FEF2F2' : '#FFFFFF',
                        color: (isRecording && recordingTargetField === 'chapterName') ? '#DC2626' : '#123B5D',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Mic size={12} />
                      <span>{(isRecording && recordingTargetField === 'chapterName') ? 'સાંભળે છે...' : 'Voice Input (English)'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. Current Electricity"
                    required
                    value={newChapterForm.chapterName}
                    onChange={e => setNewChapterForm({ ...newChapterForm, chapterName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="field-label" style={{ marginBottom: 4 }}>પ્રકરણનું નામ (ગુજરાતીમાં)</label>
                  <input
                    type="text"
                    ref={newChapterGujRef}
                    className="field-input w-full"
                    placeholder="દા.ત. પ્રવાહ વિદ્યુત"
                    value={newChapterForm.chapterNameGujarati}
                    onChange={e => setNewChapterForm({ ...newChapterForm, chapterNameGujarati: e.target.value })}
                  />
                  <VoiceInputControl
                    value={newChapterForm.chapterNameGujarati}
                    onChange={(val) => setNewChapterForm(prev => ({ ...prev, chapterNameGujarati: val }))}
                    inputRef={newChapterGujRef}
                    defaultLang="gu-IN"
                  />
                </div>

                {isRecording && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span><strong>માઈક્રોફોન ચાલુ છે:</strong> બોલો, ટેક્સ્ટ આપમેળે લખાશે...</span>
                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      style={{ background: '#DC2626', color: '#FFF', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => { stopVoiceRecording(); setShowAddChapterModal(false); }}>
                  રદ કરો (Cancel)
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  પ્રકરણ સાચવો (Save Chapter)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. ADD TOPIC / SUBTOPIC / SUB-SUBTOPIC / EXAMPLE / SWADHYAY MODAL ── */}
      {showAddTopicModal && (
        <div className="modal-overlay is-open" onClick={e => { if (e.target.classList.contains('modal-overlay')) setShowAddTopicModal(false); }}>
          <div className="modal-box" style={{ maxWidth: 640 }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">નવો મુદ્દો ઉમેરો (Add Topic / Subtopic / Question)</div>
                <div className="card__desc">
                  તમે કોઈપણ પ્રકરણ અથવા ટોપિક વચ્ચે નવો ક્રમ ઉમેરી શકો છો
                </div>
              </div>
              <button className="modal-close" onClick={() => { stopVoiceRecording(); setShowAddTopicModal(false); }} aria-label="Close modal">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddTopicSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, margin: '18px 0' }}>
                <div className="form-grid-2">
                  <div>
                    <label className="field-label">લક્ષ્ય પ્રકરણ (Target Chapter) *</label>
                    <select
                      className="filter-select w-full"
                      value={newTopicForm.chapterNo}
                      onChange={e => {
                        const chNo = Number(e.target.value);
                        const ch = chapters.find(c => c.chapterNo === chNo);
                        setNewTopicForm({
                          ...newTopicForm,
                          chapterNo: e.target.value,
                          chapterId: ch?.id || ch?._id,
                          parentTopicNo: ch?.topics?.[0]?.topicNo || `${chNo}.1`,
                        });
                      }}
                      required
                    >
                      {chapters.map(c => (
                        <option key={c.chapterNo} value={c.chapterNo}>
                          Ch {c.chapterNo}: {c.chapterName} ({c.chapterNameGujarati || ''})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label">મુદ્દાનો પ્રકાર (Entry Type) *</label>
                    <select
                      className="filter-select w-full"
                      value={newTopicForm.entryType}
                      onChange={e => setNewTopicForm({ ...newTopicForm, entryType: e.target.value })}
                    >
                      <option value="TOPIC">મુખ્ય ટોપિક (Main Topic, e.g. 1.2)</option>
                      <option value="SUBTOPIC">સબ-ટોપિક (Subtopic, e.g. 1.1.1)</option>
                      <option value="SUBSUBTOPIC">સબ-સબટોપિક (Deep Concept, e.g. 1.1.1.a)</option>
                      <option value="EXAMPLE">ઉદાહરણ (Example, e.g. ઉદા. 1.1)</option>
                      <option value="SWADHYAY">સ્વાધ્યાય પ્રશ્ન (Exercise, e.g. 1, 2)</option>
                    </select>
                  </div>
                </div>

                {newTopicForm.entryType !== 'TOPIC' && (
                  <div className={newTopicForm.entryType === 'SUBSUBTOPIC' ? 'form-grid-2' : ''} style={{ display: 'grid', gap: 14 }}>
                    <div>
                      <label className="field-label">કયા મુખ્ય ટોપિક હેઠળ? (Parent Topic No)</label>
                      <input
                        type="text"
                        className="field-input w-full"
                        placeholder="e.g. 1.1 (or CHAPTER for chapter-level)"
                        value={newTopicForm.parentTopicNo}
                        onChange={e => setNewTopicForm({ ...newTopicForm, parentTopicNo: e.target.value })}
                      />
                    </div>
                    {newTopicForm.entryType === 'SUBSUBTOPIC' && (
                      <div>
                        <label className="field-label">કયા સબ-ટોપિક હેઠળ? (Parent Subtopic No) *</label>
                        <input
                          type="text"
                          className="field-input w-full"
                          placeholder="e.g. 1.1.1"
                          required
                          value={newTopicForm.parentSubtopicNo}
                          onChange={e => setNewTopicForm({ ...newTopicForm, parentSubtopicNo: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="field-label">ટોપિક ક્રમ / નંબર (Number / Code to Insert Anywhere) *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. 1.1.3 or 1.1.1b or ઉદા. 1.3 or 4"
                    value={newTopicForm.number}
                    onChange={e => setNewTopicForm({ ...newTopicForm, number: e.target.value })}
                  />
                  <span style={{ fontSize: 11.5, color: '#64748B', marginTop: 3, display: 'block' }}>
                    દા.ત. 1.1.1 અને 1.1.2 ની વચ્ચે ઉમેરવા માટે 1.1.1.1 અથવા 1.1.1b આપી શકો છો.
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                    <label className="field-label" style={{ margin: 0 }}>Topic / Question Title (English) *</label>
                    <button
                      type="button"
                      onClick={() => startVoiceRecording('title', 'topic', 'en-IN')}
                      style={{
                        padding: '2px 8px',
                        fontSize: 11.5,
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        background: (isRecording && recordingTargetField === 'title') ? '#FEF2F2' : '#FFFFFF',
                        color: (isRecording && recordingTargetField === 'title') ? '#DC2626' : '#123B5D',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Mic size={12} />
                      <span>{(isRecording && recordingTargetField === 'title') ? 'સાંભળે છે...' : 'Voice Dictate (English)'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. Continuous Charge Distribution"
                    required
                    value={newTopicForm.title}
                    onChange={e => setNewTopicForm({ ...newTopicForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="field-label" style={{ marginBottom: 4 }}>ગુજરાતીમાં શીર્ષક / પ્રશ્ન (Gujarati)</label>
                  <input
                    type="text"
                    ref={newTopicGujRef}
                    className="field-input w-full"
                    placeholder="દા.ત. સતત વિદ્યુતભાર વિતરણ"
                    value={newTopicForm.titleGujarati}
                    onChange={e => setNewTopicForm({ ...newTopicForm, titleGujarati: e.target.value })}
                  />
                  <VoiceInputControl
                    value={newTopicForm.titleGujarati}
                    onChange={(val) => setNewTopicForm(prev => ({ ...prev, titleGujarati: val }))}
                    inputRef={newTopicGujRef}
                    defaultLang="gu-IN"
                  />
                </div>

                {isRecording && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span><strong>માઈક્રોફોન ચાલુ છે:</strong> સ્પષ્ટ અવાજે બોલો, શીર્ષક લખાશે...</span>
                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      style={{ background: '#DC2626', color: '#FFF', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => { stopVoiceRecording(); setShowAddTopicModal(false); }}>
                  રદ કરો (Cancel)
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  મુદ્દો ઉમેરો (Add to Syllabus)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
