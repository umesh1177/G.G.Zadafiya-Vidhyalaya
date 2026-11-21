import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { accessApi } from '../../services/accessApi';
import PaginationBar from '../../components/common/PaginationBar';
import {
  ShieldCheck,
  Eye,
  KeyRound,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  History,
  Users,
  GraduationCap,
  Sparkles,
  X,
  FileSpreadsheet,
  Award,
  BookOpen,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

export default function ManageAccess() {
  const { setHeader } = useOutletContext();
  const { user, updateUser } = useAuth();

  useEffect(() => {
    setHeader({
      title: 'Manage Access',
      subtitle:
        'Configure dashboard navigation tabs, exam marks entry, and LT marks entry permissions for faculties & assistants',
    });
  }, [setHeader]);

  // Master catalog & data states
  const [masterConfig, setMasterConfig] = useState({
    tabs: [],
    examSubjects: [],
    ltSubjects: [],
  });
  const [faculties, setFaculties] = useState([]);
  const [statistics, setStatistics] = useState({
    totalFaculties: 0,
    subjectFacultiesCount: 0,
    assistantFacultiesCount: 0,
    totalLogsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  // Search & Filters for Faculty Table
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');

  // Pagination for Faculty Table
  const [facultyPage, setFacultyPage] = useState(1);
  const FACULTY_PAGE_SIZE = 8;

  // Modals state
  const [viewingFaculty, setViewingFaculty] = useState(null);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editTabs, setEditTabs] = useState([]);
  const [editExamSubjects, setEditExamSubjects] = useState([]);
  const [editLtSubjects, setEditLtSubjects] = useState([]);
  const [editNote, setEditNote] = useState('');

  // Access History state
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historySearch, setHistorySearch] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [viewingLogDetail, setViewingLogDetail] = useState(null);
  const HISTORY_PAGE_SIZE = 6;

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToastMsg({ message, type });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Load faculty & master configuration
  const loadFaculties = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await accessApi.getFaculties({
        search: searchTerm,
        role: roleFilter,
        subject: subjectFilter,
      });
      setFaculties(data.faculties || []);
      if (data.statistics) setStatistics(data.statistics);
      if (data.masterCatalog) setMasterConfig(data.masterCatalog);
    } catch (err) {
      console.error('Failed to load faculties:', err);
      showToast('Error loading faculties: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, roleFilter, subjectFilter]);

  // Load access history
  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const data = await accessApi.getAccessHistory({
        search: historySearch,
        page: historyPage,
        limit: HISTORY_PAGE_SIZE,
      });
      setHistoryRecords(data.records || []);
      setHistoryTotal(data.total || 0);
      setHistoryTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [historySearch, historyPage]);

  useEffect(() => {
    loadFaculties();
  }, [loadFaculties]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Client-side pagination for faculty table
  const paginatedFaculties = useMemo(() => {
    const startIndex = (facultyPage - 1) * FACULTY_PAGE_SIZE;
    return faculties.slice(startIndex, startIndex + FACULTY_PAGE_SIZE);
  }, [faculties, facultyPage]);

  const totalFacultyPages = Math.ceil(faculties.length / FACULTY_PAGE_SIZE) || 1;

  // Open Edit Modal
  const openEditModal = (faculty) => {
    setEditingFaculty(faculty);
    const perms = faculty.permissions || {};
    setEditTabs(Array.isArray(perms.accessibleTabs) ? [...perms.accessibleTabs] : []);
    setEditExamSubjects(Array.isArray(perms.allowedExamSubjects) ? [...perms.allowedExamSubjects] : []);
    setEditLtSubjects(Array.isArray(perms.allowedLtSubjects) ? [...perms.allowedLtSubjects] : []);
    setEditNote('');
  };

  // Toggle Tab in Edit Modal
  const handleToggleTab = (tabId) => {
    setEditTabs((prev) =>
      prev.includes(tabId) ? prev.filter((id) => id !== tabId) : [...prev, tabId]
    );
  };

  // Toggle Exam Subject
  const handleToggleExamSubject = (sub) => {
    setEditExamSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  // Toggle LT Subject
  const handleToggleLtSubject = (sub) => {
    setEditLtSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  // Select Default Role Tabs
  const handleResetToRoleDefaults = () => {
    if (!editingFaculty) return;
    const isAssistant = editingFaculty.role === 'Assistant Faculty';
    if (isAssistant) {
      setEditTabs([
        '/assistant/lt',
        '/assistant/cbt-exam',
        '/assistant/exam',
        '/assistant/result',
        '/assistant/hall-ticket',
        '/assistant/notice',
        '/assistant/discipline-remark',
      ]);
      setEditExamSubjects(['Physics', 'Chemistry', 'Mathematics', 'Biology']);
      setEditLtSubjects(['Physics', 'Chemistry', 'Mathematics', 'Biology']);
    } else {
      setEditTabs([
        '/faculty/set-lt',
        '/faculty/exam-unit',
        '/faculty/syllabus',
        '/faculty/reports',
        '/faculty/notice',
      ]);
      const rawSub = String(editingFaculty.subject || '').toLowerCase();
      const detected = [];
      if (rawSub.includes('physics')) detected.push('Physics');
      if (rawSub.includes('chem')) detected.push('Chemistry');
      if (rawSub.includes('math')) detected.push('Mathematics');
      if (rawSub.includes('bio')) detected.push('Biology');
      const fallback = detected.length > 0 ? detected : [editingFaculty.subject || 'Physics'];
      setEditExamSubjects(fallback);
      setEditLtSubjects(fallback);
    }
  };

  // Select All Tabs
  const handleSelectAllTabs = () => {
    setEditTabs(masterConfig.tabs.map((t) => t.id));
  };

  // Clear All Tabs
  const handleClearAllTabs = () => {
    setEditTabs([]);
  };

  // Save Permissions
  const handleSaveAccess = async () => {
    if (!editingFaculty) return;
    setIsSaving(true);
    try {
      const res = await accessApi.updateFacultyAccess(editingFaculty.id || editingFaculty._id, {
        accessibleTabs: editTabs,
        allowedExamSubjects: editExamSubjects,
        allowedLtSubjects: editLtSubjects,
        note: editNote,
        changedBy: user?.name || 'Principal',
      });

      showToast(`Permissions updated successfully for ${editingFaculty.fullName}!`, 'success');

      // If current logged-in user is this faculty, update local AuthContext & localStorage
      if (user && (user.id === editingFaculty.id || user.empCode === editingFaculty.empCode)) {
        if (typeof updateUser === 'function') {
          updateUser({ permissions: res.faculty.permissions });
        }
      }

      setEditingFaculty(null);
      loadFaculties();
      loadHistory();
    } catch (err) {
      console.error('Save access failed:', err);
      showToast(err.message || 'Failed to save access permissions', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Group tabs by Workspace for Edit & View Modals
  const groupedTabs = useMemo(() => {
    const principalTabs = masterConfig.tabs.filter((t) => t.group === 'Principal');
    const facultyTabs = masterConfig.tabs.filter((t) => t.group === 'Faculty');
    const assistantTabs = masterConfig.tabs.filter((t) => t.group === 'Assistant');
    return { principalTabs, facultyTabs, assistantTabs };
  }, [masterConfig.tabs]);

  // Tab readable name lookup
  const getTabLabel = (id) => {
    const found = masterConfig.tabs.find((t) => t.id === id);
    return found ? found.label : id.replace(/^\/[^/]+\//, '');
  };

  return (
    <div className="manage-access-page" style={{ paddingBottom: 60 }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 99999,
            background: toastMsg.type === 'error' ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMsg.message}</span>
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="kpi-grid-4" style={{ marginBottom: 24 }}>
        {/* Total Staff */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #123B5D' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Staff
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                {statistics.totalFaculties}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                Active faculty & lab assistants
              </div>
            </div>
            <div
              style={{
                background: '#E0F2FE',
                color: '#0284C7',
                padding: 10,
                borderRadius: 12,
                display: 'inline-flex',
              }}
            >
              <Users size={24} />
            </div>
          </div>
        </div>

        {/* Subject Faculties */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #0284C7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Subject Faculties
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                {statistics.subjectFacultiesCount}
              </div>
              <div style={{ fontSize: 12, color: '#0284C7', marginTop: 4 }}>
                Teachers & lecturers
              </div>
            </div>
            <div
              style={{
                background: '#F0F9FF',
                color: '#0284C7',
                padding: 10,
                borderRadius: 12,
                display: 'inline-flex',
              }}
            >
              <GraduationCap size={24} />
            </div>
          </div>
        </div>

        {/* Assistant Faculties */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #7C3AED' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Assistant Faculties
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                {statistics.assistantFacultiesCount}
              </div>
              <div style={{ fontSize: 12, color: '#7C3AED', marginTop: 4 }}>
                Lab techs & exam assistants
              </div>
            </div>
            <div
              style={{
                background: '#EDE9FE',
                color: '#7C3AED',
                padding: 10,
                borderRadius: 12,
                display: 'inline-flex',
              }}
            >
              <KeyRound size={24} />
            </div>
          </div>
        </div>

        {/* Audit Log Entries */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #10B981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                Access Modifications
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                {statistics.totalLogsCount}
              </div>
              <div style={{ fontSize: 12, color: '#10B981', marginTop: 4 }}>
                Logged security audit events
              </div>
            </div>
            <div
              style={{
                background: '#ECFDF5',
                color: '#10B981',
                padding: 10,
                borderRadius: 12,
                display: 'inline-flex',
              }}
            >
              <History size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Card: Staff Permissions Management */}
      <div className="card" style={{ marginBottom: 32, padding: '24px 24px' }}>
        {/* Title & Description */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  background: '#F0F7FC',
                  color: '#123B5D',
                  padding: 8,
                  borderRadius: 8,
                  display: 'inline-flex',
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                Staff Access & Permission Control
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: 13.5, color: '#64748B' }}>
              Grant or revoke specific dashboard tabs, assign authorized subject exam marks entry, and set LT marks entry privileges.
            </p>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setRoleFilter('ALL');
              setSubjectFilter('ALL');
              loadFaculties();
            }}
            type="button"
            className="btn btn--outline"
            style={{ fontSize: 13, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={15} />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            background: '#F8FAFC',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            marginBottom: 20,
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search
              size={17}
              color="#94A3B8"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search faculty name, code, email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setFacultyPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                borderRadius: 8,
                border: '1.5px solid #CBD5E1',
                fontSize: 13.5,
                background: '#FFFFFF',
              }}
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setFacultyPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1.5px solid #CBD5E1',
                fontSize: 13.5,
                background: '#FFFFFF',
                color: '#1E293B',
              }}
            >
              <option value="ALL">All Roles (Subject & Assistant)</option>
              <option value="Subject Faculty">Subject Faculty Only</option>
              <option value="Assistant Faculty">Assistant Faculty Only</option>
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setFacultyPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1.5px solid #CBD5E1',
                fontSize: 13.5,
                background: '#FFFFFF',
                color: '#1E293B',
              }}
            >
              <option value="ALL">All Subjects</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Biology">Biology</option>
            </select>
          </div>
        </div>

        {/* Faculties Table */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748B' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
            Loading faculties and permission profiles...
          </div>
        ) : paginatedFaculties.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              background: '#F8FAFC',
              borderRadius: 12,
              border: '1.5px dashed #CBD5E1',
              color: '#64748B',
            }}
          >
            <ShieldCheck size={36} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: 16, color: '#1E293B' }}>No faculties found</h3>
            <p style={{ margin: 0, fontSize: 13 }}>Try clearing your search query or filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#F1F5F9' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: '#475569' }}>
                    Faculty Member
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: '#475569' }}>
                    Role & Subject
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: '#475569' }}>
                    Accessible Tabs
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: '#475569' }}>
                    Exam Marks Access
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: '#475569' }}>
                    LT Marks Access
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: '#475569' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedFaculties.map((fac) => {
                  const perms = fac.permissions || {};
                  const tabs = perms.accessibleTabs || [];
                  const examSubs = perms.allowedExamSubjects || [];
                  const ltSubs = perms.allowedLtSubjects || [];
                  const isAssistant = fac.role === 'Assistant Faculty';

                  return (
                    <tr key={fac.id || fac._id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      {/* Name & EmpCode */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background: isAssistant ? '#EDE9FE' : '#E0F2FE',
                              color: isAssistant ? '#7C3AED' : '#0284C7',
                              fontWeight: 800,
                              fontSize: 13,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {(fac.fullName || 'FC').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
                              {fac.fullName}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748B', display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, color: '#123B5D' }}>{fac.empCode}</span>
                              {fac.email && <span>• {fac.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Subject */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              display: 'inline-block',
                              width: 'fit-content',
                              background: isAssistant ? '#EDE9FE' : '#E0F2FE',
                              color: isAssistant ? '#6D28D9' : '#0369A1',
                            }}
                          >
                            {fac.role}
                          </span>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                            {fac.subject || 'General'}
                          </span>
                        </div>
                      </td>

                      {/* Accessible Tabs */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', maxWidth: 220 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: '#F1F5F9',
                              color: '#1E293B',
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            {tabs.length} Tabs Active
                          </span>
                          {perms.isCustomized && (
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                background: '#FEF3C7',
                                color: '#B45309',
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              Custom
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: '#64748B',
                            marginTop: 4,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 200,
                          }}
                          title={tabs.map(getTabLabel).join(', ')}
                        >
                          {tabs.slice(0, 3).map(getTabLabel).join(', ')}
                          {tabs.length > 3 ? ` +${tabs.length - 3} more` : ''}
                        </div>
                      </td>

                      {/* Exam Marks Subjects */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', maxWidth: 180 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {examSubs.slice(0, 2).map((s) => (
                            <span
                              key={s}
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                background: '#ECFDF5',
                                color: '#047857',
                                padding: '2px 6px',
                                borderRadius: 5,
                              }}
                            >
                              {s}
                            </span>
                          ))}
                          {examSubs.length > 2 && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                background: '#F1F5F9',
                                color: '#475569',
                                padding: '2px 6px',
                                borderRadius: 5,
                              }}
                              title={examSubs.join(', ')}
                            >
                              +{examSubs.length - 2}
                            </span>
                          )}
                          {examSubs.length === 0 && (
                            <span style={{ fontSize: 11.5, color: '#94A3B8' }}>None</span>
                          )}
                        </div>
                      </td>

                      {/* LT Marks Subjects */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', maxWidth: 180 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {ltSubs.slice(0, 2).map((s) => (
                            <span
                              key={s}
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                background: '#EFF6FF',
                                color: '#1D4ED8',
                                padding: '2px 6px',
                                borderRadius: 5,
                              }}
                            >
                              {s}
                            </span>
                          ))}
                          {ltSubs.length > 2 && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                background: '#F1F5F9',
                                color: '#475569',
                                padding: '2px 6px',
                                borderRadius: 5,
                              }}
                              title={ltSubs.join(', ')}
                            >
                              +{ltSubs.length - 2}
                            </span>
                          )}
                          {ltSubs.length === 0 && (
                            <span style={{ fontSize: 11.5, color: '#94A3B8' }}>None</span>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'center' }}>
                          {/* View Access Button */}
                          <button
                            type="button"
                            onClick={() => setViewingFaculty(fac)}
                            className="btn btn--outline"
                            title="View current access permissions"
                            style={{
                              padding: '6px 12px',
                              fontSize: 12.5,
                              fontWeight: 700,
                              borderColor: '#CBD5E1',
                              color: '#1E293B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <Eye size={14} color="#0284C7" />
                            <span>View</span>
                          </button>

                          {/* Edit Access Button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(fac)}
                            className="btn btn--primary"
                            title="Edit dashboard tabs and marks permissions"
                            style={{
                              padding: '6px 12px',
                              fontSize: 12.5,
                              fontWeight: 700,
                              background: '#123B5D',
                              borderColor: '#123B5D',
                              color: '#FFFFFF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <KeyRound size={14} />
                            <span>Edit Access</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Faculty Pagination */}
        {totalFacultyPages > 1 && (
          <div style={{ marginTop: 20 }}>
            <PaginationBar
              currentPage={facultyPage}
              totalPages={totalFacultyPages}
              onPageChange={setFacultyPage}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: ACCESS AUDIT HISTORY TABLE */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: '24px 24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: '#ECFDF5',
                color: '#10B981',
                padding: 8,
                borderRadius: 8,
                display: 'inline-flex',
              }}
            >
              <History size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0F172A' }}>
                Access Modification History
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: 13, color: '#64748B' }}>
                Audit trail recording every permission change executed by the Principal.
              </p>
            </div>
          </div>

          {/* Search within History */}
          <div style={{ position: 'relative', width: 280 }}>
            <Search
              size={16}
              color="#94A3B8"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Filter history logs..."
              value={historySearch}
              onChange={(e) => {
                setHistorySearch(e.target.value);
                setHistoryPage(1);
              }}
              style={{
                width: '100%',
                padding: '7px 10px 7px 34px',
                borderRadius: 8,
                border: '1.5px solid #CBD5E1',
                fontSize: 13,
                background: '#FFFFFF',
              }}
            />
          </div>
        </div>

        {/* History Table */}
        {isHistoryLoading ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748B' }}>
            <div className="spinner" style={{ margin: '0 auto 10px auto' }} />
            Loading access history records...
          </div>
        ) : historyRecords.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '36px 20px',
              background: '#F8FAFC',
              borderRadius: 12,
              border: '1px dashed #CBD5E1',
              color: '#64748B',
            }}
          >
            <Info size={32} color="#94A3B8" style={{ margin: '0 auto 8px auto' }} />
            <h4 style={{ margin: '0 0 4px 0', fontSize: 15, color: '#1E293B' }}>
              No access modifications recorded yet
            </h4>
            <p style={{ margin: 0, fontSize: 12.5 }}>
              Whenever you edit a faculty's dashboard tabs or marks entry permissions, the audit event will appear here.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#475569' }}>
                    Timestamp
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#475569' }}>
                    Faculty Member
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#475569' }}>
                    Changed By
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#475569' }}>
                    Modifications Summary
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#475569' }}>
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {historyRecords.map((log) => {
                  const dateStr = log.createdAt
                    ? new Date(log.createdAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : '—';

                  return (
                    <tr key={log._id || log.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#475569', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={13} color="#94A3B8" />
                          <span>{dateStr}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A' }}>
                          {log.facultyName}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748B' }}>
                          {log.facultyEmpCode} • {log.facultyRole}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            background: '#F0F7FC',
                            color: '#123B5D',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {log.changedBy || 'Principal'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#1E293B' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>
                          {log.summary}
                        </div>
                        {log.note && (
                          <div style={{ fontSize: 11.5, color: '#64748B', fontStyle: 'italic' }}>
                            Note: "{log.note}"
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setViewingLogDetail(log)}
                          className="btn btn--outline"
                          style={{ padding: '4px 10px', fontSize: 11.5, fontWeight: 600 }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* History Pagination */}
        {historyTotalPages > 1 && (
          <div style={{ marginTop: 18 }}>
            <PaginationBar
              currentPage={historyPage}
              totalPages={historyTotalPages}
              onPageChange={setHistoryPage}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW ACCESS DETAILS */}
      {/* ========================================================================= */}
      {viewingFaculty && (
        <div
          className="modal-overlay is-open"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setViewingFaculty(null)}
        >
          <div
            className="modal-content"
            style={{
              background: '#FFFFFF',
              borderRadius: 18,
              width: '100%',
              maxWidth: 720,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.28)',
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #123B5D 0%, #0F2D48 100%)',
                color: '#FFFFFF',
                padding: '20px 24px',
                borderRadius: '18px 18px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.18)',
                    color: '#6EE7B7',
                    fontWeight: 800,
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {(viewingFaculty.fullName || 'FC').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#FFFFFF' }}>
                    {viewingFaculty.fullName}
                  </h3>
                  <div style={{ fontSize: 12.5, color: '#CBD5E1', display: 'flex', gap: 8, marginTop: 2 }}>
                    <span>{viewingFaculty.empCode}</span>
                    <span>• {viewingFaculty.role}</span>
                    <span>• {viewingFaculty.subject}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingFaculty(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 24px' }}>
              {/* Category 1: Accessible Dashboard Tabs */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                  Accessible Dashboard Tabs ({viewingFaculty.permissions?.accessibleTabs?.length || 0})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                  {masterConfig.tabs.map((tab) => {
                    const hasAccess = (viewingFaculty.permissions?.accessibleTabs || []).includes(tab.id);
                    return (
                      <div
                        key={tab.id}
                        style={{
                          border: hasAccess ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                          background: hasAccess ? '#F0FDF4' : '#F8FAFC',
                          borderRadius: 10,
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          opacity: hasAccess ? 1 : 0.55,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: hasAccess ? '#065F46' : '#64748B' }}>
                            {tab.label}
                          </div>
                          <div style={{ fontSize: 10.5, color: '#94A3B8' }}>{tab.group} Workspace</div>
                        </div>
                        {hasAccess ? (
                          <CheckCircle2 size={16} color="#10B981" />
                        ) : (
                          <XCircle size={16} color="#CBD5E1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category 2: Exam Marks Entry Permissions */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                  Exam Marks Entry Authorized Subjects
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {masterConfig.examSubjects.map((sub) => {
                    const isAllowed = (viewingFaculty.permissions?.allowedExamSubjects || []).includes(sub);
                    return (
                      <span
                        key={sub}
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          padding: '5px 12px',
                          borderRadius: 8,
                          border: isAllowed ? '1.5px solid #059669' : '1px solid #E2E8F0',
                          background: isAllowed ? '#ECFDF5' : '#F8FAFC',
                          color: isAllowed ? '#065F46' : '#94A3B8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {isAllowed && <Check size={14} color="#059669" />}
                        {sub}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Category 3: LT Marks Entry Permissions */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                  Daily LT Marks Entry Authorized Subjects
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {masterConfig.ltSubjects.map((sub) => {
                    const isAllowed = (viewingFaculty.permissions?.allowedLtSubjects || []).includes(sub);
                    return (
                      <span
                        key={sub}
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          padding: '5px 12px',
                          borderRadius: 8,
                          border: isAllowed ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                          background: isAllowed ? '#EFF6FF' : '#F8FAFC',
                          color: isAllowed ? '#1E40AF' : '#94A3B8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {isAllowed && <Check size={14} color="#2563EB" />}
                        {sub}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                borderTop: '1px solid #E2E8F0',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                background: '#F8FAFC',
                borderRadius: '0 0 18px 18px',
              }}
            >
              <button
                type="button"
                onClick={() => setViewingFaculty(null)}
                className="btn btn--outline"
                style={{ fontSize: 13, padding: '8px 18px' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewingFaculty;
                  setViewingFaculty(null);
                  openEditModal(target);
                }}
                className="btn btn--primary"
                style={{
                  fontSize: 13,
                  padding: '8px 20px',
                  background: '#123B5D',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <KeyRound size={15} />
                <span>Edit Permissions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT ACCESS PERMISSIONS (INTERACTIVE TOGGLES) */}
      {/* ========================================================================= */}
      {editingFaculty && (
        <div
          className="modal-overlay is-open"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setEditingFaculty(null)}
        >
          <div
            className="modal-content"
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 820,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.32)',
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #123B5D 0%, #0F2D48 100%)',
                color: '#FFFFFF',
                padding: '20px 24px',
                borderRadius: '20px 20px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <KeyRound size={22} color="#6EE7B7" />
                  <h3 style={{ margin: 0, fontSize: 18.5, fontWeight: 800, color: '#FFFFFF' }}>
                    Edit Access Permissions: {editingFaculty.fullName}
                  </h3>
                </div>
                <div style={{ fontSize: 12.5, color: '#CBD5E1', marginTop: 3 }}>
                  {editingFaculty.empCode} • {editingFaculty.role} • Primary Subject: {editingFaculty.subject}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingFaculty(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions Helper */}
            <div
              style={{
                padding: '12px 24px',
                background: '#F0F7FC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ fontSize: 12.5, color: '#1E293B', fontWeight: 600 }}>
                Active Selection: <span style={{ color: '#0284C7', fontWeight: 800 }}>{editTabs.length} tabs</span>,{' '}
                <span style={{ color: '#059669', fontWeight: 800 }}>{editExamSubjects.length} exam subjects</span>,{' '}
                <span style={{ color: '#2563EB', fontWeight: 800 }}>{editLtSubjects.length} LT subjects</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleResetToRoleDefaults}
                  className="btn btn--outline"
                  style={{ fontSize: 11.5, padding: '4px 10px', background: '#FFFFFF' }}
                >
                  Set Role Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllTabs}
                  className="btn btn--outline"
                  style={{ fontSize: 11.5, padding: '4px 10px', background: '#FFFFFF' }}
                >
                  Select All Tabs
                </button>
                <button
                  type="button"
                  onClick={handleClearAllTabs}
                  className="btn btn--outline"
                  style={{ fontSize: 11.5, padding: '4px 10px', background: '#FFFFFF' }}
                >
                  Clear All Tabs
                </button>
              </div>
            </div>

            {/* Modal Body: Toggles & Permissions */}
            <div style={{ padding: '24px 24px' }}>
              {/* Note / Advisory */}
              <div
                style={{
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  color: '#92400E',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <Info size={18} color="#D97706" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Tip:</strong> You can grant Principal Workspace tabs to any faculty or assistant simply by toggling them on. They will immediately see and access that tab in their dashboard menu!
                </span>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* GROUP A: Principal Dashboard Tabs */}
              {/* ------------------------------------------------------------- */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span
                    style={{
                      background: '#123B5D',
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    Principal Workspace Tabs
                  </span>
                  <span style={{ fontSize: 12.5, color: '#64748B' }}>
                    (Institutional management, analytics & reporting)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                  {groupedTabs.principalTabs.map((tab) => {
                    const isChecked = editTabs.includes(tab.id);
                    return (
                      <label
                        key={tab.id}
                        style={{
                          border: isChecked ? '1.5px solid #123B5D' : '1px solid #E2E8F0',
                          background: isChecked ? '#F0F7FC' : '#FFFFFF',
                          borderRadius: 12,
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTab(tab.id)}
                          style={{
                            width: 18,
                            height: 18,
                            marginTop: 2,
                            accentColor: '#123B5D',
                            cursor: 'pointer',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A' }}>
                            {tab.label}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                            {tab.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* GROUP B: Faculty Workspace Tabs */}
              {/* ------------------------------------------------------------- */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span
                    style={{
                      background: '#0284C7',
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    Faculty Workspace Tabs
                  </span>
                  <span style={{ fontSize: 12.5, color: '#64748B' }}>
                    (Daily teaching, Set LT, blueprints & syllabus)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                  {groupedTabs.facultyTabs.map((tab) => {
                    const isChecked = editTabs.includes(tab.id);
                    return (
                      <label
                        key={tab.id}
                        style={{
                          border: isChecked ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
                          background: isChecked ? '#F0F9FF' : '#FFFFFF',
                          borderRadius: 12,
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTab(tab.id)}
                          style={{
                            width: 18,
                            height: 18,
                            marginTop: 2,
                            accentColor: '#0284C7',
                            cursor: 'pointer',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A' }}>
                            {tab.label}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                            {tab.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* GROUP C: Assistant Workspace Tabs */}
              {/* ------------------------------------------------------------- */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span
                    style={{
                      background: '#7C3AED',
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    Assistant Workspace Tabs
                  </span>
                  <span style={{ fontSize: 12.5, color: '#64748B' }}>
                    (LT timer, CBT exams, marks entry & hall tickets)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                  {groupedTabs.assistantTabs.map((tab) => {
                    const isChecked = editTabs.includes(tab.id);
                    return (
                      <label
                        key={tab.id}
                        style={{
                          border: isChecked ? '1.5px solid #7C3AED' : '1px solid #E2E8F0',
                          background: isChecked ? '#FAF5FF' : '#FFFFFF',
                          borderRadius: 12,
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTab(tab.id)}
                          style={{
                            width: 18,
                            height: 18,
                            marginTop: 2,
                            accentColor: '#7C3AED',
                            cursor: 'pointer',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A' }}>
                            {tab.label}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                            {tab.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* SECTION: EXAM MARKS ENTRY SUBJECTS */}
              {/* ------------------------------------------------------------- */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 14,
                  padding: 18,
                  border: '1px solid #E2E8F0',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                      Exam Marks Entry Access
                    </h4>
                    <p style={{ margin: '3px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
                      Select which subjects' exam marks this faculty/assistant is authorized to enter.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditExamSubjects(masterConfig.examSubjects)}
                    className="btn btn--outline"
                    style={{ fontSize: 11.5, padding: '4px 8px', background: '#FFFFFF' }}
                  >
                    Select All
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {masterConfig.examSubjects.map((sub) => {
                    const isSelected = editExamSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => handleToggleExamSubject(sub)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 8,
                          border: isSelected ? '1.5px solid #059669' : '1px solid #CBD5E1',
                          background: isSelected ? '#ECFDF5' : '#FFFFFF',
                          color: isSelected ? '#065F46' : '#475569',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected ? <CheckCircle2 size={16} color="#059669" /> : <div style={{ width: 16 }} />}
                        <span>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* SECTION: LT MARKS ENTRY SUBJECTS */}
              {/* ------------------------------------------------------------- */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 14,
                  padding: 18,
                  border: '1px solid #E2E8F0',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                      Daily LT Marks Entry Access
                    </h4>
                    <p style={{ margin: '3px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
                      Select which LT subjects this assistant or faculty can enter grades/marks for.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditLtSubjects(masterConfig.ltSubjects)}
                    className="btn btn--outline"
                    style={{ fontSize: 11.5, padding: '4px 8px', background: '#FFFFFF' }}
                  >
                    Select All
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {masterConfig.ltSubjects.map((sub) => {
                    const isSelected = editLtSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => handleToggleLtSubject(sub)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 8,
                          border: isSelected ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          color: isSelected ? '#1E40AF' : '#475569',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected ? <CheckCircle2 size={16} color="#2563EB" /> : <div style={{ width: 16 }} />}
                        <span>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Change Reason Note */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Change Reason / Audit Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Granted Chemistry LT marks access for term evaluation duty"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 13.5,
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                borderTop: '1px solid #E2E8F0',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#F8FAFC',
                borderRadius: '0 0 20px 20px',
              }}
            >
              <button
                type="button"
                onClick={() => setEditingFaculty(null)}
                className="btn btn--outline"
                style={{ fontSize: 13, padding: '9px 18px' }}
                disabled={isSaving}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAccess}
                className="btn btn--primary"
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  padding: '10px 24px',
                  background: '#123B5D',
                  borderColor: '#123B5D',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} />
                    <span>Save Access Permissions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW AUDIT LOG INSPECT DETAILS */}
      {/* ========================================================================= */}
      {viewingLogDetail && (
        <div
          className="modal-overlay is-open"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setViewingLogDetail(null)}
        >
          <div
            className="modal-content"
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 580,
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.28)',
              padding: '24px 24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <History size={20} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                  Access Audit Event Detail
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingLogDetail(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, marginBottom: 16 }}>
              <div><strong>Faculty:</strong> {viewingLogDetail.facultyName} ({viewingLogDetail.facultyEmpCode})</div>
              <div><strong>Role:</strong> {viewingLogDetail.facultyRole}</div>
              <div><strong>Modified By:</strong> {viewingLogDetail.changedBy || 'Principal'}</div>
              <div>
                <strong>Timestamp:</strong>{' '}
                {new Date(viewingLogDetail.createdAt).toLocaleString('en-GB')}
              </div>
              {viewingLogDetail.note && <div><strong>Audit Note:</strong> "{viewingLogDetail.note}"</div>}
            </div>

            <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', marginBottom: 6 }}>
                Summary of Modifications:
              </div>
              <div style={{ fontWeight: 600, color: '#123B5D', fontSize: 13.5 }}>
                {viewingLogDetail.summary}
              </div>

              {Array.isArray(viewingLogDetail.details) && viewingLogDetail.details.length > 0 && (
                <ul style={{ margin: '10px 0 0 16px', padding: 0, fontSize: 12.5, color: '#475569' }}>
                  {viewingLogDetail.details.map((d, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {d}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setViewingLogDetail(null)}
                className="btn btn--primary"
                style={{ fontSize: 13, padding: '7px 18px', background: '#123B5D' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
