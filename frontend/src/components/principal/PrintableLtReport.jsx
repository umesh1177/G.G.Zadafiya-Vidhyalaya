import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function triggerLtReportPrint(reportData, reportType, onSaved) {
  if (!reportData) return;
  document.body.classList.add('printing-lt-report');
  setTimeout(() => {
    window.print();
    if (onSaved) onSaved();
  }, 100);
}

export default function PrintableLtReport({ report, reportType = 'WEEKLY', onClose }) {
  useEffect(() => {
    if (!report) return undefined;

    const cleanup = () => {
      document.body.classList.remove('printing-lt-report');
      if (onClose) onClose();
    };

    window.addEventListener('afterprint', cleanup);
    const safetyTimer = setTimeout(() => {
      document.body.classList.remove('printing-lt-report');
    }, 30000);

    return () => {
      window.removeEventListener('afterprint', cleanup);
      clearTimeout(safetyTimer);
      document.body.classList.remove('printing-lt-report');
    };
  }, [report, onClose]);

  if (!report) return null;

  const isWeekly = reportType === 'WEEKLY';
  const isMonthly = reportType === 'MONTHLY';
  const isStudent = reportType === 'STUDENT';

  return createPortal(
    <div id="printable-lt-report" className="print-report-sheet">
      {/* ── HEADER ── */}
      <div className="print-report-header">
        <div>
          <div className="print-report-school">G.G. ZADAFIYA VIDHYALAYA</div>
          <div className="print-report-doc-title">
            {isWeekly && 'Weekly Lecture Test (LT) Evaluation & Performance Report'}
            {isMonthly && 'Monthly Academic Performance & LT Evaluation Report'}
            {isStudent && 'Student Academic Progress & LT Evaluation Dossier'}
          </div>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
            Std 11 &amp; 12 • Science Stream (GSEB / JEE / NEET)
          </div>
        </div>
        <div className="print-report-meta-right">
          <div>
            <strong>
              {isWeekly && (report.weekInfo?.label || 'Weekly Assessment')}
              {isMonthly && (report.monthLabel || 'Monthly Assessment')}
              {isStudent && `${report.student?.fullName || 'Student'} · Roll #${report.student?.rollNo || '—'}`}
            </strong>
          </div>
          <div>Date: {fmtDate(new Date())}</div>
          <div style={{ fontSize: '10.5px', color: '#64748B' }}>Authorized School Record</div>
        </div>
      </div>

      {/* ── METADATA & EXECUTIVE SUMMARY ── */}
      <table className="print-meta-table">
        <tbody>
          <tr>
            <th>Academic Scope</th>
            <td>
              {isWeekly && `${report.weekInfo?.label || 'Week'} · ${report.filters?.subject || 'All Subjects'}`}
              {isMonthly && `${report.monthLabel || 'Month'} · ${report.filters?.subject || 'All Subjects'}`}
              {isStudent && `${report.student?.standard || 'STD_11'} · Div ${report.student?.division || 'A'}`}
            </td>
            <th>Assessment Unit</th>
            <td>Daily Lecture Tests (LTs) — Rubric Graded</td>
          </tr>
          <tr>
            <th>Overall Performance</th>
            <td>
              <strong style={{ fontSize: '13px', color: '#123B5D' }}>
                {isStudent
                  ? report.kpis?.studentWeeklyGrade || 'Better'
                  : report.kpis?.overallClassAverage || report.monthAverage || 'Better'}
              </strong>
            </td>
            <th>Performance Trend</th>
            <td>
              <strong>
                {isStudent
                  ? report.kpis?.growthDownfallText || 'Consistent'
                  : report.kpis?.growthDownfallText || report.growthDownfallText || 'Consistent with prior benchmark'}
              </strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── WEEKLY REPORT CONTENT ── */}
      {isWeekly && (
        <>
          <div className="print-section-title">1. Subject Performance Breakdown</div>
          <table className="print-data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Class Overall Average</th>
                <th>Mon</th>
                <th>Tue</th>
                <th>Wed</th>
                <th>Thu</th>
                <th>Fri</th>
                <th>Sat</th>
                <th>Trend vs Prior Week</th>
              </tr>
            </thead>
            <tbody>
              {['Physics', 'Chemistry', 'Mathematics', 'Biology'].map((subj) => {
                const sData = report.subjectGraphs?.[subj];
                const vText = report.subjectVarianceTextList?.find((v) => v.subject === subj);
                return (
                  <tr key={subj}>
                    <td><strong>{subj}</strong></td>
                    <td><strong>{sData?.overallGrade || 'Better'}</strong></td>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                      const dObj = sData?.days?.find((d) => d.day === day);
                      return <td key={day}>{dObj?.grade || '—'}</td>;
                    })}
                    <td>{vText?.text || 'Steady'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Weak LT Questions Table (ONLY: LT No, Subject, Questions List, Class Avg) */}
          <div className="print-section-title" style={{ marginTop: '16px' }}>
            2. Weak LT Performance Questions (Attention Required)
          </div>
          {report.weakQuestions && report.weakQuestions.length > 0 ? (
            <table className="print-data-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>LT NO</th>
                  <th style={{ width: '18%' }}>SUBJECT</th>
                  <th style={{ width: '56%' }}>LT QUESTIONS LIST</th>
                  <th style={{ width: '14%' }}>CLASS AVG</th>
                </tr>
              </thead>
              <tbody>
                {report.weakQuestions.map((q, idx) => (
                  <tr key={idx}>
                    <td><strong>#{q.ltNo}</strong></td>
                    <td><strong>{q.subject}</strong></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {(q.questions || []).map((item, qIdx) => (
                          <div key={qIdx} style={{ fontSize: '11px', lineHeight: '1.4' }}>
                            <strong>Q{item.questionNo || qIdx + 1}.</strong> {item.questionText}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: q.classAvg === 'Good' ? '#DC2626' : '#D97706' }}>
                        {q.classAvg}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '8px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
              ✓ No weak LT performance questions found for the selected filters.
            </div>
          )}

          {/* Top & Low Performers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px' }}>
            <div>
              <div className="print-section-title">3A. Top Performing Students (Consistent Excellent)</div>
              <table className="print-data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Roll</th>
                    <th>Student Name</th>
                    <th>Overall Grade</th>
                    <th>Grades Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.topPerformers || []).slice(0, 6).map((tp) => (
                    <tr key={tp.rollNo}>
                      <td>#{tp.rank}</td>
                      <td>{tp.rollNo}</td>
                      <td><strong>{tp.studentName}</strong></td>
                      <td><span style={{ color: '#059669', fontWeight: 800 }}>{tp.overallGrade}</span></td>
                      <td style={{ fontSize: '10.5px' }}>{tp.excellentCount} Exc, {tp.betterCount} Bet</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="print-section-title">3B. Students Requiring Academic Support</div>
              <table className="print-data-table">
                <thead>
                  <tr>
                    <th>Roll</th>
                    <th>Student Name</th>
                    <th>Overall Grade</th>
                    <th>Grades Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.poorPerformers || []).slice(0, 6).map((pp) => (
                    <tr key={pp.rollNo}>
                      <td>{pp.rollNo}</td>
                      <td><strong>{pp.studentName}</strong></td>
                      <td><span style={{ color: '#DC2626', fontWeight: 800 }}>{pp.overallGrade}</span></td>
                      <td style={{ fontSize: '10.5px' }}>{pp.goodCount} Good, {pp.betterCount} Bet</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── MONTHLY REPORT CONTENT ── */}
      {isMonthly && (
        <>
          <div className="print-section-title">1. Monthly Evaluation Ledger (Week-by-Week)</div>
          <table className="print-data-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Tests Conducted</th>
                <th>Overall Class Average</th>
                <th>Physics</th>
                <th>Chemistry</th>
                <th>Mathematics</th>
                <th>Biology</th>
              </tr>
            </thead>
            <tbody>
              {(report.weekSummaries || []).map((ws) => (
                <tr key={ws.weekNo}>
                  <td><strong>Week #{ws.weekNo}</strong></td>
                  <td>{ws.ltsConducted} LTs</td>
                  <td><strong>{ws.overallAverage}</strong></td>
                  <td>{ws.subjectAverages?.Physics}</td>
                  <td>{ws.subjectAverages?.Chemistry}</td>
                  <td>{ws.subjectAverages?.Mathematics}</td>
                  <td>{ws.subjectAverages?.Biology}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="print-section-title" style={{ marginTop: '16px' }}>
            2. Weak LT Performance Questions Across Month
          </div>
          {report.weakQuestions && report.weakQuestions.length > 0 ? (
            <table className="print-data-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>LT NO</th>
                  <th style={{ width: '18%' }}>SUBJECT</th>
                  <th style={{ width: '56%' }}>LT QUESTIONS LIST</th>
                  <th style={{ width: '14%' }}>CLASS AVG</th>
                </tr>
              </thead>
              <tbody>
                {report.weakQuestions.slice(0, 6).map((q, idx) => (
                  <tr key={idx}>
                    <td><strong>#{q.ltNo}</strong></td>
                    <td><strong>{q.subject}</strong></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {(q.questions || []).map((item, qIdx) => (
                          <div key={qIdx} style={{ fontSize: '11px', lineHeight: '1.4' }}>
                            <strong>Q{item.questionNo || qIdx + 1}.</strong> {item.questionText}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: q.classAvg === 'Good' ? '#DC2626' : '#D97706' }}>
                        {q.classAvg}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '8px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
              ✓ No weak LT performance questions found for this month.
            </div>
          )}
        </>
      )}

      {/* ── STUDENT PERFORMANCE DOSSIER ── */}
      {isStudent && (
        <>
          <div className="print-section-title">1. Student Profile &amp; Performance Summary</div>
          <table className="print-meta-table">
            <tbody>
              <tr>
                <th>Student Full Name</th>
                <td><strong>{report.student?.fullName}</strong></td>
                <th>Roll Number</th>
                <td>{report.student?.rollNo}</td>
              </tr>
              <tr>
                <th>Standard &amp; Division</th>
                <td>{report.student?.standard} • Division {report.student?.division}</td>
                <th>Stream Group</th>
                <td>{report.student?.streamGroup}</td>
              </tr>
              <tr>
                <th>Evaluated Weekly Grade</th>
                <td><strong style={{ fontSize: '13px', color: '#123B5D' }}>{report.kpis?.studentWeeklyGrade}</strong></td>
                <th>Tests Attended</th>
                <td>{report.kpis?.testsAttended} / {report.kpis?.totalTestsScheduled} tests</td>
              </tr>
            </tbody>
          </table>

          <div className="print-section-title" style={{ marginTop: '16px' }}>
            2. Daily Lecture Test (LT) Evaluation Record
          </div>
          <table className="print-data-table">
            <thead>
              <tr>
                <th>Date &amp; Day</th>
                <th>Subject</th>
                <th>LT #</th>
                <th>Topic Assessed</th>
                <th>Student Grade</th>
                <th>Class Benchmark</th>
                <th>Evaluation Status</th>
              </tr>
            </thead>
            <tbody>
              {(report.dailyResults || []).map((r, idx) => (
                <tr key={idx}>
                  <td>{fmtDate(r.date)} ({r.dayName.substring(0, 3)})</td>
                  <td><strong>{r.subject}</strong></td>
                  <td>#{r.ltNo}</td>
                  <td>{r.topic}</td>
                  <td>
                    <strong style={{ color: r.studentGrade === 'Excellent' ? '#059669' : r.studentGrade === 'Good' ? '#DC2626' : '#D97706' }}>
                      {r.studentGrade}
                    </strong>
                  </td>
                  <td>{r.classAverageGrade}</td>
                  <td>
                    {r.statusVsClass === 'ABOVE_CLASS_AVERAGE'
                      ? '▲ Above Class Average'
                      : r.statusVsClass === 'BELOW_CLASS_AVERAGE'
                      ? '▼ Below Class Average'
                      : 'At Class Average'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="print-section-title" style={{ marginTop: '16px' }}>
            3. Subject-Wise Mastery Summary
          </div>
          <table className="print-data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Student Grade</th>
                <th>Class Average Grade</th>
                <th>Performance Status</th>
              </tr>
            </thead>
            <tbody>
              {(report.subjectBreakdown || []).map((sb) => (
                <tr key={sb.subject}>
                  <td><strong>{sb.subject}</strong></td>
                  <td><strong>{sb.studentGrade}</strong></td>
                  <td>{sb.classGrade}</td>
                  <td>
                    {sb.studentGrade === 'Excellent'
                      ? '✓ Mastered'
                      : sb.studentGrade === 'Good'
                      ? '⚠️ Remedial Practice Needed'
                      : 'Consistent Understanding'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── OFFICIAL SIGNATURES ── */}
      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1.5px solid #CBD5E1' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: '32px' }}></div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Subject Faculty Signature</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: '32px' }}></div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Assistant Faculty (Evaluator)</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: '32px' }}></div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#123B5D' }}>Principal / Academic Director</div>
          <div style={{ fontSize: '10px', color: '#64748B' }}>G.G. Zadafiya Vidhyalaya</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
