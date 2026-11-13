import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Play,
  CheckCircle,
  BarChart3,
  Users,
  Clock,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Edit,
  Trash2,
  Filter,
  MonitorCheck,
  Eye,
  Award,
  Sparkles,
} from 'lucide-react';
import { fetchCbtExams, evaluateCbtExam, deleteCbtExam } from '../../services/cbtService';
import CbtLiveMonitorModal from '../../components/cbt/CbtLiveMonitorModal';
import CbtCreateExamModal from '../../components/cbt/CbtCreateExamModal';
import CbtQuestionPaperModal from '../../components/cbt/CbtQuestionPaperModal';

export default function AssistantCbtExam() {
  const outlet = useOutletContext();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStandard, setFilterStandard] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [examToEdit, setExamToEdit] = useState(null);
  const [activeMonitorExamId, setActiveMonitorExamId] = useState(null);
  const [selectedExamForPaper, setSelectedExamForPaper] = useState(null);

  useEffect(() => {
    if (outlet?.setHeader) {
      outlet.setHeader({
        title: 'CBT Exam Management',
        subtitle: 'Schedule computer-based tests, monitor kiosk security, and evaluate performance',
      });
    }
  }, [outlet]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await fetchCbtExams();
      setExams(data || []);
    } catch (err) {
      console.error('Error fetching CBT exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleEvaluate = async (exam) => {
    if (!window.confirm(`Evaluate all student submissions for "${exam.title}" and publish leaderboard & analytics?`)) {
      return;
    }
    try {
      const res = await evaluateCbtExam(exam._id);
      if (res.success) {
        alert(res.message);
        loadExams();
        navigate(`/assistant/cbt-exam/analysis/${exam._id}`);
      } else {
        alert(res.message || 'Evaluation failed.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm(`Are you sure you want to delete exam "${exam.title}" and all related attempts?`)) {
      return;
    }
    try {
      const res = await deleteCbtExam(exam._id);
      if (res.success) {
        loadExams();
      } else {
        alert(res.message || 'Delete failed.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredExams = exams.filter((e) => {
    if (filterType !== 'ALL' && e.examType !== filterType) return false;
    if (filterStandard !== 'ALL' && e.standard !== filterStandard && e.standard !== 'ALL') return false;
    return true;
  });

  const totalExams = exams.length;
  const activeCount = exams.filter((e) => e.status === 'ACTIVE').length;
  const evaluatedCount = exams.filter((e) => e.status === 'EVALUATED').length;
  const totalTakers = exams.reduce((acc, e) => acc + (e.takersCount || 0), 0);

  return (
    <div className="cbt-assistant-page">
      {/* Top Banner & Header Card */}
      <div className="cbt-page-header-card">
        <div className="cbt-page-header-left">
          <div className="cbt-header-icon-box">
            <MonitorCheck size={26} />
          </div>
          <div>
            <h1 className="cbt-page-title">CBT Examination Management</h1>
            <p className="cbt-page-subtitle">
              JEE / NEET / GUJCET Computer-Based Tests, Kiosk Security & Analytics
            </p>
          </div>
        </div>

        <button
          className="cbt-btn-primary"
          onClick={() => {
            setExamToEdit(null);
            setShowCreateModal(true);
          }}
        >
          <Plus size={18} />
          <span>Create New CBT Exam</span>
        </button>
      </div>

      {/* KPI Cards Summary */}
      <div className="cbt-kpi-summary-grid">
        <div className="cbt-stat-card">
          <div className="cbt-stat-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="cbt-stat-val">{totalExams}</div>
            <div className="cbt-stat-lbl">Total CBT Exams</div>
          </div>
        </div>

        <div className="cbt-stat-card">
          <div className="cbt-stat-icon-wrap" style={{ background: '#fffbeb', color: '#d97706' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="cbt-stat-val">{activeCount}</div>
            <div className="cbt-stat-lbl">Active Exams</div>
          </div>
        </div>

        <div className="cbt-stat-card">
          <div className="cbt-stat-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Award size={24} />
          </div>
          <div>
            <div className="cbt-stat-val">{evaluatedCount}</div>
            <div className="cbt-stat-lbl">Evaluated & Published</div>
          </div>
        </div>

        <div className="cbt-stat-card">
          <div className="cbt-stat-icon-wrap" style={{ background: '#faf5ff', color: '#7c3aed' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="cbt-stat-val">{totalTakers}</div>
            <div className="cbt-stat-lbl">Student Attempts</div>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="cbt-table-card">
        {/* Table Filters Bar */}
        <div className="cbt-table-toolbar">
          <div className="cbt-toolbar-left">
            <span className="cbt-toolbar-label">
              <Filter size={14} /> Filter:
            </span>
            <select
              className="cbt-toolbar-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">All Exam Types</option>
              <option value="GUJCET">GUJCET</option>
              <option value="JEE">JEE (Main)</option>
              <option value="NEET">NEET</option>
            </select>

            <select
              className="cbt-toolbar-select"
              value={filterStandard}
              onChange={(e) => setFilterStandard(e.target.value)}
            >
              <option value="ALL">All Standards</option>
              <option value="STD_11">Standard 11</option>
              <option value="STD_12">Standard 12</option>
            </select>
          </div>

          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing {filteredExams.length} of {totalExams} exams
          </span>
        </div>

        {/* Exams Table */}
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <div className="cbt-spinner" style={{ margin: '0 auto 12px' }}></div>
            Loading CBT exams...
          </div>
        ) : filteredExams.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
            <p style={{ fontSize: '0.9rem', marginBottom: '14px' }}>No CBT exams found matching criteria.</p>
            <button
              className="cbt-btn-primary"
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              onClick={() => {
                setExamToEdit(null);
                setShowCreateModal(true);
              }}
            >
              + Create First Exam
            </button>
          </div>
        ) : (
          <div className="cbt-table-responsive">
            <table className="cbt-data-table">
              <thead>
                <tr>
                  <th>Exam Title & Code</th>
                  <th>Type & Stream</th>
                  <th>Timings & Schedule</th>
                  <th>Duration & Marks</th>
                  <th>Takers</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr key={exam._id}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{exam.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                        {exam.examCode}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span
                          className={`cbt-type-badge ${
                            exam.examType === 'JEE'
                              ? 'cbt-type-jee'
                              : exam.examType === 'NEET'
                              ? 'cbt-type-neet'
                              : 'cbt-type-gujcet'
                          }`}
                        >
                          {exam.examType}
                        </span>
                        <span className="cbt-group-pill">{exam.streamGroup}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {exam.subjects?.join(', ') || 'Physics, Chemistry, Maths'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', color: '#1e293b' }}>
                        <strong>Starts:</strong>{' '}
                        {new Date(exam.startTime).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Ends: {new Date(exam.windowEndTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                        {exam.durationMinutes} mins • {exam.totalMarks} Marks
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {exam.questions?.length || 0} Questions
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                        <Users size={14} style={{ color: '#2563eb' }} />
                        <span>{exam.takersCount || 0}</span>
                      </div>
                    </td>
                    <td>
                      {exam.status === 'EVALUATED' ? (
                        <span className="cbt-status-pill cbt-status-submitted">Evaluated</span>
                      ) : exam.status === 'ACTIVE' ? (
                        <span className="cbt-status-pill cbt-status-started">Active</span>
                      ) : (
                        <span className="cbt-status-pill cbt-status-absent">Scheduled</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {/* Show Question Paper */}
                        <button
                          className="cbt-action-btn cbt-action-btn--paper"
                          title="Show Question Paper with Options & Correct Answer Keys"
                          onClick={() => setSelectedExamForPaper(exam)}
                        >
                          <FileText size={14} />
                          <span>Show Question Paper</span>
                        </button>

                        {/* Live Monitor */}
                        <button
                          className="cbt-action-btn cbt-action-btn--monitor"
                          title="Live Monitor & Anti-Cheating Control"
                          onClick={() => setActiveMonitorExamId(exam._id)}
                        >
                          <MonitorCheck size={14} />
                          <span>Monitor</span>
                        </button>

                        {/* Evaluate button */}
                        <button
                          className="cbt-action-btn cbt-action-btn--evaluate"
                          title="Evaluate & Calculate Results"
                          onClick={() => handleEvaluate(exam)}
                        >
                          <Award size={14} />
                          <span>Evaluate</span>
                        </button>

                        {/* View Analysis (Disabled until results are published) */}
                        {(() => {
                          const isPublished = exam.isResultPublished || exam.status === 'EVALUATED';
                          return (
                            <button
                              className={`cbt-action-btn cbt-action-btn--analysis ${!isPublished ? 'opacity-50 cursor-not-allowed pointer-events-auto' : ''}`}
                              title={
                                isPublished
                                  ? 'View Analysis & Leaderboard'
                                  : 'Analysis disabled until assistant faculty publishes result of exam'
                              }
                              disabled={!isPublished}
                              onClick={() => {
                                if (isPublished) {
                                  navigate(`/assistant/cbt-exam/analysis/${exam._id}`);
                                } else {
                                  alert('Please evaluate the exam first to publish results and unlock the Analysis page.');
                                }
                              }}
                            >
                              <BarChart3 size={14} />
                              <span>Analysis</span>
                            </button>
                          );
                        })()}

                        {/* Edit */}
                        <button
                          className="cbt-action-icon-btn"
                          title="Edit Exam"
                          onClick={() => {
                            setExamToEdit(exam);
                            setShowCreateModal(true);
                          }}
                        >
                          <Edit size={14} />
                        </button>

                        {/* Delete */}
                        <button
                          className="cbt-action-icon-btn"
                          style={{ color: '#ef4444' }}
                          title="Delete Exam"
                          onClick={() => handleDelete(exam)}
                        >
                          <Trash2 size={14} />
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

      {/* Show Question Paper Modal */}
      {selectedExamForPaper && (
        <CbtQuestionPaperModal
          exam={selectedExamForPaper}
          onClose={() => setSelectedExamForPaper(null)}
        />
      )}

      {/* Live Monitor Modal */}
      {activeMonitorExamId && (
        <CbtLiveMonitorModal
          examId={activeMonitorExamId}
          onClose={() => setActiveMonitorExamId(null)}
        />
      )}

      {/* Create / Edit Exam Modal */}
      {showCreateModal && (
        <CbtCreateExamModal
          examToEdit={examToEdit}
          onClose={() => {
            setShowCreateModal(false);
            setExamToEdit(null);
          }}
          onExamSaved={loadExams}
        />
      )}
    </div>
  );
}
