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

export default function ExamEnterMarks() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setHeader } = useOutletContext();
  const { user } = useAuth();

  const [exam, setExam] = useState(null);
  const [activeGroup, setActiveGroup] = useState('A');
  const [includeAllStd, setIncludeAllStd] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [submittedMsg, setSubmittedMsg] = useState(null);

  // Store rows per group key ('A' | 'B' | 'ALL') so switching GUJCET groups preserves unsaved inputs
  const [rowsByGroup, setRowsByGroup] = useState({});
  const [metaByGroup, setMetaByGroup] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const loadMarksSheet = useCallback(
    async (groupToLoad, forceAllStd = includeAllStd) => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const resData = await examApi.getExamMarks(id, {
          group: groupToLoad,
          includeAllStd: forceAllStd,
        });
        const loadedExam = resData.exam;
        setExam(loadedExam);
        const effGroup = resData.effectiveGroup || groupToLoad || 'ALL';
        setMetaByGroup((prev) => ({
          ...prev,
          [effGroup]: {
            subjects: resData.subjects || [],
            thirdLabel: resData.thirdLabel || 'Maths',
            isMulti: Boolean(resData.isMulti),
            marksPerSubject: resData.marksPerSubject || loadedExam?.marksPerSubject || 100,
            allClassStudentsCount: resData.allClassStudentsCount || 0,
          },
        }));
        setRowsByGroup((prev) => ({
          ...prev,
          [effGroup]: (resData.rows || []).map((r) => ({ ...r })),
        }));
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load exam marks sheet');
      } finally {
        setIsLoading(false);
      }
    },
    [id, includeAllStd]
  );

  useEffect(() => {
    loadMarksSheet(activeGroup, includeAllStd);
  }, [loadMarksSheet, activeGroup, includeAllStd]);

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
        title: `Enter Marks — Exam #${exam.examNo}`,
        subtitle: `Record marks for ${typeLabel} Exam (${subjDisplay}, Std ${stdDisplay})`,
      });
    } else {
      setHeader({
        title: 'Enter Marks',
        subtitle: 'Loading exam sheet...',
      });
    }
  }, [setHeader, exam]);

  const isGUJCET = exam?.examType === 'GUJCET';
  const currentGroupKey = isGUJCET
    ? activeGroup
    : exam?.examType === 'JEE'
    ? 'A'
    : exam?.examType === 'NEET'
    ? 'B'
    : 'ALL';

  const groupMeta = metaByGroup[currentGroupKey] || {
    subjects: [],
    thirdLabel: exam?.examType === 'JEE' ? 'Maths' : 'Biology',
    isMulti: ['JEE', 'NEET', 'GUJCET'].includes(exam?.examType),
    marksPerSubject: exam?.marksPerSubject || 100,
    allClassStudentsCount: 0,
  };
  const rows = rowsByGroup[currentGroupKey] || [];
  const maxPerSub = groupMeta.marksPerSubject || 100;

  const updateRowField = (studentId, field, rawVal) => {
    setRowsByGroup((prev) => {
      const list = prev[currentGroupKey] || [];
      const next = list.map((r) => {
        if (r.studentId !== studentId) return r;
        let val = rawVal;
        if (val !== '') {
          const num = Number(val);
          if (Number.isFinite(num)) {
            if (num < 0) val = '0';
            if (num > maxPerSub) val = String(maxPerSub);
          }
        }
        const updated = { ...r, [field]: val };
        if (groupMeta.isMulti) {
          const p = parseFloat(updated.phy) || 0;
          const c = parseFloat(updated.chem) || 0;
          const t = parseFloat(updated.third) || 0;
          updated.totalObtained = p + c + t;
        } else {
          updated.totalObtained = parseFloat(updated.single) || 0;
        }
        return updated;
      });
      return { ...prev, [currentGroupKey]: next };
    });
  };

  const toggleAb = (studentId) => {
    setRowsByGroup((prev) => {
      const list = prev[currentGroupKey] || [];
      const next = list.map((r) => {
        if (r.studentId !== studentId) return r;
        const nextAb = !r.ab;
        return {
          ...r,
          ab: nextAb,
          phy: nextAb ? '' : r.phy,
          chem: nextAb ? '' : r.chem,
          third: nextAb ? '' : r.third,
          single: nextAb ? '' : r.single,
          totalObtained: nextAb
            ? 0
            : groupMeta.isMulti
            ? (parseFloat(r.phy) || 0) + (parseFloat(r.chem) || 0) + (parseFloat(r.third) || 0)
            : parseFloat(r.single) || 0,
        };
      });
      return { ...prev, [currentGroupKey]: next };
    });
  };

  const handleSubmitMarks = async (e) => {
    e.preventDefault();
    if (rows.length === 0) {
      setErrorMsg('No active students loaded to submit marks for.');
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    setSubmittedMsg(null);
    try {
      const savedRes = await examApi.saveExamMarks(id, {
        group: currentGroupKey,
        marks: rows,
        assistantFacultyId: user?._id || user?.id,
        assistantName: user?.name || user?.fullName || 'Assistant Faculty',
      });
      setExam(savedRes.exam);
      setRowsByGroup((prev) => ({
        ...prev,
        [currentGroupKey]: (savedRes.rows || []).map((r) => ({ ...r })),
      }));
      setSubmittedMsg(
        isGUJCET
          ? `Group ${currentGroupKey} (${currentGroupKey === 'A' ? 'PCM' : 'PCB'}) marks saved & published!`
          : `Exam #${savedRes.exam?.examNo} marks saved & published to Completed Exam!`
      );
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save exam marks');
    } finally {
      setIsSaving(false);
    }
  };

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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/assistant/exam')}
            className="btn btn-ghost btn-sm"
          >
            ✕ Close Tab
          </button>
          {exam?.unitSummary && (
            <span className="chip chip-neutral" style={{ fontSize: 12 }}>
              Units: {exam.unitSummary}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {exam?.questionPaperStatus === 'UPLOADED' && (
            <a
              href={getQuestionPaperUrl(exam.id || exam._id)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
            >
              View Question Paper PDF
            </a>
          )}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              color: 'var(--ink-soft)',
              cursor: 'pointer',
              background: '#FFFFFF',
              border: '1px solid var(--line)',
              padding: '6px 10px',
              borderRadius: 8,
            }}
          >
            <input
              type="checkbox"
              checked={includeAllStd}
              onChange={(e) => {
                setIncludeAllStd(e.target.checked);
                setCurrentPage(1);
              }}
            />
            Include all Std students
          </label>
        </div>
      </div>

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
              setSubmittedMsg(null);
            }}
          >
            Group A — PCM (Physics, Chemistry, Maths)
          </button>
          <button
            type="button"
            className={`exam-group-btn ${activeGroup === 'B' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveGroup('B');
              setCurrentPage(1);
              setSubmittedMsg(null);
            }}
          >
            Group B — PCB (Physics, Chemistry, Biology)
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="banner banner-danger" style={{ marginBottom: 16 }}>
          <span>{errorMsg}</span>
        </div>
      )}

      {submittedMsg && (
        <div
          className="banner banner-success"
          style={{
            marginBottom: 16,
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span>✅ {submittedMsg}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/assistant/exam/view-marks/${id}`} className="btn btn-ghost btn-sm">
              View Submitted Marks →
            </Link>
            <Link to="/assistant/exam" className="btn btn-primary btn-sm">
              Back to Exam Portal
            </Link>
          </div>
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
                ? `Group ${activeGroup} (${activeGroup === 'A' ? 'PCM' : 'PCB'}) Student Marks List`
                : exam?.examType === 'JEE'
                ? 'Student Marks List — JEE (PCM)'
                : exam?.examType === 'NEET'
                ? 'Student Marks List — NEET (PCB)'
                : `Student Marks List — ${exam?.subject || 'Board'}`}
            </div>
            <div className="card__desc">
              Max marks per subject: <strong className="num">{maxPerSub}</strong>
              {groupMeta.isMulti && (
                <>
                  {' '}
                  • Combined Max Total: <strong className="num">{maxPerSub * 3}</strong>
                </>
              )}
            </div>
          </div>
          <span className="chip chip-neutral">{rows.length} Students</span>
        </div>

        {isLoading ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--slate)' }}>
            Loading students &amp; marks grid...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--slate)' }}>
            <div style={{ fontWeight: 700, color: '#123B5D', marginBottom: 6 }}>
              No students matched {isGUJCET || exam?.examType === 'JEE' || exam?.examType === 'NEET' ? `this stream group` : 'this class'} in Std{' '}
              {exam?.standard === 'STD_11' ? '11' : '12'}-{exam?.division || 'ALL'}.
            </div>
            {groupMeta.allClassStudentsCount > 0 && !includeAllStd && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIncludeAllStd(true)}
              >
                Show All {groupMeta.allClassStudentsCount} Active Students in Std{' '}
                {exam?.standard === 'STD_11' ? '11' : '12'}-{exam?.division || 'ALL'}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmitMarks}>
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    {groupMeta.isMulti ? (
                      <>
                        <th>Physics</th>
                        <th>Chemistry</th>
                        <th>{groupMeta.thirdLabel}</th>
                        <th>Total &amp; AB Status</th>
                      </>
                    ) : (
                      <th>Marks (0–{maxPerSub}) &amp; AB Status</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((m) => (
                    <tr key={m.studentId}>
                      <td className="num">
                        <strong>{m.rollNo}</strong>
                      </td>
                      <td>
                        <div><strong>{m.name}</strong></div>
                        <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                          Div {m.division} • {m.streamGroup}
                        </div>
                      </td>

                      {groupMeta.isMulti ? (
                        <>
                          <td>
                            <input
                              type="number"
                              className="mark-input"
                              placeholder={`0-${maxPerSub}`}
                              style={{
                                width: 82,
                                textAlign: 'center',
                                padding: '6px 8px',
                                border: '1.5px solid #8e9bb0',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 13,
                                background: m.ab ? '#F1F5F9' : '#FFFFFF',
                              }}
                              min={0}
                              max={maxPerSub}
                              value={m.ab ? '' : m.phy}
                              disabled={m.ab}
                              onChange={(e) => updateRowField(m.studentId, 'phy', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="mark-input"
                              placeholder={`0-${maxPerSub}`}
                              style={{
                                width: 82,
                                textAlign: 'center',
                                padding: '6px 8px',
                                border: '1.5px solid #8e9bb0',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 13,
                                background: m.ab ? '#F1F5F9' : '#FFFFFF',
                              }}
                              min={0}
                              max={maxPerSub}
                              value={m.ab ? '' : m.chem}
                              disabled={m.ab}
                              onChange={(e) => updateRowField(m.studentId, 'chem', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="mark-input"
                              placeholder={`0-${maxPerSub}`}
                              style={{
                                width: 82,
                                textAlign: 'center',
                                padding: '6px 8px',
                                border: '1.5px solid #8e9bb0',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 13,
                                background: m.ab ? '#F1F5F9' : '#FFFFFF',
                              }}
                              min={0}
                              max={maxPerSub}
                              value={m.ab ? '' : m.third}
                              disabled={m.ab}
                              onChange={(e) => updateRowField(m.studentId, 'third', e.target.value)}
                            />
                          </td>
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="number"
                                readOnly
                                disabled
                                className="total-input"
                                style={{
                                  width: 78,
                                  textAlign: 'center',
                                  padding: '6px 8px',
                                  border: '1.5px solid #8e9bb0',
                                  borderRadius: 'var(--radius-sm)',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  background: '#F1F5F9',
                                  color: m.ab ? '#94A3B8' : '#123B5D',
                                }}
                                value={m.ab ? 0 : m.totalObtained ?? 0}
                              />
                              <button
                                type="button"
                                onClick={() => toggleAb(m.studentId)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '6px 12px',
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-display)',
                                  borderRadius: 'var(--radius-sm)',
                                  border: `1.5px solid ${m.ab ? 'var(--danger)' : '#8e9bb0'}`,
                                  background: m.ab ? 'var(--danger)' : '#FFFFFF',
                                  color: m.ab ? '#FFFFFF' : 'var(--ink-soft)',
                                  cursor: 'pointer',
                                }}
                              >
                                AB
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="number"
                              className="mark-input"
                              placeholder={`0-${maxPerSub}`}
                              style={{
                                width: 92,
                                textAlign: 'center',
                                padding: '6px 8px',
                                border: '1.5px solid #8e9bb0',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 13,
                                background: m.ab ? '#F1F5F9' : '#FFFFFF',
                              }}
                              min={0}
                              max={maxPerSub}
                              value={m.ab ? '' : m.single}
                              disabled={m.ab}
                              onChange={(e) => updateRowField(m.studentId, 'single', e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => toggleAb(m.studentId)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px 12px',
                                fontSize: 11.5,
                                fontWeight: 700,
                                fontFamily: 'var(--font-display)',
                                borderRadius: 'var(--radius-sm)',
                                border: `1.5px solid ${m.ab ? 'var(--danger)' : '#8e9bb0'}`,
                                background: m.ab ? 'var(--danger)' : '#FFFFFF',
                                color: m.ab ? '#FFFFFF' : 'var(--ink-soft)',
                                cursor: 'pointer',
                              }}
                            >
                              AB
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
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

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line-soft)' }}>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Submitting Marks...' : 'Submit Marks'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
