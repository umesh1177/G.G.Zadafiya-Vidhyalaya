import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { syllabusApi } from '../../services/syllabusApi';
import { examApi, readPdfFileAsPayload, getQuestionPaperUrl } from '../../services/examApi';
import {
  compareSyllabusCodes,
  collectChapterExamples,
  collectChapterExercises,
  hasDistinctGujarati,
  normalizeBaseSubject,
} from '../../utils/syllabusUtils';
import PaginationBar from '../../components/common/PaginationBar';
import { FileText, Upload } from 'lucide-react';

const SUBJECT_OPTIONS = [
  'Physics',
  'Chemistry',
  'Chemistry (Board)',
  'Chemistry (JEE)',
  'Mathematics',
  'Biology',
  'PCM',
  'PCB',
  'PCMB',
];

const EXAM_TYPE_OPTIONS = [
  { value: 'BOARD', label: 'Board' },
  { value: 'GUJCET', label: 'GUJCET' },
  { value: 'JEE', label: 'JEE' },
  { value: 'NEET', label: 'NEET' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'ANNUAL', label: 'Annual' },
];

function getTodayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatExamDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatExamTime12h(timeStr) {
  if (!timeStr) return '10:00 AM';
  const m = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return timeStr;
  let hh = Number(m[1]);
  const mm = m[2];
  const suffix = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${hh}:${mm} ${suffix}`;
}

function formatExamTypeLabel(t) {
  const map = {
    BOARD: 'Board',
    GUJCET: 'GUJCET',
    JEE: 'JEE',
    NEET: 'NEET',
    WEEKLY: 'Weekly',
    ANNUAL: 'Annual',
    OTHER: 'Other',
  };
  return map[String(t || '').toUpperCase()] || t || 'Board';
}

function collectCompletedNodesForChapter(chapter) {
  const nodes = [];
  const sortedTopics = [...(chapter.topics || [])].sort((a, b) =>
    compareSyllabusCodes(a.topicNo, b.topicNo)
  );

  for (const t of sortedTopics) {
    const subs = [...(t.subtopics || [])].sort((a, b) =>
      compareSyllabusCodes(a.subtopicNo, b.subtopicNo)
    );
    const completedSubs = [];
    for (const st of subs) {
      const subSubs = [...(st.subSubtopics || [])].sort((a, b) =>
        compareSyllabusCodes(a.subSubtopicNo, b.subSubtopicNo)
      );
      const doneSubSubs = subSubs.filter((sst) => sst.status === 'done');
      if (subSubs.length > 0) {
        if (doneSubSubs.length > 0) {
          completedSubs.push({
            kind: 'SUBTOPIC_GROUP',
            code: st.subtopicNo,
            title: st.title,
            titleGujarati: st.titleGujarati || '',
            allDone: doneSubSubs.length === subSubs.length,
            doneSubSubs,
          });
        }
      } else if (st.status === 'done') {
        completedSubs.push({
          kind: 'SUBTOPIC',
          code: st.subtopicNo,
          title: st.title,
          titleGujarati: st.titleGujarati || '',
          allDone: true,
          doneSubSubs: [],
        });
      }
    }

    if (subs.length === 0) {
      if (t.status === 'done') {
        nodes.push({
          kind: 'TOPIC',
          code: t.topicNo,
          title: t.title,
          titleGujarati: t.titleGujarati || '',
          itemType: 'TOPIC',
        });
      }
    } else if (completedSubs.length > 0) {
      nodes.push({
        kind: 'TOPIC_HEADER',
        code: t.topicNo,
        title: t.title,
        titleGujarati: t.titleGujarati || '',
        itemType: 'TOPIC',
        allSubsDone: completedSubs.length === subs.length && completedSubs.every((s) => s.allDone),
        subtopics: completedSubs,
      });
    }
  }

  const examples = collectChapterExamples(chapter).filter((ex) => ex.status === 'done');
  const exercises = collectChapterExercises(chapter).filter((sw) => sw.status === 'done');

  return { nodes, examples, exercises };
}

export default function ExamUnit() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();
  const defaultSubject = user?.subject || 'Physics';
  const facultyId = user?.id || user?._id || user?.empCode || user?.username || 'faculty';
  const facultyCode = user?.empCode || user?.id || user?.username || '';
  const facultyName = user?.name || user?.fullName || 'Subject Faculty';
  const defaultStd = 'STD_11';

  useEffect(() => {
    setHeader({
      title: 'Exam Unit',
      subtitle: 'Select completed chapters, topics, koyda & exercises for upcoming exams, or upload PDF papers',
    });
  }, [setHeader]);

  // Top Sub-tabs: 'select' | 'history'
  const [activeTab, setActiveTab] = useState('select');

  // Shared class & exam parameters (synchronized between Left Syllabus selector & Right Exam Box)
  const [standard, setStandard] = useState(defaultStd);
  const [division, setDivision] = useState('ALL');
  const [subject, setSubject] = useState(defaultSubject);
  const [examDate, setExamDate] = useState(getTodayYmd());
  const [examTime, setExamTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [examType, setExamType] = useState('BOARD');
  const [marksPerSubject, setMarksPerSubject] = useState(100);
  const [cbtExamId, setCbtExamId] = useState('');

  // Syllabus Tree State (isolated to logged-in faculty)
  const [chapters, setChapters] = useState([]);
  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState({});

  // Selected Units inside Exam Box (editable rows!)
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [customUnitInput, setCustomUnitInput] = useState('');
  const [pdfPayload, setPdfPayload] = useState(null);
  const pdfInputRef = useRef(null);

  // Exam History State (persisted in MongoDB)
  const [examHistory, setExamHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyFilterSubject, setHistoryFilterSubject] = useState('MY_SUBJECT');
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 6;

  // Row PDF Upload Trigger State
  const rowPdfInputRef = useRef(null);
  const [uploadingExamId, setUploadingExamId] = useState(null);

  // Submission / Action Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadSyllabus = useCallback(async () => {
    setIsLoadingSyllabus(true);
    try {
      const apiStd = standard === 'STD_11' ? 'Standard 11' : 'Standard 12';
      const apiDiv = division === 'ALL' ? 'Division A' : `Division ${division}`;
      const list = await syllabusApi.getSyllabus({
        standard: apiStd,
        division: apiDiv,
        subject: normalizeBaseSubject(subject),
        facultyId,
        role: 'faculty',
      });
      const safeList = Array.isArray(list) ? list : [];
      setChapters(safeList);
      if (safeList.length > 0) {
        setExpandedChapters((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          return { [safeList[0].id || safeList[0].chapterNo]: true };
        });
      }
    } catch (err) {
      console.warn('Could not load syllabus for Exam Unit:', err);
      setChapters([]);
    } finally {
      setIsLoadingSyllabus(false);
    }
  }, [standard, division, subject, facultyId]);

  const loadExamHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const all = await examApi.getAllExams({});
      setExamHistory(Array.isArray(all) ? all : []);
    } catch (err) {
      console.warn('Could not load exam history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadSyllabus();
  }, [loadSyllabus]);

  useEffect(() => {
    loadExamHistory();
    const onFocus = () => {
      loadSyllabus();
      loadExamHistory();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadSyllabus();
        loadExamHistory();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadSyllabus, loadExamHistory]);

  // Build chapters that contain at least 1 completed topic / subtopic / sub-subtopic / koyda / exercise
  const completedChapters = useMemo(() => {
    return chapters
      .map((ch) => {
        const extracted = collectCompletedNodesForChapter(ch);
        const totalDoneCount =
          extracted.nodes.length + extracted.examples.length + extracted.exercises.length;
        return {
          chapter: ch,
          ...extracted,
          totalDoneCount,
        };
      })
      .filter((entry) => entry.totalDoneCount > 0);
  }, [chapters]);

  const isMultiType = ['JEE', 'NEET', 'GUJCET'].includes(examType);

  const toggleChapterAccordion = (chKey) => {
    setExpandedChapters((prev) => ({ ...prev, [chKey]: !prev[chKey] }));
  };

  // Select "Till <code>" for a chapter topic / subtopic / sub-subtopic
  const handleSelectTill = (chapter, code, title, itemType = 'TOPIC') => {
    const chNo = chapter.chapterNo;
    const chName = chapter.chapterName;
    const targetKey = `till-ch-${chNo}`;
    setSelectedUnits((prev) => {
      const existingSame = prev.find((u) => u.key === targetKey && u.upToCode === code);
      if (existingSame) {
        return prev.filter((u) => u.key !== targetKey);
      }
      const nextItem = {
        key: targetKey,
        chapterNo: chNo,
        chapterName: chName,
        chapterNameGujarati: chapter.chapterNameGujarati || '',
        itemType,
        code,
        upToCode: code,
        label: `Ch ${chNo} (${chName}) — till ${code} (${title})`,
      };
      const idx = prev.findIndex((u) => u.key === targetKey);
      if (idx !== -1) {
        return prev.map((u, i) => (i === idx ? nextItem : u));
      }
      return [...prev, nextItem];
    });
  };

  // Toggle "All topics" for a chapter
  const handleSelectAllTopics = (chapter) => {
    const chNo = chapter.chapterNo;
    const targetKey = `all-topics-ch-${chNo}`;
    setSelectedUnits((prev) => {
      const exists = prev.some((u) => u.key === targetKey);
      if (exists) {
        return prev.filter((u) => u.key !== targetKey);
      }
      // Replace any previous till selection for this chapter when "All topics" is picked
      const withoutTill = prev.filter((u) => u.key !== `till-ch-${chNo}`);
      return [
        ...withoutTill,
        {
          key: targetKey,
          chapterNo: chNo,
          chapterName: chapter.chapterName,
          chapterNameGujarati: chapter.chapterNameGujarati || '',
          itemType: 'CHAPTER',
          code: String(chNo),
          upToCode: 'ALL',
          label: `Ch ${chNo}: ${chapter.chapterName} — All Completed Topics`,
        },
      ];
    });
  };

  // Toggle an individual Koyda (Example) or Swadhyay Exercise
  const handleToggleItem = (chapter, itemType, code, title) => {
    const chNo = chapter.chapterNo;
    const itemKey = `${itemType}-ch-${chNo}-${code}`;
    setSelectedUnits((prev) => {
      if (prev.some((u) => u.key === itemKey)) {
        return prev.filter((u) => u.key !== itemKey);
      }
      const prefix = itemType === 'EXAMPLE' ? `ઉદા. ${code}` : `Ex Q.${code}`;
      return [
        ...prev,
        {
          key: itemKey,
          chapterNo: chNo,
          chapterName: chapter.chapterName,
          chapterNameGujarati: chapter.chapterNameGujarati || '',
          itemType,
          code,
          upToCode: '',
          label: `Ch ${chNo} · ${prefix} (${title})`,
        },
      ];
    });
  };

  // Select all completed Koyda or all completed Exercises inside a chapter
  const handleSelectAllGroupInChapter = (chapter, items, itemType) => {
    const chNo = chapter.chapterNo;
    setSelectedUnits((prev) => {
      const keys = items.map((it) => {
        const code = itemType === 'EXAMPLE' ? it.exampleNo : it.exerciseNo;
        return `${itemType}-ch-${chNo}-${code}`;
      });
      const allSelected = keys.every((k) => prev.some((u) => u.key === k));
      if (allSelected) {
        return prev.filter((u) => !keys.includes(u.key));
      }
      const next = [...prev];
      items.forEach((it) => {
        const code = itemType === 'EXAMPLE' ? it.exampleNo : it.exerciseNo;
        const k = `${itemType}-ch-${chNo}-${code}`;
        if (!next.some((u) => u.key === k)) {
          const prefix = itemType === 'EXAMPLE' ? `ઉદા. ${code}` : `Ex Q.${code}`;
          next.push({
            key: k,
            chapterNo: chNo,
            chapterName: chapter.chapterName,
            chapterNameGujarati: chapter.chapterNameGujarati || '',
            itemType,
            code,
            upToCode: '',
            label: `Ch ${chNo} · ${prefix} (${it.title})`,
          });
        }
      });
      return next;
    });
  };

  const handleEditUnitLabel = (key, newLabel) => {
    setSelectedUnits((prev) =>
      prev.map((u) => (u.key === key ? { ...u, label: newLabel } : u))
    );
  };

  const handleRemoveSelectedUnit = (key) => {
    setSelectedUnits((prev) => prev.filter((u) => u.key !== key));
  };

  const handleAddCustomUnit = () => {
    const text = customUnitInput.trim();
    if (!text) return;
    setSelectedUnits((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        chapterNo: undefined,
        chapterName: 'Custom Unit',
        chapterNameGujarati: '',
        itemType: 'CUSTOM',
        code: 'CUSTOM',
        upToCode: '',
        label: text,
      },
    ]);
    setCustomUnitInput('');
  };

  const handleSelectPdfFile = async (e) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) {
      setPdfPayload(null);
      return;
    }
    try {
      const payload = await readPdfFileAsPayload(file);
      setPdfPayload(payload);
    } catch (err) {
      setErrorMsg(err.message);
      setPdfPayload(null);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleSubmitExam = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);

    const isMulti = ['JEE', 'NEET', 'GUJCET'].includes(examType);

    if (isMulti && !cbtExamId.trim()) {
      setErrorMsg('Please enter the CBT Exam ID / Code to map this exam.');
      return;
    }

    const cleanUnits = selectedUnits
      .map((u) => ({ ...u, label: String(u.label || '').trim() }))
      .filter((u) => u.label.length > 0);

    if (!isMulti && cleanUnits.length === 0) {
      setErrorMsg('Please select at least one chapter, topic, koyda, or exercise from the left panel (or add a custom unit).');
      return;
    }
    if (!examDate) {
      setErrorMsg('Please choose an exam date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const unitSummary = isMulti
        ? `CBT Mapped: ${cbtExamId.trim()}`
        : cleanUnits.map((u) => u.label).join('; ');
      const created = await examApi.createExam({
        examType,
        subject,
        standard,
        division,
        examDate,
        examTime: formatExamTime12h(examTime),
        durationMinutes: Number(durationMinutes) || 60,
        marksPerSubject: Number(marksPerSubject) || 100,
        totalMarks: isMultiType
          ? (Number(marksPerSubject) || 100) * 3
          : Number(marksPerSubject) || 100,
        cbtExamId: isMulti ? cbtExamId.trim() : undefined,
        unitSummary,
        selectedUnits: isMulti ? [] : cleanUnits.map(({ key: _k, ...rest }) => rest),
        createdByFacultyId: user?._id || user?.id,
        facultyCode,
        facultyName,
        createdByRole: 'faculty',
        questionPaper: pdfPayload || undefined,
      });

      setSelectedUnits([]);
      setCustomUnitInput('');
      setPdfPayload(null);
      if (pdfInputRef.current) pdfInputRef.current.value = '';

      setExamHistory((prev) => [created, ...prev]);
      setFeedbackMsg(
        `Exam #${created.examNo} submitted (${created.questionPaperStatus === 'UPLOADED' ? 'PDF Attached' : 'Question Paper PDF Pending'}). It is now visible in Assistant Faculty -> Exam Unit!`
      );
      setActiveTab('history');
      setHistoryPage(1);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit exam unit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerRowPdfUpload = (examId) => {
    setUploadingExamId(examId);
    if (rowPdfInputRef.current) {
      rowPdfInputRef.current.value = '';
      rowPdfInputRef.current.click();
    }
  };

  const handleRowPdfSelected = async (e) => {
    const file = e.target.files?.[0];
    const targetExamId = uploadingExamId;
    if (!file || !targetExamId) return;

    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const payload = await readPdfFileAsPayload(file);
      const updated = await examApi.uploadQuestionPaper(targetExamId, payload);
      setExamHistory((prev) =>
        prev.map((ex) => ((ex.id || ex._id) === (updated.id || updated._id) ? updated : ex))
      );
      setFeedbackMsg(`Question paper PDF "${updated.questionPaperFileName}" uploaded for Exam #${updated.examNo}!`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to upload PDF');
    } finally {
      setUploadingExamId(null);
      if (rowPdfInputRef.current) rowPdfInputRef.current.value = '';
    }
  };

  const handleDeleteExam = async (ex) => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await examApi.deleteExam(ex.id || ex._id);
      setExamHistory((prev) => prev.filter((item) => (item.id || item._id) !== (ex.id || ex._id)));
      setFeedbackMsg(`Exam #${ex.examNo} removed.`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove exam');
    }
  };

  const filteredHistory = useMemo(() => {
    return examHistory.filter((ex) => {
      if (historyFilterSubject === 'MY_EXAMS') {
        if (facultyCode && ex.facultyCode) {
          return ex.facultyCode === facultyCode;
        }
        return ex.facultyName === facultyName;
      }
      if (historyFilterSubject === 'MY_SUBJECT') {
        const baseA = normalizeBaseSubject(defaultSubject);
        const baseB = normalizeBaseSubject(ex.subject);
        return (
          baseA === baseB ||
          ['PCM', 'PCB', 'PCMB'].includes(String(ex.subject || '').toUpperCase())
        );
      }
      return true;
    });
  }, [examHistory, historyFilterSubject, facultyCode, facultyName, defaultSubject]);

  const safeHistoryPage = Math.min(
    historyPage,
    Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE))
  );
  const paginatedHistory = filteredHistory.slice(
    (safeHistoryPage - 1) * HISTORY_PAGE_SIZE,
    safeHistoryPage * HISTORY_PAGE_SIZE
  );

  return (
    <>
      <input
        ref={rowPdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handleRowPdfSelected}
      />

      {feedbackMsg && (
        <div
          className="banner banner-success"
          style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
        >
          <span>{feedbackMsg}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setFeedbackMsg(null)}
          >
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          className="banner banner-danger"
          style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setErrorMsg(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Navigation Tabs matching reference screenshot with STS Navy theme */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'select' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('select')}
        >
          Select Unit for Exam
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'history' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Exam History ({filteredHistory.length})
        </button>
      </div>

      {activeTab === 'select' && (
        <div className="set-lt-grid">
          {/* LEFT PANEL: Completed Chapters, Topics, Subtopics, Koyda & Exercises */}
          <div className="card">
            <div className="card__head" style={{ marginBottom: 12 }}>
              <div>
                <div className="card__title">Chapters &amp; Completed Syllabus</div>
                <div className="card__desc">
                  Only topics, koyda (examples) &amp; exercises finished by you appear here ({facultyName})
                </div>
              </div>
              <Link to="/faculty/syllabus" className="btn btn-ghost btn-sm">
                Update Syllabus →
              </Link>
            </div>

            {/* Syllabus Selector Row synced with Right Box */}
            <div
              className="filters"
              style={{
                padding: '10px 12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              <select
                className="filter-select"
                style={{ flex: '1 1 130px' }}
                value={standard}
                onChange={(e) => setStandard(e.target.value)}
                aria-label="Select Standard"
              >
                <option value="STD_11">Standard 11</option>
                <option value="STD_12">Standard 12</option>
              </select>
              <select
                className="filter-select"
                style={{ flex: '1 1 130px' }}
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                aria-label="Select Division"
              >
                <option value="ALL">All Divisions</option>
                <option value="A">Division A</option>
                <option value="B">Division B</option>
              </select>
              <div
                className="filter-select flex items-center justify-between"
                style={{
                  flex: '1 1 160px',
                  background: 'var(--bg-card, #f8fafc)',
                  borderColor: 'var(--border, #cbd5e1)',
                  color: 'var(--text, #0f172a)',
                  fontWeight: 600,
                  cursor: 'not-allowed',
                  padding: '7px 12px',
                }}
                title="Syllabus view is locked to your assigned subject"
              >
                <span>🔒 {defaultSubject}</span>
                <span style={{ fontSize: '11px', color: '#2563eb', background: '#eff6ff', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                  Assigned
                </span>
              </div>
            </div>

            {isLoadingSyllabus ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--slate)' }}>
                Loading your completed syllabus units...
              </div>
            ) : completedChapters.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: 12,
                  background: '#FAFBFD',
                }}
              >
                <div style={{ fontWeight: 700, color: '#123B5D', marginBottom: 6 }}>
                  No Completed Chapters or Topics Found
                </div>
                <p style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 14 }}>
                  Mark topics, subtopics, koyda (examples), or swadhyay exercises as <strong>Finish</strong> in the Syllabus tab first to pick them here.
                </p>
                <Link to="/faculty/syllabus" className="btn btn-primary btn-sm">
                  Go to Syllabus Tab →
                </Link>
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#FFFFFF',
                }}
              >
                {completedChapters.map((entry, chIdx) => {
                  const ch = entry.chapter;
                  const chKey = ch.id || ch._id || `ch-${ch.chapterNo}`;
                  const isOpen = Boolean(expandedChapters[chKey]);
                  const hasAllTopicsSelected = selectedUnits.some(
                    (u) => u.key === `all-topics-ch-${ch.chapterNo}`
                  );

                  return (
                    <div
                      key={chKey}
                      style={{
                        borderBottom:
                          chIdx < completedChapters.length - 1 ? '1px solid #E2E8F0' : 'none',
                      }}
                    >
                      {/* Chapter Header Accordion */}
                      <button
                        type="button"
                        onClick={() => toggleChapterAccordion(chKey)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 10,
                          padding: '13px 16px',
                          background: isOpen ? '#F1F6FB' : '#FFFFFF',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14.5, color: '#123B5D' }}>
                            {ch.chapterNo}. {ch.chapterName}
                          </div>
                          {hasDistinctGujarati(ch.chapterName, ch.chapterNameGujarati) && (
                            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>
                              {ch.chapterNameGujarati}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span className="chip chip-success" style={{ fontSize: 11 }}>
                            {entry.nodes.length}T · {entry.examples.length}K · {entry.exercises.length}E
                          </span>
                          <span style={{ fontSize: 14, color: '#123B5D', fontWeight: 700 }}>
                            {isOpen ? '▲' : '▼'}
                          </span>
                        </div>
                      </button>

                      {/* Chapter Content */}
                      {isOpen && (
                        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid #E2E8F0' }}>
                          {/* Completed Topics / Subtopics / Sub-subtopics */}
                          {entry.nodes.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                              {entry.nodes.map((node) => {
                                const isTopicTillSelected = selectedUnits.some(
                                  (u) =>
                                    u.key === `till-ch-${ch.chapterNo}` &&
                                    u.upToCode === node.code
                                );

                                if (node.kind === 'TOPIC') {
                                  return (
                                    <div
                                      key={node.code}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '9px 6px',
                                        borderBottom: '1px dashed #E2E8F0',
                                      }}
                                    >
                                      <div style={{ minWidth: 0 }}>
                                        <span className="num" style={{ color: '#64748B', marginRight: 8, fontSize: 12.5 }}>
                                          {node.code}
                                        </span>
                                        <span style={{ fontWeight: 600, color: '#1C2340', fontSize: 13.5 }}>
                                          {node.title}
                                        </span>
                                        {hasDistinctGujarati(node.title, node.titleGujarati) && (
                                          <div style={{ fontSize: 12, color: '#64748B', marginLeft: 32 }}>
                                            {node.titleGujarati}
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${isTopicTillSelected ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() =>
                                          handleSelectTill(ch, node.code, node.title, 'TOPIC')
                                        }
                                      >
                                        {isTopicTillSelected ? `✓ Till ${node.code}` : `Till ${node.code}`}
                                      </button>
                                    </div>
                                  );
                                }

                                return (
                                  <div key={node.code} style={{ marginBottom: 8 }}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '8px 6px',
                                        background: '#FAFBFD',
                                        borderRadius: 6,
                                      }}
                                    >
                                      <div style={{ minWidth: 0 }}>
                                        <span className="num" style={{ color: '#123B5D', fontWeight: 700, marginRight: 8, fontSize: 12.5 }}>
                                          {node.code}
                                        </span>
                                        <span style={{ fontWeight: 700, color: '#123B5D', fontSize: 13.5 }}>
                                          {node.title}
                                        </span>
                                        {hasDistinctGujarati(node.title, node.titleGujarati) && (
                                          <div style={{ fontSize: 12, color: '#64748B', marginLeft: 34 }}>
                                            {node.titleGujarati}
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${isTopicTillSelected ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() =>
                                          handleSelectTill(ch, node.code, node.title, 'TOPIC')
                                        }
                                      >
                                        {isTopicTillSelected ? `✓ Till ${node.code}` : `Till ${node.code}`}
                                      </button>
                                    </div>

                                    {/* Nested Subtopics */}
                                    <div style={{ paddingLeft: 18 }}>
                                      {node.subtopics.map((st) => {
                                        const isSubTillSelected = selectedUnits.some(
                                          (u) =>
                                            u.key === `till-ch-${ch.chapterNo}` &&
                                            u.upToCode === st.code
                                        );
                                        return (
                                          <div key={st.code}>
                                            <div
                                              style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '7px 6px',
                                                borderBottom: '1px dashed #EEF0F8',
                                              }}
                                            >
                                              <div style={{ minWidth: 0 }}>
                                                <span className="num" style={{ color: '#64748B', marginRight: 8, fontSize: 12 }}>
                                                  {st.code}
                                                </span>
                                                <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
                                                  {st.title}
                                                </span>
                                                {hasDistinctGujarati(st.title, st.titleGujarati) && (
                                                  <div style={{ fontSize: 11.5, color: '#64748B', marginLeft: 34 }}>
                                                    {st.titleGujarati}
                                                  </div>
                                                )}
                                              </div>
                                              <button
                                                type="button"
                                                className={`btn btn-sm ${isSubTillSelected ? 'btn-primary' : 'btn-ghost'}`}
                                                onClick={() =>
                                                  handleSelectTill(ch, st.code, st.title, 'SUBTOPIC')
                                                }
                                              >
                                                {isSubTillSelected ? `✓ Till ${st.code}` : `Till ${st.code}`}
                                              </button>
                                            </div>

                                            {/* Nested Sub-subtopics */}
                                            {st.doneSubSubs.length > 0 && (
                                              <div style={{ paddingLeft: 18 }}>
                                                {st.doneSubSubs.map((sst) => {
                                                  const isSstTillSelected = selectedUnits.some(
                                                    (u) =>
                                                      u.key === `till-ch-${ch.chapterNo}` &&
                                                      u.upToCode === sst.subSubtopicNo
                                                  );
                                                  return (
                                                    <div
                                                      key={sst.subSubtopicNo}
                                                      style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        padding: '5px 6px',
                                                        borderBottom: '1px dotted #EEF0F8',
                                                      }}
                                                    >
                                                      <div style={{ minWidth: 0 }}>
                                                        <span className="num" style={{ color: '#94A3B8', marginRight: 6, fontSize: 11.5 }}>
                                                          {sst.subSubtopicNo}
                                                        </span>
                                                        <span style={{ fontSize: 12.5, color: '#475569' }}>
                                                          {sst.title}
                                                        </span>
                                                        {hasDistinctGujarati(sst.title, sst.titleGujarati) && (
                                                          <span style={{ fontSize: 11.5, color: '#64748B', marginLeft: 6 }}>
                                                            ({sst.titleGujarati})
                                                          </span>
                                                        )}
                                                      </div>
                                                      <button
                                                        type="button"
                                                        className={`btn btn-sm ${isSstTillSelected ? 'btn-primary' : 'btn-ghost'}`}
                                                        style={{ fontSize: 11, padding: '4px 10px' }}
                                                        onClick={() =>
                                                          handleSelectTill(
                                                            ch,
                                                            sst.subSubtopicNo,
                                                            sst.title,
                                                            'SUBSUBTOPIC'
                                                          )
                                                        }
                                                      >
                                                        {isSstTillSelected
                                                          ? `✓ Till ${sst.subSubtopicNo}`
                                                          : `Till ${sst.subSubtopicNo}`}
                                                      </button>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}

                              <div style={{ marginTop: 10 }}>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${hasAllTopicsSelected ? 'btn-primary' : 'btn-ghost'}`}
                                  onClick={() => handleSelectAllTopics(ch)}
                                >
                                  {hasAllTopicsSelected ? '✓ All Completed Topics Selected' : 'All topics'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Completed Koyda (Examples) Section */}
                          {entry.examples.length > 0 && (
                            <div
                              style={{
                                marginTop: 12,
                                padding: 12,
                                borderRadius: 10,
                                background: '#F8F6FC',
                                border: '1px solid #E5DDF5',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: 8,
                                  gap: 8,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: 12.5, color: '#5B21B6' }}>
                                  Completed Koyda / ઉદાહરણો ({entry.examples.length})
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: 11.5, padding: '4px 10px' }}
                                  onClick={() =>
                                    handleSelectAllGroupInChapter(ch, entry.examples, 'EXAMPLE')
                                  }
                                >
                                  Toggle All Koyda
                                </button>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {entry.examples.map((ex) => {
                                  const isSel = selectedUnits.some(
                                    (u) => u.key === `EXAMPLE-ch-${ch.chapterNo}-${ex.exampleNo}`
                                  );
                                  return (
                                    <div
                                      key={ex.exampleNo}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '7px 10px',
                                        background: '#FFFFFF',
                                        borderRadius: 8,
                                        border: '1px solid #EDE9FE',
                                      }}
                                    >
                                      <div style={{ minWidth: 0 }}>
                                        <span className="num" style={{ fontWeight: 700, fontSize: 12, color: '#5B21B6', marginRight: 8 }}>
                                          ઉદા. {ex.exampleNo}
                                        </span>
                                        <span style={{ fontSize: 12.8, color: '#1E293B' }}>{ex.title}</span>
                                        {ex.imageUrl && (
                                          <a
                                            href={ex.imageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              marginLeft: 8,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              background: '#EFF6FF',
                                              color: '#1D4ED8',
                                              border: '1px solid #BFDBFE',
                                              padding: '1px 6px',
                                              borderRadius: 4,
                                              fontSize: 11,
                                              fontWeight: 700,
                                              textDecoration: 'none',
                                            }}
                                            title="View figure in new tab"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            🖼️ {ex.figureNote || 'આકૃતિ'} ↗
                                          </a>
                                        )}
                                        {hasDistinctGujarati(ex.title, ex.titleGujarati) && (
                                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                                            {ex.titleGujarati}
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${isSel ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() =>
                                          handleToggleItem(ch, 'EXAMPLE', ex.exampleNo, ex.title)
                                        }
                                      >
                                        {isSel ? '✓ Selected' : 'Select'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Completed Swadhyay Exercises Section */}
                          {entry.exercises.length > 0 && (
                            <div
                              style={{
                                marginTop: 12,
                                padding: 12,
                                borderRadius: 10,
                                background: '#FFFDF4',
                                border: '1px solid #FDE68A',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: 8,
                                  gap: 8,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: 12.5, color: '#92400E' }}>
                                  Completed Swadhyay Exercises / સ્વાધ્યાય ({entry.exercises.length})
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: 11.5, padding: '4px 10px' }}
                                  onClick={() =>
                                    handleSelectAllGroupInChapter(ch, entry.exercises, 'SWADHYAY')
                                  }
                                >
                                  Toggle All Exercises
                                </button>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {entry.exercises.map((sw) => {
                                  const isSel = selectedUnits.some(
                                    (u) => u.key === `SWADHYAY-ch-${ch.chapterNo}-${sw.exerciseNo}`
                                  );
                                  return (
                                    <div
                                      key={sw.exerciseNo}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '7px 10px',
                                        background: '#FFFFFF',
                                        borderRadius: 8,
                                        border: '1px solid #FEF3C7',
                                      }}
                                    >
                                      <div style={{ minWidth: 0 }}>
                                        <span className="num" style={{ fontWeight: 700, fontSize: 12, color: '#B45309', marginRight: 8 }}>
                                          Q.{sw.exerciseNo}
                                        </span>
                                        <span style={{ fontSize: 12.8, color: '#1E293B' }}>{sw.title}</span>
                                        {sw.imageUrl && (
                                          <a
                                            href={sw.imageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              marginLeft: 8,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              background: '#FEF3C7',
                                              color: '#92400E',
                                              border: '1px solid #FDE68A',
                                              padding: '1px 6px',
                                              borderRadius: 4,
                                              fontSize: 11,
                                              fontWeight: 700,
                                              textDecoration: 'none',
                                            }}
                                            title="View figure in new tab"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            🖼️ {sw.figureNote || 'આકૃતિ'} ↗
                                          </a>
                                        )}
                                        {hasDistinctGujarati(sw.title, sw.titleGujarati) && (
                                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                                            {sw.titleGujarati}
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${isSel ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() =>
                                          handleToggleItem(ch, 'SWADHYAY', sw.exerciseNo, sw.title)
                                        }
                                      >
                                        {isSel ? '✓ Selected' : 'Select'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Exam Box (Editable Selected Units + Date/Time/Std/Div/Type/Subject/PDF) */}
          <div className="card">
            <div className="card__head" style={{ marginBottom: 12 }}>
              <div>
                <div className="card__title">Exam Box</div>
                <div className="card__desc">Edit selected syllabus units &amp; configure exam schedule</div>
              </div>
              <span className="chip chip-neutral">{selectedUnits.length} Selected</span>
            </div>

            <form onSubmit={handleSubmitExam} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* If JEE / NEET / GUJCET: show CBT Exam ID mapping instead of syllabus units */}
              {['JEE', 'NEET', 'GUJCET'].includes(examType) ? (
                <div
                  style={{
                    background: '#F0F9FF',
                    border: '1.5px solid #BAE6FD',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <label className="field-label" style={{ fontWeight: 800, color: '#0369A1', marginBottom: 6, display: 'block' }}>
                    Enter CBT Exam ID / Code *
                  </label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. CBT-2026-JEE-01 or paste CBT Exam ID"
                    value={cbtExamId}
                    onChange={(e) => setCbtExamId(e.target.value)}
                    required
                    style={{ background: '#FFFFFF', fontSize: 13.5 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#0284C7', marginTop: 6, display: 'block' }}>
                    🔗 Maps this exam with the live CBT examination module. When Assistant Faculty evaluates CBT results, student marks will automatically enter into this exam.
                  </span>
                </div>
              ) : (
                /* Selected Units / Chapters / Koyda / Exercises Editable Box */
                <div
                  style={{
                    background: '#F4F7FA',
                    border: '1px solid #DCE6F1',
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: '#475569', marginBottom: 10 }}>
                    Selected Units / Chapters / Koyda / Exercises (Editable)
                  </div>

                  {selectedUnits.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#94A3B8', padding: '10px 2px' }}>
                      None selected yet — click <strong>Till ...</strong>, <strong>Select</strong>, or <strong>All topics</strong> on the left panel.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedUnits.map((item) => (
                        <div
                          key={item.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: '#FFFFFF',
                            padding: 6,
                            borderRadius: 8,
                            border: '1px solid #D1DDE8',
                          }}
                        >
                          <input
                            type="text"
                            className="field-input"
                            style={{ flex: 1, minWidth: 0, padding: '6px 10px', fontSize: 13 }}
                            value={item.label}
                            onChange={(e) => handleEditUnitLabel(item.key, e.target.value)}
                            aria-label="Edit selected syllabus unit"
                          />
                          <button
                            type="button"
                            className="btn btn-danger-ghost btn-sm"
                            style={{ padding: '5px 10px' }}
                            onClick={() => handleRemoveSelectedUnit(item.key)}
                            title="Remove unit"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick custom unit addition inside right box */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      type="text"
                      className="field-input"
                      style={{ flex: 1, minWidth: 0, background: '#FFFFFF' }}
                      placeholder="+ Add custom note or chapter range..."
                      value={customUnitInput}
                      onChange={(e) => setCustomUnitInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomUnit();
                        }
                      }}
                    />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddCustomUnit}>
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Date & Exam Time */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="field-label">Date *</label>
                  <input
                    type="date"
                    className="field-input w-full"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="field-label">Time *</label>
                  <input
                    type="time"
                    className="field-input w-full"
                    value={examTime}
                    onChange={(e) => setExamTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Standard & Division */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="field-label">Standard *</label>
                  <select
                    className="filter-select w-full"
                    value={standard}
                    onChange={(e) => setStandard(e.target.value)}
                  >
                    <option value="STD_11">Standard 11</option>
                    <option value="STD_12">Standard 12</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="field-label">Division *</label>
                  <select
                    className="filter-select w-full"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                  >
                    <option value="ALL">All Divisions</option>
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                  </select>
                </div>
              </div>

              {/* Exam Type & Subject */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="field-label">Exam Type *</label>
                  <select
                    className="filter-select w-full"
                    value={examType}
                    onChange={(e) => {
                      const next = e.target.value;
                      setExamType(next);
                      if (next === 'GUJCET') setDurationMinutes(120);
                      else if (next === 'JEE' || next === 'NEET') setDurationMinutes(180);
                      else setDurationMinutes(60);
                    }}
                  >
                    {EXAM_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="field-label">Subject *</label>
                  <div
                    className="filter-select w-full flex items-center justify-between"
                    style={{
                      background: 'var(--bg-card, #f8fafc)',
                      borderColor: 'var(--border, #cbd5e1)',
                      color: 'var(--text, #0f172a)',
                      fontWeight: 600,
                      cursor: 'not-allowed',
                      padding: '8px 12px',
                    }}
                    title="Exam creation is locked to your assigned subject"
                  >
                    <span>🔒 {defaultSubject}</span>
                    <span style={{ fontSize: '11px', color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                      Assigned Subject
                    </span>
                  </div>
                </div>
              </div>

              {/* Duration & Marks per subject */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="field-label">Duration (Minutes)</label>
                  <input
                    type="number"
                    className="field-input w-full num"
                    min={15}
                    max={360}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="field-label">
                    {isMultiType ? 'Marks Per Subject (e.g. 100 / 40)' : 'Total Marks'}
                  </label>
                  <input
                    type="number"
                    className="field-input w-full num"
                    min={10}
                    max={300}
                    value={marksPerSubject}
                    onChange={(e) => setMarksPerSubject(e.target.value)}
                  />
                </div>
              </div>

              {/* Optional Question Paper PDF Upload */}
              <div
                style={{
                  border: '1px dashed #CBD5E1',
                  borderRadius: 10,
                  padding: 12,
                  background: '#FAFBFD',
                }}
              >
                <label className="field-label" style={{ display: 'block', marginBottom: 6 }}>
                  Upload Question Paper PDF (Optional)
                </label>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="field-input w-full"
                  style={{ padding: '7px 10px', background: '#FFFFFF' }}
                  onChange={handleSelectPdfFile}
                />
                {pdfPayload ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 8,
                      gap: 8,
                    }}
                  >
                    <span className="chip chip-success">PDF Ready: {pdfPayload.fileName}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setPdfPayload(null);
                        if (pdfInputRef.current) pdfInputRef.current.value = '';
                      }}
                    >
                      Clear PDF
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: 'var(--slate)', marginTop: 6 }}>
                    If not uploaded now, status will remain <strong>Pending Upload</strong> and you can upload it after submission from <strong>Exam History</strong>.
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting Exam Unit...' : 'Submit Exam Unit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="card__head"
            style={{ padding: '16px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}
          >
            <div>
              <div className="card__title">Submitted Exam History &amp; Question Paper PDFs</div>
              <div className="card__desc">
                Upload pending question paper PDFs anytime after exam submission
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                className="filter-select"
                value={historyFilterSubject}
                onChange={(e) => {
                  setHistoryFilterSubject(e.target.value);
                  setHistoryPage(1);
                }}
              >
                <option value="MY_SUBJECT">My Subject ({normalizeBaseSubject(defaultSubject)})</option>
                <option value="MY_EXAMS">Created By Me ({facultyName})</option>
                <option value="ALL">All Exams</option>
              </select>
            </div>
          </div>

          <div className="table-wrap desktop-only" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Exam No</th>
                  <th>Date &amp; Time</th>
                  <th>Std / Div</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Units Covered</th>
                  <th>Question Paper PDF</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>
                      Loading exam history...
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No submitted exams found yet. Switch to <strong>Select Unit for Exam</strong> to submit one.
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((ex) => {
                    const exId = ex.id || ex._id;
                    const isPdfUploaded = ex.questionPaperStatus === 'UPLOADED';
                    const statusBadge =
                      ex.status === 'MARKS_ENTERED' || ex.status === 'RESULT_PUBLISHED'
                        ? { cls: 'chip-success', label: 'Completed' }
                        : ex.status === 'CONDUCTED'
                        ? { cls: 'chip-warning', label: 'Pending Marks' }
                        : { cls: 'chip-neutral', label: 'Upcoming' };

                    return (
                      <tr key={exId}>
                        <td className="num">
                          <strong>#{ex.examNo}</strong>
                        </td>
                        <td className="num">
                          <div>{formatExamDate(ex.examDate)}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                            {ex.examTime || '10:00 AM'} ({ex.durationMinutes || 60}m)
                          </div>
                        </td>
                        <td className="num">
                          {ex.standard === 'STD_11' ? '11' : '12'}-{ex.division || 'ALL'}
                        </td>
                        <td>
                          <span className="chip chip-neutral">{formatExamTypeLabel(ex.examType)}</span>
                        </td>
                        <td>
                          <strong>{ex.subject}</strong>
                        </td>
                        <td style={{ maxWidth: 260, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {ex.unitSummary || '—'}
                        </td>
                        <td>
                          {isPdfUploaded ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span className="chip chip-success">Uploaded</span>
                              <a
                                href={getQuestionPaperUrl(exId)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost btn-sm"
                              >
                                View PDF
                              </a>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => triggerRowPdfUpload(exId)}
                              >
                                Replace
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span className="chip chip-warning">Pending Upload</span>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => triggerRowPdfUpload(exId)}
                              >
                                Upload PDF
                              </button>
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`chip ${statusBadge.cls}`}>{statusBadge.label}</span>
                        </td>
                        <td>
                          {ex.status === 'SCHEDULED' ? (
                            <button
                              type="button"
                              className="btn btn-danger-ghost btn-sm"
                              onClick={() => handleDeleteExam(ex)}
                            >
                              Delete
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--slate)' }}>Synced</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
            {isLoadingHistory ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>Loading exams...</div>
            ) : filteredHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>No submitted exams found.</div>
            ) : (
              paginatedHistory.map((ex) => {
                const exId = ex.id || ex._id;
                const isPdfUploaded = ex.questionPaperStatus === 'UPLOADED';
                const statusBadge =
                  ex.status === 'MARKS_ENTERED' || ex.status === 'RESULT_PUBLISHED'
                    ? { cls: 'chip-success', label: 'Completed' }
                    : ex.status === 'CONDUCTED'
                    ? { cls: 'chip-warning', label: 'Pending Marks' }
                    : { cls: 'chip-neutral', label: 'Upcoming' };

                return (
                  <div
                    key={exId}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      padding: 14,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#123B5D' }}>#{ex.examNo}</span>
                        <span className="chip chip-neutral" style={{ fontSize: 11 }}>{formatExamTypeLabel(ex.examType)}</span>
                      </div>
                      <span className={`chip ${statusBadge.cls}`} style={{ fontSize: 11 }}>{statusBadge.label}</span>
                    </div>

                    <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div><strong>Date:</strong> {formatExamDate(ex.examDate)} • {ex.examTime || '10:00 AM'} ({ex.durationMinutes || 60}m)</div>
                      <div><strong>Class:</strong> Std {ex.standard === 'STD_11' ? '11' : '12'} - Div {ex.division || 'ALL'} • <strong>Subject:</strong> {ex.subject}</div>
                      {ex.unitSummary && (
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          <strong>Units:</strong> {ex.unitSummary}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
                      {isPdfUploaded ? (
                        <>
                          <a
                            href={getQuestionPaperUrl(exId)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                          >
                            <FileText size={13} />
                            <span>View PDF</span>
                          </a>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => triggerRowPdfUpload(exId)}
                          >
                            Replace PDF
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                          onClick={() => triggerRowPdfUpload(exId)}
                        >
                          <Upload size={13} />
                          <span>Upload PDF</span>
                        </button>
                      )}
                      {ex.status === 'SCHEDULED' && (
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => handleDeleteExam(ex)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <PaginationBar
            currentPage={safeHistoryPage}
            totalItems={filteredHistory.length}
            pageSize={HISTORY_PAGE_SIZE}
            onPageChange={setHistoryPage}
            itemLabel="exams"
          />
        </div>
      )}
    </>
  );
}
