import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ltApi } from '../../services/ltApi';
import { studentApi } from '../../services/studentApi';
import PaginationBar from '../../components/common/PaginationBar';
import { triggerBrowserExcelDownload } from '../../utils/excelDownloadHelper';

export default function LtEnterMarks() {
  const { id } = useParams();
  const { setHeader } = useOutletContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ltDetail, setLtDetail] = useState(null);
  const [marksState, setMarksState] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const normalizeGrade = (g) => {
    const up = String(g || '').trim().toUpperCase();
    if (up === 'EXCELLENT') return 'Excellent';
    if (up === 'BETTER') return 'Better';
    if (up === 'GOOD' || up === 'POOR') return 'Good';
    if (up === 'AB' || up === 'ABSENT') return 'AB';
    return 'Better';
  };

  useEffect(() => {
    let isMounted = true;
    async function loadLtAndStudents() {
      setIsLoading(true);
      try {
        const [lt, students, existingMarks] = await Promise.all([
          ltApi.getLtById(id),
          studentApi.getStudents({ status: 'ACTIVE' }).catch(() => []),
          ltApi.getLtMarks(id).catch(() => []),
        ]);

        if (!isMounted) return;
        setLtDetail(lt);

        const targetStd = lt.standard === 'STD_11' || lt.standard === 'Standard 11' ? 'STD_11' : 'STD_12';
        const filteredStudents = (students || []).filter(s => {
          if (s.status !== 'ACTIVE') return false;
          if (s.standard && s.standard !== targetStd) return false;
          if (lt.division && lt.division !== 'ALL' && s.division && s.division !== lt.division) return false;
          return true;
        });

        const existingMap = new Map();
        (existingMarks || []).forEach(m => {
          const sid = m.studentId?._id || m.studentId;
          if (sid) existingMap.set(String(sid), m.grade);
          if (m.rollNo) existingMap.set(`roll-${m.rollNo}`, m.grade);
        });

        const list = filteredStudents.map(s => {
          const sid = s.id || s._id;
          const prevRaw = existingMap.get(String(sid)) || existingMap.get(`roll-${s.rollNo}`);
          const prevGrade = prevRaw ? normalizeGrade(prevRaw) : 'Better';
          return {
            studentId: sid,
            rollNo: s.rollNo,
            name: s.fullName || s.name,
            standard: s.standard || targetStd,
            division: s.division || '',
            mark: prevGrade,
          };
        });

        setMarksState(list);
      } catch (err) {
        console.error('Failed to load LT details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadLtAndStudents();
    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    if (ltDetail) {
      setHeader({
        title: `Grade LT #${ltDetail.ltNo} Marks`,
        subtitle: `Subject: ${ltDetail.subject} • ${ltDetail.standard === 'STD_11' ? 'Standard 11' : 'Standard 12'}`
      });
    } else {
      setHeader({
        title: 'Grade LT Marks',
        subtitle: 'Loading Lecture Test parameters...'
      });
    }
  }, [setHeader, ltDetail]);

  const handleGradeChange = (studentId, grade) => {
    setMarksState(prev => prev.map(s => s.studentId === studentId ? { ...s, mark: grade } : s));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const savedRes = await ltApi.saveLtMarks(
        id,
        marksState.map(s => ({
          studentId: s.studentId,
          rollNo: s.rollNo,
          studentName: s.name,
          mark: s.mark,
        })),
        user?.id || user?._id,
        user?.name || user?.fullName || 'Assistant Faculty'
      );

      // Trigger automatic browser download of Excel
      if (savedRes?.excelDownload) {
        triggerBrowserExcelDownload(savedRes.excelDownload);
      }

      navigate(`/assistant/lt/history/${id}`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save LT marks');
    } finally {
      setIsSaving(false);
    }
  };

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

  const safePage = Math.min(currentPage, Math.max(1, Math.ceil(marksState.length / PAGE_SIZE)));
  const paginatedMarks = marksState.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link to="/assistant/lt" className="btn btn-ghost btn-sm">
          ← Back to LT Overview
        </Link>
      </div>

      {errorMsg && (
        <div className="banner banner-danger" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span>⚠️ {errorMsg}</span>
          <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => setErrorMsg(null)}>✕</button>
        </div>
      )}

      {isLoading ? (
        <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--slate)' }}>
          Loading Lecture Test &amp; Student roster...
        </div>
      ) : !ltDetail ? (
        <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--danger)' }}>
          Lecture Test not found.
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontSize: 18, margin: 0, color: '#123B5D' }}>
                  LT #{ltDetail.ltNo} — {ltDetail.subject} ({ltDetail.standard === 'STD_11' ? 'Standard 11' : 'Standard 12'})
                </h2>
                <div style={{ color: 'var(--slate)', fontSize: 13, marginTop: 4 }}>
                  Rate student responses: <strong>Excellent</strong> (Mastered), <strong>Better</strong> (Competent), <strong>Good</strong> (Remedial), <strong>AB</strong> (Absent)
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                Date: <strong>{ltDetail.examDate ? new Date(ltDetail.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</strong>
              </div>
            </div>

            {ltDetail.questions && ltDetail.questions.length > 0 && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: '#F6F7FB', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#123B5D', marginBottom: 6 }}>
                  Questions in this Lecture Test:
                </div>
                {ltDetail.questions.map((q, idx) => (
                  <div key={idx} style={{ fontSize: 13, color: '#1C2340', marginBottom: 4 }}>
                    <strong style={{ color: '#123B5D' }}>Question {q.questionNo || idx + 1}:</strong> {q.questionText}
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSave}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap" style={{ margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 90 }}>ROLL NO</th>
                      <th>NAME</th>
                      <th style={{ width: 140 }}>STANDARD</th>
                      <th>MARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksState.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>
                          No active students found matching {ltDetail.standard === 'STD_11' ? 'Standard 11' : 'Standard 12'}.
                        </td>
                      </tr>
                    ) : (
                      paginatedMarks.map((s) => (
                        <tr key={s.studentId}>
                          <td className="num" style={{ fontWeight: 700 }}>{s.rollNo}</td>
                          <td><strong>{s.name}</strong></td>
                          <td>
                            <span className="chip chip-neutral">
                              {s.standard === 'STD_11' ? 'Standard 11' : 'Standard 12'}
                              {s.division ? ` - ${s.division}` : ''}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {['Excellent', 'Better', 'Good', 'AB'].map((grade) => (
                                <button
                                  key={grade}
                                  type="button"
                                  style={getGradePillStyle(grade, s.mark === grade)}
                                  onClick={() => handleGradeChange(s.studentId, grade)}
                                >
                                  {grade}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationBar
                currentPage={safePage}
                totalItems={marksState.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                itemLabel="students"
              />

              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#FAFBFD', flexWrap: 'wrap' }}>
                <Link to="/assistant/lt" className="btn btn-ghost">Cancel</Link>
                <button type="submit" className="btn btn-primary" disabled={isSaving || marksState.length === 0}>
                  {isSaving ? 'Saving...' : 'Save All Student Marks'}
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </>
  );
}
