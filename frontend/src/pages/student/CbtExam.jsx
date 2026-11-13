import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Calendar,
  BookOpen,
  Clock,
  Award,
  Play,
  CheckCircle2,
  AlertTriangle,
  MonitorCheck,
  Eye,
  BarChart2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchCbtExams, startCbtExam } from '../../services/cbtService';
import CbtInstructionsModal from '../../components/cbt/CbtInstructionsModal';
import CbtExamPlayer from '../../components/cbt/CbtExamPlayer';
import CbtAnalysisModal from '../../components/cbt/CbtAnalysisModal';

export default function StudentCbtExam() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Flow State
  const [selectedExamForInstructions, setSelectedExamForInstructions] = useState(null);
  const [activePlayerState, setActivePlayerState] = useState(null); // { exam, attempt, questions }
  const [viewResultExamId, setViewResultExamId] = useState(null);
  const [nowTime, setNowTime] = useState(new Date());

  const rollNo = user?.rollNo || 1;
  const standard = user?.standard || 'STD_11';
  const division = user?.division || 'A';
  const streamGroup = user?.streamGroup || 'GROUP_A';

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await fetchCbtExams({
        role: 'student',
        standard,
        division,
        streamGroup,
        rollNo,
      });
      setExams(data || []);
    } catch (err) {
      console.error('Error fetching student CBT exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
    const clock = setInterval(() => {
      setNowTime(new Date());
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // Format Relative or Start Countdown
  const getStartStatus = (exam) => {
    const start = new Date(exam.startTime);
    const end = new Date(exam.windowEndTime);
    const diffMs = start - nowTime;

    if (nowTime > end) {
      return { canStart: false, isEnded: true, label: 'Expired' };
    }

    if (diffMs > 0) {
      // Countdown
      const totalSec = Math.floor(diffMs / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      if (m > 60) {
        const h = Math.floor(m / 60);
        return { canStart: false, label: `Starts in ${h}h ${m % 60}m` };
      }
      return {
        canStart: false,
        label: `Starts in ${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`,
      };
    }

    return { canStart: true, label: 'Start' };
  };

  // Format Date (e.g. 9th Aug 2026 09:00)
  const formatExamDate = (dStr) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    const day = d.getDate();
    const nth =
      day % 10 === 1 && day !== 11
        ? 'st'
        : day % 10 === 2 && day !== 12
        ? 'nd'
        : day % 10 === 3 && day !== 13
        ? 'rd'
        : 'th';
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}${nth} ${month} ${year} ${hours}:${mins}`;
  };

  // Handler when student clicks Start on an exam card
  const handleCardStartClick = (exam) => {
    setSelectedExamForInstructions(exam);
  };

  // Handler when student completes instructions agreement
  const handleProceedToExam = async () => {
    const exam = selectedExamForInstructions;
    if (!exam) return;

    try {
      const res = await startCbtExam(exam._id, {
        studentRollNo: rollNo,
        studentName: user?.name || 'Student',
        studentEmail: user?.email || `student${rollNo}@ggzv.edu.in`,
        standard,
        division,
        streamGroup,
      });

      if (res.success) {
        setSelectedExamForInstructions(null);
        setActivePlayerState({
          exam: res.exam,
          attempt: res.attempt,
          questions: res.questions,
        });
      } else {
        alert(res.message || 'Unable to start exam');
        if (res.isDisqualified) {
          loadExams();
        }
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // If Live Player is active, render fullscreen player!
  if (activePlayerState) {
    return (
      <CbtExamPlayer
        exam={activePlayerState.exam}
        attempt={activePlayerState.attempt}
        questions={activePlayerState.questions}
        currentUser={user}
        onExamFinished={() => {
          setActivePlayerState(null);
          loadExams();
        }}
      />
    );
  }

  return (
    <div className="cbt-student-page p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <MonitorCheck size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                CBT Examination Portal
              </h1>
              <p className="text-sm text-slate-500">
                Online Computer Based Mock Tests • JEE / NEET / GUJCET
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
            Student: <strong>{user?.name || 'Umesh Pal'}</strong> (Roll #{rollNo} • {standard.replace('_', ' ')} Div {division})
          </div>
        </div>
      </div>

      {/* Exam Cards Grid matching Photo 3 */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <div className="cbt-spinner mx-auto mb-2"></div>
          Loading scheduled exams...
        </div>
      ) : exams.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Calendar size={42} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No CBT exams currently scheduled for your class & stream.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => {
            const startStatus = getStartStatus(exam);
            const isSubmitted = exam.attemptStatus === 'SUBMITTED';
            const isDisqualified = exam.attemptStatus === 'DISQUALIFIED';
            const canRetry = exam.myAttempt?.retryAllowed;

            // Subjects list with max 2 and "+X more" matching Photo 3
            const subjectsList = exam.subjects || ['Physics', 'Chemistry', 'Mathematics'];
            const displayedSubjects = subjectsList.slice(0, 2);
            const extraCount = subjectsList.length - 2;

            return (
              <div key={exam._id} className="cbt-card-view">
                {/* Card Top: Title & Takers Count Badge matching Photo 3 */}
                <div className="cbt-card-top">
                  <div className="cbt-card-title-wrap">
                    <h3 className="cbt-card-title">{exam.title}</h3>
                    <div className="cbt-card-portal-name">
                      <Building2 size={13} />
                      <span>{exam.instituteName || 'QuizPortal'}</span>
                    </div>
                  </div>

                  {/* Dark Blue Ribbon Takers Badge matching Photo 3 */}
                  <div className="cbt-takers-badge">
                    <Users size={14} />
                    <span>{exam.takersCount || 0} takers</span>
                  </div>
                </div>

                {/* Timing Info matching Photo 3 */}
                <div className="cbt-card-timing-section">
                  <div className="cbt-timing-row">
                    <div className="cbt-timing-col">
                      <div className="cbt-timing-label">
                        <Calendar size={13} />
                        STARTS
                      </div>
                      <div className="cbt-timing-val">{formatExamDate(exam.startTime)}</div>
                    </div>

                    <div className="cbt-timing-col">
                      <div className="cbt-timing-label">
                        <Calendar size={13} />
                        ENDS
                      </div>
                      <div className="cbt-timing-val">{formatExamDate(exam.windowEndTime)}</div>
                    </div>
                  </div>
                </div>

                {/* Subjects Tags matching Photo 3 */}
                <div className="cbt-card-subjects-section">
                  <div className="cbt-subjects-label">
                    <BookOpen size={13} />
                    SUBJECTS
                  </div>
                  <div className="cbt-subjects-pills-wrap">
                    {displayedSubjects.map((sub) => (
                      <span key={sub} className="cbt-subject-tag-pill">
                        {sub}
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <span className="cbt-subject-more-pill">+{extraCount} more</span>
                    )}
                  </div>
                </div>

                {/* Status Badges */}
                {isSubmitted && (
                  <div className="cbt-submitted-pill-box">
                    <span className="cbt-submitted-pill">
                      <CheckCircle2 size={14} />
                      Submitted
                    </span>
                  </div>
                )}

                {isDisqualified && !canRetry && (
                  <div className="cbt-submitted-pill-box">
                    <span className="cbt-disqualified-pill">
                      <AlertTriangle size={14} />
                      Disqualified (Contact Faculty)
                    </span>
                  </div>
                )}

                {isDisqualified && canRetry && (
                  <div className="cbt-submitted-pill-box">
                    <span className="cbt-retry-ready-pill">
                      Retry Granted by Faculty! Click Start to Resume
                    </span>
                  </div>
                )}

                {/* Card Footer matching Photo 3 */}
                <div className="cbt-card-footer">
                  <div className="cbt-footer-meta">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {exam.durationMinutes} minutes
                    </span>
                    <span className="flex items-center gap-1">
                      <Award size={14} />
                      {exam.totalMarks} marks
                    </span>
                  </div>

                  <div className="cbt-footer-action">
                    {isSubmitted ? (
                      exam.isResultPublished ? (
                        <button
                          className="cbt-btn-view-result"
                          onClick={() => setViewResultExamId(exam._id)}
                        >
                          <BarChart2 size={14} />
                          View Result
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500 font-semibold px-2">
                          Under Evaluation
                        </span>
                      )
                    ) : isDisqualified && !canRetry ? (
                      <button className="cbt-btn-start disabled" disabled>
                        Disqualified
                      </button>
                    ) : startStatus.canStart || canRetry ? (
                      <button
                        className="cbt-btn-start"
                        onClick={() => handleCardStartClick(exam)}
                      >
                        <Play size={14} fill="currentColor" />
                        Start
                      </button>
                    ) : (
                      <button className="cbt-btn-start disabled" disabled>
                        <Clock size={13} />
                        {startStatus.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pre-Exam Instructions Modal */}
      {selectedExamForInstructions && (
        <CbtInstructionsModal
          exam={selectedExamForInstructions}
          onProceed={handleProceedToExam}
          onClose={() => setSelectedExamForInstructions(null)}
        />
      )}

      {/* View Result & Analysis Modal (Photo 1) */}
      {viewResultExamId && (
        <CbtAnalysisModal
          examId={viewResultExamId}
          onClose={() => setViewResultExamId(null)}
        />
      )}
    </div>
  );
}
