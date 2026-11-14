import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { examApi, readPdfFileAsPayload, getQuestionPaperUrl } from '../../services/examApi';
import { fetchCbtExamById, fetchCbtExams } from '../../services/cbtService';
import PaginationBar from '../../components/common/PaginationBar';
import CbtQuestionPaperModal from '../../components/cbt/CbtQuestionPaperModal';

const SUBJECT_OPTIONS = [
  'Physics',
  'Chemistry',
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

function csvEscape(val) {
  const str = String(val ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function AssistantExam() {
  const { setHeader } = useOutletContext();
  const { user } = useAuth();

  useEffect(() => {
    setHeader({
      title: 'Exam',
      subtitle: 'Upcoming schedule, pending marks entries, and completed exam records',
    });
  }, [setHeader]);

  // Tabs: 'upcoming' | 'pending' | 'completed'
  const [activeTab, setActiveTab] = useState('upcoming');
  const [allExams, setAllExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // Pagination state per tab
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const PAGE_SIZE = 7;

  // Question Paper Modal State
  const [selectedExamForPaper, setSelectedExamForPaper] = useState(null);
  const [isLoadingPaper, setIsLoadingPaper] = useState(false);

  // Create Exam Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const createPdfRef = useRef(null);
  const [createPdfPayload, setCreatePdfPayload] = useState(null);
  const [createForm, setCreateForm] = useState({
    examType: 'BOARD',
    standard: 'STD_11',
    division: 'ALL',
    subject: 'Chemistry',
    examDate: getTodayYmd(),
    examTime: '10:00',
    durationMinutes: 60,
    marksPerSubject: 100,
    cbtExamId: '',
  });

  const loadExams = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const list = await examApi.getAllExams({});
      setAllExams(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to fetch exams:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExams(false);
    const onFocus = () => loadExams(true);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadExams(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadExams]);

  const upcomingExams = allExams.filter((e) => e.status === 'SCHEDULED');
  const pendingExams = allExams.filter((e) => e.status === 'CONDUCTED');
  const completedExams = allExams.filter(
    (e) => e.status === 'MARKS_ENTERED' || e.status === 'RESULT_PUBLISHED'
  );

  const handleMarkCompleted = async (exam) => {
    setErrorMsg(null);
    setBannerMsg(null);
    try {
      const updated = await examApi.markExamCompleted(exam.id || exam._id);
      setAllExams((prev) =>
        prev.map((item) => ((item.id || item._id) === (updated.id || updated._id) ? updated : item))
      );
      setBannerMsg(`Exam #${updated.examNo} moved to Pending Exam queue for marks entry.`);
      setActiveTab('pending');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update exam status');
    }
  };

  const handleDeleteExam = async (exam) => {
    setErrorMsg(null);
    setBannerMsg(null);
    try {
      await examApi.deleteExam(exam.id || exam._id);
      setAllExams((prev) =>
        prev.filter((item) => (item.id || item._id) !== (exam.id || exam._id))
      );
      setBannerMsg(`Exam #${exam.examNo} deleted.`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete exam');
    }
  };

  const handleDownloadExcel = async (exam) => {
    const exId = exam.id || exam._id;
    setDownloadingId(exId);
    setErrorMsg(null);
    try {
      const isGujcet = exam.examType === 'GUJCET';
      const isMulti = ['JEE', 'NEET', 'GUJCET'].includes(exam.examType);
      const csvRows = [];

      if (isGujcet) {
        const [grpA, grpB] = await Promise.all([
          examApi.getExamMarks(exId, { group: 'A' }),
          examApi.getExamMarks(exId, { group: 'B' }),
        ]);
        csvRows.push([
          'Exam No',
          'Exam Type',
          'Standard',
          'Division',
          'Group',
          'Roll No',
          'Student Name',
          'Physics',
          'Chemistry',
          'Maths / Biology',
          'Total',
          'Max Marks',
          'Percentage (%)',
          'Attendance',
        ]);
        const appendGroupRows = (resData, grpLabel) => {
          (resData?.rows || []).forEach((r) => {
            csvRows.push([
              `#${exam.examNo}`,
              'GUJCET',
              exam.standard === 'STD_11' ? '11' : '12',
              r.division || exam.division,
              grpLabel,
              r.rollNo,
              r.name,
              r.ab ? 'AB' : r.phy || 0,
              r.ab ? 'AB' : r.chem || 0,
              r.ab ? 'AB' : r.third || 0,
              r.ab ? 0 : r.totalObtained || 0,
              r.totalMaxMarks,
              r.ab ? 0 : r.percentage || 0,
              r.ab ? 'Absent' : 'Present',
            ]);
          });
        };
        appendGroupRows(grpA, 'Group A (PCM)');
        appendGroupRows(grpB, 'Group B (PCB)');
      } else {
        const resData = await examApi.getExamMarks(exId, {
          group: exam.examType === 'NEET' ? 'B' : 'A',
        });
        const thirdLabel = exam.examType === 'NEET' ? 'Biology' : 'Maths';
        if (isMulti) {
          csvRows.push([
            'Exam No',
            'Exam Type',
            'Standard',
            'Division',
            'Roll No',
            'Student Name',
            'Physics',
            'Chemistry',
            thirdLabel,
            'Total',
            'Max Marks',
            'Percentage (%)',
            'Attendance',
          ]);
          (resData?.rows || []).forEach((r) => {
            csvRows.push([
              `#${exam.examNo}`,
              formatExamTypeLabel(exam.examType),
              exam.standard === 'STD_11' ? '11' : '12',
              r.division || exam.division,
              r.rollNo,
              r.name,
              r.ab ? 'AB' : r.phy || 0,
              r.ab ? 'AB' : r.chem || 0,
              r.ab ? 'AB' : r.third || 0,
              r.ab ? 0 : r.totalObtained || 0,
              r.totalMaxMarks,
              r.ab ? 0 : r.percentage || 0,
              r.ab ? 'Absent' : 'Present',
            ]);
          });
        } else {
          csvRows.push([
            'Exam No',
            'Exam Type',
            'Subject',
            'Standard',
            'Division',
            'Roll No',
            'Student Name',
            'Marks Obtained',
            'Total Marks',
            'Percentage (%)',
            'Attendance',
          ]);
          (resData?.rows || []).forEach((r) => {
            csvRows.push([
              `#${exam.examNo}`,
              formatExamTypeLabel(exam.examType),
              exam.subject,
              exam.standard === 'STD_11' ? '11' : '12',
              r.division || exam.division,
              r.rollNo,
              r.name,
              r.ab ? 'AB' : r.single || 0,
              r.totalMaxMarks,
              r.ab ? 0 : r.percentage || 0,
              r.ab ? 'Absent' : 'Present',
            ]);
          });
        }
      }

      const csvContent = '\uFEFF' + csvRows.map((row) => row.map(csvEscape).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Exam_${exam.examNo}_${exam.subject.replace(/\s+/g, '_')}_Marks.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to download marks sheet');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCreateExamTypeChange = (nextType) => {
    let nextSubject = createForm.subject;
    let nextDuration = createForm.durationMinutes;
    if (nextType === 'JEE') {
      nextSubject = 'PCM';
      nextDuration = 180;
    } else if (nextType === 'NEET') {
      nextSubject = 'PCB';
      nextDuration = 180;
    } else if (nextType === 'GUJCET') {
      nextSubject = 'PCMB';
      nextDuration = 120;
    } else {
      if (['PCM', 'PCB', 'PCMB'].includes(nextSubject)) nextSubject = 'Physics';
      nextDuration = 60;
    }
    setCreateForm((prev) => ({
      ...prev,
      examType: nextType,
      subject: nextSubject,
      durationMinutes: nextDuration,
    }));
  };

  const handleCreatePdfChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setCreatePdfPayload(null);
      return;
    }
    try {
      const payload = await readPdfFileAsPayload(file);
      setCreatePdfPayload(payload);
    } catch (err) {
      setErrorMsg(err.message);
      setCreatePdfPayload(null);
      if (createPdfRef.current) createPdfRef.current.value = '';
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setBannerMsg(null);
    setIsCreating(true);
    try {
      const isMulti = ['JEE', 'NEET', 'GUJCET'].includes(createForm.examType);
      const created = await examApi.createExam({
        examType: createForm.examType,
        standard: createForm.standard,
        division: createForm.division,
        subject: createForm.subject,
        examDate: createForm.examDate,
        examTime: formatExamTime12h(createForm.examTime),
        durationMinutes: Number(createForm.durationMinutes) || 60,
        marksPerSubject: Number(createForm.marksPerSubject) || 100,
        totalMarks: isMulti
          ? (Number(createForm.marksPerSubject) || 100) * 3
          : Number(createForm.marksPerSubject) || 100,
        cbtExamId: createForm.cbtExamId.trim() || undefined,
        createdByFacultyId: user?._id || user?.id,
        facultyCode: user?.empCode || user?.id || 'ASST',
        facultyName: user?.name || user?.fullName || 'Assistant Faculty',
        createdByRole: 'assistant',
        status: 'CONDUCTED', // Explicitly pending marks per workflow!
        questionPaper: createPdfPayload || undefined,
      });

      setAllExams((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setCreatePdfPayload(null);
      if (createPdfRef.current) createPdfRef.current.value = '';
      setCreateForm((prev) => ({ ...prev, cbtExamId: '' }));
      setBannerMsg(
        `Exam #${created.examNo} (${formatExamTypeLabel(created.examType)} — ${created.subject}) created successfully!`
      );
      setActiveTab('pending');
      setPendingPage(1);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create exam');
    } finally {
      setIsCreating(false);
    }
  };

  const handleShowQuestionPaper = async (ex) => {
    setIsLoadingPaper(true);
    try {
      let cbtExam = null;
      if (ex.cbtExamId) {
        cbtExam = await fetchCbtExamById(ex.cbtExamId);
      }
      if (!cbtExam && ex.cbtExamCode) {
        const allCbt = await fetchCbtExams();
        cbtExam = allCbt.find((c) => c.examCode === ex.cbtExamCode);
      }
      if (!cbtExam && ['JEE', 'NEET', 'GUJCET'].includes(ex.examType)) {
        const allCbt = await fetchCbtExams();
        cbtExam = allCbt.find((c) => c.examType === ex.examType && c.standard === ex.standard);
      }

      if (cbtExam && Array.isArray(cbtExam.questions) && cbtExam.questions.length > 0) {
        setSelectedExamForPaper({
          ...cbtExam,
          title: ex.title || cbtExam.title,
          examCode: cbtExam.examCode || `EXAM-${ex.examNo}`,
          examType: ex.examType,
          standard: ex.standard,
          division: ex.division,
          streamGroup: ex.streamGroup,
          durationMinutes: ex.durationMinutes || cbtExam.durationMinutes,
          totalMarks: ex.totalMarks || cbtExam.totalMarks,
        });
        return;
      }

      if (ex.questionPaperStatus === 'UPLOADED') {
        window.open(getQuestionPaperUrl(ex.id || ex._id), '_blank');
        return;
      }

      alert('No question paper PDF or extracted CBT questions found for this exam.');
    } catch (paperErr) {
      console.warn('Error displaying question paper:', paperErr);
      alert('Could not load question paper: ' + paperErr.message);
    } finally {
      setIsLoadingPaper(false);
    }
  };

  const safeUpcomingPage = Math.min(
    upcomingPage,
    Math.max(1, Math.ceil(upcomingExams.length / PAGE_SIZE))
  );
  const paginatedUpcoming = upcomingExams.slice(
    (safeUpcomingPage - 1) * PAGE_SIZE,
    safeUpcomingPage * PAGE_SIZE
  );

  const safePendingPage = Math.min(
    pendingPage,
    Math.max(1, Math.ceil(pendingExams.length / PAGE_SIZE))
  );
  const paginatedPending = pendingExams.slice(
    (safePendingPage - 1) * PAGE_SIZE,
    safePendingPage * PAGE_SIZE
  );

  const safeCompletedPage = Math.min(
    completedPage,
    Math.max(1, Math.ceil(completedExams.length / PAGE_SIZE))
  );
  const paginatedCompleted = completedExams.slice(
    (safeCompletedPage - 1) * PAGE_SIZE,
    safeCompletedPage * PAGE_SIZE
  );

  return (
    <>
      {bannerMsg && (
        <div
          className="banner banner-success"
          style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
        >
          <span>{bannerMsg}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBannerMsg(null)}>
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
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setErrorMsg(null)}>
            ✕
          </button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Total Exams</div>
          <div className="kpi-card__value num">{allExams.length}</div>
        </div>
        <div className="kpi-card is-warning">
          <div className="kpi-card__label">Pending Marks</div>
          <div className="kpi-card__value num">{pendingExams.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Upcoming</div>
          <div className="kpi-card__value num">{upcomingExams.length}</div>
        </div>
        <div className="kpi-card is-success">
          <div className="kpi-card__label">Completed</div>
          <div className="kpi-card__value num">{completedExams.length}</div>
        </div>
      </div>

      {/* Pending Marks Warning Banner */}
      {pendingExams.length > 0 && (
        <div className="banner banner-warning" style={{ marginBottom: 16 }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 20, height: 20, flexShrink: 0 }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            You have <strong>{pendingExams.length}</strong> completed exam(s) that require student marks entry. Check the{' '}
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                fontWeight: 800,
                color: '#123B5D',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              Pending Exam
            </button>{' '}
            tab.
          </span>
        </div>
      )}

      {/* Navigation Tabs + Create Exam CTA */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'upcoming' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Exam ({upcomingExams.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'pending' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Exam ({pendingExams.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'completed' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed Exam ({completedExams.length})
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Exam
        </button>
      </div>

      {/* TAB 1: UPCOMING EXAM SCHEDULE */}
      {activeTab === 'upcoming' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="card__head"
            style={{ padding: '18px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}
          >
            <div>
              <div className="card__title">Upcoming Exam Schedule</div>
              <div className="card__desc">
                Exams submitted by Subject Faculty — mark as finished when conducted to enter student marks
              </div>
            </div>
          </div>

          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Date &amp; Time</th>
                  <th>Standard</th>
                  <th>Subject</th>
                  <th>Unit</th>
                  <th>Type</th>
                  <th>Question Paper</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>
                      Loading upcoming exams...
                    </td>
                  </tr>
                ) : upcomingExams.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No upcoming exams scheduled right now. Subject Faculty can submit units, or click <strong>+ Create Exam</strong> to set up a new exam for marks entry.
                    </td>
                  </tr>
                ) : (
                  paginatedUpcoming.map((ex, idx) => {
                    const exId = ex.id || ex._id;
                    const srNo = (safeUpcomingPage - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr key={exId}>
                        <td className="num">{srNo}</td>
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
                          <strong>{ex.subject}</strong>
                        </td>
                        <td style={{ maxWidth: 260, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {ex.unitSummary || '—'}
                        </td>
                        <td>
                          <span className="chip chip-neutral">{formatExamTypeLabel(ex.examType)}</span>
                        </td>
                        <td>
                          {ex.questionPaperStatus === 'UPLOADED' ? (
                            <a
                              href={getQuestionPaperUrl(exId)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm"
                            >
                              View PDF
                            </a>
                          ) : (
                            <span className="chip chip-warning">Pending Upload</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleMarkCompleted(ex)}
                            >
                              Finish Exam →
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger-ghost btn-sm"
                              onClick={() => handleDeleteExam(ex)}
                            >
                              Delete
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
            currentPage={safeUpcomingPage}
            totalItems={upcomingExams.length}
            pageSize={PAGE_SIZE}
            onPageChange={setUpcomingPage}
            itemLabel="upcoming exams"
          />
        </div>
      )}

      {/* TAB 2: PENDING EXAM MARKS ENTRY */}
      {activeTab === 'pending' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="card__head"
            style={{ padding: '18px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}
          >
            <div>
              <div className="card__title">Pending Exam Marks Entry</div>
              <div className="card__desc">
                Board exams record single-subject score; JEE (PCM), NEET (PCB) &amp; GUJCET (Group A PCM / Group B PCB) record three subject marks per student
              </div>
            </div>
          </div>

          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Exam No</th>
                  <th>Date</th>
                  <th>Standard</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Question Paper</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>
                      Loading pending exams...
                    </td>
                  </tr>
                ) : pendingExams.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No pending marks entry right now. Click <strong>+ Create Exam</strong> or finish an Upcoming Exam to enter marks.
                    </td>
                  </tr>
                ) : (
                  paginatedPending.map((ex) => {
                    const exId = ex.id || ex._id;
                    return (
                      <tr key={exId}>
                        <td className="num">
                          <strong>{ex.examNo}</strong>
                        </td>
                        <td className="num">{formatExamDate(ex.examDate)}</td>
                        <td className="num">
                          {ex.standard === 'STD_11' ? '11' : '12'}-{ex.division || 'ALL'}
                        </td>
                        <td>
                          <span className="chip chip-neutral">{formatExamTypeLabel(ex.examType)}</span>
                        </td>
                        <td>
                          <strong>{ex.subject}</strong>
                        </td>
                        <td>
                          {ex.questionPaperStatus === 'UPLOADED' ? (
                            <a
                              href={getQuestionPaperUrl(exId)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm"
                            >
                              View PDF
                            </a>
                          ) : (
                            <span className="chip chip-warning">Pending Upload</span>
                          )}
                        </td>
                        <td>
                          <span className="chip chip-warning">Awaiting Marks</span>
                        </td>
                        <td>
                          {ex.examType === 'BOARD' ? (
                            <Link
                              to={`/assistant/exam/enter-marks/${exId}`}
                              className="btn btn-primary btn-sm"
                            >
                              Enter Marks
                            </Link>
                          ) : (
                            <span
                              className="chip chip-neutral"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: '0.78rem',
                                padding: '5px 10px',
                                fontWeight: 600,
                                background: '#eff6ff',
                                color: '#1e40af',
                                border: '1px solid #bfdbfe',
                              }}
                              title="Marks for JEE/NEET/GUJCET are automatically populated when CBT Exam is evaluated"
                            >
                              <span>⚡</span>
                              <span>Auto via CBT</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            currentPage={safePendingPage}
            totalItems={pendingExams.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPendingPage}
            itemLabel="pending exams"
          />
        </div>
      )}

      {/* TAB 3: COMPLETED EXAM RECORDS */}
      {activeTab === 'completed' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="card__head"
            style={{ padding: '18px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}
          >
            <div>
              <div className="card__title">Completed Exam Records</div>
              <div className="card__desc">
                View, edit, or export student marks spreadsheets for completed exams
              </div>
            </div>
          </div>

          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Exam No</th>
                  <th>Date</th>
                  <th>Standard</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Question Paper</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>
                      Loading completed exam records...
                    </td>
                  </tr>
                ) : completedExams.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                      No completed exam marks records yet.
                    </td>
                  </tr>
                ) : (
                  paginatedCompleted.map((ex) => {
                    const exId = ex.id || ex._id;
                    return (
                      <tr key={exId}>
                        <td className="num">
                          <strong>{ex.examNo}</strong>
                        </td>
                        <td className="num">{formatExamDate(ex.examDate)}</td>
                        <td className="num">
                          {ex.standard === 'STD_11' ? '11' : '12'}-{ex.division || 'ALL'}
                        </td>
                        <td>
                          <span className="chip chip-neutral">{formatExamTypeLabel(ex.examType)}</span>
                        </td>
                        <td>
                          <strong>{ex.subject}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            {ex.questionPaperStatus === 'UPLOADED' && (
                              <a
                                href={getQuestionPaperUrl(exId)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost btn-sm"
                              >
                                View PDF
                              </a>
                            )}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleShowQuestionPaper(ex)}
                              disabled={isLoadingPaper}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontSize: '0.78rem',
                              }}
                              title="Show complete question paper with options and correct answers"
                            >
                              <span>📄</span>
                              <span>Show Question Paper</span>
                            </button>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <Link
                              to={`/assistant/exam/view-marks/${exId}`}
                              className="btn btn-ghost btn-sm"
                            >
                              View Marks
                            </Link>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{
                                background: '#1F9D6B',
                                borderColor: '#1F9D6B',
                                color: '#FFFFFF',
                              }}
                              disabled={downloadingId === exId}
                              onClick={() => handleDownloadExcel(ex)}
                            >
                              {downloadingId === exId ? 'Preparing...' : 'Download Excel'}
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
            currentPage={safeCompletedPage}
            totalItems={completedExams.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCompletedPage}
            itemLabel="completed exams"
          />
        </div>
      )}

      {/* CREATE EXAM MODAL (Assistant Faculty Direct Creation -> Pending Marks Status) */}
      {showCreateModal && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setShowCreateModal(false);
          }}
        >
          <div className="modal-box" style={{ maxWidth: 620, width: '100%' }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">Create Exam (Direct Pending Marks Entry)</div>
                <div className="card__desc">
                  Sets exam status to Pending Marks so you can enter student marks immediately
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="field-label">Exam Type *</label>
                  <select
                    className="filter-select w-full"
                    value={createForm.examType}
                    onChange={(e) => handleCreateExamTypeChange(e.target.value)}
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
                  <select
                    className="filter-select w-full"
                    value={createForm.subject}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, subject: e.target.value }))
                    }
                  >
                    {SUBJECT_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="field-label">Standard *</label>
                  <select
                    className="filter-select w-full"
                    value={createForm.standard}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, standard: e.target.value }))
                    }
                  >
                    <option value="STD_11">Standard 11</option>
                    <option value="STD_12">Standard 12</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="field-label">Division *</label>
                  <select
                    className="filter-select w-full"
                    value={createForm.division}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, division: e.target.value }))
                    }
                  >
                    <option value="ALL">All Divisions</option>
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="field-label">Exam Date *</label>
                  <input
                    type="date"
                    className="field-input w-full"
                    value={createForm.examDate}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, examDate: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="field-label">Exam Time *</label>
                  <input
                    type="time"
                    className="field-input w-full"
                    value={createForm.examTime}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, examTime: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="field-label">Duration (Minutes)</label>
                  <input
                    type="number"
                    className="field-input w-full num"
                    min={15}
                    max={360}
                    value={createForm.durationMinutes}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, durationMinutes: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="field-label">
                    {['JEE', 'NEET', 'GUJCET'].includes(createForm.examType)
                      ? 'Marks Per Subject (PCM/PCB)'
                      : 'Total Marks'}
                  </label>
                  <input
                    type="number"
                    className="field-input w-full num"
                    min={10}
                    max={300}
                    value={createForm.marksPerSubject}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, marksPerSubject: e.target.value }))
                    }
                  />
                </div>
              </div>

              {['JEE', 'NEET', 'GUJCET'].includes(createForm.examType) && (
                <div className="form-group">
                  <label className="field-label">Enter CBT Exam ID / Code *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. CBT-2026-JEE-01 or paste CBT Exam ID"
                    value={createForm.cbtExamId}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, cbtExamId: e.target.value }))
                    }
                    required={['JEE', 'NEET', 'GUJCET'].includes(createForm.examType)}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4, display: 'block' }}>
                    Maps this exam with the CBT module. Student marks from CBT evaluation will automatically enter into this exam and move it to Completed Exam!
                  </span>
                </div>
              )}

              <div
                style={{
                  border: '1px dashed #CBD5E1',
                  borderRadius: 10,
                  padding: 12,
                  background: '#FAFBFD',
                }}
              >
                <label className="field-label" style={{ display: 'block', marginBottom: 6 }}>
                  Question Paper PDF (Optional)
                </label>
                <input
                  ref={createPdfRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="field-input w-full"
                  style={{ padding: '7px 10px', background: '#FFFFFF' }}
                  onChange={handleCreatePdfChange}
                />
                {createPdfPayload && (
                  <div style={{ marginTop: 8 }}>
                    <span className="chip chip-success">Selected: {createPdfPayload.fileName}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Exam (Pending Marks)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Question Paper Modal */}
      {selectedExamForPaper && (
        <CbtQuestionPaperModal
          exam={selectedExamForPaper}
          onClose={() => setSelectedExamForPaper(null)}
        />
      )}
    </>
  );
}
