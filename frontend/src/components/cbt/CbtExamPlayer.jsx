import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  BookmarkCheck,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Maximize2,
  Send,
  HelpCircle,
} from 'lucide-react';
import {
  saveCbtProgress,
  recordCbtViolation,
  submitCbtExam,
} from '../../services/cbtService';

export default function CbtExamPlayer({
  exam,
  attempt,
  questions,
  currentUser,
  onExamFinished,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(attempt?.answers || []);
  const [timeLeft, setTimeLeft] = useState(attempt?.remainingSeconds || exam.durationMinutes * 60);
  const [violationsCount, setViolationsCount] = useState(attempt?.violationsCount || 0);
  const [warningModal, setWarningModal] = useState(null);
  const [isDisqualified, setIsDisqualified] = useState(attempt?.status === 'DISQUALIFIED');
  const [disqualificationReason, setDisqualificationReason] = useState(attempt?.disqualificationReason || '');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedDone, setSubmittedDone] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('ALL');

  const playerRef = useRef(null);
  const violationCooldownRef = useRef(false);

  const rollNo = currentUser?.rollNo || attempt?.studentRollNo || 1;
  const currentQ = questions[currentIndex] || questions[0];

  // Request fullscreen on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn('Fullscreen request rejected or not supported:', err);
      }
    };
    enterFullscreen();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isDisqualified || submittedDone) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit('Time Expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDisqualified, submittedDone]);

  // Anti-Cheating & Kiosk Violations Handler
  const triggerViolation = useCallback(
    async (action) => {
      if (isDisqualified || submittedDone) return;
      if (violationCooldownRef.current) return;

      violationCooldownRef.current = true;
      setTimeout(() => {
        violationCooldownRef.current = false;
      }, 2500);

      try {
        const res = await recordCbtViolation(exam._id, {
          attemptId: attempt?._id,
          studentRollNo: rollNo,
          studentEmail: currentUser?.email,
          studentName: currentUser?.name,
          action,
        });

        if (res.success) {
          setViolationsCount(res.violationsCount);
          if (res.disqualified) {
            setIsDisqualified(true);
            setDisqualificationReason(res.message);
            setWarningModal(null);
          } else {
            setWarningModal({
              warningNum: res.violationsCount,
              action,
              remaining: res.remainingWarnings,
            });
          }
        }
      } catch (err) {
        console.error('Error logging violation:', err);
      }
    },
    [exam._id, rollNo, isDisqualified, submittedDone]
  );

  // Kiosk Event Listeners: Tab switch, Blur, Fullscreen exit, Key shortcuts
  useEffect(() => {
    if (isDisqualified || submittedDone) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('Tab switched or browser minimized');
      }
    };

    const handleWindowBlur = () => {
      triggerViolation('Window lost focus (Alt+Tab or application switch detected)');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerViolation('Exited fullscreen kiosk mode');
      }
    };

    const handleKeyDown = (e) => {
      // Restrict Alt+Tab, Ctrl+C, Ctrl+V, F12, Escape, Windows key
      if (
        (e.altKey && e.key === 'Tab') ||
        (e.ctrlKey && ['c', 'v', 'u', 'w', 'a', 'p'].includes(e.key.toLowerCase())) ||
        ['F12', 'Escape'].includes(e.key)
      ) {
        e.preventDefault();
        triggerViolation(`Restricted keyboard shortcut (${e.key}) attempted`);
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      triggerViolation('Right-click context menu prohibited');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [triggerViolation, isDisqualified, submittedDone]);

  // Periodic autosave of student answers every 20 seconds
  useEffect(() => {
    if (isDisqualified || submittedDone) return;

    const autoSaveInterval = setInterval(async () => {
      try {
        const totalDuration = exam.durationMinutes * 60;
        const timeSpent = Math.max(0, totalDuration - timeLeft);
        await saveCbtProgress(exam._id, {
          studentRollNo: rollNo,
          answers,
          timeSpentSeconds: timeSpent,
        });
      } catch (err) {
        console.warn('Autosave error:', err);
      }
    }, 20000);

    return () => clearInterval(autoSaveInterval);
  }, [exam._id, rollNo, answers, timeLeft, isDisqualified, submittedDone]);

  // Answer selection handler
  const handleSelectOption = (optionKey) => {
    if (isDisqualified || submittedDone) return;

    setAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === currentQ.id);
      const isSame = existing?.selectedOption === optionKey;
      const nextOption = isSame ? null : optionKey;
      const nextStatus = nextOption
        ? existing?.status === 'MARKED_FOR_REVIEW'
          ? 'MARKED_FOR_REVIEW'
          : 'ANSWERED'
        : 'NOT_ANSWERED';

      if (existing) {
        return prev.map((a) =>
          a.questionId === currentQ.id
            ? { ...a, selectedOption: nextOption, status: nextStatus }
            : a
        );
      } else {
        return [
          ...prev,
          {
            questionId: currentQ.id,
            selectedOption: nextOption,
            status: nextStatus,
            timeSpentSeconds: 0,
          },
        ];
      }
    });
  };

  // Toggle Mark for Review
  const handleToggleMarkForReview = () => {
    setAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === currentQ.id);
      const currentlyMarked = existing?.status === 'MARKED_FOR_REVIEW';
      const hasAnswer = Boolean(existing?.selectedOption);

      const newStatus = currentlyMarked
        ? hasAnswer
          ? 'ANSWERED'
          : 'NOT_ANSWERED'
        : 'MARKED_FOR_REVIEW';

      if (existing) {
        return prev.map((a) =>
          a.questionId === currentQ.id ? { ...a, status: newStatus } : a
        );
      } else {
        return [
          ...prev,
          {
            questionId: currentQ.id,
            selectedOption: null,
            status: 'MARKED_FOR_REVIEW',
            timeSpentSeconds: 0,
          },
        ];
      }
    });
  };

  // Current answer status for current question
  const currentAnswerItem = answers.find((a) => a.questionId === currentQ?.id);
  const selectedOption = currentAnswerItem?.selectedOption;
  const isMarkedForReview = currentAnswerItem?.status === 'MARKED_FOR_REVIEW';

  // Format Digital Timer: HH : MM : SS
  const formatTimer = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const hh = h < 10 ? `0${h}` : `${h}`;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    return `${hh} : ${mm} : ${ss}`;
  };

  // Status counters for Summary box matching Photo 2
  const answeredCount = answers.filter((a) => a.selectedOption).length;
  const markedCount = answers.filter((a) => a.status === 'MARKED_FOR_REVIEW').length;
  const totalQ = questions.length;
  const notVisitedCount = questions.filter(
    (q) => !answers.some((a) => a.questionId === q.id && a.status !== 'NOT_VISITED')
  ).length;
  const notAnsweredCount = totalQ - answeredCount;

  // Submit Handler
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      const totalDuration = exam.durationMinutes * 60;
      const timeSpent = Math.max(0, totalDuration - timeLeft);

      const res = await submitCbtExam(exam._id, {
        studentRollNo: rollNo,
        answers,
        timeSpentSeconds: timeSpent,
      });

      if (res.success) {
        setSubmittedDone(true);
        setShowConfirmSubmit(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } else {
        alert(res.message || 'Submission failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async (reason) => {
    try {
      const totalDuration = exam.durationMinutes * 60;
      const timeSpent = Math.max(0, totalDuration - timeLeft);
      await submitCbtExam(exam._id, {
        studentRollNo: rollNo,
        answers,
        timeSpentSeconds: timeSpent,
        reason,
      });
      setSubmittedDone(true);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Group questions by Subject/Section for tabs in Question Navigator
  const subjects = Array.from(new Set(questions.map((q) => q.subject)));
  const filteredQuestions =
    selectedSubject === 'ALL'
      ? questions
      : questions.filter((q) => q.subject === selectedSubject);

  // Status helper for question palette buttons
  const getQuestionPaletteClass = (q, indexInFullList) => {
    const isCurrent = indexInFullList === currentIndex;
    const ans = answers.find((a) => a.questionId === q.id);

    if (isCurrent) return 'cbt-pal-current'; // Dark blue (Photo 2)
    if (ans?.status === 'MARKED_FOR_REVIEW') return 'cbt-pal-review'; // Light blue
    if (ans?.selectedOption) return 'cbt-pal-answered'; // Light green
    if (ans?.status === 'NOT_ANSWERED') return 'cbt-pal-not-answered'; // Light yellow / orange
    return 'cbt-pal-not-visited'; // Gray / white
  };

  // DISQUALIFIED STATE SCREEN
  if (isDisqualified) {
    return (
      <div className="cbt-fullscreen-player cbt-disqualified-screen">
        <div className="cbt-disqualified-card">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-2xl font-bold text-red-700 mb-2">
            Disqualified from Examination
          </h2>
          <p className="text-sm text-slate-700 mb-4 max-w-md mx-auto">
            {disqualificationReason ||
              'You have exceeded the maximum allowed anti-cheating warnings (3). Your examination has been automatically auto-submitted.'}
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600 text-left mb-6 max-w-md mx-auto space-y-1.5">
            <div>• Fullscreen exits and tab switching are strictly audited.</div>
            <div>• Your action log has been transmitted to the Assistant Faculty Dashboard.</div>
            <div>• If this was accidental, please contact the Assistant Faculty to request an <strong>Exam Retry</strong>.</div>
          </div>
          <button
            className="cbt-btn-primary px-6 py-2.5 text-sm"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              if (onExamFinished) onExamFinished();
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // SUBMITTED DONE SCREEN
  if (submittedDone) {
    return (
      <div className="cbt-fullscreen-player cbt-submitted-screen">
        <div className="cbt-submitted-card">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Exam Submitted Successfully!
          </h2>
          <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
            Your answers for <strong>{exam.title}</strong> have been recorded in the system. Results will be published after evaluation.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-6 text-center">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-xl font-bold text-emerald-700">{answeredCount}</div>
              <div className="text-[11px] text-emerald-800">Answered</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-xl font-bold text-amber-700">{notAnsweredCount}</div>
              <div className="text-[11px] text-amber-800">Unanswered</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xl font-bold text-blue-700">{totalQ}</div>
              <div className="text-[11px] text-blue-800">Total MCQs</div>
            </div>
          </div>

          <button
            className="cbt-btn-primary px-6 py-2.5 text-sm"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              if (onExamFinished) onExamFinished();
            }}
          >
            Return to Exam Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cbt-fullscreen-player" ref={playerRef}>
      {/* Top Navy Banner matching Photo 2 */}
      <header className="cbt-player-header">
        <div className="cbt-header-info">
          <h1 className="cbt-player-exam-title">{exam.title || 'Keyboard'}</h1>
          <div className="cbt-player-user-meta">
            <span className="flex items-center gap-1">
              <User size={13} />
              {currentUser?.email || attempt?.studentEmail || 'student@ggzv.edu.in'}
            </span>
            <span className="flex items-center gap-1">
              <Building2 size={13} />
              {exam.instituteName || 'G.G. Zadafiya Vidhyalaya'}
            </span>
          </div>
        </div>

        {/* Digital Countdown Clock matching Photo 2 */}
        <div className="cbt-player-timer-wrap">
          <Clock size={18} className="text-white/80" />
          <span className="cbt-digital-timer">{formatTimer(timeLeft)}</span>
        </div>
      </header>

      {/* Main Two-Panel Layout */}
      <div className="cbt-player-main-layout">
        {/* LEFT / CENTER PANEL: Question Display matching Photo 2 */}
        <div className="cbt-player-left-panel">
          {/* Question Metadata Bar */}
          <div className="cbt-q-header-bar">
            <div className="flex items-center gap-2">
              <span className="cbt-qnum-tag">
                Q{currentQ?.displayQuestionNo || currentIndex + 1}
              </span>
              <span className="cbt-marks-tag">{currentQ?.marks || 4} marks</span>
            </div>
            <span className="cbt-mcq-badge">
              <HelpCircle size={13} />
              MCQ
            </span>
          </div>

          {/* Question Text */}
          <div className="cbt-question-statement-box">
            <p className="cbt-statement-en">{currentQ?.questionText}</p>
            {currentQ?.questionTextGujarati && (
              <p className="cbt-statement-gu mt-2 text-slate-700 font-gujarati">
                {currentQ.questionTextGujarati}
              </p>
            )}
          </div>

          {/* Options A, B, C, D matching Photo 2 */}
          <div className="cbt-options-list">
            {currentQ?.options?.map((optText, optIdx) => {
              const optKey = ['A', 'B', 'C', 'D'][optIdx];
              const isSelected = selectedOption === optKey;

              return (
                <div
                  key={optKey}
                  className={`cbt-option-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleSelectOption(optKey)}
                >
                  <span className="cbt-option-letter">{optKey}.</span>
                  <span className="cbt-option-text">{optText}</span>
                </div>
              );
            })}
          </div>

          {/* Bottom Action Controls matching Photo 2 */}
          <div className="cbt-player-bottom-bar">
            <div className="flex items-center gap-3">
              <button
                className="cbt-btn-nav-prev"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              >
                <ChevronLeft size={16} />
                Prev
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                className={`cbt-btn-review ${isMarkedForReview ? 'is-active' : ''}`}
                onClick={handleToggleMarkForReview}
              >
                <BookmarkCheck size={16} />
                {isMarkedForReview ? 'Marked for Review' : 'Mark For Review'}
              </button>

              <button
                className="cbt-btn-nav-next"
                disabled={currentIndex === questions.length - 1}
                onClick={() =>
                  setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))
                }
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>

            <div>
              <button
                className="cbt-btn-submit-quiz"
                onClick={() => setShowConfirmSubmit(true)}
              >
                <CheckCircle2 size={16} />
                Submit Quiz
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Question Navigator & Summary matching Photo 2 */}
        <aside className="cbt-player-right-panel">
          <h3 className="cbt-navigator-title">Question Navigator</h3>

          {/* Section / Subject Header Tabs matching Photo 2 */}
          {subjects.length > 1 && (
            <div className="cbt-subj-tabs-row">
              <button
                className={`cbt-subj-tab-btn ${selectedSubject === 'ALL' ? 'is-active' : ''}`}
                onClick={() => setSelectedSubject('ALL')}
              >
                All
              </button>
              {subjects.map((sub) => (
                <button
                  key={sub}
                  className={`cbt-subj-tab-btn ${selectedSubject === sub ? 'is-active' : ''}`}
                  onClick={() => setSelectedSubject(sub)}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}

          {/* Question Grid Buttons (5 per row matching Photo 2) */}
          <div className="cbt-palette-grid">
            {filteredQuestions.map((q) => {
              const fullIndex = questions.findIndex((item) => item.id === q.id);
              const buttonClass = getQuestionPaletteClass(q, fullIndex);

              return (
                <button
                  key={q.id}
                  className={`cbt-palette-btn ${buttonClass}`}
                  onClick={() => setCurrentIndex(fullIndex)}
                >
                  {q.displayQuestionNo || fullIndex + 1}
                </button>
              );
            })}
          </div>

          {/* Summary Box matching Photo 2 */}
          <div className="cbt-navigator-summary-card">
            <h4 className="cbt-summary-title">Summary</h4>
            <div className="cbt-summary-grid">
              <div className="cbt-summary-pill cbt-sum-answered">
                <span>{answeredCount} Answered</span>
              </div>
              <div className="cbt-summary-pill cbt-sum-not-answered">
                <span>{notAnsweredCount} Not Answered</span>
              </div>
              <div className="cbt-summary-pill cbt-sum-review">
                <span>{markedCount} Marked For Review</span>
              </div>
              <div className="cbt-summary-pill cbt-sum-not-visited">
                <span>{notVisitedCount} Not Visited</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ANTI-CHEATING WARNING MODAL (1st or 2nd Strike) */}
      {warningModal && (
        <div className="cbt-warning-overlay">
          <div className="cbt-warning-box">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-amber-800 mb-1">
              Warning {warningModal.warningNum} of 3
            </h3>
            <p className="text-xs text-amber-700 font-semibold mb-2">
              Violation Detected: {warningModal.action}
            </p>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Switching tabs, minimizing the exam window, or exiting fullscreen is strictly prohibited.
              You have <strong>{warningModal.remaining} warning(s)</strong> remaining before your exam is automatically disqualified and submitted.
            </p>
            <button
              className="cbt-btn-primary w-full py-2 text-xs"
              onClick={async () => {
                setWarningModal(null);
                if (!document.fullscreenElement) {
                  try {
                    await document.documentElement.requestFullscreen();
                  } catch (e) {}
                }
              }}
            >
              I Understand & Resume Fullscreen Exam
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM FINAL SUBMISSION MODAL */}
      {showConfirmSubmit && (
        <div className="cbt-warning-overlay">
          <div className="cbt-confirm-submit-box">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Are you sure you want to submit?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Once submitted, you will not be able to modify any responses.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs mb-5">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded">
                <div className="font-bold text-emerald-800 text-base">{answeredCount}</div>
                <div className="text-emerald-700">Answered</div>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded">
                <div className="font-bold text-amber-800 text-base">{notAnsweredCount}</div>
                <div className="text-amber-700">Not Answered</div>
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
                <div className="font-bold text-blue-800 text-base">{markedCount}</div>
                <div className="text-blue-700">Marked For Review</div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div className="font-bold text-slate-800 text-base">{totalQ}</div>
                <div className="text-slate-600">Total Questions</div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="cbt-btn-secondary text-xs"
                onClick={() => setShowConfirmSubmit(false)}
              >
                Cancel & Review
              </button>
              <button
                type="button"
                className="cbt-btn-primary text-xs"
                disabled={submitting}
                onClick={handleFinalSubmit}
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Final Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

