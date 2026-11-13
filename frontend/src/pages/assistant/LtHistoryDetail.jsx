import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { ltApi } from '../../services/ltApi';
import PaginationBar from '../../components/common/PaginationBar';

export default function LtHistoryDetail() {
  const { id } = useParams();
  const { setHeader } = useOutletContext();

  const [detail, setDetail] = useState(null);
  const [studentMarks, setStudentMarks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [lt, marks] = await Promise.all([
        ltApi.getLtById(id),
        ltApi.getLtMarks(id).catch(() => []),
      ]);
      setDetail(lt);
      const formattedMarks = (marks || []).map(m => ({
        rollNo: m.studentId?.rollNo || m.rollNo || '—',
        name: m.studentId?.fullName || m.studentId?.name || m.studentName || 'Student',
        standard: m.studentId?.standard || lt?.standard || 'STD_12',
        division: m.studentId?.division || '',
        mark: m.grade || 'Better',
      }));
      setStudentMarks(formattedMarks);
    } catch (err) {
      console.error('Failed to load LT history detail:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [id]);

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

  useEffect(() => {
    if (detail) {
      setHeader({
        title: `LT #${detail.ltNo} Marksheet Records`,
        subtitle: `${detail.subject} • ${detail.standard === 'STD_11' ? 'Standard 11' : 'Standard 12'}`
      });
    }
  }, [setHeader, detail]);

  const getChipClass = (mark) => {
    const up = String(mark || '').toUpperCase();
    if (up === 'EXCELLENT') return 'chip-success';
    if (up === 'BETTER') return 'chip-neutral';
    if (up === 'AB' || up === 'ABSENT') return 'chip-danger';
    return 'chip-warning';
  };

  const getRemarkText = (mark) => {
    const up = String(mark || '').toUpperCase();
    if (up === 'EXCELLENT') return 'Concept mastered';
    if (up === 'BETTER') return 'Competent performance';
    if (up === 'AB' || up === 'ABSENT') return 'Absent for lecture test';
    return 'Needs numerical practice';
  };

  const safePage = Math.min(currentPage, Math.max(1, Math.ceil(studentMarks.length / PAGE_SIZE)));
  const paginatedMarks = studentMarks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link to="/assistant/lt" className="btn btn-ghost btn-sm">
          ← Back to LT Overview
        </Link>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--slate)' }}>
          Loading Lecture Test Marksheet...
        </div>
      ) : !detail ? (
        <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--danger)' }}>
          Lecture Test not found.
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, margin: 0, color: '#123B5D' }}>
                  LT #{detail.ltNo} — {detail.subject} ({detail.standard === 'STD_11' ? 'Standard 11' : 'Standard 12'})
                </h2>
                <div style={{ color: 'var(--slate)', fontSize: 13, marginTop: 4 }}>
                  Date: <strong>{detail.examDate ? new Date(detail.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</strong> • Status: <strong>{detail.status}</strong>
                </div>
              </div>
              <div>
                <Link to={`/assistant/lt/enter-marks/${detail.id || detail._id}`} className="btn btn-primary btn-sm">
                  Edit Student Grades
                </Link>
              </div>
            </div>

            {detail.questions && detail.questions.length > 0 && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: '#F6F7FB', borderRadius: 10, border: '1px solid #E4E7F2' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#123B5D', marginBottom: 6 }}>
                  Questions Covered in this Lecture Test:
                </div>
                {detail.questions.map((q, idx) => (
                  <div key={idx} style={{ fontSize: 13, color: '#1C2340', marginBottom: 4 }}>
                    <strong style={{ color: '#123B5D' }}>Question {q.questionNo || idx + 1}:</strong> {q.questionText}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card__head" style={{ padding: '16px 20px', marginBottom: 0, borderBottom: '1px solid var(--line-soft)' }}>
              <div className="card__title">Evaluated Student Candidate Marksheet ({studentMarks.length})</div>
            </div>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Candidate Name</th>
                    <th>Standard</th>
                    <th>Performance Grade</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {studentMarks.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>
                        No marks submitted yet. Click <strong>Edit Student Grades</strong> to evaluate students.
                      </td>
                    </tr>
                  ) : (
                    paginatedMarks.map((s, idx) => (
                      <tr key={`${s.rollNo}-${idx}`}>
                        <td className="num" style={{ fontWeight: 700 }}>{s.rollNo}</td>
                        <td><strong>{s.name}</strong></td>
                        <td>
                          <span className="chip chip-neutral">
                            {s.standard === 'STD_11' ? 'Standard 11' : 'Standard 12'}
                            {s.division ? ` - ${s.division}` : ''}
                          </span>
                        </td>
                        <td>
                          <span className={`chip ${getChipClass(s.mark)}`}>
                            {s.mark}
                          </span>
                        </td>
                        <td>{getRemarkText(s.mark)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={safePage}
              totalItems={studentMarks.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="student marks"
            />
          </div>
        </>
      )}
    </>
  );
}
