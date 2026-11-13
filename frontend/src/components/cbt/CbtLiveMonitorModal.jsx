import React, { useState, useEffect } from 'react';
import {
  Users,
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { fetchCbtLiveMonitor, grantCbtRetry } from '../../services/cbtService';

export default function CbtLiveMonitorModal({ examId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monitorData, setMonitorData] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const loadData = async (isSilent = false) => {
    if (!examId) return;
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      const res = await fetchCbtLiveMonitor(examId);
      if (res.success) {
        setMonitorData(res);
      }
    } catch (err) {
      console.error('Error loading live monitor:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 6 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [examId]);

  const handleGrantRetry = async (student) => {
    if (!window.confirm(`Grant exam retry to ${student.name} (Roll #${student.rollNo})? They will be able to resume taking their exam from where they left off.`)) {
      return;
    }
    try {
      const res = await grantCbtRetry(examId, {
        studentRollNo: student.rollNo,
        grantedBy: 'Assistant Faculty',
      });
      if (res.success) {
        setActionMessage(res.message);
        loadData(true);
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(res.message || 'Failed to grant retry');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const students = monitorData?.students || [];
  const exam = monitorData?.exam || {};

  const total = students.length;
  const inProgress = students.filter(s => s.status === 'IN_PROGRESS').length;
  const submitted = students.filter(s => s.status === 'SUBMITTED').length;
  const disqualified = students.filter(s => s.status === 'DISQUALIFIED').length;
  const notStarted = students.filter(s => s.status === 'NOT_STARTED').length;

  return (
    <div className="cbt-modal-overlay">
      <div className="cbt-live-monitor-container">
        {/* Header */}
        <div className="cbt-modal-header">
          <div className="cbt-header-left">
            <div className="flex items-center gap-2">
              <span className="cbt-live-pulse-dot"></span>
              <h2 className="cbt-modal-title">Live Exam Monitoring & Kiosk Security</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {exam.title} • Live Real-time Anti-Cheating Tracking & Retry Management
            </p>
          </div>

          <div className="cbt-header-right flex items-center gap-3">
            <button
              className="cbt-btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Live'}</span>
            </button>
            <button className="cbt-close-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Live Stat Badges */}
        <div className="cbt-monitor-kpi-bar">
          <div className="cbt-monitor-kpi-pill">
            <Users size={15} className="text-gray-500" />
            <span>Enrolled: <strong>{total}</strong></span>
          </div>
          <div className="cbt-monitor-kpi-pill border-amber-200 bg-amber-50 text-amber-800">
            <Clock size={15} className="text-amber-600" />
            <span>In Progress: <strong>{inProgress}</strong></span>
          </div>
          <div className="cbt-monitor-kpi-pill border-emerald-200 bg-emerald-50 text-emerald-800">
            <CheckCircle size={15} className="text-emerald-600" />
            <span>Submitted: <strong>{submitted}</strong></span>
          </div>
          <div className="cbt-monitor-kpi-pill border-red-200 bg-red-50 text-red-800">
            <ShieldAlert size={15} className="text-red-600" />
            <span>Disqualified: <strong>{disqualified}</strong></span>
          </div>
          <div className="cbt-monitor-kpi-pill text-gray-600">
            <span>Not Started: <strong>{notStarted}</strong></span>
          </div>
        </div>

        {actionMessage && (
          <div className="cbt-alert-success mx-6 mt-3">
            <CheckCircle size={16} />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Students Live Table */}
        <div className="cbt-modal-body p-6">
          {loading ? (
            <div className="cbt-loading-state">
              <div className="cbt-spinner"></div>
              <p>Fetching active students and violation logs...</p>
            </div>
          ) : (
            <div className="cbt-table-responsive">
              <table className="cbt-data-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Group</th>
                    <th>Status</th>
                    <th>Answered</th>
                    <th>Violations Log</th>
                    <th>Security Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <tr key={st.rollNo} className={st.status === 'DISQUALIFIED' ? 'bg-red-50/50' : ''}>
                      <td className="font-bold">#{st.rollNo}</td>
                      <td>
                        <div className="font-semibold text-slate-800">{st.name}</div>
                        <div className="text-xs text-gray-400">Std 11 • Div {st.division}</div>
                      </td>
                      <td>
                        <span className="cbt-group-pill">{st.streamGroup}</span>
                      </td>
                      <td>
                        {st.status === 'SUBMITTED' ? (
                          <span className="cbt-status-pill cbt-status-submitted">Submitted</span>
                        ) : st.status === 'DISQUALIFIED' ? (
                          <span className="cbt-status-pill cbt-status-disqualified">
                            Disqualified
                          </span>
                        ) : st.status === 'IN_PROGRESS' ? (
                          <span className="cbt-status-pill cbt-status-started flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                            In Exam
                          </span>
                        ) : (
                          <span className="cbt-status-pill cbt-status-absent">Not Started</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700">
                            {st.answeredCount} / {st.totalQuestions}
                          </span>
                          <div className="cbt-accuracy-track" style={{ width: 60, height: 6 }}>
                            <div
                              className="cbt-accuracy-fill"
                              style={{
                                width: `${Math.round((st.answeredCount / (st.totalQuestions || 1)) * 100)}%`,
                                backgroundColor: '#2563EB',
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {st.violationsCount > 0 ? (
                          <div>
                            <div className="flex items-center gap-1.5 text-red-600 font-semibold text-xs mb-1">
                              <AlertTriangle size={13} />
                              <span>{st.violationsCount} Warning{st.violationsCount > 1 ? 's' : ''}</span>
                            </div>
                            {st.disqualificationReason ? (
                              <p className="text-xs text-red-700 max-w-xs leading-snug">
                                {st.disqualificationReason}
                              </p>
                            ) : st.violationLogs && st.violationLogs.length > 0 ? (
                              <p className="text-xs text-gray-600 max-w-xs leading-snug">
                                {st.violationLogs[st.violationLogs.length - 1]?.action}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-700 flex items-center gap-1">
                            <CheckCircle size={13} /> Clear
                          </span>
                        )}
                      </td>
                      <td>
                        {st.status === 'DISQUALIFIED' || st.violationsCount >= 2 ? (
                          <button
                            className="cbt-btn-retry flex items-center gap-1.5 text-xs py-1 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-colors"
                            onClick={() => handleGrantRetry(st)}
                            title="Reset violations and permit student to resume exam"
                          >
                            <RotateCcw size={13} />
                            <span>Grant Retry</span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Regular</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
