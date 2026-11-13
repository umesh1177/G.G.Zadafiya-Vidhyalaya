import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { examApi, getQuestionPaperUrl } from '../../services/examApi';
import PaginationBar from '../../components/common/PaginationBar';

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
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export default function ExamViewMarks() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setHeader } = useOutletContext();
  const { user } = useAuth();

  const [exam, setExam] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    isMulti: false,
    thirdLabel: 'Maths',
    marksPerSubject: 100,
    effectiveGroup: 'A',
  });
  const [activeGroup, setActiveGroup] = useState('A');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [bannerMsg, setBannerMsg] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [editModal, setEditModal] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadMarks = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await examApi.getExamMarks(id, { group: activeGroup });
      setExam(data.exam);
      setRows(data.rows || []);
      setMeta({
        isMulti: Boolean(data.isMulti),
        thirdLabel: data.thirdLabel || 'Maths',
        marksPerSubject: data.marksPerSubject || data.exam?.marksPerSubject || 100,
        effectiveGroup: data.effectiveGroup || activeGroup,
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load exam marks');
    } finally {
      setIsLoading(false);
    }
  }, [id, activeGroup]);

  useEffect(() => {
    loadMarks();
  }, [loadMarks]);

  useEffect(() => {
    if (exam) {
      const typeLabel = formatExamTypeLabel(exam.examType);
      const subjDisplay =
        exam.examType === 'JEE'
          ? 'PCM'
          : exam.examType === 'NEET'
          ? 'PCB'
          : exam.examType === 'GUJCET'
          ? 'PCMB'
          : exam.subject;
      const stdDisplay = `${exam.standard === 'STD_11' ? '11' : '12'}-${exam.division || 'ALL'}`;
      setHeader({
        title: `View Marks — Exam #${exam.examNo}`,
        subtitle: `Student marks records for ${typeLabel} Exam (${subjDisplay}, Std ${stdDisplay})`,
      });
    } else {
      setHeader({
        title: 'View Exam Marks',
        subtitle: 'Loading marksheet...',
      });
    }
  }, [setHeader, exam]);

  const isGUJCET = exam?.examType === 'GUJCET';
  const maxPerSub = meta.marksPerSubject || 100;

  const openEdit = (s) => {
    setEditModal({
      student: s,
      phy: s.phy ?? '0',
      chem: s.chem ?? '0',
      third: s.third ?? '0',
      single: s.single ?? '0',
      ab: Boolean(s.ab),
    });
  };

  const handleSaveChanges = async () => {
    if (!editModal) return;
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const resData = await examApi.updateStudentMark(id, editModal.student.studentId, {
        group: meta.effectiveGroup,
        phy: editModal.ab ? 0 : Number(editModal.phy) || 0,
        chem: editModal.ab ? 0 : Number(editModal.chem) || 0,
        third: editModal.ab ? 0 : Number(editModal.third) || 0,
        single: editModal.ab ? 0 : Number(editModal.single) || 0,
        ab: Boolean(editModal.ab),
        assistantFacultyId: user?._id || user?.id,
        assistantName: user?.name || user?.fullName || 'Assistant Faculty',
      });
      setExam(resData.exam);
      setRows(resData.rows || []);
      setBannerMsg(`Updated marks for ${editModal.student.name} (Roll No ${editModal.student.rollNo}).`);
      setEditModal(null);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update student marks');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!exam) return;
    const csvRows = [];
    if (meta.isMulti) {
      csvRows.push([
        'Exam No',
        'Exam Type',
        'Roll No',
        'Student Name',
        'Division',
        'Physics',
        'Chemistry',
        meta.thirdLabel,
        'Total',
        'Max Marks',
        'Percentage',
        'Status',
      ]);
      rows.forEach((r) => {
        csvRows.push([
          `#${exam.examNo}`,
          formatExamTypeLabel(exam.examType),
          r.rollNo,
          r.name,
          r.division,
          r.ab ? 'AB' : r.phy || 0,
          r.ab ? 'AB' : r.chem || 0,
          r.ab ? 'AB' : r.third || 0,
          r.ab ? 0 : r.totalObtained || 0,
          r.totalMaxMarks,
          `${r.percentage || 0}%`,
          r.ab ? 'Absent' : 'Present',
        ]);
      });
    } else {
      csvRows.push([
        'Exam No',
        'Exam Type',
        'Subject',
        'Roll No',
        'Student Name',
        'Division',
        'Marks Obtained',
        'Total Marks',
        'Percentage',
        'Status',
      ]);
      rows.forEach((r) => {
        csvRows.push([
          `#${exam.examNo}`,
          formatExamTypeLabel(exam.examType),
          exam.subject,
          r.rollNo,
          r.name,
          r.division,
          r.ab ? 'AB' : r.single || 0,
          r.totalMaxMarks,
          `${r.percentage || 0}%`,
          r.ab ? 'Absent' : 'Present',
        ]);
      });
    }
    const content = '\uFEFF' + csvRows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Exam_${exam.examNo}_${exam.subject.replace(/\s+/g, '_')}_Marks.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const modalTotal = editModal
    ? (parseFloat(editModal.phy) || 0) +
      (parseFloat(editModal.chem) || 0) +
      (parseFloat(editModal.third) || 0)
    : 0;

  const safePage = Math.min(currentPage, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
  const paginatedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/assistant/exam')}
          className="btn btn-ghost btn-sm"
        >
          ← Back to Exam Portal
        </button>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {exam?.questionPaperStatus === 'UPLOADED' && (
            <a
              href={getQuestionPaperUrl(exam.id || exam._id)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
            >
              View PDF
            </a>
          )}
          <Link to={`/assistant/exam/enter-marks/${id}`} className="btn btn-ghost btn-sm">
            Batch Edit / Enter Marks
          </Link>
          <button
            type="button"
            className="btn btn-sm"
            style={{ background: '#1F9D6B', borderColor: '#1F9D6B', color: '#FFFFFF' }}
            onClick={handleDownloadCsv}
          >
            Download Excel
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div
          className="banner banner-success"
          style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>✅ {bannerMsg}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBannerMsg(null)}>
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="banner banner-danger" style={{ marginBottom: 16 }}>
          <span>{errorMsg}</span>
        </div>
      )}

      {isGUJCET && (
        <div
          className="exam-group-tabs"
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 18,
            background: '#F1F5F9',
            padding: 6,
            borderRadius: 'var(--radius-md)',
            border: '1px solid #D1DDE8',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className={`exam-group-btn ${activeGroup === 'A' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveGroup('A');
              setCurrentPage(1);
            }}
          >
            Group A — PCM (Maths)
          </button>
          <button
            type="button"
            className={`exam-group-btn ${activeGroup === 'B' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveGroup('B');
              setCurrentPage(1);
            }}
          >
            Group B — PCB (Biology)
          </button>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="card__head"
          style={{ padding: '18px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}
        >
          <div>
            <div className="card__title">
              {isGUJCET
                ? `Group ${activeGroup} (${activeGroup === 'A' ? 'PCM' : 'PCB'}) Marks Ledger`
                : 'Student Marks List'}
            </div>
            <div className="card__desc">
              {exam?.unitSummary ? `Units: ${exam.unitSummary}` : 'Saved in MongoDB exam ledger'}
            </div>
          </div>
          <span className="chip chip-neutral">{rows.length} Students</span>
        </div>

        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                {meta.isMulti ? (
                  <>
                    <th>Physics</th>
                    <th>Chemistry</th>
                    <th>{meta.thirdLabel}</th>
                    <th>Total</th>
                  </>
                ) : (
                  <th>Marks</th>
                )}
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={meta.isMulti ? 8 : 5} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>
                    Loading saved marks...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={meta.isMulti ? 8 : 5} style={{ textAlign: 'center', padding: 28, color: 'var(--slate)' }}>
                    No marks saved yet for this view. Click <strong>Batch Edit / Enter Marks</strong> to enter scores.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((s) => (
                  <tr key={s.studentId}>
                    <td className="num">
                      <strong>{s.rollNo}</strong>
                    </td>
                    <td>
                      <div><strong>{s.name}</strong></div>
                      <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>Div {s.division}</div>
                    </td>
                    {meta.isMulti ? (
                      <>
                        <td className="num">{s.ab ? '—' : s.phy || 0}</td>
                        <td className="num">{s.ab ? '—' : s.chem || 0}</td>
                        <td className="num">{s.ab ? '—' : s.third || 0}</td>
                        <td className="num" style={{ fontWeight: 700, color: '#123B5D' }}>
                          {s.ab ? 0 : s.totalObtained ?? 0}{' '}
                          <span style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 500 }}>
                            / {s.totalMaxMarks}
                          </span>
                        </td>
                      </>
                    ) : (
                      <td className="num" style={{ fontWeight: 700, color: '#123B5D' }}>
                        {s.ab ? '—' : `${s.single || 0} / ${s.totalMaxMarks}`}
                      </td>
                    )}
                    <td>
                      <span className={`chip ${s.ab ? 'chip-danger' : 'chip-success'}`}>
                        {s.ab ? 'Absent' : 'Present'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(s)}
                      >
                        Edit Mark
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          currentPage={safePage}
          totalItems={rows.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="students"
        />
      </div>

      {/* Edit Student Mark Modal */}
      {editModal && (
        <div
          className="modal-overlay is-open"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setEditModal(null);
          }}
        >
          <div className="modal-box">
            <div className="modal-box__head">
              <div>
                <div className="card__title">Edit Marks — {editModal.student.name}</div>
                <div className="card__desc">
                  {formatExamTypeLabel(exam?.examType)} Exam · Roll No{' '}
                  <span className="num">{editModal.student.rollNo}</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditModal(null)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              {meta.isMulti ? (
                <>
                  <div>
                    <label className="field-label">Physics (0–{maxPerSub})</label>
                    <input
                      type="number"
                      className="field-input w-full num"
                      min={0}
                      max={maxPerSub}
                      value={editModal.phy}
                      disabled={editModal.ab}
                      onChange={(e) => setEditModal((p) => ({ ...p, phy: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="field-label">Chemistry (0–{maxPerSub})</label>
                    <input
                      type="number"
                      className="field-input w-full num"
                      min={0}
                      max={maxPerSub}
                      value={editModal.chem}
                      disabled={editModal.ab}
                      onChange={(e) => setEditModal((p) => ({ ...p, chem: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="field-label">
                      {meta.thirdLabel} (0–{maxPerSub})
                    </label>
                    <input
                      type="number"
                      className="field-input w-full num"
                      min={0}
                      max={maxPerSub}
                      value={editModal.third}
                      disabled={editModal.ab}
                      onChange={(e) => setEditModal((p) => ({ ...p, third: e.target.value }))}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <span className="field-label" style={{ marginBottom: 0 }}>
                      Total Score:{' '}
                      <strong className="num" style={{ color: '#123B5D' }}>
                        {editModal.ab ? 0 : modalTotal}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditModal((p) => ({ ...p, ab: !p.ab }))}
                      style={{
                        padding: '8px 16px',
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        border: `1.5px solid ${editModal.ab ? 'var(--danger)' : '#8e9bb0'}`,
                        background: editModal.ab ? 'var(--danger)' : '#FFFFFF',
                        color: editModal.ab ? '#FFFFFF' : 'var(--ink-soft)',
                        cursor: 'pointer',
                      }}
                    >
                      AB
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="field-label">Marks Obtained (0–{maxPerSub})</label>
                    <input
                      type="number"
                      className="field-input w-full num"
                      min={0}
                      max={maxPerSub}
                      value={editModal.single}
                      disabled={editModal.ab}
                      onChange={(e) => setEditModal((p) => ({ ...p, single: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setEditModal((p) => ({ ...p, ab: !p.ab }))}
                      style={{
                        padding: '8px 16px',
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        border: `1.5px solid ${editModal.ab ? 'var(--danger)' : '#8e9bb0'}`,
                        background: editModal.ab ? 'var(--danger)' : '#FFFFFF',
                        color: editModal.ab ? '#FFFFFF' : 'var(--ink-soft)',
                        cursor: 'pointer',
                      }}
                    >
                      AB
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={isUpdating}
              onClick={handleSaveChanges}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
