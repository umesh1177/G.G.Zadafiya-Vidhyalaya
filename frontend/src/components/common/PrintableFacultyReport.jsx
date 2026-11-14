import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtStd(std) {
  if (!std) return 'Standard 12';
  const s = String(std).toUpperCase();
  if (s.includes('11')) return 'Standard 11';
  if (s.includes('12')) return 'Standard 12';
  return std;
}

export function triggerFacultyReportPrint(report, setPrintReport) {
  if (!report) return;
  setPrintReport(report);
  document.body.classList.add('printing-faculty-report');
  setTimeout(() => {
    window.print();
  }, 80);
}

export default function PrintableFacultyReport({ report, onClose }) {
  useEffect(() => {
    if (!report) return undefined;

    const cleanup = () => {
      document.body.classList.remove('printing-faculty-report');
      if (onClose) onClose();
    };

    window.addEventListener('afterprint', cleanup);
    const safetyTimer = setTimeout(() => {
      document.body.classList.remove('printing-faculty-report');
    }, 30000);

    return () => {
      window.removeEventListener('afterprint', cleanup);
      clearTimeout(safetyTimer);
      document.body.classList.remove('printing-faculty-report');
    };
  }, [report, onClose]);

  if (!report) return null;

  const isExam = report.reportType === 'EXAM' || Boolean(report.examId) || Boolean(report.examNo);
  const isWeak = report.alertStatus === 'WEAK_TOPIC_UNDERSTANDING';
  const questions = Array.isArray(report.questions) ? report.questions : [];
  const topics = Array.isArray(report.topicsCovered) ? report.topicsCovered : [];
  const counts = report.counts || {};
  const divLabel = report.division && report.division !== 'ALL' ? `Div ${report.division}` : 'All Divisions';

  const trendText =
    report.growthRate !== null && report.growthRate !== undefined
      ? `+${Number(report.growthRate).toFixed(1)}% Growth`
      : report.downfallRate !== null && report.downfallRate !== undefined
        ? `-${Number(report.downfallRate).toFixed(1)}% Downfall`
        : 'First Exam Baseline';

  return createPortal(
    <div id="printable-faculty-report" className="print-report-sheet">
      <div className="print-report-header">
        <div>
          <div className="print-report-school">G.G. ZADAFIYA VIDHYALAYA</div>
          <div className="print-report-doc-title">
            {isExam
              ? 'Examination Diagnostic & Faculty Handover Report'
              : 'Lecture Test (LT) Diagnostic & Faculty Handover Report'}
          </div>
        </div>
        <div className="print-report-meta-right">
          <div>
            <strong>
              {isExam
                ? `Exam #${report.examNo || '—'} · ${report.examType || 'EXAM'}`
                : `LT #${report.ltNo || '—'}`}
            </strong>
          </div>
          <div>Generated: {fmtDate(report.createdAt || new Date())}</div>
        </div>
      </div>

      <table className="print-meta-table">
        <tbody>
          <tr>
            <th>Subject</th>
            <td>{report.targetSubject || report.subject || '—'}</td>
            <th>Standard / Division</th>
            <td>{fmtStd(report.standard)} · {divLabel}</td>
          </tr>
          <tr>
            <th>Subject Faculty</th>
            <td>{report.facultyName || `${report.subject || ''} Faculty`}</td>
            <th>{isExam ? 'Exam Date' : 'LT Taken Date'}</th>
            <td>{fmtDate(isExam ? (report.examDate || report.ltDate) : report.ltDate)}</td>
          </tr>
          <tr>
            <th>Marks Entry Date</th>
            <td>{fmtDate(report.markEntryDate)}</td>
            <th>Marks Entered By</th>
            <td>{report.marksEnteredByName || 'Assistant Faculty'}</td>
          </tr>
          {isExam && (
            <tr>
              <th>Exam Stream / Type</th>
              <td>{report.examType || 'BOARD'}</td>
              <th>Units Covered</th>
              <td>{report.unitSummary || '—'}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={`print-alert-box ${isWeak ? 'is-weak' : 'is-good'}`}>
        <div className="print-alert-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isWeak ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{report.alertTitle || (isWeak ? 'Attention / Revision Alert' : 'Good Class Understanding Alert')}</span>
        </div>
        {report.alertMessage && <div className="print-alert-msg">{report.alertMessage}</div>}
      </div>

      {isExam ? (
        <div className="print-kpi-row">
          <div className="print-kpi-cell">
            <div className="print-kpi-label">Class Average</div>
            <div className="print-kpi-val">{report.classAveragePercent || 0}%</div>
            <div className="print-kpi-sub">
              {Number(report.averageMarks || 0)} / {report.totalMarks || 100} marks
            </div>
          </div>
          <div className="print-kpi-cell">
            <div className="print-kpi-label">Highest Marks</div>
            <div className="print-kpi-val">{report.highestMarks ?? 0}</div>
            <div className="print-kpi-sub">Out of {report.totalMarks || 100}</div>
          </div>
          <div className="print-kpi-cell">
            <div className="print-kpi-label">Lowest Marks</div>
            <div className="print-kpi-val">{report.lowestMarks ?? 0}</div>
            <div className="print-kpi-sub">Out of {report.totalMarks || 100}</div>
          </div>
          <div className="print-kpi-cell">
            <div className="print-kpi-label">
              {report.downfallRate !== null && report.downfallRate !== undefined ? 'Downfall Rate' : 'Growth Rate'}
            </div>
            <div className="print-kpi-val">{trendText}</div>
            <div className="print-kpi-sub">
              {report.previousExamNo ? `vs Exam #${report.previousExamNo} (${report.previousExamAveragePercent ?? '—'}%)` : 'Same type & subject'}
            </div>
          </div>
          <div className="print-kpi-cell">
            <div className="print-kpi-label">Pass / Fail</div>
            <div className="print-kpi-val">{report.passCount || 0} / {report.failCount || 0}</div>
            <div className="print-kpi-sub">{report.absentCount || 0} Absent</div>
          </div>
        </div>
      ) : (
        <div className="print-kpi-row">
          <div className="print-kpi-cell">
            <div className="print-kpi-label">Class Average</div>
            <div className="print-kpi-val">{report.classAverageLabel || report.overallAverage || '—'}</div>
            <div className="print-kpi-sub">
              {report.classAveragePercent || 0}% ({Number(report.classAverageScore || 0).toFixed(2)} / 3.00)
            </div>
          </div>
          <div className="print-kpi-cell">
            <div className="print-kpi-label">Excellent</div>
            <div className="print-kpi-val">{counts.excellent || 0}</div>
            <div className="print-kpi-sub">Students</div>
          </div>
          <div className="print-kpi-cell">
            <div className="print-kpi-label">Better</div>
            <div className="print-kpi-val">{counts.better || 0}</div>
            <div className="print-kpi-sub">Students</div>
          </div>
          <div className="print-kpi-cell">
            <div className="print-kpi-label">Good (Weak)</div>
            <div className="print-kpi-val">{counts.good || 0}</div>
            <div className="print-kpi-sub">Students</div>
          </div>
          <div className="print-kpi-cell">
            <div className="print-kpi-label">Absent / Total</div>
            <div className="print-kpi-val">{counts.ab || 0} / {counts.total || 0}</div>
            <div className="print-kpi-sub">Evaluated</div>
          </div>
        </div>
      )}

      {!isExam && topics.length > 0 && (
        <div className="print-section">
          <div className="print-section-title">Topics Covered in LT #{report.ltNo || ''}</div>
          <div className="print-topics-list">
            {topics.map((t, i) => (
              <span key={i} className="print-topic-pill">{t}</span>
            ))}
          </div>
        </div>
      )}

      {!isExam && (
        <div className="print-section">
          <div className="print-section-title">
            LT Questions ({questions.length})
          </div>
          {questions.length > 0 ? (
            <table className="print-questions-table">
              <thead>
                <tr>
                  <th style={{ width: '52px' }}>Q. No</th>
                  <th>Question</th>
                  <th style={{ width: '175px' }}>Topic Mapping</th>
                  <th style={{ width: '64px', textAlign: 'right' }}>Marks</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700 }}>Q{q.questionNo || idx + 1}</td>
                    <td>{q.questionText || '—'}</td>
                    <td style={{ fontSize: '10.5px', color: '#475569' }}>
                      {q.sourceTopicCode ? `[${q.sourceTopicCode}] ` : ''}
                      {q.sourceTopicTitle || 'General'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{q.marks || 2}M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="print-empty-box">
              No individual questions were attached to this LT record.
            </div>
          )}
        </div>
      )}

      <div className="print-section">
        <div className="print-section-title">Principal Guidance &amp; Message for Faculty</div>
        <div className="print-message-box">
          {report.principalMessage && report.principalMessage.trim()
            ? report.principalMessage
            : 'No additional written note from the Principal. Please review the performance summary above.'}
        </div>
      </div>

      <div className="print-signatures">
        <div className="print-sig-box">
          <div className="print-sig-line" />
          <div className="print-sig-label">Principal Signature &amp; School Seal</div>
          <div className="print-sig-sub">{report.sentByName || 'Principal'} · Date: {fmtDate(report.createdAt || new Date())}</div>
        </div>
        <div className="print-sig-box">
          <div className="print-sig-line" />
          <div className="print-sig-label">Subject Faculty Signature (Handover Receipt)</div>
          <div className="print-sig-sub">
            {report.facultyName || `${report.targetSubject || report.subject || ''} Faculty`} ·{' '}
            {report.acknowledgedByFaculty ? `Acknowledged ${fmtDate(report.acknowledgedAt)}` : 'Date: ____________'}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
