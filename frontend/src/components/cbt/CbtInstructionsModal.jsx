import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  HelpCircle,
  Award,
  AlertTriangle,
  CheckCircle,
  X,
  Maximize2,
} from 'lucide-react';

export default function CbtInstructionsModal({ exam, onProceed, onClose }) {
  const [agreed, setAgreed] = useState(false);

  if (!exam) return null;

  return (
    <div className="cbt-modal-overlay">
      <div className="cbt-instructions-container">
        {/* Header */}
        <div className="cbt-modal-header bg-slate-900 text-white rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="text-blue-400" size={22} />
              Examination Rules & Kiosk Security Guidelines
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Please carefully read all instructions before entering the secure testing environment.
            </p>
          </div>
          <button className="cbt-close-btn text-white hover:text-red-400" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Exam Meta Bar */}
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="font-bold text-blue-900 text-sm">{exam.title}</div>
          <div className="flex items-center gap-4 text-blue-800">
            <span className="flex items-center gap-1">
              <Clock size={14} /> {exam.durationMinutes} Minutes
            </span>
            <span className="flex items-center gap-1">
              <HelpCircle size={14} /> {exam.questions?.length || exam.questionsCount || 45} Questions
            </span>
            <span className="flex items-center gap-1">
              <Award size={14} /> {exam.totalMarks} Marks
            </span>
          </div>
        </div>

        {/* Rules Body */}
        <div className="cbt-modal-body p-6 space-y-4 text-xs text-slate-700 max-h-[60vh] overflow-y-auto">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold mb-1">Strict Anti-Cheating & Kiosk Mode Enforced</strong>
              This computer-based exam runs in a locked kiosk environment. Your browser actions, window focus, and keyboard events are continuously audited in real time.
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-900">Key Examination Regulations:</h4>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                <div>
                  <strong>Mandatory Fullscreen Mode:</strong> The test will automatically expand to fullscreen. Exiting fullscreen mode will immediately trigger an anti-cheating warning.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                <div>
                  <strong>No Tab Switching or Minimizing:</strong> Switching to another browser tab, opening another window, or pressing Alt+Tab is recorded as a violation.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                <div>
                  <strong>3 Strikes Disqualification Rule:</strong> You will be given a maximum of <strong>2 warnings</strong>. On the <strong>3rd violation</strong>, you will be <strong>automatically disqualified and your exam will be auto-submitted</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">4</span>
                <div>
                  <strong>Restricted Shortcuts:</strong> Right-clicking, copying (Ctrl+C), pasting (Ctrl+V), and developer tools (F12) are blocked.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">5</span>
                <div>
                  <strong>Unique Question Sequence:</strong> Questions are randomized per student to ensure academic integrity. No two neighboring seats have the same question number.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">6</span>
                <div>
                  <strong>Countdown Timer:</strong> The countdown timer in the header ticks continuously. When time expires, your responses will be submitted automatically.
                </div>
              </div>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <div className="pt-4 border-t border-slate-200">
            <label className="flex items-start gap-3 cursor-pointer select-none p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span className="text-xs font-semibold text-slate-800">
                I have read, understood, and agree to abide by all the examination rules, anti-cheating regulations, and kiosk security policies.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="cbt-modal-footer px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
          <button className="cbt-btn-secondary text-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            className="cbt-btn-primary flex items-center gap-2 text-xs py-2 px-4"
            disabled={!agreed}
            onClick={onProceed}
          >
            <Maximize2 size={15} />
            <span>Enter Fullscreen Exam</span>
          </button>
        </div>
      </div>
    </div>
  );
}
