import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  Clock,
  ArrowLeft,
  Search,
  Users,
  ShieldAlert,
  AlertTriangle,
  Eye,
  Filter,
  Check,
} from 'lucide-react';
import { fetchCbtExamResponses } from '../../services/cbtService';

export default function CbtStudentResponsesModal({ exam, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examData, setExamData] = useState(exam);
  const [attempts, setAttempts] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Filters for student list
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filters for detailed question responses
  const [detailSubjectFilter, setDetailSubjectFilter] = useState('ALL');
  const [detailResultFilter, setDetailResultFilter] = useState('ALL');

  useEffect(() => {
    if (!exam?._id) return;
    loadResponses();
  }, [exam?._id]);

  const loadResponses = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchCbtExamResponses(exam._id);
      if (data.success) {
        if (data.exam) setExamData(data.exam);
        setAttempts(data.attempts || []);
      } else {
        setError(data.message || 'Failed to load exam responses.');
      }
    } catch (err) {
      console.error('Error fetching student responses:', err);
      setError('Network error while fetching student responses.');
    } finally {
      setLoading(false);
    }
  };

  if (!exam) return null;

  const questions = examData?.questions || [];
  const subjects = Array.from(new Set(questions.map((q) => q.subject).filter(Boolean)));

  // Filter students
  const filteredAttempts = attempts.filter((att) => {
    if (statusFilter !== 'ALL' && att.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRoll = String(att.studentRollNo || '').includes(q);
      const matchName = String(att.studentName || '').toLowerCase().includes(q);
      const matchEmail = String(att.studentEmail || '').toLowerCase().includes(q);
      if (!matchRoll && !matchName && !matchEmail) return false;
    }
    return true;
  });

  // Calculate quick stats
  const totalAttended = attempts.length;
  const submittedCount = attempts.filter((a) => a.status === 'SUBMITTED').length;
  const disqualifiedCount = attempts.filter((a) => a.status === 'DISQUALIFIED').length;
  const inProgressCount = attempts.filter((a) => a.status === 'IN_PROGRESS').length;
  const avgScore =
    totalAttended > 0
      ? Math.round(
          (attempts.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / totalAttended) * 10
        ) / 10
      : 0;

  // Render Student Detailed Responses View
  const renderStudentDetail = (att) => {
    const studentAnsMap = {};
    (att.answers || []).forEach((a) => {
      if (a && a.questionId) {
        studentAnsMap[String(a.questionId)] = a;
      }
    });

    const defaultPos = examData.marksPerQuestion || (examData.examType === 'GUJCET' ? 1 : 4);
    const defaultNeg = examData.negativeMarks !== undefined ? examData.negativeMarks : (examData.examType === 'GUJCET' ? 0.25 : 1);

    const questionsWithResult = questions.map((q, idx) => {
      const qId = String(q.id || `q_${idx + 1}`);
      const ansObj =
        studentAnsMap[qId] ||
        studentAnsMap[`q_${idx + 1}`] ||
        studentAnsMap[String(idx + 1)] ||
        studentAnsMap[String(q.questionNo)];

      const selected = ansObj?.selectedOption ? String(ansObj.selectedOption).trim().toUpperCase() : null;
      const correct = String(q.correctAnswer || '').trim().toUpperCase();
      const timeSpent = ansObj?.timeSpentSeconds || 0;

      const qPos = q.marks !== undefined && q.marks !== null ? Number(q.marks) : defaultPos;
      const qNeg = q.negativeMarks !== undefined && q.negativeMarks !== null ? Number(q.negativeMarks) : defaultNeg;

      let resultStatus = 'SKIPPED';
      let marksAwarded = 0;

      if (selected) {
        if (selected === correct) {
          resultStatus = 'CORRECT';
          marksAwarded = qPos;
        } else {
          resultStatus = 'WRONG';
          marksAwarded = -qNeg;
        }
      }

      return {
        ...q,
        displayNo: idx + 1,
        selected,
        correct,
        resultStatus,
        marksAwarded,
        timeSpent,
        qPos,
        qNeg,
      };
    });

    const filteredDetailQuestions = questionsWithResult.filter((q) => {
      if (detailSubjectFilter !== 'ALL' && q.subject !== detailSubjectFilter) return false;
      if (detailResultFilter === 'CORRECT' && q.resultStatus !== 'CORRECT') return false;
      if (detailResultFilter === 'WRONG' && q.resultStatus !== 'WRONG') return false;
      if (detailResultFilter === 'SKIPPED' && q.resultStatus !== 'SKIPPED') return false;
      return true;
    });

    return (
      <div className="space-y-4">
        {/* Back and Student Info Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedStudent(null)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft size={16} />
              <span>Back to Students</span>
            </button>
            <div className="border-l border-slate-700 pl-3">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-white">
                  Roll #{att.studentRollNo}: {att.studentName}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    att.status === 'SUBMITTED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : att.status === 'DISQUALIFIED'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {att.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {att.studentEmail || `student${att.studentRollNo}@ggzv.edu.in`} • Standard {att.standard?.replace('STD_', '') || '11'} • Div {att.division || 'A'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Score</div>
              <div className="text-lg font-black text-emerald-400">
                {att.score ?? 0} <span className="text-xs font-normal text-slate-400">/ {att.totalMarks || examData.totalMarks}</span>
              </div>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Percentage</div>
              <div className="text-lg font-black text-blue-400">
                {att.percentage ?? 0}%
              </div>
            </div>
            {att.rank ? (
              <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Rank</div>
                <div className="text-lg font-black text-purple-400">#{att.rank}</div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Disqualification Banner if Disqualified */}
        {att.status === 'DISQUALIFIED' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
            <ShieldAlert size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900">
              <span className="font-bold">Student Disqualified: </span>
              {att.disqualificationReason || 'Exceeded 3 anti-cheating kiosk violations.'}
              <div className="mt-1 text-slate-600">
                Total Violations Logged: <strong>{att.violationsCount || 3}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
            <div className="text-xs font-semibold text-emerald-800">Correct Answers</div>
            <div className="text-lg font-black text-emerald-700 mt-0.5">{att.correctCount ?? 0}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-center">
            <div className="text-xs font-semibold text-red-800">Wrong Answers</div>
            <div className="text-lg font-black text-red-700 mt-0.5">{att.wrongCount ?? 0}</div>
          </div>
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-center">
            <div className="text-xs font-semibold text-slate-700">Unanswered / Skipped</div>
            <div className="text-lg font-black text-slate-600 mt-0.5">{att.unansweredCount ?? 0}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
            <div className="text-xs font-semibold text-blue-800">Total Questions</div>
            <div className="text-lg font-black text-blue-700 mt-0.5">{questions.length}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-center col-span-2 md:col-span-1">
            <div className="text-xs font-semibold text-purple-800">Time Taken</div>
            <div className="text-sm font-bold text-purple-700 mt-1">
              {Math.floor((att.timeSpentSeconds || 0) / 60)}m {(att.timeSpentSeconds || 0) % 60}s
            </div>
          </div>
        </div>

        {/* Detail Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Filter By Subject:</span>
            <select
              className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
              value={detailSubjectFilter}
              onChange={(e) => setDetailSubjectFilter(e.target.value)}
            >
              <option value="ALL">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Status:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  detailResultFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setDetailResultFilter('ALL')}
              >
                All ({questionsWithResult.length})
              </button>
              <button
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  detailResultFilter === 'CORRECT' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
                onClick={() => setDetailResultFilter('CORRECT')}
              >
                Correct ({questionsWithResult.filter((q) => q.resultStatus === 'CORRECT').length})
              </button>
              <button
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  detailResultFilter === 'WRONG' ? 'bg-red-600 text-white' : 'text-red-700 hover:bg-red-50'
                }`}
                onClick={() => setDetailResultFilter('WRONG')}
              >
                Wrong ({questionsWithResult.filter((q) => q.resultStatus === 'WRONG').length})
              </button>
              <button
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  detailResultFilter === 'SKIPPED' ? 'bg-slate-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setDetailResultFilter('SKIPPED')}
              >
                Skipped ({questionsWithResult.filter((q) => q.resultStatus === 'SKIPPED').length})
              </button>
            </div>
          </div>
        </div>

        {/* Question Cards List */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {filteredDetailQuestions.map((q) => {
            return (
              <div
                key={q.id || q.displayNo}
                className={`rounded-xl border p-4 transition-all ${
                  q.resultStatus === 'CORRECT'
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : q.resultStatus === 'WRONG'
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Question Top Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      Q{q.displayNo}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {q.subject}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      (+{q.qPos} / -{q.qNeg})
                    </span>
                  </div>

                  {/* Result Badge */}
                  <div className="flex items-center gap-2">
                    {q.resultStatus === 'CORRECT' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        Correct (+{q.qPos} Marks)
                      </span>
                    ) : q.resultStatus === 'WRONG' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-300">
                        <XCircle size={13} className="text-red-600" />
                        Wrong (-{q.qNeg} Marks)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                        <HelpCircle size={13} className="text-slate-400" />
                        Not Attempted (0 Marks)
                      </span>
                    )}

                    {q.timeSpent > 0 && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {q.timeSpent}s
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <p className="text-sm font-medium text-slate-800 mb-2 leading-relaxed whitespace-pre-wrap">
                  {q.questionText}
                </p>
                {q.questionTextGujarati && (
                  <p className="text-xs font-medium text-slate-600 mb-3 leading-relaxed whitespace-pre-wrap bg-slate-50 p-2 rounded border border-slate-200">
                    {q.questionTextGujarati}
                  </p>
                )}

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                  {(q.options || []).map((opt, optIdx) => {
                    const optKey = ['A', 'B', 'C', 'D'][optIdx];
                    const isSelected = q.selected === optKey;
                    const isCorrect = q.correct === optKey;

                    let cardClass = 'border-slate-200 bg-white text-slate-700';
                    let badge = null;

                    if (isCorrect) {
                      cardClass = 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-semibold ring-1 ring-emerald-500';
                      badge = (
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-1">
                          <Check size={11} /> Correct Key
                        </span>
                      );
                    }

                    if (isSelected && !isCorrect) {
                      cardClass = 'border-red-500 bg-red-50/80 text-red-950 font-semibold ring-1 ring-red-500';
                      badge = (
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white flex items-center gap-1">
                          <X size={11} /> Student Choice
                        </span>
                      );
                    } else if (isSelected && isCorrect) {
                      badge = (
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-700 text-white flex items-center gap-1">
                          <Check size={11} /> Student Choice (Correct)
                        </span>
                      );
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs leading-normal transition-all ${cardClass}`}
                      >
                        <span className="font-bold shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-slate-200 text-slate-800 text-[11px]">
                          {optKey}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {badge}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="cbt-modal-overlay">
      <div className="cbt-question-paper-modal-container" style={{ maxWidth: 1040, maxHeight: '92vh' }}>
        {/* Header */}
        <div className="cbt-modal-header bg-slate-900 text-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{examData.title || exam.title}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/30 text-blue-300 font-mono">
                  {examData.examCode || exam.examCode}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    examData.examType === 'JEE'
                      ? 'bg-blue-600 text-white'
                      : examData.examType === 'NEET'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {examData.examType}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Student Attendance & Detailed Submitted Response Sheets • {totalAttended} Students Attended
              </p>
            </div>
          </div>

          <button className="cbt-close-btn text-white hover:text-red-400" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 80px)' }}>
          {loading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="cbt-spinner mx-auto mb-3"></div>
              Loading student responses...
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
              <AlertTriangle size={32} className="mx-auto mb-2 text-red-500" />
              <p className="font-bold">{error}</p>
              <button
                onClick={loadResponses}
                className="mt-3 px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
              >
                Try Again
              </button>
            </div>
          ) : selectedStudent ? (
            renderStudentDetail(selectedStudent)
          ) : (
            <div className="space-y-5">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="text-xs font-semibold text-blue-700">Total Attended</div>
                  <div className="text-2xl font-black text-blue-950 mt-1">{totalAttended}</div>
                  <div className="text-[11px] text-blue-600 mt-0.5">Exam Takers</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-xs font-semibold text-emerald-700">Submitted</div>
                  <div className="text-2xl font-black text-emerald-950 mt-1">{submittedCount}</div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">Completed test</div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="text-xs font-semibold text-red-700">Disqualified</div>
                  <div className="text-2xl font-black text-red-950 mt-1">{disqualifiedCount}</div>
                  <div className="text-[11px] text-red-600 mt-0.5">Rule violations</div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="text-xs font-semibold text-amber-700">In Progress</div>
                  <div className="text-2xl font-black text-amber-950 mt-1">{inProgressCount}</div>
                  <div className="text-[11px] text-amber-600 mt-0.5">Currently active</div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 col-span-2 md:col-span-1">
                  <div className="text-xs font-semibold text-indigo-700">Class Average</div>
                  <div className="text-2xl font-black text-indigo-950 mt-1">{avgScore}</div>
                  <div className="text-[11px] text-indigo-600 mt-0.5">Average marks</div>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Search size={15} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Roll No or Student Name..."
                    className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 w-full md:w-64 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Status:</span>
                  <select
                    className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Status ({attempts.length})</option>
                    <option value="SUBMITTED">Submitted ({submittedCount})</option>
                    <option value="DISQUALIFIED">Disqualified ({disqualifiedCount})</option>
                    <option value="IN_PROGRESS">In Progress ({inProgressCount})</option>
                  </select>
                </div>
              </div>

              {/* Students Table */}
              {filteredAttempts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Users size={36} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-sm">No student attempts found.</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {searchQuery ? 'Try clearing your search query.' : 'Students will appear here once they start the exam.'}
                  </p>
                </div>
              ) : (
                <div className="cbt-table-responsive border border-slate-200 rounded-xl overflow-hidden">
                  <table className="cbt-data-table">
                    <thead>
                      <tr>
                        <th>Roll No</th>
                        <th>Student Name & Details</th>
                        <th>Status</th>
                        <th>Violations</th>
                        <th>Score & Accuracy</th>
                        <th>Performance</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttempts.map((att) => (
                        <tr key={att._id || att.studentRollNo}>
                          <td>
                            <span className="font-extrabold text-blue-900 bg-blue-50 px-2.5 py-1 rounded text-xs">
                              #{att.studentRollNo}
                            </span>
                          </td>
                          <td>
                            <div className="font-bold text-slate-900 text-sm">{att.studentName}</div>
                            <div className="text-xs text-slate-400">
                              {att.studentEmail || `student${att.studentRollNo}@ggzv.edu.in`}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`cbt-status-pill ${
                                att.status === 'SUBMITTED'
                                  ? 'cbt-status-submitted'
                                  : att.status === 'DISQUALIFIED'
                                  ? 'cbt-status-disqualified'
                                  : 'cbt-status-started'
                              }`}
                            >
                              {att.status}
                            </span>
                          </td>
                          <td>
                            {att.violationsCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                <ShieldAlert size={12} />
                                {att.violationsCount} Warnings
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">0 Violations</span>
                            )}
                          </td>
                          <td>
                            <div className="font-extrabold text-slate-900 text-sm">
                              {att.score ?? 0}{' '}
                              <span className="text-xs font-normal text-slate-500">
                                / {att.totalMarks || examData.totalMarks || 100}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-semibold">
                              {att.percentage ?? 0}%
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                ✓ {att.correctCount ?? 0}
                              </span>
                              <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                                ✗ {att.wrongCount ?? 0}
                              </span>
                              <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                - {att.unansweredCount ?? 0}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center justify-end">
                              <button
                                className="cbt-action-btn cbt-action-btn--paper"
                                title="Show detailed question-by-question responses"
                                onClick={() => setSelectedStudent(att)}
                              >
                                <Eye size={14} />
                                <span>Show Response</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
