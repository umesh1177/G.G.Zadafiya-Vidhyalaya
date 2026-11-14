import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Lock, Eye, Pencil, Trash2, XCircle } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { facultyApi } from '../../services/facultyApi';
import { normalizeBaseSubject } from '../../utils/syllabusUtils';

const SUBJECT_TRACK_OPTIONS = [
  'Physics',
  'Physics (Board)',
  'Physics (JEE)',
  'Chemistry',
  'Chemistry (Board)',
  'Chemistry (JEE)',
  'Chemistry (NEET)',
  'Mathematics',
  'Mathematics (Board)',
  'Mathematics (JEE)',
  'Biology',
  'Biology (Board)',
  'Biology (NEET)',
  'Lab — Physics/Chemistry',
  'Lab — Biology',
];

// ─── Reusable Table Pagination Component ─────────────────────────────────────
function getWindowedPages(safePage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = [1];
  if (safePage > 3) pages.push('left-ellipsis');
  const start = Math.max(2, safePage - 1);
  const end = Math.min(totalPages - 1, safePage + 1);
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }
  if (safePage < totalPages - 2) pages.push('right-ellipsis');
  pages.push(totalPages);
  return pages;
}

function TablePagination({ totalItems, currentPage, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);
  const pages = getWindowedPages(safePage, totalPages);

  if (totalItems === 0) return null;

  return (
    <div className="pagination-bar" style={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#64748B', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span>Showing <strong style={{ color: '#0F172A' }}>{startItem}</strong> to <strong style={{ color: '#0F172A' }}>{endItem}</strong> of <strong style={{ color: '#0F172A' }}>{totalItems}</strong> entries</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#334155'
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="pagination-bar__controls">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: '1px solid #CBD5E1',
            background: safePage === 1 ? '#F1F5F9' : '#FFFFFF',
            color: safePage === 1 ? '#94A3B8' : '#334155',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: safePage === 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Previous
        </button>

        {pages.map(page => (
          typeof page === 'string' ? (
            <span key={page} style={{ padding: '0 4px', color: '#64748B', fontWeight: 700 }}>…</span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              style={{
                minWidth: 32,
                height: 32,
                padding: '0 8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                border: page === safePage ? '1px solid #123B5D' : '1px solid #CBD5E1',
                background: page === safePage ? '#123B5D' : '#FFFFFF',
                color: page === safePage ? '#FFFFFF' : '#334155',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {page}
            </button>
          )
        ))}

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: '1px solid #CBD5E1',
            background: safePage === totalPages ? '#F1F5F9' : '#FFFFFF',
            color: safePage === totalPages ? '#94A3B8' : '#334155',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ─── Main FacultyManagement Component ────────────────────────────────────────
export default function FacultyManagement({ defaultTab } = {}) {
  const { setHeader } = useOutletContext();

  useEffect(() => {
    setHeader({
      title: 'Faculty Management',
      subtitle: 'Subject Faculty & Assistant Faculty records'
    });
  }, [setHeader]);

  // Active Tab: 'active-faculty' | 'subject-faculty' | 'assistant-faculty' | 'deactivated' | 'register-faculty'
  const [activeTab, setActiveTab] = useState(
    defaultTab === 'add-faculty' || defaultTab === 'register-faculty'
      ? 'register-faculty'
      : 'active-faculty'
  );

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');

  // Pagination State
  const [facultyPage, setFacultyPage] = useState(1);
  const [facultyPageSize, setFacultyPageSize] = useState(10);

  // Faculty State
  const [facultyList, setFacultyList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [actionToast, setActionToast] = useState(null);

  const showToast = (msg) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 4000);
  };

  // Modals
  const [viewingFaculty, setViewingFaculty] = useState(null);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editError, setEditError] = useState(null);

  // Form State
  const emptyFacultyForm = {
    firstName: '',
    middleName: '',
    lastName: '',
    empCode: '',
    role: 'Subject Faculty',
    subject: 'Physics',
    qualification: '',
    contactNo: '',
    email: '',
    password: 'faculty123',
    experience: '3 Years',
    joiningDate: new Date().toISOString().split('T')[0],
    schoolName: 'G.G. Zadafiya Vidhyalaya',
  };
  const [facultyForm, setFacultyForm] = useState(emptyFacultyForm);

  // ─── Load Faculty directly from MongoDB backend API ───────────────────────
  const loadFaculty = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await facultyApi.getFaculty({ status: '' });
      setFacultyList(data || []);
      setBackendStatus('connected');
    } catch (err) {
      console.error('Failed to load faculty from MongoDB:', err.message);
      setBackendStatus('offline');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFaculty();
    const onFocus = () => loadFaculty(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = facultyList.filter(f => f.status === 'ACTIVE');
    return {
      total: active.length,
      subjectFaculty: active.filter(f => f.role === 'Subject Faculty').length,
      assistantFaculty: active.filter(f => f.role === 'Assistant Faculty').length,
      deactivated: facultyList.filter(f => f.status === 'DEACTIVATED').length,
    };
  }, [facultyList]);

  // ─── Multi-Faculty Subject Mapping (shows subjects with >=2 active teachers) ───
  const multiFacultySubjects = useMemo(() => {
    const groups = new Map();
    facultyList
      .filter(f => f.status === 'ACTIVE' && f.role === 'Subject Faculty')
      .forEach(f => {
        const base = normalizeBaseSubject(f.subject);
        if (!groups.has(base)) groups.set(base, []);
        groups.get(base).push(f);
      });
    return Array.from(groups.entries())
      .filter(([, list]) => list.length > 1)
      .map(([subject, members]) => ({ subject, members }));
  }, [facultyList]);

  // ─── Filtered Faculty ─────────────────────────────────────────────────────
  const filteredFaculty = useMemo(() => {
    return facultyList.filter(f => {
      // Tab-based status/role filter
      if (activeTab === 'deactivated') {
        if (f.status !== 'DEACTIVATED') return false;
      } else {
        if (f.status === 'DEACTIVATED') return false;
        if (activeTab === 'subject-faculty' && f.role !== 'Subject Faculty') return false;
        if (activeTab === 'assistant-faculty' && f.role !== 'Assistant Faculty') return false;
      }

      // Dropdown filters (base subject matches all tracks unless exact track chosen)
      if (filterSubject) {
        if (['Physics', 'Chemistry', 'Mathematics', 'Biology'].includes(filterSubject)) {
          if (normalizeBaseSubject(f.subject) !== filterSubject && !String(f.subject || '').includes(filterSubject)) {
            return false;
          }
        } else if (f.subject !== filterSubject) {
          return false;
        }
      }
      if (filterRole && f.role !== filterRole) return false;

      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = (f.fullName || '').toLowerCase().includes(q);
        const matchEmail = (f.email || '').toLowerCase().includes(q);
        const matchCode = (f.empCode || '').toLowerCase().includes(q);
        const matchSubject = (f.subject || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchCode && !matchSubject) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'name-asc') return (a.fullName || '').localeCompare(b.fullName || '');
      if (sortBy === 'name-desc') return (b.fullName || '').localeCompare(a.fullName || '');
      if (sortBy === 'code-asc') return (a.empCode || '').localeCompare(b.empCode || '');
      if (sortBy === 'date-desc') return new Date(b.joiningDate || 0) - new Date(a.joiningDate || 0);
      return 0;
    });
  }, [facultyList, activeTab, filterSubject, filterRole, searchTerm, sortBy]);

  // ─── Paginated Faculty ────────────────────────────────────────────────────
  const paginatedFaculty = useMemo(() => {
    const start = (facultyPage - 1) * facultyPageSize;
    return filteredFaculty.slice(start, start + facultyPageSize);
  }, [filteredFaculty, facultyPage, facultyPageSize]);

  // ─── Reset Filters ────────────────────────────────────────────────────────
  const resetFilters = () => {
    setSearchTerm('');
    setFilterSubject('');
    setFilterRole('');
    setSortBy('name-asc');
    setFacultyPage(1);
  };

  // ─── Create Faculty ───────────────────────────────────────────────────────
  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!facultyForm.firstName || !facultyForm.lastName) {
      setFormError('First Name and Last Name are required.');
      return;
    }

    const count = facultyList.length + 1;
    const empCode = facultyForm.empCode?.trim().toUpperCase() || `FAC${100 + count}`;
    const fullName = [facultyForm.firstName, facultyForm.middleName, facultyForm.lastName].filter(Boolean).join(' ');
    const email = facultyForm.email?.trim().toLowerCase() || `${facultyForm.firstName.toLowerCase()}.${facultyForm.lastName.toLowerCase()}@ggzv.edu.in`;
    const password = facultyForm.password?.trim() || 'faculty123';

    const payload = {
      ...facultyForm,
      empCode,
      fullName,
      email,
      password,
      status: 'ACTIVE',
    };

    try {
      const serverResult = await facultyApi.createFaculty(payload);
      const normalizedCreated = {
        ...serverResult,
        id: serverResult.id || serverResult._id,
        fullName: serverResult.fullName || payload.fullName,
      };
      setFacultyList(prev => [normalizedCreated, ...prev]);
      setFacultyForm(emptyFacultyForm);
      setSearchTerm('');
      setFilterSubject('');
      setFilterRole('');
      setFacultyPage(1);
      setFormSuccess(null);
      setActiveTab('active-faculty');
      showToast(`Faculty ${normalizedCreated.fullName} (${normalizedCreated.empCode || empCode}) registered and synced!`);
      loadFaculty(true);
    } catch (err) {
      setFormError(err.message || 'Failed to save faculty in MongoDB');
    }
  };

  // ─── Update Faculty (Directly in MongoDB) ────────────────────────────────
  const handleUpdateFaculty = async (e) => {
    e.preventDefault();
    if (!editingFaculty) return;

    const targetId = editingFaculty.id || editingFaculty._id;
    const fullName = [editingFaculty.firstName, editingFaculty.middleName, editingFaculty.lastName]
      .filter(Boolean).join(' ') || editingFaculty.fullName;

    const payload = {
      ...editingFaculty,
      fullName,
    };

    setEditError(null);
    try {
      const updated = await facultyApi.updateFaculty(targetId, payload);
      const normalizedUpdated = {
        ...updated,
        id: updated.id || updated._id || targetId,
        fullName: updated.fullName || fullName,
      };
      setFacultyList(prev => prev.map(f =>
        ((f.id || f._id) === targetId) ? normalizedUpdated : f
      ));
      setEditingFaculty(null);
      showToast(`${normalizedUpdated.fullName} updated immediately!`);
      loadFaculty(true);
    } catch (err) {
      setEditError(err.message || 'Failed to update faculty in database');
    }
  };

  // ─── Delete Faculty (Directly in MongoDB) ────────────────────────────────
  const handleDeleteFaculty = async (faculty) => {
    const targetId = faculty.id || faculty._id;
    if (!window.confirm(`Are you sure you want to permanently delete faculty record for ${faculty.fullName} (${faculty.empCode}) from the database?`)) {
      return;
    }

    try {
      await facultyApi.deleteFaculty(targetId);
      setFacultyList(prev => {
        const remaining = prev.filter(f => (f.id || f._id) !== targetId);
        const maxPg = Math.max(1, Math.ceil(remaining.length / facultyPageSize));
        if (facultyPage > maxPg) setFacultyPage(maxPg);
        return remaining;
      });
      showToast(`Faculty record ${faculty.fullName} deleted.`);
      loadFaculty(true);
    } catch (err) {
      showToast(`${err.message || 'Failed to delete faculty from database'}`);
    }
  };

  // ─── Helper: Role Chip ────────────────────────────────────────────────────
  const renderRoleChip = (role) => {
    if (role === 'Assistant Faculty') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: 6,
          background: '#ECFDF5',
          color: '#047857',
          fontWeight: 700,
          fontSize: 12,
          border: '1px solid #A7F3D0'
        }}>
          ● Assistant Faculty
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 6,
        background: '#EFF6FF',
        color: '#1D4ED8',
        fontWeight: 700,
        fontSize: 12,
        border: '1px solid #BFDBFE'
      }}>
        ● Subject Faculty
      </span>
    );
  };

  return (
    <div className="content">

      {/* ── Live CRUD Success Toast ── */}
      {actionToast && (
        <div className="banner banner-success" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={14} style={{marginRight:4}}/><span>{actionToast}</span>
        </div>
      )}

      {/* ── Offline Notice ── */}
      {backendStatus === 'offline' && (
        <div style={{
          background: '#FFFBEB',
          border: '1px solid #FCD34D',
          borderLeft: '4px solid #F59E0B',
          borderRadius: 8,
          padding: '12px 18px',
          marginBottom: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          fontSize: 13,
          color: '#92400E'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18}/>
            <span><strong>Backend Server Offline:</strong> Run <code style={{ background: '#FEF3C7', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>npm run backend</code> to connect to MongoDB localhost.</span>
          </div>
          <button
            onClick={loadFaculty}
            style={{
              background: '#FFFFFF',
              border: '1px solid #FCD34D',
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              color: '#92400E'
            }}
          >
            <><RefreshCw size={13} style={{marginRight:4}}/>Retry</>
          </button>
        </div>
      )}

      {/* ── 1. KPI CARDS ── */}
      <div className="kpi-grid-4">
        {/* Total Active Faculty */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderTop: '3.5px solid #123B5D',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(18, 59, 93, 0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Faculty
            </span>
            <span style={{ background: '#E8F1F8', color: '#123B5D', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
              TOTAL
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#123B5D', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
            {stats.total}
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 6, fontWeight: 500 }}>
            Teaching &amp; Lab Staff
          </div>
        </div>

        {/* Subject Faculty */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderTop: '3.5px solid #1D4ED8',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(29, 78, 216, 0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Subject Faculty
            </span>
            <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
              LECTURE / LT
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
            {stats.subjectFaculty}
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 6, fontWeight: 500 }}>
            Physics · Chem · Maths · Bio
          </div>
        </div>

        {/* Assistant Faculty */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderTop: '3.5px solid #059669',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(5, 150, 105, 0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Assistant Faculty
            </span>
            <span style={{ background: '#ECFDF5', color: '#059669', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
              LAB &amp; MARKS
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
            {stats.assistantFaculty}
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 6, fontWeight: 500 }}>
            LT Checking &amp; Practical
          </div>
        </div>

        {/* Deactivated Faculty */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderTop: '3.5px solid #64748B',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(100, 116, 139, 0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Deactivated
            </span>
            <span style={{ background: '#F1F5F9', color: '#64748B', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
              ARCHIVE
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
            {stats.deactivated}
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 6, fontWeight: 500 }}>
            Past / Resigned Staff
          </div>
        </div>
      </div>

      {/* ── 2. STYLED TABS CONTAINER (MATCHING StudentManagement) ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#EDF3F8',
        padding: '8px 10px',
        borderRadius: 14,
        border: '1px solid #CBDDEB',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* All Faculty Tab */}
          <button
            onClick={() => { setActiveTab('active-faculty'); setFacultyPage(1); }}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'active-faculty' ? '#123B5D' : '#FFFFFF',
              color: activeTab === 'active-faculty' ? '#FFFFFF' : '#334155',
              border: activeTab === 'active-faculty' ? '1px solid #123B5D' : '1px solid #CBD5E1',
              boxShadow: activeTab === 'active-faculty' ? '0 2px 8px rgba(18, 59, 93, 0.25)' : 'none',
            }}
          >
            All Faculty ({facultyList.filter(f => f.status === 'ACTIVE').length})
          </button>

          {/* Subject Faculty Tab */}
          <button
            onClick={() => { setActiveTab('subject-faculty'); setFacultyPage(1); }}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'subject-faculty' ? '#123B5D' : '#FFFFFF',
              color: activeTab === 'subject-faculty' ? '#FFFFFF' : '#1D4ED8',
              border: activeTab === 'subject-faculty' ? '1px solid #123B5D' : '1px solid #BFDBFE',
              boxShadow: activeTab === 'subject-faculty' ? '0 2px 8px rgba(18, 59, 93, 0.25)' : 'none',
            }}
          >
            Subject Faculty ({stats.subjectFaculty})
          </button>

          {/* Assistant Faculty Tab */}
          <button
            onClick={() => { setActiveTab('assistant-faculty'); setFacultyPage(1); }}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'assistant-faculty' ? '#123B5D' : '#FFFFFF',
              color: activeTab === 'assistant-faculty' ? '#FFFFFF' : '#047857',
              border: activeTab === 'assistant-faculty' ? '1px solid #123B5D' : '1px solid #A7F3D0',
              boxShadow: activeTab === 'assistant-faculty' ? '0 2px 8px rgba(18, 59, 93, 0.25)' : 'none',
            }}
          >
            Assistant Faculty ({stats.assistantFaculty})
          </button>

          {/* Deactivated Tab */}
          <button
            onClick={() => { setActiveTab('deactivated'); setFacultyPage(1); }}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'deactivated' ? '#123B5D' : '#FFFFFF',
              color: activeTab === 'deactivated' ? '#FFFFFF' : '#64748B',
              border: activeTab === 'deactivated' ? '1px solid #123B5D' : '1px solid #CBD5E1',
              boxShadow: activeTab === 'deactivated' ? '0 2px 8px rgba(18, 59, 93, 0.25)' : 'none',
            }}
          >
            Deactivated ({stats.deactivated})
          </button>

          {/* Register Faculty Tab */}
          <button
            onClick={() => setActiveTab('register-faculty')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'register-faculty' ? '#123B5D' : '#FFFFFF',
              color: activeTab === 'register-faculty' ? '#FFFFFF' : '#123B5D',
              border: activeTab === 'register-faculty' ? '1px solid #123B5D' : '1px solid #B4CBE2',
              boxShadow: activeTab === 'register-faculty' ? '0 2px 8px rgba(18, 59, 93, 0.25)' : 'none',
            }}
          >
            + Register Faculty
          </button>
        </div>

        {isLoading && (
          <span style={{ fontSize: 12.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #CBD5E1', borderTopColor: '#123B5D', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            Syncing MongoDB...
          </span>
        )}
      </div>

      {/* ── 3. FACULTY TABLE TABS ── */}
      {activeTab !== 'register-faculty' && (
        <div style={{ marginTop: 0 }}>
          {multiFacultySubjects.length > 0 && (
            <div style={{
              background: '#F0F7FC',
              border: '1px solid #C8DBED',
              borderLeft: '4px solid #123B5D',
              borderRadius: 10,
              padding: '10px 16px',
              marginBottom: 14,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              fontSize: 12.5,
              color: '#1E293B',
            }}>
              <span style={{ fontWeight: 800, color: '#123B5D' }}>
                <><Lock size={13} style={{marginRight:4}}/>Multi-Faculty Subject Assignment (Isolated Progress):</>
              </span>
              {multiFacultySubjects.map(grp => (
                <span key={grp.subject} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#FFFFFF',
                  border: '1px solid #D1E1EF',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 12,
                }}>
                  <strong style={{ color: '#123B5D' }}>{grp.subject}:</strong>
                  <span>{grp.members.map(m => `${m.fullName} (${m.subject})`).join(' · ')}</span>
                </span>
              ))}
            </div>
          )}

          {/* Enhanced 2-Tier Filter Toolbar */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            {/* Row 1: Search Input */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <input
                type="text"
                className="field-input w-full"
                placeholder="Search by name, employee code, email, subject..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setFacultyPage(1); }}
                style={{ paddingLeft: 38, height: 42, borderRadius: 8, fontSize: 13.5 }}
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Row 2: Dropdown Filters */}
            <div className="filter-grid-4" style={{ alignItems: 'end' }}>
              {/* Subject Filter */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>
                  Subject
                </label>
                <select
                  className="filter-select w-full"
                  value={filterSubject}
                  onChange={e => { setFilterSubject(e.target.value); setFacultyPage(1); }}
                  style={{ height: 38, borderRadius: 8 }}
                >
                  <option value="">All Subjects</option>
                  <option value="Physics">Physics (All Tracks)</option>
                  <option value="Chemistry">Chemistry (All Tracks)</option>
                  <option value="Chemistry (Board)">Chemistry (Board)</option>
                  <option value="Chemistry (JEE)">Chemistry (JEE)</option>
                  <option value="Chemistry (NEET)">Chemistry (NEET)</option>
                  <option value="Mathematics">Mathematics (All Tracks)</option>
                  <option value="Biology">Biology (All Tracks)</option>
                  <option value="Lab — Physics/Chemistry">Lab — Physics/Chemistry</option>
                  <option value="Lab — Biology">Lab — Biology</option>
                </select>
              </div>

              {/* Role Filter */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>
                  Faculty Role
                </label>
                <select
                  className="filter-select w-full"
                  value={filterRole}
                  onChange={e => { setFilterRole(e.target.value); setFacultyPage(1); }}
                  style={{ height: 38, borderRadius: 8 }}
                >
                  <option value="">All Roles</option>
                  <option value="Subject Faculty">Subject Faculty</option>
                  <option value="Assistant Faculty">Assistant Faculty</option>
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>
                  Sort By
                </label>
                <select
                  className="filter-select w-full"
                  value={sortBy}
                  onChange={e => { setSortBy(e.target.value); setFacultyPage(1); }}
                  style={{ height: 38, borderRadius: 8 }}
                >
                  <option value="name-asc">Name (A → Z)</option>
                  <option value="name-desc">Name (Z → A)</option>
                  <option value="code-asc">Employee Code</option>
                  <option value="date-desc">Newest First</option>
                </select>
              </div>

              {/* Reset or Count */}
              <div style={{ paddingTop: 18 }}>
                {(searchTerm || filterSubject || filterRole || sortBy !== 'name-asc') ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={resetFilters}
                    style={{ height: 38, padding: '0 14px', borderRadius: 8, color: '#EF4444', borderColor: '#FCA5A5', width: '100%' }}
                  >
                    Reset Filters
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                    {filteredFaculty.length} records
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                    <th style={{ width: 90, padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Emp Code</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Faculty Member</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Subject</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Faculty Role</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Qualification</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Experience</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ textAlign: 'center', width: 170, padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFaculty.map(faculty => (
                    <tr key={faculty.id || faculty._id || faculty.empCode} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      {/* Employee Code */}
                      <td style={{ padding: '14px 16px' }}>
                        <span className="num" style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          background: '#E8F1F8',
                          color: '#123B5D',
                          borderRadius: 6,
                          fontWeight: 800,
                          fontSize: 12.5,
                          border: '1px solid #D1E1EF'
                        }}>
                          {faculty.empCode}
                        </span>
                      </td>

                      {/* Faculty Identity */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: '#123B5D',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 12.5,
                            flexShrink: 0
                          }}>
                            {faculty.fullName ? faculty.fullName.split(' ').map(n => n[0]).slice(0, 2).join('') : 'FC'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>{faculty.fullName}</div>
                            <div style={{ fontSize: 11.5, color: '#64748B' }}>{faculty.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Subject */}
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: '#1E293B' }}>{faculty.subject}</strong>
                      </td>

                      {/* Role Chip */}
                      <td style={{ padding: '14px 16px' }}>{renderRoleChip(faculty.role)}</td>

                      {/* Qualification */}
                      <td style={{ padding: '14px 16px', color: '#334155', fontSize: 12.5 }}>
                        {faculty.qualification || 'M.Sc., B.Ed.'}
                      </td>

                      {/* Experience */}
                      <td className="num" style={{ padding: '14px 16px', color: '#334155' }}>
                        {faculty.experience || '—'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        {faculty.status === 'DEACTIVATED' ? (
                          <span className="chip chip-neutral" style={{ color: '#64748B' }}>Deactivated</span>
                        ) : (
                          <span className="chip chip-success" style={{ fontWeight: 700 }}>Active</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 9px', fontSize: 12, borderRadius: 6 }}
                            title="View Profile"
                            onClick={() => setViewingFaculty(faculty)}
                          >
                            <Eye size={13} style={{marginRight:4}}/>View
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 9px', fontSize: 12, borderRadius: 6 }}
                            title="Edit Faculty"
                            onClick={() => { setEditError(null); setEditingFaculty({ ...faculty }); }}
                          >
                            <Pencil size={13} style={{marginRight:4}}/>Edit
                          </button>
                          <button
                            className="btn btn-danger-ghost btn-sm"
                            style={{ padding: '5px 9px', fontSize: 12, borderRadius: 6 }}
                            title="Delete Faculty"
                            onClick={() => handleDeleteFaculty(faculty)}
                          >
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {paginatedFaculty.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
                        No faculty records match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <TablePagination
              totalItems={filteredFaculty.length}
              currentPage={facultyPage}
              pageSize={facultyPageSize}
              onPageChange={setFacultyPage}
              onPageSizeChange={setFacultyPageSize}
            />
          </div>
        </div>
      )}

      {/* ── 4. REGISTER FACULTY FORM TAB ── */}
      {activeTab === 'register-faculty' && (
        <div className="card" style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 32px' }}>
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 16, marginBottom: 24 }}>
            <div className="card__title" style={{ fontSize: 20, marginBottom: 4 }}>Register New Faculty Member</div>
            <div className="card__desc" style={{ fontSize: 13.5 }}>
              Onboard teaching and laboratory personnel into the Science stream school faculty registry (saved directly to MongoDB)
            </div>
          </div>

          {formError && (
            <div className="banner banner-danger" style={{ marginBottom: 20 }}>
              <AlertTriangle size={14} style={{marginRight:4}}/><span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="banner banner-success" style={{ marginBottom: 20 }}>
              <CheckCircle2 size={14} style={{marginRight:4}}/><span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateFaculty}>
            {/* Section 1: Identity */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#123B5D', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                1. Faculty Identity &amp; Full Name
              </div>
              <div className="form-grid-3">
                <div>
                  <label className="field-label">First Name *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. Ramesh"
                    required
                    value={facultyForm.firstName}
                    onChange={e => setFacultyForm({ ...facultyForm, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Middle Name</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. K."
                    value={facultyForm.middleName}
                    onChange={e => setFacultyForm({ ...facultyForm, middleName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Last Name *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. Joshi"
                    required
                    value={facultyForm.lastName}
                    onChange={e => setFacultyForm({ ...facultyForm, lastName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Role & Department */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#123B5D', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                2. Academic Role &amp; Subject Specialization
              </div>
              <div className="form-grid-3">
                <div>
                  <label className="field-label">Faculty Role *</label>
                  <select
                    className="filter-select w-full"
                    value={facultyForm.role}
                    onChange={e => setFacultyForm({ ...facultyForm, role: e.target.value })}
                  >
                    <option value="Subject Faculty">Subject Faculty (Lectures &amp; LT Sets)</option>
                    <option value="Assistant Faculty">Assistant Faculty (Lab &amp; Marks)</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Subject Taken *</label>
                  <select
                    className="filter-select w-full"
                    value={facultyForm.subject}
                    onChange={e => setFacultyForm({ ...facultyForm, subject: e.target.value })}
                  >
                    {SUBJECT_TRACK_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Employee Code <span style={{ color: '#64748B', fontWeight: 400 }}>(Optional, auto-generated)</span></label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. FAC108"
                    value={facultyForm.empCode}
                    onChange={e => setFacultyForm({ ...facultyForm, empCode: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Professional Info & Contact */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#123B5D', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                3. Qualifications &amp; Official Contact Details
              </div>
              <div className="form-grid-2" style={{ marginBottom: 14 }}>
                <div>
                  <label className="field-label">Mobile Contact *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="+91 99887 00000"
                    required
                    value={facultyForm.contactNo}
                    onChange={e => setFacultyForm({ ...facultyForm, contactNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Joining Date</label>
                  <input
                    type="date"
                    className="field-input w-full"
                    value={facultyForm.joiningDate}
                    onChange={e => setFacultyForm({ ...facultyForm, joiningDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div>
                  <label className="field-label">Highest Academic Qualification</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. M.Sc. Physics (Gold Medalist), B.Ed."
                    value={facultyForm.qualification}
                    onChange={e => setFacultyForm({ ...facultyForm, qualification: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Prior Teaching Experience</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. 5 Years in Higher Secondary Science"
                    value={facultyForm.experience}
                    onChange={e => setFacultyForm({ ...facultyForm, experience: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Portal Login Credentials */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#123B5D', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                4. Portal Login Credentials &amp; Account Security
              </div>
              <div className="form-grid-2" style={{ background: '#F8FAFC', padding: '16px 18px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div>
                  <label className="field-label">Official Portal Login Email *</label>
                  <input
                    type="email"
                    className="field-input w-full"
                    placeholder="e.g. ramesh.joshi@ggzv.edu.in"
                    value={facultyForm.email}
                    onChange={e => setFacultyForm({ ...facultyForm, email: e.target.value })}
                  />
                  <span style={{ fontSize: 11.5, color: '#64748B', marginTop: 4, display: 'block' }}>
                    Used by faculty to sign in to their dashboard. If blank, auto-generated from name.
                  </span>
                </div>
                <div>
                  <label className="field-label">Portal Account Password *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. faculty123"
                    required
                    value={facultyForm.password}
                    onChange={e => setFacultyForm({ ...facultyForm, password: e.target.value })}
                  />
                  <span style={{ fontSize: 11.5, color: '#64748B', marginTop: 4, display: 'block' }}>
                    Initial password for portal login. Faculty can update this in their profile.
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 18 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setActiveTab('active-faculty'); setFormError(null); }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ minWidth: 180 }}>
                Save &amp; Register Faculty
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── 5. VIEW FACULTY MODAL (WITH UPDATE BUTTON) ── */}
      {viewingFaculty && (
        <div
          className="modal-overlay is-open"
          onClick={e => { if (e.target.classList.contains('modal-overlay')) setViewingFaculty(null); }}
        >
          <div className="modal-box" style={{ maxWidth: 580 }}>
            <div className="modal-box__head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#123B5D',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 18
                }}>
                  {viewingFaculty.fullName ? viewingFaculty.fullName.split(' ').map(n => n[0]).slice(0, 2).join('') : 'FC'}
                </div>
                <div>
                  <div className="card__title" style={{ fontSize: 18 }}>{viewingFaculty.fullName}</div>
                  <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                    Emp Code <span className="num" style={{ fontWeight: 800, color: '#123B5D' }}>#{viewingFaculty.empCode}</span>
                    &nbsp;·&nbsp;{viewingFaculty.subject}
                    &nbsp;·&nbsp;<span className={`chip ${viewingFaculty.status === 'ACTIVE' ? 'chip-success' : 'chip-neutral'}`} style={{ padding: '1px 8px', fontSize: 11 }}>{viewingFaculty.status}</span>
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setViewingFaculty(null)}>✕</button>
            </div>

            <div style={{ padding: '6px 0 16px' }}>
              <div className="detail-panel__row">
                <span>Faculty Role</span>
                <span>{renderRoleChip(viewingFaculty.role)}</span>
              </div>
              <div className="detail-panel__row">
                <span>Subject Taken</span>
                <span style={{ fontWeight: 600 }}>{viewingFaculty.subject}</span>
              </div>
              <div className="detail-panel__row">
                <span>Academic Qualification</span>
                <span>{viewingFaculty.qualification || 'M.Sc., B.Ed.'}</span>
              </div>
              <div className="detail-panel__row">
                <span>Teaching Experience</span>
                <span className="num" style={{ fontWeight: 600 }}>{viewingFaculty.experience || '—'}</span>
              </div>
              <div className="detail-panel__row">
                <span>Primary Mobile Contact</span>
                <span className="num" style={{ fontWeight: 600 }}>{viewingFaculty.contactNo || '—'}</span>
              </div>
              <div className="detail-panel__row">
                <span>Official Email</span>
                <span style={{ color: '#123B5D', fontWeight: 600 }}>{viewingFaculty.email || '—'}</span>
              </div>
              <div className="detail-panel__row" style={{ background: '#F8FAFC', padding: '6px 10px', borderRadius: 6 }}>
                <span>Portal Login Identifier</span>
                <span style={{ fontWeight: 700, color: '#123B5D' }}>{viewingFaculty.email || viewingFaculty.empCode}</span>
              </div>
              <div className="detail-panel__row">
                <span>Joining Date</span>
                <span className="num">{viewingFaculty.joiningDate ? String(viewingFaculty.joiningDate).split('T')[0] : '—'}</span>
              </div>
              {viewingFaculty.resignationDate && (
                <div className="detail-panel__row">
                  <span>Resignation Date</span>
                  <span className="num" style={{ color: '#EF4444' }}>{String(viewingFaculty.resignationDate).split('T')[0]}</span>
                </div>
              )}
            </div>

            {/* Modal Actions: UPDATE BUTTON INSIDE VIEW MODAL */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontWeight: 700, color: '#123B5D', borderColor: '#CBD5E1' }}
                onClick={() => {
                  setEditError(null);
                  setEditingFaculty({ ...viewingFaculty });
                  setViewingFaculty(null);
                }}
              >
                <><Pencil size={13} style={{marginRight:4}}/>Update Profile</>
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setViewingFaculty(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. EDIT FACULTY MODAL ── */}
      {editingFaculty && (
        <div
          className="modal-overlay is-open"
          onClick={e => { if (e.target.classList.contains('modal-overlay')) { setEditingFaculty(null); setEditError(null); } }}
        >
          <div className="modal-box" style={{ maxWidth: 660 }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">Edit Faculty Profile</div>
                <div className="card__desc">Update records for {editingFaculty.fullName} ({editingFaculty.empCode}) directly in MongoDB</div>
              </div>
              <button className="modal-close" onClick={() => { setEditingFaculty(null); setEditError(null); }}>✕</button>
            </div>

            <form onSubmit={handleUpdateFaculty}>
              {editError && (
                <div className="banner banner-danger" style={{ marginTop: 14, marginBottom: 4 }}>
                  <AlertTriangle size={14} style={{marginRight:4}}/><span>{editError}</span>
                </div>
              )}
              <div className="form-grid-2" style={{ margin: '18px 0' }}>
                <div>
                  <label className="field-label">First Name *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    required
                    value={editingFaculty.firstName || ''}
                    onChange={e => setEditingFaculty({ ...editingFaculty, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Middle Name</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    value={editingFaculty.middleName || ''}
                    onChange={e => setEditingFaculty({ ...editingFaculty, middleName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Last Name *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    required
                    value={editingFaculty.lastName || ''}
                    onChange={e => setEditingFaculty({ ...editingFaculty, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Employee Code</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    value={editingFaculty.empCode || ''}
                    onChange={e => setEditingFaculty({ ...editingFaculty, empCode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Faculty Role *</label>
                  <select
                    className="filter-select w-full"
                    value={editingFaculty.role}
                    onChange={e => setEditingFaculty({ ...editingFaculty, role: e.target.value })}
                  >
                    <option value="Subject Faculty">Subject Faculty (Lectures &amp; LT Sets)</option>
                    <option value="Assistant Faculty">Assistant Faculty (Lab &amp; Marks)</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Subject Specialization *</label>
                  <select
                    className="filter-select w-full"
                    value={editingFaculty.subject}
                    onChange={e => setEditingFaculty({ ...editingFaculty, subject: e.target.value })}
                  >
                    {!SUBJECT_TRACK_OPTIONS.includes(editingFaculty.subject) && editingFaculty.subject && (
                      <option value={editingFaculty.subject}>{editingFaculty.subject}</option>
                    )}
                    {SUBJECT_TRACK_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Contact Number *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    required
                    value={editingFaculty.contactNo || ''}
                    onChange={e => setEditingFaculty({ ...editingFaculty, contactNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Email Address</label>
                  <input
                    type="email"
                    className="field-input w-full"
                    value={editingFaculty.email || ''}
                    onChange={e => setEditingFaculty({ ...editingFaculty, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Qualification</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    value={editingFaculty.qualification || ''}
                    onChange={e => setEditingFaculty({ ...editingFaculty, qualification: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Experience</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    value={editingFaculty.experience || ''}
                    onChange={e => setEditingFaculty({ ...editingFaculty, experience: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Joining Date</label>
                  <input
                    type="date"
                    className="field-input w-full"
                    value={editingFaculty.joiningDate ? String(editingFaculty.joiningDate).split('T')[0] : ''}
                    onChange={e => setEditingFaculty({ ...editingFaculty, joiningDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Portal Password <span style={{ color: '#64748B', fontWeight: 400 }}>(Reset/Update)</span></label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="Enter new password"
                    value={editingFaculty.password || ''}
                    onChange={e => setEditingFaculty({ ...editingFaculty, password: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                {/* Deactivate / Reactivate button on the left */}
                <button
                  type="button"
                  onClick={async () => {
                    const targetId = editingFaculty.id || editingFaculty._id;
                    const newStatus = editingFaculty.status === 'DEACTIVATED' ? 'ACTIVE' : 'DEACTIVATED';
                    const action = newStatus === 'DEACTIVATED' ? 'deactivate' : 'reactivate';
                    if (!window.confirm(`Are you sure you want to ${action} ${editingFaculty.fullName}?`)) return;
                    setEditError(null);
                    try {
                      const updated = await facultyApi.updateFaculty(
                        targetId,
                        { ...editingFaculty, status: newStatus }
                      );
                      const normalizedUpdated = {
                        ...updated,
                        id: updated.id || updated._id || targetId,
                      };
                      setFacultyList(prev => prev.map(f =>
                        ((f.id || f._id) === targetId) ? normalizedUpdated : f
                      ));
                      setEditingFaculty(null);
                      setEditError(null);
                      setActiveTab(newStatus === 'DEACTIVATED' ? 'deactivated' : 'active-faculty');
                      setFacultyPage(1);
                      showToast(`Faculty ${editingFaculty.fullName} ${newStatus === 'DEACTIVATED' ? 'deactivated' : 'reactivated'} and synced!`);
                      loadFaculty(true);
                    } catch (err) {
                      setEditError(err.message || `Failed to ${action} faculty`);
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: editingFaculty.status === 'DEACTIVATED' ? '1px solid #A7F3D0' : '1px solid #FCA5A5',
                    background: editingFaculty.status === 'DEACTIVATED' ? '#ECFDF5' : '#FEF2F2',
                    color: editingFaculty.status === 'DEACTIVATED' ? '#047857' : '#DC2626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {editingFaculty.status === 'DEACTIVATED' ? 'Reactivate Faculty' : 'Deactivate Faculty'}
                </button>

                {/* Save / Cancel on the right */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => { setEditingFaculty(null); setEditError(null); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes to MongoDB
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
