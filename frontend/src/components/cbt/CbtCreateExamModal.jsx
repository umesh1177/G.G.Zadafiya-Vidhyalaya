import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  FileText,
  Clock,
  Calendar,
  CheckCircle,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { createCbtExam, updateCbtExam } from '../../services/cbtService';

export default function CbtCreateExamModal({ examToEdit, onClose, onExamSaved }) {
  const isEditing = Boolean(examToEdit);

  const [formData, setFormData] = useState({
    title: examToEdit?.title || '',
    examType: examToEdit?.examType || 'GUJCET',
    standard: examToEdit?.standard || 'STD_11',
    division: examToEdit?.division || 'ALL',
    streamGroup: examToEdit?.streamGroup || 'GROUP_A',
    durationMinutes: examToEdit?.durationMinutes || 60,
    totalMarks: examToEdit?.totalMarks || 100,
    marksPerQuestion: examToEdit?.marksPerQuestion || 4,
    negativeMarks: examToEdit?.negativeMarks !== undefined ? examToEdit?.negativeMarks : 1,
    scheduleTime: examToEdit?.scheduleTime
      ? new Date(examToEdit.scheduleTime).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    startTime: examToEdit?.startTime
      ? new Date(examToEdit.startTime).toISOString().slice(0, 16)
      : new Date(Date.now() + 10 * 60000).toISOString().slice(0, 16),
    windowEndTime: examToEdit?.windowEndTime
      ? new Date(examToEdit.windowEndTime).toISOString().slice(0, 16)
      : new Date(Date.now() + 7 * 24 * 3600000).toISOString().slice(0, 16),
    questionsText: '',
  });

  const [questions, setQuestions] = useState(examToEdit?.questions || []);
  const [activeTab, setActiveTab] = useState('paper'); // 'paper' or 'details'
  const [submitting, setSubmitting] = useState(false);
  const [rawText, setRawText] = useState('');

  // Auto-generate title if blank when type changes
  const handleExamTypeChange = (type) => {
    let stream = formData.streamGroup;
    if (type === 'JEE') stream = 'GROUP_A';
    if (type === 'NEET') stream = 'GROUP_B';

    setFormData((prev) => ({
      ...prev,
      examType: type,
      streamGroup: stream,
      title: prev.title ? prev.title : `#1 ${type} Mock Test - ${prev.standard.replace('_', ' ')}`,
      marksPerQuestion: type === 'GUJCET' ? 1 : 4,
      negativeMarks: type === 'GUJCET' ? 0.25 : 1,
    }));
  };

  const handleParseRawText = () => {
    if (!rawText.trim()) {
      alert('Please paste question paper text first.');
      return;
    }

    // Basic client parsing or send to backend parser
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed = [];
    let currentQ = null;
    let optMap = {};

    function pushCurrent() {
      if (currentQ && currentQ.questionText) {
        parsed.push({
          id: `q_${parsed.length + 1}`,
          subject: formData.examType === 'NEET' ? 'Biology' : 'Physics',
          questionNo: parsed.length + 1,
          marks: Number(formData.marksPerQuestion) || 4,
          negativeMarks: Number(formData.negativeMarks) || 1,
          questionText: currentQ.questionText,
          options: [
            optMap['A'] || 'Option A',
            optMap['B'] || 'Option B',
            optMap['C'] || 'Option C',
            optMap['D'] || 'Option D',
          ],
          correctAnswer: currentQ.correctAnswer || 'A',
          explanation: '',
        });
      }
      currentQ = null;
      optMap = {};
    }

    for (let line of lines) {
      const qMatch = line.match(/^(?:Q(?:uestion)?\s*(\d+)[\.\:]|(\d+)[\.\)])\s*(.*)$/i);
      if (qMatch) {
        pushCurrent();
        currentQ = {
          questionText: qMatch[3] || line,
          correctAnswer: 'A',
        };
        continue;
      }

      const optMatch = line.match(/^(?:\(?([A-Da-d])[\.\)]|\b([A-Da-d])[\.\)])\s*(.*)$/);
      if (optMatch && currentQ) {
        const k = (optMatch[1] || optMatch[2]).toUpperCase();
        optMap[k] = optMatch[3] || '';
        continue;
      }

      const ansMatch = line.match(/^(?:Ans(?:wer)?|Key|Correct)\s*[\:\-]?\s*\(?([A-Da-d])\)?/i);
      if (ansMatch && currentQ) {
        currentQ.correctAnswer = ansMatch[1].toUpperCase();
        continue;
      }

      if (currentQ) {
        currentQ.questionText += ' ' + line;
      }
    }
    pushCurrent();

    if (parsed.length > 0) {
      setQuestions(parsed);
      alert(`Extracted ${parsed.length} questions successfully!`);
    } else {
      alert('Could not detect standard Q1., A., B. formatting. You can add questions manually or use sample paper.');
    }
  };

  const handleLoadSamplePaper = () => {
    // Generates sample questions appropriate for exam type
    const subj = formData.streamGroup === 'GROUP_B' ? 'Biology' : 'Mathematics';
    const sampleSet = [
      {
        id: 'q1',
        subject: 'Physics',
        questionNo: 1,
        marks: Number(formData.marksPerQuestion),
        negativeMarks: Number(formData.negativeMarks),
        questionText: 'A particle moves along a straight line with x = 3t^3 - 6t^2 + 2t + 5. What is the acceleration when velocity is zero?',
        questionTextGujarati: 'સુરેખ પથ પર x = 3t^3 - 6t^2 + 2t + 5 મુજબ ગતિ કરતા કણ માટે વેગ શૂન્ય હોય ત્યારે પ્રવેગ કેટલો?',
        options: ['2 m/s^2', '4 m/s^2', '8 m/s^2', '12 m/s^2'],
        correctAnswer: 'C',
      },
      {
        id: 'q2',
        subject: 'Physics',
        questionNo: 2,
        marks: Number(formData.marksPerQuestion),
        negativeMarks: Number(formData.negativeMarks),
        questionText: 'A projectile is fired at an angle of 45° with an initial velocity of 20 m/s. The maximum height reached is (g = 10 m/s²):',
        questionTextGujarati: 'સમક્ષિતિજ સાથે 45° ના ખૂણે 20 m/s ના વેગથી પ્રક્ષિપ્ત પદાર્થની મહત્તમ ઊંચાઈ કેટલી? (g = 10 m/s²)',
        options: ['10 m', '20 m', '5 m', '15 m'],
        correctAnswer: 'A',
      },
      {
        id: 'q3',
        subject: 'Chemistry',
        questionNo: 3,
        marks: Number(formData.marksPerQuestion),
        negativeMarks: Number(formData.negativeMarks),
        questionText: 'Which orbital quantum number set is NOT possible for an electron in an atom?',
        questionTextGujarati: 'પરમાણુમાં ઇલેક્ટ્રોન માટે નીચેનામાંથી કયો ક્વોન્ટમ આંકનો સમૂહ શક્ય નથી?',
        options: [
          'n = 3, l = 2, m = -2, s = +1/2',
          'n = 4, l = 0, m = 0, s = -1/2',
          'n = 3, l = 3, m = 0, s = +1/2',
          'n = 2, l = 1, m = +1, s = -1/2',
        ],
        correctAnswer: 'C',
      },
      {
        id: 'q4',
        subject: 'Chemistry',
        questionNo: 4,
        marks: Number(formData.marksPerQuestion),
        negativeMarks: Number(formData.negativeMarks),
        questionText: 'The geometry and hybridization of XeF4 molecule according to VSEPR theory is:',
        questionTextGujarati: 'VSEPR સિદ્ધાંત મુજબ XeF4 અણુનો ભૌમિતિક આકાર અને સંકરણ શું છે?',
        options: ['Square Planar, sp3d2', 'Tetrahedral, sp3', 'Octahedral, sp3d2', 'See-saw, sp3d'],
        correctAnswer: 'A',
      },
      {
        id: 'q5',
        subject: subj,
        questionNo: 5,
        marks: Number(formData.marksPerQuestion),
        negativeMarks: Number(formData.negativeMarks),
        questionText: formData.streamGroup === 'GROUP_B'
          ? 'Which cell organelle is known as the "Powerhouse of the cell" due to ATP synthesis?'
          : 'The value of the limit lim(x -> 0) [sin(5x) / tan(2x)] is equal to:',
        questionTextGujarati: formData.streamGroup === 'GROUP_B'
          ? 'ATP સંશ્લેષણને કારણે કઈ અંગિકા "કોષનું શક્તિઘર" તરીકે ઓળખાય છે?'
          : 'લિમિટ lim(x -> 0) [sin(5x) / tan(2x)] નું મૂલ્ય કેટલું?',
        options: formData.streamGroup === 'GROUP_B'
          ? ['Golgi Apparatus', 'Mitochondria', 'Endoplasmic Reticulum', 'Ribosome']
          : ['2/5', '5/2', '1', '0'],
        correctAnswer: 'B',
      },
    ];

    setQuestions(sampleSet);
  };

  const handleAddEmptyQuestion = () => {
    const qNum = questions.length + 1;
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}`,
        subject: formData.examType === 'NEET' ? 'Biology' : 'Physics',
        questionNo: qNum,
        marks: Number(formData.marksPerQuestion) || 4,
        negativeMarks: Number(formData.negativeMarks) || 1,
        questionText: `Question ${qNum} text here...`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'A',
      },
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please provide an exam title.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        questions,
      };

      let res;
      if (isEditing) {
        res = await updateCbtExam(examToEdit._id, payload);
      } else {
        res = await createCbtExam(payload);
      }

      if (res.success) {
        alert(isEditing ? 'Exam updated successfully!' : 'CBT Exam scheduled successfully!');
        if (onExamSaved) onExamSaved();
        onClose();
      } else {
        alert(res.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving exam:', err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cbt-modal-overlay">
      <div className="cbt-create-modal-container">
        {/* Header */}
        <div className="cbt-modal-header">
          <div className="cbt-header-left">
            <h2 className="cbt-modal-title">
              {isEditing ? 'Edit CBT Exam & Schedule' : 'Create & Schedule New CBT Exam'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Configure Computer Based Test for JEE, NEET, or GUJCET with full anti-cheating controls
            </p>
          </div>
          <button className="cbt-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="cbt-nav-tabs">
          <button
            type="button"
            className={`cbt-nav-tab ${activeTab === 'paper' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('paper')}
          >
            <BookOpen size={16} />
            Question Paper & MCQs ({questions.length})
          </button>
          <button
            type="button"
            className={`cbt-nav-tab ${activeTab === 'details' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <Clock size={16} />
            Timings & Anti-Cheating Settings
          </button>
        </div>

        <form onSubmit={handleSubmit} className="cbt-modal-body p-6">
          {activeTab === 'paper' && (
            <div className="space-y-5">
              {/* Exam Classification */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="cbt-form-label">Exam Type</label>
                  <select
                    className="cbt-form-select"
                    value={formData.examType}
                    onChange={(e) => handleExamTypeChange(e.target.value)}
                  >
                    <option value="GUJCET">GUJCET</option>
                    <option value="JEE">JEE (Main)</option>
                    <option value="NEET">NEET</option>
                  </select>
                </div>

                <div>
                  <label className="cbt-form-label">Target Standard</label>
                  <select
                    className="cbt-form-select"
                    value={formData.standard}
                    onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                  >
                    <option value="STD_11">Standard 11</option>
                    <option value="STD_12">Standard 12</option>
                    <option value="ALL">All Standards</option>
                  </select>
                </div>

                <div>
                  <label className="cbt-form-label">Division</label>
                  <select
                    className="cbt-form-select"
                    value={formData.division}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                  >
                    <option value="ALL">All Divisions (A & B)</option>
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                  </select>
                </div>

                <div>
                  <label className="cbt-form-label">Stream / Subject Group</label>
                  <select
                    className="cbt-form-select"
                    value={formData.streamGroup}
                    onChange={(e) => setFormData({ ...formData, streamGroup: e.target.value })}
                  >
                    <option value="GROUP_A">Group A (PCM - Physics, Chemistry, Maths)</option>
                    <option value="GROUP_B">Group B (PCB - Physics, Chemistry, Biology)</option>
                    <option value="ALL">Both Groups (PCM & PCB)</option>
                  </select>
                </div>
              </div>

              {/* Title & Basic Specs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="cbt-form-label">Exam Title</label>
                  <input
                    type="text"
                    className="cbt-form-input"
                    placeholder="e.g. #30 Mock Technical Aptitude (GUJCET)"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="cbt-form-label">Duration (Minutes)</label>
                  <input
                    type="number"
                    className="cbt-form-input"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    min="10"
                    max="360"
                  />
                </div>
              </div>

              {/* MCQ Extraction & Ready Papers Bar */}
              <div className="cbt-extractor-card bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-500" size={18} />
                    <span className="font-semibold text-slate-800 text-sm">
                      Question Paper Extraction & Templates
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="cbt-btn-pill-amber flex items-center gap-1.5"
                      onClick={handleLoadSamplePaper}
                    >
                      <Sparkles size={14} />
                      Load Standard Mock Paper
                    </button>
                    <button
                      type="button"
                      className="cbt-btn-pill-blue flex items-center gap-1.5"
                      onClick={handleAddEmptyQuestion}
                    >
                      <Plus size={14} />
                      Add Question
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 mb-2">
                  Paste raw text from question paper / PDF with questions and options (e.g. 1. Question... A. Opt1 B. Opt2... Ans: B):
                </div>

                <div className="flex gap-2">
                  <textarea
                    rows={3}
                    className="cbt-form-textarea text-xs font-mono"
                    placeholder="Paste question paper text here to automatically extract MCQs..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="cbt-btn-primary px-4 self-center text-xs whitespace-nowrap"
                    onClick={handleParseRawText}
                  >
                    Extract MCQs
                  </button>
                </div>
              </div>

              {/* Questions List Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">
                    Questions in Exam ({questions.length})
                  </span>
                  <span className="text-xs text-gray-500">
                    Marks per Question: +{formData.marksPerQuestion} | Negative: -{formData.negativeMarks}
                  </span>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                    No questions added yet. Click <strong>"Load Standard Mock Paper"</strong> above or paste questions!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {questions.map((q, idx) => (
                      <div key={q.id || idx} className="cbt-q-item-card border border-slate-200 rounded-lg p-3 bg-white">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="cbt-qno-pill">Q{idx + 1}</span>
                            <span className="cbt-subject-tag text-xs">{q.subject}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Correct Answer:</span>
                            <select
                              className="cbt-form-select text-xs py-1 px-2 font-bold text-emerald-700 bg-emerald-50 border-emerald-300"
                              value={q.correctAnswer || 'A'}
                              onChange={(e) => {
                                const copy = [...questions];
                                copy[idx].correctAnswer = e.target.value;
                                setQuestions(copy);
                              }}
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                            <button
                              type="button"
                              className="text-red-500 hover:text-red-700 p-1"
                              onClick={() => handleRemoveQuestion(idx)}
                              title="Delete Question"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs font-medium text-slate-800 mb-2">{q.questionText}</p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {q.options?.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-1.5 rounded border ${
                                ['A', 'B', 'C', 'D'][oIdx] === q.correctAnswer
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="font-bold mr-1.5">{['A', 'B', 'C', 'D'][oIdx]}.</span>
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Three Timings Specified by User */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 text-sm mb-1 flex items-center gap-1.5">
                  <Calendar size={16} />
                  Exam Timing & Visibility Lifecycle
                </h4>
                <p className="text-xs text-blue-700 mb-3">
                  Set when the exam card becomes visible to students, the countdown timer to start, and when the window closes.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="cbt-form-label">
                      1. Schedule Time (Card Visibility)
                    </label>
                    <input
                      type="datetime-local"
                      className="cbt-form-input text-xs"
                      value={formData.scheduleTime}
                      onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                      required
                    />
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Card becomes visible on student dashboard.
                    </span>
                  </div>

                  <div>
                    <label className="cbt-form-label">
                      2. Exam Start Counter (Target Time)
                    </label>
                    <input
                      type="datetime-local"
                      className="cbt-form-input text-xs"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Live countdown counts down to this time.
                    </span>
                  </div>

                  <div>
                    <label className="cbt-form-label">
                      3. Exam Window End Time
                    </label>
                    <input
                      type="datetime-local"
                      className="cbt-form-input text-xs"
                      value={formData.windowEndTime}
                      onChange={(e) => setFormData({ ...formData, windowEndTime: e.target.value })}
                      required
                    />
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Exam card disappears / closes after this time.
                    </span>
                  </div>
                </div>
              </div>

              {/* Marking Scheme */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="cbt-form-label">Total Marks</label>
                  <input
                    type="number"
                    className="cbt-form-input"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="cbt-form-label">Marks Per Question (+)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="cbt-form-input"
                    value={formData.marksPerQuestion}
                    onChange={(e) => setFormData({ ...formData, marksPerQuestion: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="cbt-form-label">Negative Marks (-)</label>
                  <input
                    type="number"
                    step="0.25"
                    className="cbt-form-input"
                    value={formData.negativeMarks}
                    onChange={(e) => setFormData({ ...formData, negativeMarks: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Anti-Cheating & Kiosk Rules Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 text-sm mb-1 flex items-center gap-1.5">
                  <CheckCircle size={16} />
                  Kiosk Mode & Anti-Cheating Protection (Enabled by Default)
                </h4>
                <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside mt-2">
                  <li>Fullscreen kiosk enforcement (exiting fullscreen is blocked & logged).</li>
                  <li>Alt+Tab, tab switching, and window minimize detection with 3-strike auto-disqualification.</li>
                  <li>Right-click, Ctrl+C, Ctrl+V, and F12 developer tools blocked.</li>
                  <li>Unique randomized question sequence per student seat.</li>
                  <li>Assistant faculty can re-admit / grant retry to disqualified students in real time.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="cbt-modal-footer mt-6 pt-4 border-t flex justify-end gap-3">
            <button type="button" className="cbt-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="cbt-btn-primary" disabled={submitting}>
              {submitting ? 'Saving Exam...' : isEditing ? 'Save Changes' : 'Schedule & Publish CBT Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

