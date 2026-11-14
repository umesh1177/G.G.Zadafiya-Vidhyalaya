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
  UploadCloud,
  FileUp,
  AlertCircle,
  ShieldAlert,
  Award,
} from 'lucide-react';
import { createCbtExam, updateCbtExam, extractCbtPaper } from '../../services/cbtService';

export default function CbtCreateExamModal({ examToEdit, onClose, onExamSaved }) {
  const isEditing = Boolean(examToEdit);

  // Initial defaults matching examType
  const initialType = examToEdit?.examType || 'GUJCET';
  const defaultPos = initialType === 'GUJCET' ? 1 : 4;
  const defaultNeg = initialType === 'GUJCET' ? 0.25 : 1;

  const [formData, setFormData] = useState({
    title: examToEdit?.title || '',
    examType: initialType,
    standard: examToEdit?.standard || 'STD_11',
    division: examToEdit?.division || 'ALL',
    streamGroup: examToEdit?.streamGroup || (initialType === 'NEET' ? 'GROUP_B' : 'GROUP_A'),
    durationMinutes: examToEdit?.durationMinutes || 60,
    totalMarks: examToEdit?.totalMarks || 100,
    marksPerQuestion: examToEdit?.marksPerQuestion !== undefined ? examToEdit.marksPerQuestion : defaultPos,
    negativeMarks: examToEdit?.negativeMarks !== undefined ? examToEdit.negativeMarks : defaultNeg,
    scheduleTime: examToEdit?.scheduleTime
      ? new Date(examToEdit.scheduleTime).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    startTime: examToEdit?.startTime
      ? new Date(examToEdit.startTime).toISOString().slice(0, 16)
      : new Date(Date.now() + 15 * 60000).toISOString().slice(0, 16),
    windowEndTime: examToEdit?.windowEndTime
      ? new Date(examToEdit.windowEndTime).toISOString().slice(0, 16)
      : new Date(Date.now() + 7 * 24 * 3600000).toISOString().slice(0, 16),
    questionsText: '',
  });

  // 3 Subject Question Papers (PDFs)
  const getSubjectNames = (type, stream) => {
    if (type === 'NEET' || stream === 'GROUP_B') {
      return ['Physics', 'Chemistry', 'Biology'];
    }
    return ['Physics', 'Chemistry', 'Mathematics'];
  };

  const initialSubjects = getSubjectNames(formData.examType, formData.streamGroup);

  const [subjectMarksConfig, setSubjectMarksConfig] = useState(() => {
    if (examToEdit?.subjectMarksConfig && examToEdit.subjectMarksConfig.length > 0) {
      return examToEdit.subjectMarksConfig;
    }
    const defaultPerSub = initialType === 'GUJCET' ? 40 : 100;
    return initialSubjects.map((sub) => ({
      subject: sub,
      totalMarks: defaultPerSub,
    }));
  });

  const handleSubjectMarkChange = (index, totalMarksVal) => {
    const val = Number(totalMarksVal) || 0;
    const nextConfig = [...subjectMarksConfig];
    nextConfig[index] = {
      ...nextConfig[index],
      totalMarks: val,
    };
    setSubjectMarksConfig(nextConfig);

    const newTotal = nextConfig.reduce((sum, item) => sum + (Number(item.totalMarks) || 0), 0);
    setFormData((prev) => ({
      ...prev,
      totalMarks: newTotal,
    }));
  };

  const [subjectPapers, setSubjectPapers] = useState(() => {
    if (examToEdit?.subjectPapers && examToEdit.subjectPapers.length > 0) {
      return examToEdit.subjectPapers;
    }
    return initialSubjects.map((sub) => ({
      subject: sub,
      fileName: '',
      fileSize: 0,
      uploadedAt: null,
    }));
  });

  const [questions, setQuestions] = useState(examToEdit?.questions || []);
  const [activeTab, setActiveTab] = useState('setup'); // 'setup', 'papers', 'questions'
  const [submitting, setSubmitting] = useState(false);
  const [extractingMap, setExtractingMap] = useState({});
  const [rawText, setRawText] = useState('');

  // Handle Exam Type selection with dynamic marking (+4/-1 for JEE/NEET, +1/-0.25 for GUJCET)
  const handleExamTypeChange = (type) => {
    let stream = formData.streamGroup;
    let pos = 4;
    let neg = 1;

    if (type === 'JEE') {
      stream = 'GROUP_A';
      pos = 4;
      neg = 1;
    } else if (type === 'NEET') {
      stream = 'GROUP_B';
      pos = 4;
      neg = 1;
    } else if (type === 'GUJCET') {
      pos = 1;
      neg = 0.25;
    }

    const nextSubs = getSubjectNames(type, stream);
    const defaultPerSub = type === 'GUJCET' ? 40 : 100;
    const nextConfig = nextSubs.map((sub) => ({
      subject: sub,
      totalMarks: defaultPerSub,
    }));
    setSubjectMarksConfig(nextConfig);
    const newTotal = nextConfig.reduce((sum, item) => sum + item.totalMarks, 0);

    setFormData((prev) => ({
      ...prev,
      examType: type,
      streamGroup: stream,
      marksPerQuestion: pos,
      negativeMarks: neg,
      totalMarks: newTotal,
      title: prev.title ? prev.title : `#1 ${type} Mock Test - ${prev.standard.replace('_', ' ')}`,
    }));

    // Update subject papers subjects
    setSubjectPapers((prev) =>
      nextSubs.map((sub, i) => ({
        subject: sub,
        fileName: prev[i]?.fileName || '',
        fileSize: prev[i]?.fileSize || 0,
        uploadedAt: prev[i]?.uploadedAt || null,
      }))
    );
  };

  // Handle Stream change (Group A vs Group B)
  const handleStreamChange = (stream) => {
    const nextSubs = getSubjectNames(formData.examType, stream);
    setFormData((prev) => ({ ...prev, streamGroup: stream }));
    setSubjectPapers((prev) =>
      nextSubs.map((sub, i) => ({
        subject: sub,
        fileName: prev[i]?.fileName || '',
        fileSize: prev[i]?.fileSize || 0,
        uploadedAt: prev[i]?.uploadedAt || null,
      }))
    );
    setSubjectMarksConfig((prev) =>
      nextSubs.map((sub, i) => ({
        subject: sub,
        totalMarks: prev[i]?.totalMarks || (formData.examType === 'GUJCET' ? 40 : 100),
      }))
    );
  };

  // Real File selection & parsing for 3 Subject PDFs
  const handleFileSelect = async (index, subject, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const copy = [...subjectPapers];
    copy[index] = {
      subject,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    };
    setSubjectPapers(copy);

    setExtractingMap((prev) => ({ ...prev, [subject]: true }));

    try {
      const reader = new FileReader();
      const fileDataPromise = new Promise((resolve, reject) => {
        if (file.name.endsWith('.txt')) {
          reader.readAsText(file);
          reader.onload = () => resolve({ rawText: reader.result });
          reader.onerror = reject;
        } else {
          reader.readAsDataURL(file);
          reader.onload = () => resolve({ pdfBase64: reader.result });
          reader.onerror = reject;
        }
      });

      const { pdfBase64, rawText: fileRawText } = await fileDataPromise;

      const res = await extractCbtPaper({
        pdfBase64,
        rawText: fileRawText,
        subject,
        marks: Number(formData.marksPerQuestion),
        negativeMarks: Number(formData.negativeMarks),
      });

      if (res.success && res.questions && res.questions.length > 0) {
        // Replace previous questions of this subject with the newly extracted ones
        const otherQuestions = questions.filter((q) => q.subject !== subject);
        const combined = [...otherQuestions, ...res.questions].map((q, idx) => ({
          ...q,
          questionNo: idx + 1,
        }));

        setQuestions(combined);
        setFormData((prev) => ({
          ...prev,
          totalMarks: combined.length * Number(prev.marksPerQuestion),
        }));

        if (res.rawText) {
          setRawText((prev) => (prev ? prev + '\n\n' + res.rawText : res.rawText));
        }

        alert(res.message || `Extracted ${res.questions.length} MCQs for ${subject} successfully!`);
      } else {
        alert(`Could not extract questions from ${file.name}. You can paste question text directly or use the sample question bank.`);
      }
    } catch (err) {
      console.error('File extraction error:', err);
      alert(`Error extracting from ${file.name}: ${err.message}`);
    } finally {
      setExtractingMap((prev) => ({ ...prev, [subject]: false }));
    }
  };

  const handleRemoveSubjectPaper = (index, subject) => {
    const copy = [...subjectPapers];
    copy[index] = {
      subject,
      fileName: '',
      fileSize: 0,
      uploadedAt: null,
    };
    setSubjectPapers(copy);
  };

  // Text parser for raw MCQs
  const handleParseRawText = () => {
    if (!rawText.trim()) {
      alert('Please paste question paper text first.');
      return;
    }

    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed = [];
    let currentQ = null;
    let optMap = {};

    function pushCurrent() {
      if (currentQ && currentQ.questionText) {
        parsed.push({
          id: `q_${parsed.length + 1}_${Date.now()}`,
          subject: formData.examType === 'NEET' ? 'Biology' : 'Physics',
          questionNo: questions.length + parsed.length + 1,
          marks: Number(formData.marksPerQuestion) || (formData.examType === 'GUJCET' ? 1 : 4),
          negativeMarks: Number(formData.negativeMarks) || (formData.examType === 'GUJCET' ? 0.25 : 1),
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
      const updated = [...questions, ...parsed].map((q, idx) => ({ ...q, questionNo: idx + 1 }));
      setQuestions(updated);
      setFormData((prev) => ({
        ...prev,
        totalMarks: updated.length * Number(prev.marksPerQuestion),
      }));
      setRawText('');
      alert(`Extracted ${parsed.length} questions successfully! Total questions in exam: ${updated.length}`);
    } else {
      alert('Could not detect standard Q1., A., B. formatting. You can add questions manually or use standard sample paper.');
    }
  };

  // Load sample questions matching syllabus
  const handleLoadSamplePaper = () => {
    const thirdSub = formData.streamGroup === 'GROUP_B' ? 'Biology' : 'Mathematics';
    const pos = Number(formData.marksPerQuestion);
    const neg = Number(formData.negativeMarks);

    const sampleSet = [
      {
        id: `q_phy_1_${Date.now()}`,
        subject: 'Physics',
        questionNo: 1,
        marks: pos,
        negativeMarks: neg,
        questionText:
          'A particle moves along a straight line with x = 3t^3 - 6t^2 + 2t + 5. What is the acceleration when velocity is zero?',
        questionTextGujarati: 'સુરેખ પથ પર x = 3t^3 - 6t^2 + 2t + 5 મુજબ ગતિ કરતા કણ માટે વેગ શૂન્ય હોય ત્યારે પ્રવેગ કેટલો?',
        options: ['2 m/s²', '4 m/s²', '8 m/s²', '12 m/s²'],
        correctAnswer: 'C',
      },
      {
        id: `q_phy_2_${Date.now()}`,
        subject: 'Physics',
        questionNo: 2,
        marks: pos,
        negativeMarks: neg,
        questionText:
          'A projectile is fired at an angle of 45° with an initial velocity of 20 m/s. The maximum height reached is (g = 10 m/s²):',
        questionTextGujarati: 'સમક્ષિતિજ સાથે 45° ના ખૂણે 20 m/s ના વેગથી પ્રક્ષિપ્ત પદાર્થની મહત્તમ ઊંચાઈ કેટલી? (g = 10 m/s²)',
        options: ['10 m', '20 m', '5 m', '15 m'],
        correctAnswer: 'A',
      },
      {
        id: `q_chem_1_${Date.now()}`,
        subject: 'Chemistry',
        questionNo: 3,
        marks: pos,
        negativeMarks: neg,
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
        id: `q_chem_2_${Date.now()}`,
        subject: 'Chemistry',
        questionNo: 4,
        marks: pos,
        negativeMarks: neg,
        questionText: 'The geometry and hybridization of XeF4 molecule according to VSEPR theory is:',
        questionTextGujarati: 'VSEPR સિદ્ધાંત મુજબ XeF4 અણુનો ભૌમિતિક આકાર અને સંકરણ શું છે?',
        options: ['Square Planar, sp3d2', 'Tetrahedral, sp3', 'Octahedral, sp3d2', 'See-saw, sp3d'],
        correctAnswer: 'A',
      },
      {
        id: `q_third_1_${Date.now()}`,
        subject: thirdSub,
        questionNo: 5,
        marks: pos,
        negativeMarks: neg,
        questionText:
          formData.streamGroup === 'GROUP_B'
            ? 'Which cell organelle is known as the "Powerhouse of the cell" due to ATP synthesis?'
            : 'The value of the limit lim(x -> 0) [sin(5x) / tan(2x)] is equal to:',
        questionTextGujarati:
          formData.streamGroup === 'GROUP_B'
            ? 'ATP સંશ્લેષણને કારણે કઈ અંગિકા "કોષનું શક્તિઘર" તરીકે ઓળખાય છે?'
            : 'લિમિટ lim(x -> 0) [sin(5x) / tan(2x)] નું મૂલ્ય કેટલું?',
        options:
          formData.streamGroup === 'GROUP_B'
            ? ['Golgi Apparatus', 'Mitochondria', 'Endoplasmic Reticulum', 'Ribosome']
            : ['2/5', '5/2', '1', '0'],
        correctAnswer: 'B',
      },
    ];

    setQuestions(sampleSet);
    setFormData((prev) => ({
      ...prev,
      totalMarks: sampleSet.length * pos,
    }));
  };

  const handleAddEmptyQuestion = () => {
    const qNum = questions.length + 1;
    const thirdSub = formData.streamGroup === 'GROUP_B' ? 'Biology' : 'Mathematics';
    setQuestions([
      ...questions,
      {
        id: `q_custom_${Date.now()}`,
        subject: qNum % 3 === 1 ? 'Physics' : qNum % 3 === 2 ? 'Chemistry' : thirdSub,
        questionNo: qNum,
        marks: Number(formData.marksPerQuestion),
        negativeMarks: Number(formData.negativeMarks),
        questionText: `Enter question ${qNum} text here...`,
        options: ['Option A text', 'Option B text', 'Option C text', 'Option D text'],
        correctAnswer: 'A',
      },
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    const updated = questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, questionNo: i + 1 }));
    setQuestions(updated);
    setFormData((prev) => ({
      ...prev,
      totalMarks: updated.length * Number(prev.marksPerQuestion),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please enter an exam title.');
      return;
    }

    if (questions.length === 0) {
      alert('Please add or extract at least one question paper MCQ before creating the exam.');
      return;
    }

    // Validation for timings
    const sched = new Date(formData.scheduleTime);
    const start = new Date(formData.startTime);
    const end = new Date(formData.windowEndTime);

    if (sched >= end) {
      alert('Exam card display time must be before the window end time.');
      return;
    }
    if (start >= end) {
      alert('Exam entry/start time must be before the window end time.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        subjectMarksConfig,
        subjectPapers,
        questions,
      };

      let res;
      if (isEditing) {
        res = await updateCbtExam(examToEdit._id, payload);
      } else {
        res = await createCbtExam(payload);
      }

      if (res.success) {
        alert(isEditing ? 'Exam updated successfully!' : 'CBT Exam scheduled and published successfully!');
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
      <div className="cbt-create-modal-container" style={{ maxWidth: 960 }}>
        {/* Modal Header */}
        <div className="cbt-modal-header">
          <div className="cbt-header-left">
            <h2 className="cbt-modal-title">
              {isEditing ? 'Edit CBT Exam Configuration' : 'Create & Schedule New CBT Exam'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Configure JEE / NEET / GUJCET Computer-Based Test with 3 subject PDF papers, 3 lifecycle timings & anti-cheating kiosk mode
            </p>
          </div>
          <button className="cbt-close-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {/* Dynamic Marking Scheme Banner */}
        <div className="cbt-marking-banner">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-blue-600" />
            <span className="font-bold text-slate-800 text-sm">Marking Scheme:</span>
            <span className="cbt-marking-badge cbt-marking-badge-pos">
              +{formData.marksPerQuestion} Correct
            </span>
            <span className="cbt-marking-badge cbt-marking-badge-neg">
              -{formData.negativeMarks} Wrong
            </span>
            <span className="text-xs text-slate-500">
              ({formData.examType === 'GUJCET' ? 'GUJCET Standard: +1, -0.25' : `${formData.examType} Standard: +4, -1`})
            </span>
          </div>

          <div className="text-xs font-semibold text-slate-700">
            Total Marks: <strong className="text-blue-700">{formData.totalMarks}</strong> ({questions.length} Questions)
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="cbt-nav-tabs">
          <button
            type="button"
            className={`cbt-nav-tab ${activeTab === 'setup' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('setup')}
          >
            <Calendar size={15} />
            1. Exam Details & 3 Timing Windows
          </button>
          <button
            type="button"
            className={`cbt-nav-tab ${activeTab === 'papers' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('papers')}
          >
            <UploadCloud size={15} />
            2. Upload 3 Subject Papers (PDF)
          </button>
          <button
            type="button"
            className={`cbt-nav-tab ${activeTab === 'questions' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            <BookOpen size={15} />
            3. Questions & MCQs ({questions.length})
          </button>
        </div>

        <form onSubmit={handleSubmit} className="cbt-modal-body p-6 space-y-6">
          {/* TAB 1: BASIC SETUP & 3 TIMINGS */}
          {activeTab === 'setup' && (
            <div className="space-y-6">
              {/* Exam Classification */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="cbt-form-label">Exam Type</label>
                  <select
                    className="cbt-form-select font-bold"
                    value={formData.examType}
                    onChange={(e) => handleExamTypeChange(e.target.value)}
                  >
                    <option value="GUJCET">GUJCET (+1 / -0.25)</option>
                    <option value="JEE">JEE Main (+4 / -1)</option>
                    <option value="NEET">NEET (+4 / -1)</option>
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
                  <label className="cbt-form-label">Subject Stream / Group</label>
                  <select
                    className="cbt-form-select"
                    value={formData.streamGroup}
                    onChange={(e) => handleStreamChange(e.target.value)}
                  >
                    <option value="GROUP_A">Group A (PCM - Physics, Chem, Maths)</option>
                    <option value="GROUP_B">Group B (PCB - Physics, Chem, Biology)</option>
                    <option value="ALL">All Groups</option>
                  </select>
                </div>
              </div>

              {/* Title & Duration */}
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
                  <label className="cbt-form-label">Exam Duration (Minutes)</label>
                  <input
                    type="number"
                    className="cbt-form-input font-bold"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    min="15"
                    max="360"
                  />
                </div>
              </div>

              {/* 3 Explicit Lifecycle Timings Required by User */}
              <div className="cbt-timings-card">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={18} className="text-blue-600" />
                  <h4 className="font-bold text-slate-800 text-sm">
                    Three Lifecycle Timings (Display Time, Entry Time, Ending Window Time)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Set when the exam card becomes visible to students, the exact time students can enter the exam environment, and when the window closes.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. Schedule Time */}
                  <div className="cbt-timing-field-box">
                    <label className="cbt-timing-field-title">
                      1. Exam Card Display Start Time
                    </label>
                    <input
                      type="datetime-local"
                      className="cbt-form-input text-xs"
                      value={formData.scheduleTime}
                      onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                      required
                    />
                    <div className="cbt-timing-field-desc">
                      After this time, the exam card becomes visible on the student dashboard.
                    </div>
                  </div>

                  {/* 2. Exam Entry / Start Time */}
                  <div className="cbt-timing-field-box is-highlighted">
                    <label className="cbt-timing-field-title text-blue-900 font-bold">
                      2. Exam Entry / Start Time (Countdown Target)
                    </label>
                    <input
                      type="datetime-local"
                      className="cbt-form-input text-xs border-blue-400 font-semibold"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                    <div className="cbt-timing-field-desc text-blue-800">
                      The countdown timer counts down to this exact time. Students can enter the exam environment only after this moment arrives.
                    </div>
                  </div>

                  {/* 3. Window End Time */}
                  <div className="cbt-timing-field-box">
                    <label className="cbt-timing-field-title">
                      3. Exam Card Ending Window Time
                    </label>
                    <input
                      type="datetime-local"
                      className="cbt-form-input text-xs"
                      value={formData.windowEndTime}
                      onChange={(e) => setFormData({ ...formData, windowEndTime: e.target.value })}
                      required
                    />
                    <div className="cbt-timing-field-desc">
                      After this time, the exam card disappears from the dashboard and submissions close.
                    </div>
                  </div>
                </div>
              </div>

              {/* Subject Total Marks Configuration (Requirement 6) */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-blue-600" />
                    <h4 className="font-bold text-slate-900 text-sm">
                      Total Marks for Each Subject
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-blue-900 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                    Combined Total: <strong>{formData.totalMarks} Marks</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Set the maximum total marks for each subject. Individual student scores and percentages will be calculated dynamically based on these totals.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {subjectMarksConfig.map((subCfg, idx) => {
                    const subQuestions = questions.filter(
                      (q) => q.subject && q.subject.toLowerCase() === subCfg.subject.toLowerCase()
                    );
                    return (
                      <div key={subCfg.subject || idx} className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-800">
                            {subCfg.subject} Total Marks
                          </label>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {subQuestions.length} Questions
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="720"
                          className="cbt-form-input font-bold text-blue-700 text-sm"
                          value={subCfg.totalMarks}
                          onChange={(e) => handleSubjectMarkChange(idx, e.target.value)}
                          placeholder="e.g. 40 or 100"
                          required
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Standard: {formData.examType === 'GUJCET' ? '40 Marks' : formData.examType === 'JEE' ? '100 Marks' : '180 Marks'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Marks Config */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="cbt-form-label">Marks Per Question (+)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="cbt-form-input font-bold text-emerald-700"
                    value={formData.marksPerQuestion}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData({
                        ...formData,
                        marksPerQuestion: val,
                        totalMarks: questions.length * val,
                      });
                    }}
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">JEE/NEET: +4, GUJCET: +1</span>
                </div>

                <div>
                  <label className="cbt-form-label">Negative Marks (-)</label>
                  <input
                    type="number"
                    step="0.25"
                    className="cbt-form-input font-bold text-red-600"
                    value={formData.negativeMarks}
                    onChange={(e) => setFormData({ ...formData, negativeMarks: Number(e.target.value) })}
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">JEE/NEET: -1, GUJCET: -0.25</span>
                </div>

                <div>
                  <label className="cbt-form-label">Total Exam Marks</label>
                  <input
                    type="number"
                    className="cbt-form-input font-bold text-blue-700"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: Number(e.target.value) })}
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Calculated from questions ({questions.length} × {formData.marksPerQuestion})
                  </span>
                </div>
              </div>

              {/* Kiosk Mode Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
                <ShieldAlert size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong>Strict Kiosk Mode & Anti-Cheating Enabled:</strong> Fullscreen enforcement, Alt+Tab prevention, tab switch detection, and copy/paste restrictions are active. Students receive 3 warnings before automatic disqualification. Disqualified students can be granted retry by faculty in real time.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD 3 SUBJECT PAPERS (PDF) */}
          {activeTab === 'papers' && (
            <div className="space-y-6">
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 text-sm mb-1 flex items-center gap-1.5">
                  <FileUp size={16} />
                  Upload 3 Question Papers (PDF) for {formData.examType}
                </h4>
                <p className="text-xs text-blue-700">
                  Upload three separate MCQ question papers with options & answer keys for each subject ({subjectPapers.map((s) => s.subject).join(', ')}). The system automatically attaches them to the exam and extracts questions.
                </p>
              </div>

              {/* 3 Subject Upload Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subjectPapers.map((paper, idx) => (
                  <div key={paper.subject} className="cbt-pdf-upload-box">
                    <div className="cbt-pdf-box-header">
                      <div className="flex items-center gap-2">
                        <span className="cbt-subject-tag">{paper.subject}</span>
                        <span className="text-xs font-bold text-slate-700">Subject Paper {idx + 1}</span>
                      </div>
                      {paper.fileName && (
                        <span className="cbt-uploaded-badge">
                          <CheckCircle size={12} /> Ready
                        </span>
                      )}
                    </div>

                    <div className="cbt-pdf-box-body">
                      {extractingMap[paper.subject] ? (
                        <div className="py-6 text-center text-blue-600 bg-blue-50/50 rounded-lg">
                          <div className="cbt-spinner mx-auto mb-2" style={{ width: 26, height: 26 }}></div>
                          <span className="text-xs font-semibold">
                            Extracting MCQs & Answer Key from {paper.subject} PDF...
                          </span>
                        </div>
                      ) : paper.fileName ? (
                        <div className="cbt-file-info-view">
                          <div className="cbt-file-icon-wrap">
                            <FileText size={24} className="text-blue-600" />
                          </div>
                          <div className="cbt-file-meta">
                            <div className="font-semibold text-xs text-slate-800 truncate" title={paper.fileName}>
                              {paper.fileName}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {(paper.fileSize / 1024).toFixed(1)} KB • Uploaded
                            </div>
                          </div>
                          <button
                            type="button"
                            className="cbt-file-remove-btn"
                            onClick={() => handleRemoveSubjectPaper(idx, paper.subject)}
                            title="Remove file"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="cbt-pdf-dropzone">
                          <UploadCloud size={28} className="text-slate-400 mb-1" />
                          <span className="text-xs font-semibold text-slate-700">
                            Upload {paper.subject} PDF
                          </span>
                          <span className="text-[11px] text-slate-400 mt-0.5">
                            Click to browse (.pdf, .txt)
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.txt,.docx"
                            className="hidden"
                            onChange={(e) => handleFileSelect(idx, paper.subject, e)}
                          />
                        </label>
                      )}
                    </div>

                    <div className="cbt-pdf-box-footer">
                      <span className="text-[11px] text-gray-500">
                        {questions.filter((q) => q.subject === paper.subject).length} MCQs assigned
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200">
                <div className="text-xs text-slate-500">
                  Total questions across 3 subjects: <strong>{questions.length}</strong>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="cbt-btn-pill-amber flex items-center gap-1.5"
                    onClick={handleLoadSamplePaper}
                  >
                    <Sparkles size={14} />
                    Load Pre-Curated Syllabus MCQs
                  </button>
                  <button
                    type="button"
                    className="cbt-btn-pill-blue flex items-center gap-1.5"
                    onClick={() => setActiveTab('questions')}
                  >
                    <BookOpen size={14} />
                    Review MCQs ({questions.length})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUESTIONS & MCQS PREVIEW */}
          {activeTab === 'questions' && (
            <div className="space-y-5">
              {/* Question Paper Extractor */}
              <div className="cbt-extractor-card bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-500" size={18} />
                    <span className="font-semibold text-slate-800 text-sm">
                      Question Paper Text Extractor & Question Bank
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

              {/* Questions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">
                    Questions in Exam ({questions.length})
                  </span>
                  <span className="text-xs text-gray-500">
                    Marking: +{formData.marksPerQuestion} / -{formData.negativeMarks} per question
                  </span>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                    No questions added yet. Click <strong>"Load Pre-Curated Syllabus MCQs"</strong> or upload your subject PDFs!
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
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

          {/* Footer Actions */}
          <div className="cbt-modal-footer mt-6 pt-4 border-t flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Exam: <strong>{formData.examType}</strong> • {questions.length} MCQs • Total: <strong>{formData.totalMarks} Marks</strong>
            </div>
            <div className="flex gap-3">
              <button type="button" className="cbt-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="cbt-btn-primary" disabled={submitting}>
                {submitting ? 'Saving Exam...' : isEditing ? 'Save Changes' : 'Schedule & Publish CBT Exam'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
