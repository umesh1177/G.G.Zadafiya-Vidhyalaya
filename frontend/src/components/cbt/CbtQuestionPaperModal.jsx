import React, { useState } from 'react';
import {
  X,
  FileText,
  CheckCircle,
  HelpCircle,
  Award,
  Clock,
  Printer,
  Search,
  BookOpen,
} from 'lucide-react';

export default function CbtQuestionPaperModal({ exam, onClose }) {
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!exam) return null;

  const questions = exam.questions || [];
  const subjects = Array.from(new Set(questions.map((q) => q.subject)));

  const filteredQuestions = questions.filter((q) => {
    if (selectedSubject !== 'ALL' && q.subject !== selectedSubject) return false;
    if (searchQuery.trim()) {
      const qText = `${q.questionText || ''} ${q.questionTextGujarati || ''} ${(q.options || []).join(' ')}`.toLowerCase();
      if (!qText.includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="cbt-modal-overlay">
      <div className="cbt-question-paper-modal-container" style={{ maxWidth: 980 }}>
        {/* Header */}
        <div className="cbt-modal-header bg-slate-900 text-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{exam.title}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/30 text-blue-300 font-mono">
                  {exam.examCode}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Extracted Question Paper with Options & Correct Answer Keys • {exam.examType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="cbt-btn-secondary text-xs flex items-center gap-1.5 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
              onClick={handlePrint}
              title="Print Question Paper"
            >
              <Printer size={14} />
              <span>Print Paper</span>
            </button>
            <button className="cbt-close-btn text-white hover:text-red-400" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Paper Meta Banner */}
        <div className="bg-blue-50/80 border-b border-blue-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-blue-950">
              {exam.standard?.replace('_', ' ')} • Division {exam.division}
            </span>
            <span className="text-blue-400">•</span>
            <span className="text-blue-800 font-medium">
              Stream: <strong>{exam.streamGroup}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-blue-900 font-medium">
            <span className="flex items-center gap-1">
              <Clock size={13} /> {exam.durationMinutes} Minutes
            </span>
            <span className="flex items-center gap-1">
              <HelpCircle size={13} /> {questions.length} Total MCQs
            </span>
            <span className="flex items-center gap-1 font-bold text-blue-700">
              <Award size={13} /> {exam.totalMarks} Marks (+{exam.marksPerQuestion || 4} / -{exam.negativeMarks || 1})
            </span>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3">
          {/* Subject Pills */}
          <div className="flex items-center gap-1.5">
            <button
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedSubject === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setSelectedSubject('ALL')}
            >
              All Subjects ({questions.length})
            </button>
            {subjects.map((sub) => {
              const count = questions.filter((q) => q.subject === sub).length;
              return (
                <button
                  key={sub}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    selectedSubject === sub
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  onClick={() => setSelectedSubject(sub)}
                >
                  {sub} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-56"
              placeholder="Search question text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Questions Body */}
        <div className="cbt-modal-body p-6 space-y-4 max-h-[65vh] overflow-y-auto bg-slate-50/50">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No questions found matching your filter criteria.
            </div>
          ) : (
            filteredQuestions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-300 transition-colors"
              >
                {/* Top Question Bar */}
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-extrabold flex items-center justify-center text-xs">
                      Q{q.questionNo || idx + 1}
                    </span>
                    <span className="cbt-subject-tag text-xs font-semibold">{q.subject}</span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      +{q.marks || exam.marksPerQuestion || 4} Marks / -{q.negativeMarks || exam.negativeMarks || 1} Neg
                    </span>
                  </div>

                  {/* Correct Answer Highlight Pill */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-300 text-emerald-800">
                    <CheckCircle size={13} className="text-emerald-600" />
                    <span>Correct Answer: Option {q.correctAnswer}</span>
                  </span>
                </div>

                {/* Question Statement */}
                <p className="text-xs md:text-sm font-semibold text-slate-900 mb-3 leading-relaxed">
                  {q.questionText}
                </p>

                {q.questionTextGujarati && (
                  <p className="text-xs text-slate-700 mb-3 font-gujarati bg-slate-50 p-2 rounded">
                    {q.questionTextGujarati}
                  </p>
                )}

                {/* Options 2x2 Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {q.options?.map((opt, oIdx) => {
                    const optKey = ['A', 'B', 'C', 'D'][oIdx];
                    const isCorrect = optKey === (q.correctAnswer || '').toUpperCase();
                    const cleanOpt = typeof opt === 'string'
                      ? opt.replace(/^(?:\(?([A-Da-dઅબકડ])[\.\)\:\-]|\b([A-Da-dઅબકડ])[\.\)])\s*/, '').trim()
                      : String(opt || '');

                    return (
                      <div
                        key={optKey}
                        className={`p-2.5 rounded-lg border flex items-start gap-2 transition-all ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-200'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {optKey}
                        </span>
                        <span className="flex-1 mt-0.5">{cleanOpt}</span>
                        {isCorrect && (
                          <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100/80 px-1.5 py-0.5 rounded">
                            Key
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="cbt-modal-footer px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-xl">
          <div className="text-xs text-slate-500">
            Showing <strong>{filteredQuestions.length}</strong> of {questions.length} questions
          </div>
          <button className="cbt-btn-primary text-xs py-1.5 px-4" onClick={onClose}>
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
}

