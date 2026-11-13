import React, { useState, useEffect } from 'react';
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
import CbtAnalysisModal from '../../components/cbt/CbtAnalysisModal';
import CbtLiveMonitorModal from '../../components/cbt/CbtLiveMonitorModal';
import CbtCreateExamModal from '../../components/cbt/CbtCreateExamModal';

export default function AssistantCbtExam() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStandard, setFilterStandard] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [examToEdit, setExamToEdit] = useState(null);
  const [activeAnalysisExamId, setActiveAnalysisExamId] = useState(null);
  const [activeMonitorExamId, setActiveMonitorExamId] = useState(null);

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
        // Automatically open analysis view!
        setActiveAnalysisExamId(exam._id);
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
    <div className="cbt-assistant-page p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <MonitorCheck size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                CBT Examination Management
              </h1>
              <p className="text-sm text-slate-500">
                JEE / NEET / GUJCET Computer-Based Tests, Kiosk Security & Analytics
              </p>
            </div>
          </div>
        </div>

        <button
          className="cbt-btn-primary flex items-center gap-2 px-4 py-2.5"
          onClick={() => {
            setExamToEdit(null);
            setShowCreateModal(true);
          }}
        >
          <Plus size={18} />
          <span>Create New CBT Exam</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cbt-stat-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{totalExams}</div>
            <div className="text-xs text-slate-500">Total CBT Exams</div>
          </div>
        </div>

        <div className="cbt-stat-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{activeCount}</div>
            <div className="text-xs text-slate-500">Active Exams</div>
          </div>
        </div>

        <div className="cbt-stat-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{evaluatedCount}</div>
            <div className="text-xs text-slate-500">Evaluated & Published</div>
          </div>
        </div>

        <div className="cbt-stat-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{totalTakers}</div>
            <div className="text-xs text-slate-500">Student Attempts</div>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Filters Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Filter size={14} /> Filter:
            </span>
            <select
              className="cbt-form-select text-xs py-1.5 px-3 w-auto"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">All Exam Types</option>
              <option value="GUJCET">GUJCET</option>
              <option value="JEE">JEE (Main)</option>
              <option value="NEET">NEET</option>
            </select>

            <select
              className="cbt-form-select text-xs py-1.5 px-3 w-auto"
              value={filterStandard}
              onChange={(e) => setFilterStandard(e.target.value)}
            >
              <option value="ALL">All Standards</option>
              <option value="STD_11">Standard 11</option>
              <option value="STD_12">Standard 12</option>
            </select>
          </div>

          <span className="text-xs text-slate-500">
            Showing {filteredExams.length} of {totalExams} exams
          </span>
        </div>

        {/* Exams Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="cbt-spinner mx-auto mb-2"></div>
            Loading CBT exams...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No CBT exams found matching criteria.</p>
            <button
              className="cbt-btn-primary mt-3 text-xs px-3 py-1.5"
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
                      <div className="font-bold text-slate-900">{exam.title}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{exam.examCode}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 mb-1">
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
                        <span className="cbt-group-pill text-[11px]">{exam.streamGroup}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {exam.subjects?.join(', ') || 'Physics, Chemistry, Maths'}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs text-slate-700">
                        <strong>Starts:</strong>{' '}
                        {new Date(exam.startTime).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="text-xs text-slate-400">
                        Ends: {new Date(exam.windowEndTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs font-semibold text-slate-800">
                        {exam.durationMinutes} mins • {exam.totalMarks} Marks
                      </div>
                      <div className="text-xs text-slate-400">
                        {exam.questions?.length || 0} Questions
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Users size={14} className="text-blue-600" />
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
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Live Monitor */}
                        <button
                          className="cbt-action-btn cbt-action-btn--monitor"
                          title="Live Monitor & Anti-Cheating Control"
                          onClick={() => setActiveMonitorExamId(exam._id)}
                        >
                          <MonitorCheck size={15} />
                          <span className="hidden xl:inline text-xs">Monitor</span>
                        </button>

                        {/* Evaluate button */}
                        <button
                          className="cbt-action-btn cbt-action-btn--evaluate"
                          title="Evaluate & Calculate Results"
                          onClick={() => handleEvaluate(exam)}
                        >
                          <Award size={15} />
                          <span className="hidden xl:inline text-xs">Evaluate</span>
                        </button>

                        {/* View Analysis (Photo 1) */}
                        <button
                          className="cbt-action-btn cbt-action-btn--analysis"
                          title="View Analysis & Leaderboard"
                          onClick={() => setActiveAnalysisExamId(exam._id)}
                        >
                          <BarChart3 size={15} />
                          <span className="hidden xl:inline text-xs">Analysis</span>
                        </button>

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
                          className="cbt-action-icon-btn text-red-500 hover:text-red-700"
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

      {/* Analysis Modal (Photo 1) */}
      {activeAnalysisExamId && (
        <CbtAnalysisModal
          examId={activeAnalysisExamId}
          onClose={() => setActiveAnalysisExamId(null)}
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
