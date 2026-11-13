import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { studentApi } from '../../services/studentApi';

// Reusable Table Pagination Component
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

export default function StudentManagement() {
  const { setHeader } = useOutletContext();

  useEffect(() => {
    setHeader({
      title: 'Student Management',
      subtitle: 'Std 11–12 · Science Stream (Group A PCM & Group B PCB)'
    });
  }, [setHeader]);

  // Active Tab: 'active-students' | 'alumni' | 'register-student' | 'register-alumni'
  const [activeTab, setActiveTab] = useState('active-students');

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStandard, setFilterStandard] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [sortBy, setSortBy] = useState('roll-asc');

  // Pagination States
  const [activePage, setActivePage] = useState(1);
  const [activePageSize, setActivePageSize] = useState(5);
  const [alumniPage, setAlumniPage] = useState(1);
  const [alumniPageSize, setAlumniPageSize] = useState(5);

  // Database State
  const [studentsList, setStudentsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'connected' | 'offline'
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [actionToast, setActionToast] = useState(null);

  const showToast = (msg) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 4000);
  };

  // Modals
  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editError, setEditError] = useState(null);

  // Forms
  const emptyStudentForm = {
    firstName: '',
    middleName: '',
    lastName: '',
    rollNo: '',
    standard: 'STD_11',
    division: 'A',
    streamGroup: 'GROUP_A',
    contactNo: '',
    email: '',
    admissionDate: new Date().toISOString().split('T')[0],
    schoolName: 'G.G. Zadafiya Vidhyalaya',
  };
  const [studentForm, setStudentForm] = useState(emptyStudentForm);

  const emptyAlumniForm = {
    firstName: '',
    middleName: '',
    lastName: '',
    rollNo: '',
    standard: 'STD_12',
    division: 'A',
    streamGroup: 'GROUP_A',
    graduationYear: new Date().getFullYear().toString(),
    currentPursuit: '',
    endingDate: '',
    contactNo: '',
    email: '',
  };
  const [alumniForm, setAlumniForm] = useState(emptyAlumniForm);

  // ─── Fetch Directly from MongoDB ─────────────────────────────────────────────
  const loadStudents = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await studentApi.getStudents({ status: '' });
      setStudentsList(data || []);
      setBackendStatus('connected');
    } catch (err) {
      console.error('Failed to load students from MongoDB:', err.message);
      setBackendStatus('offline');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
    const onFocus = () => loadStudents(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // ─── Dynamic Metrics ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = studentsList.filter(s => s.status === 'ACTIVE');
    return {
      total: active.length,
      groupA: active.filter(s => s.streamGroup === 'GROUP_A').length,
      groupB: active.filter(s => s.streamGroup === 'GROUP_B').length,
      groupAB: active.filter(s => s.streamGroup === 'GROUP_AB').length,
      alumni: studentsList.filter(s => s.status === 'ALUMNI').length,
    };
  }, [studentsList]);

  // ─── Filtered Active Students ────────────────────────────────────────────────
  const filteredActiveStudents = useMemo(() => {
    return studentsList.filter(s => {
      if (s.status !== 'ACTIVE') return false;
      const matchStd = !filterStandard || s.standard === filterStandard;
      const matchDiv = !filterDivision || s.division === filterDivision;
      const matchGrp = !filterGroup || s.streamGroup === filterGroup;
      const matchSearch = !searchTerm ||
        s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(s.rollNo).includes(searchTerm) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contactNo?.includes(searchTerm);
      return matchStd && matchDiv && matchGrp && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'roll-asc') return (a.rollNo || 0) - (b.rollNo || 0);
      if (sortBy === 'roll-desc') return (b.rollNo || 0) - (a.rollNo || 0);
      if (sortBy === 'name-asc') return (a.fullName || '').localeCompare(b.fullName || '');
      if (sortBy === 'name-desc') return (b.fullName || '').localeCompare(a.fullName || '');
      return 0;
    });
  }, [studentsList, filterStandard, filterDivision, filterGroup, searchTerm, sortBy]);

  // Paginated Active Students
  const paginatedActiveStudents = useMemo(() => {
    const start = (activePage - 1) * activePageSize;
    return filteredActiveStudents.slice(start, start + activePageSize);
  }, [filteredActiveStudents, activePage, activePageSize]);

  // ─── Filtered Alumni Records ─────────────────────────────────────────────────
  const filteredAlumniStudents = useMemo(() => {
    return studentsList.filter(s => {
      if (s.status !== 'ALUMNI') return false;
      const matchSearch = !searchTerm ||
        s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(s.rollNo).includes(searchTerm) ||
        s.currentPursuit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    }).sort((a, b) => (b.graduationYear || 0) - (a.graduationYear || 0));
  }, [studentsList, searchTerm]);

  // Paginated Alumni Students
  const paginatedAlumniStudents = useMemo(() => {
    const start = (alumniPage - 1) * alumniPageSize;
    return filteredAlumniStudents.slice(start, start + alumniPageSize);
  }, [filteredAlumniStudents, alumniPage, alumniPageSize]);

  // ─── Uniqueness Check ────────────────────────────────────────────────────────
  const checkRollNoIsUnique = (rollNo, standard, division, excludeId = null) => {
    const num = Number(rollNo);
    return !studentsList.some(s =>
      s.rollNo === num &&
      s.standard === standard &&
      s.division === division &&
      (!excludeId || (s.id !== excludeId && s._id !== excludeId))
    );
  };

  // ─── Create Student (Directly in MongoDB) ────────────────────────────────────
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const roll = Number(studentForm.rollNo);
    if (!studentForm.firstName || !studentForm.lastName || !roll) {
      setFormError('First Name, Last Name, and Roll Number are required.');
      return;
    }

    if (!checkRollNoIsUnique(roll, studentForm.standard, studentForm.division)) {
      setFormError(`Roll No ${roll} already exists in Std ${studentForm.standard.replace('STD_', '')}-${studentForm.division}.`);
      return;
    }

    const payload = {
      ...studentForm,
      rollNo: roll,
      fullName: `${studentForm.firstName} ${studentForm.middleName ? studentForm.middleName + ' ' : ''}${studentForm.lastName}`.trim(),
      status: 'ACTIVE',
    };

    try {
      const created = await studentApi.createStudent(payload);
      const normalizedCreated = {
        ...created,
        id: created.id || created._id,
        fullName: created.fullName || payload.fullName,
      };
      setStudentsList(prev => [normalizedCreated, ...prev]);
      setStudentForm(emptyStudentForm);
      setSearchTerm('');
      setFilterStandard('');
      setFilterDivision('');
      setFilterGroup('');
      setActivePage(1);
      setFormSuccess(null);
      setActiveTab('active-students');
      showToast(`Student ${normalizedCreated.fullName} (Roll #${roll}) registered and synced!`);
      loadStudents(true);
    } catch (err) {
      setFormError(err.message || 'Failed to save student in MongoDB');
    }
  };

  // ─── Create Alumni (Directly in MongoDB) ─────────────────────────────────────
  const handleCreateAlumni = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const roll = Number(alumniForm.rollNo);
    if (!alumniForm.firstName || !alumniForm.lastName || !roll) {
      setFormError('First Name, Last Name, and Roll Number are required.');
      return;
    }

    const payload = {
      ...alumniForm,
      rollNo: roll,
      fullName: `${alumniForm.firstName} ${alumniForm.middleName ? alumniForm.middleName + ' ' : ''}${alumniForm.lastName}`.trim(),
      status: 'ALUMNI',
    };

    try {
      const created = await studentApi.createStudent(payload);
      const normalizedCreated = {
        ...created,
        id: created.id || created._id,
        fullName: created.fullName || payload.fullName,
      };
      setStudentsList(prev => [normalizedCreated, ...prev]);
      setAlumniForm(emptyAlumniForm);
      setSearchTerm('');
      setAlumniPage(1);
      setFormSuccess(null);
      setActiveTab('alumni');
      showToast(`Alumni ${normalizedCreated.fullName} registered and synced!`);
      loadStudents(true);
    } catch (err) {
      setFormError(err.message || 'Failed to save alumni in MongoDB');
    }
  };

  // ─── Update Student/Alumni (Directly in MongoDB) ─────────────────────────────
  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    const roll = Number(editingStudent.rollNo);
    const targetId = editingStudent.id || editingStudent._id;

    if (!checkRollNoIsUnique(roll, editingStudent.standard, editingStudent.division, targetId)) {
      setEditError(`Roll No ${roll} already belongs to another student in Std ${editingStudent.standard.replace('STD_', '')}-${editingStudent.division}.`);
      return;
    }

    const fullName = [editingStudent.firstName, editingStudent.middleName, editingStudent.lastName]
      .filter(Boolean).join(' ') || editingStudent.fullName;

    const payload = {
      ...editingStudent,
      rollNo: roll,
      fullName,
    };

    setEditError(null);
    try {
      const updated = await studentApi.updateStudent(targetId, payload);
      const normalizedUpdated = {
        ...updated,
        id: updated.id || updated._id || targetId,
        fullName: updated.fullName || fullName,
      };
      setStudentsList(prev => prev.map(s => ((s.id || s._id) === targetId) ? normalizedUpdated : s));
      setEditingStudent(null);
      showToast(`${normalizedUpdated.fullName} updated immediately!`);
      loadStudents(true);
    } catch (err) {
      setEditError(err.message || 'Failed to update record in database');
    }
  };

  // ─── Delete Student/Alumni (Directly in MongoDB) ────────────────────────────
  const handleDeleteStudent = async (student) => {
    const targetId = student.id || student._id;
    if (!window.confirm(`Are you sure you want to permanently delete record for ${student.fullName} (Roll #${student.rollNo}) from MongoDB?`)) {
      return;
    }

    try {
      await studentApi.deleteStudent(targetId);
      setStudentsList(prev => {
        const remaining = prev.filter(s => (s.id || s._id) !== targetId);
        const remainingActive = remaining.filter(s => s.status === 'ACTIVE').length;
        const maxActivePg = Math.max(1, Math.ceil(remainingActive / activePageSize));
        if (activePage > maxActivePg) setActivePage(maxActivePg);
        const remainingAlumni = remaining.filter(s => s.status === 'ALUMNI').length;
        const maxAlumniPg = Math.max(1, Math.ceil(remainingAlumni / alumniPageSize));
        if (alumniPage > maxAlumniPg) setAlumniPage(maxAlumniPg);
        return remaining;
      });
      showToast(`Record for ${student.fullName} removed.`);
      loadStudents(true);
    } catch (err) {
      showToast(`⚠️ ${err.message || 'Failed to delete record from database'}`);
    }
  };

  // ─── Reset Filters ───────────────────────────────────────────────────────────
  const resetFilters = () => {
    setSearchTerm('');
    setFilterStandard('');
    setFilterDivision('');
    setFilterGroup('');
    setSortBy('roll-asc');
    setActivePage(1);
  };

  // ─── Helper Badge Colors ─────────────────────────────────────────────────────
  const renderStreamChip = (group) => {
    if (group === 'GROUP_B') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 6,
          background: '#ECFDF5',
          color: '#047857',
          fontWeight: 700,
          fontSize: 12,
          border: '1px solid #A7F3D0'
        }}>
          ● Group B (PCB)
        </span>
      );
    }
    if (group === 'GROUP_AB') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 6,
          background: '#FFFBEB',
          color: '#B45309',
          fontWeight: 700,
          fontSize: 12,
          border: '1px solid #FDE68A'
        }}>
          ● Group AB (PCMB)
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 6,
        background: '#EFF6FF',
        color: '#1D4ED8',
        fontWeight: 700,
        fontSize: 12,
        border: '1px solid #BFDBFE'
      }}>
        ● Group A (PCM)
      </span>
    );
  };

  return (
    <div className="content">

      {/* ── Live CRUD Success Toast ── */}
      {actionToast && (
        <div className="banner banner-success" style={{ marginBottom: 16 }}>
          <span>✅ {actionToast}</span>
        </div>
      )}

      {/* ── Offline Banner ── */}
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
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span><strong>Backend Server Offline:</strong> Make sure the backend server is running (<code style={{ background: '#FEF3C7', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>npm run backend</code>) to connect directly to MongoDB localhost.</span>
          </div>
          <button
            onClick={loadStudents}
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
            🔄 Retry
          </button>
        </div>
      )}

      {/* ── 1. KPI CARDS (CLEAN STS THEME) ── */}
      <div className="kpi-grid-5">
        {/* Active Students */}
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
              Active Students
            </span>
            <span style={{ background: '#E8F1F8', color: '#123B5D', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
              TOTAL
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#123B5D', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
            {stats.total}
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 6, fontWeight: 500 }}>
            Std 11 &amp; 12 Science
          </div>
        </div>

        {/* Group A (PCM) */}
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
              Group A (PCM)
            </span>
            <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
              JEE / ENG
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
            {stats.groupA}
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 6, fontWeight: 500 }}>
            Physics, Chem, Maths
          </div>
        </div>

        {/* Group B (PCB) */}
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
              Group B (PCB)
            </span>
            <span style={{ background: '#ECFDF5', color: '#059669', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
              NEET / MED
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
            {stats.groupB}
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 6, fontWeight: 500 }}>
            Physics, Chem, Biology
          </div>
        </div>

        {/* Group AB (PCMB) */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderTop: '3.5px solid #D97706',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(217, 119, 6, 0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Group AB (PCMB)
            </span>
            <span style={{ background: '#FFFBEB', color: '#B45309', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
              COMBINED
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
            {stats.groupAB}
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 6, fontWeight: 500 }}>
            Both Maths &amp; Biology
          </div>
        </div>

        {/* Alumni Records */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderTop: '3.5px solid #7C3AED',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(124, 58, 237, 0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Alumni Records
            </span>
            <span style={{ background: '#F5F3FF', color: '#7C3AED', padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
              PASSED
            </span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#0F172A', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
            {stats.alumni}
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 6, fontWeight: 500 }}>
            Graduated Batches
          </div>
        </div>
      </div>

      {/* ── 2. STYLED TABS CONTAINER (EVERY TAB HAS BG & PROPER WRAPPER) ── */}
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
          {/* Active Students Tab */}
          <button
            onClick={() => setActiveTab('active-students')}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'active-students' ? '#123B5D' : '#FFFFFF',
              color: activeTab === 'active-students' ? '#FFFFFF' : '#334155',
              border: activeTab === 'active-students' ? '1px solid #123B5D' : '1px solid #CBD5E1',
              boxShadow: activeTab === 'active-students' ? '0 2px 8px rgba(18, 59, 93, 0.25)' : 'none',
            }}
          >
            Active Students ({filteredActiveStudents.length})
          </button>

          {/* Alumni Registry Tab */}
          <button
            onClick={() => setActiveTab('alumni')}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'alumni' ? '#123B5D' : '#FFFFFF',
              color: activeTab === 'alumni' ? '#FFFFFF' : '#334155',
              border: activeTab === 'alumni' ? '1px solid #123B5D' : '1px solid #CBD5E1',
              boxShadow: activeTab === 'alumni' ? '0 2px 8px rgba(18, 59, 93, 0.25)' : 'none',
            }}
          >
            Alumni Registry ({filteredAlumniStudents.length})
          </button>

          {/* + Register New Student Tab */}
          <button
            onClick={() => setActiveTab('register-student')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'register-student' ? '#123B5D' : '#FFFFFF',
              color: activeTab === 'register-student' ? '#FFFFFF' : '#123B5D',
              border: activeTab === 'register-student' ? '1px solid #123B5D' : '1px solid #B4CBE2',
              boxShadow: activeTab === 'register-student' ? '0 2px 8px rgba(18, 59, 93, 0.25)' : 'none',
            }}
          >
            + Register New Student
          </button>

          {/* + Register Alumni Tab */}
          <button
            onClick={() => setActiveTab('register-alumni')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'register-alumni' ? '#123B5D' : '#FFFFFF',
              color: activeTab === 'register-alumni' ? '#FFFFFF' : '#7C3AED',
              border: activeTab === 'register-alumni' ? '1px solid #123B5D' : '1px solid #D8B4FE',
              boxShadow: activeTab === 'register-alumni' ? '0 2px 8px rgba(18, 59, 93, 0.25)' : 'none',
            }}
          >
            + Register Alumni
          </button>
        </div>

        {isLoading && (
          <span style={{ fontSize: 12.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #CBD5E1', borderTopColor: '#123B5D', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            Syncing MongoDB...
          </span>
        )}
      </div>

      {/* ── 3. ACTIVE STUDENTS TAB ── */}
      {activeTab === 'active-students' && (
        <div style={{ marginTop: 0 }}>
          {/* Enhanced Filter Toolbar */}
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
                placeholder="Search student by name, roll no, email, contact..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setActivePage(1); }}
                style={{ paddingLeft: 38, height: 42, fontSize: 13.5, borderRadius: 8 }}
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setActivePage(1); }}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 14 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Row 2: Four Filter Selects + Clear Button */}
            <div className="filter-grid-4" style={{ alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>
                  Standard
                </label>
                <select
                  className="filter-select w-full"
                  value={filterStandard}
                  onChange={e => { setFilterStandard(e.target.value); setActivePage(1); }}
                  style={{ height: 38, borderRadius: 8 }}
                >
                  <option value="">All Standards</option>
                  <option value="STD_11">Standard 11</option>
                  <option value="STD_12">Standard 12</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>
                  Division
                </label>
                <select
                  className="filter-select w-full"
                  value={filterDivision}
                  onChange={e => { setFilterDivision(e.target.value); setActivePage(1); }}
                  style={{ height: 38, borderRadius: 8 }}
                >
                  <option value="">All Divisions</option>
                  <option value="A">Division A</option>
                  <option value="B">Division B</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>
                  Stream Group
                </label>
                <select
                  className="filter-select w-full"
                  value={filterGroup}
                  onChange={e => { setFilterGroup(e.target.value); setActivePage(1); }}
                  style={{ height: 38, borderRadius: 8 }}
                >
                  <option value="">All Streams</option>
                  <option value="GROUP_A">Group A (PCM — Maths)</option>
                  <option value="GROUP_B">Group B (PCB — Biology)</option>
                  <option value="GROUP_AB">Group AB (PCMB)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em' }}>
                  Sort By
                </label>
                <select
                  className="filter-select w-full"
                  value={sortBy}
                  onChange={e => { setSortBy(e.target.value); setActivePage(1); }}
                  style={{ height: 38, borderRadius: 8 }}
                >
                  <option value="roll-asc">Roll No (1 → 50)</option>
                  <option value="roll-desc">Roll No (50 → 1)</option>
                  <option value="name-asc">Name (A → Z)</option>
                  <option value="name-desc">Name (Z → A)</option>
                </select>
              </div>

              <div style={{ paddingTop: 18 }}>
                {(searchTerm || filterStandard || filterDivision || filterGroup || sortBy !== 'roll-asc') ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={resetFilters}
                    style={{ height: 38, padding: '0 14px', borderRadius: 8, color: '#EF4444', borderColor: '#FCA5A5' }}
                  >
                    Reset Filters
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                    {filteredActiveStudents.length} students
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
                    <th style={{ width: 85, padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Roll No</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Student Name</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Class &amp; Div</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Stream Group</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Primary Contact</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Admission Date</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ textAlign: 'center', width: 170, padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedActiveStudents.map(student => (
                    <tr key={student.id || student._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      {/* Roll No */}
                      <td style={{ padding: '14px 16px' }}>
                        <span className="num" style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          background: '#E8F1F8',
                          color: '#123B5D',
                          borderRadius: 6,
                          fontWeight: 800,
                          fontSize: 13,
                          border: '1px solid #D1E1EF'
                        }}>
                          #{student.rollNo}
                        </span>
                      </td>

                      {/* Student Identity */}
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
                            {student.fullName ? student.fullName.split(' ').map(n => n[0]).slice(0, 2).join('') : 'ST'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>{student.fullName}</div>
                            <div style={{ fontSize: 11.5, color: '#64748B' }}>{student.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Class & Division */}
                      <td className="num" style={{ padding: '14px 16px', fontWeight: 600, color: '#1E293B' }}>
                        Std {String(student.standard).replace('STD_', '')}-{student.division}
                      </td>

                      {/* Stream Group */}
                      <td style={{ padding: '14px 16px' }}>{renderStreamChip(student.streamGroup)}</td>

                      {/* Contact */}
                      <td className="num" style={{ padding: '14px 16px', color: '#334155' }}>{student.contactNo}</td>

                      {/* Admission Date */}
                      <td className="num" style={{ padding: '14px 16px', color: '#64748B' }}>
                        {student.admissionDate ? String(student.admissionDate).split('T')[0] : '—'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span className="chip chip-success" style={{ fontWeight: 700 }}>Active</span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 9px', fontSize: 12, borderRadius: 6 }}
                            title="View Profile"
                            onClick={() => setViewingStudent(student)}
                          >
                            👁️ View
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 9px', fontSize: 12, borderRadius: 6 }}
                            title="Edit Student"
                            onClick={() => { setEditError(null); setEditingStudent({ ...student }); }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-danger-ghost btn-sm"
                            style={{ padding: '5px 9px', fontSize: 12, borderRadius: 6 }}
                            title="Delete Student"
                            onClick={() => handleDeleteStudent(student)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {paginatedActiveStudents.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
                        No active students found matching the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <TablePagination
              totalItems={filteredActiveStudents.length}
              currentPage={activePage}
              pageSize={activePageSize}
              onPageChange={setActivePage}
              onPageSizeChange={setActivePageSize}
            />
          </div>
        </div>
      )}

      {/* ── 4. ALUMNI DIRECTORY TAB (WITH ADD NEW ALUMNI BUTTON & VIEW/UPDATE/DELETE) ── */}
      {activeTab === 'alumni' && (
        <div style={{ marginTop: 0 }}>
          {/* Header Card with Add New Alumni Button */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
            <div>
              <div className="card__title" style={{ fontSize: 18, marginBottom: 2 }}>Alumni Registry</div>
              <div className="card__desc" style={{ fontSize: 13 }}>
                Past graduated batches of G.G. Zadafiya Vidhyalaya · Connected to MongoDB
              </div>
            </div>
            {/* Direct button to add new alumni */}
            <button
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontWeight: 700 }}
              onClick={() => setActiveTab('register-alumni')}
            >
              + Add New Alumni
            </button>
          </div>

          {/* Search bar for alumni */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16
          }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="field-input w-full"
                placeholder="Search alumni by name, roll no, college, pursuit..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setAlumniPage(1); }}
                style={{ paddingLeft: 36, height: 40, borderRadius: 8 }}
              />
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          {/* Table Container */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                    <th style={{ width: 85, padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Roll No</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Student Name</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Past Class</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Stream</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Batch Year</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Current Pursuit / University</th>
                    <th style={{ padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Contact</th>
                    <th style={{ textAlign: 'center', width: 170, padding: '14px 16px', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAlumniStudents.map(alumni => (
                    <tr key={alumni.id || alumni._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="num" style={{ fontWeight: 800, padding: '4px 10px', background: '#F1F5F9', borderRadius: 6, fontSize: 12.5, color: '#334155' }}>
                          #{alumni.rollNo}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>{alumni.fullName}</div>
                        <div style={{ fontSize: 11.5, color: '#64748B' }}>{alumni.email}</div>
                      </td>
                      <td className="num" style={{ padding: '14px 16px', fontWeight: 600 }}>
                        Std {String(alumni.standard).replace('STD_', '')}-{alumni.division}
                      </td>
                      <td style={{ padding: '14px 16px' }}>{renderStreamChip(alumni.streamGroup)}</td>
                      <td className="num" style={{ padding: '14px 16px', fontWeight: 700, color: '#7C3AED' }}>
                        {alumni.graduationYear || '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="chip chip-neutral" style={{ fontWeight: 600, color: '#1E293B' }}>
                          {alumni.currentPursuit || 'Higher Studies'}
                        </span>
                      </td>
                      <td className="num" style={{ padding: '14px 16px', color: '#334155' }}>{alumni.contactNo}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 9px', fontSize: 12, borderRadius: 6 }}
                            onClick={() => setViewingStudent(alumni)}
                            title="View Alumni Profile"
                          >
                            👁️ View
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 9px', fontSize: 12, borderRadius: 6 }}
                            onClick={() => { setEditError(null); setEditingStudent({ ...alumni }); }}
                            title="Edit Alumni Profile"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-danger-ghost btn-sm"
                            style={{ padding: '5px 9px', fontSize: 12, borderRadius: 6 }}
                            onClick={() => handleDeleteStudent(alumni)}
                            title="Delete Alumni Record"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {paginatedAlumniStudents.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
                        No alumni records found. Click "+ Add New Alumni" to register past graduates.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <TablePagination
              totalItems={filteredAlumniStudents.length}
              currentPage={alumniPage}
              pageSize={alumniPageSize}
              onPageChange={setAlumniPage}
              onPageSizeChange={setAlumniPageSize}
            />
          </div>
        </div>
      )}

      {/* ── 5. REGISTER STUDENT FORM TAB ── */}
      {activeTab === 'register-student' && (
        <div className="card" style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 32px' }}>
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 16, marginBottom: 24 }}>
            <div className="card__title" style={{ fontSize: 20, marginBottom: 4 }}>Register New Student</div>
            <div className="card__desc" style={{ fontSize: 13.5 }}>
              Enroll a new 11th or 12th Standard Science stream student directly into MongoDB
            </div>
          </div>

          {formError && (
            <div className="banner banner-danger" style={{ marginBottom: 20 }}>
              <span>⚠️ {formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="banner banner-success" style={{ marginBottom: 20 }}>
              <span>✅ {formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateStudent}>
            {/* Section 1: Identity */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#123B5D', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                1. Student Identity Details
              </div>
              <div className="form-grid-3">
                <div>
                  <label className="field-label">First Name *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. Umesh"
                    required
                    value={studentForm.firstName}
                    onChange={e => setStudentForm({ ...studentForm, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Middle Name</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. Ramesh"
                    value={studentForm.middleName}
                    onChange={e => setStudentForm({ ...studentForm, middleName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Last Name *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="e.g. Pal"
                    required
                    value={studentForm.lastName}
                    onChange={e => setStudentForm({ ...studentForm, lastName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Academic & Stream */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#123B5D', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                2. Academic Class &amp; Stream Allocation
              </div>
              <div className="form-grid-3" style={{ marginBottom: 14 }}>
                <div>
                  <label className="field-label">Roll Number * <span style={{ color: '#64748B', fontWeight: 400 }}>(Unique per class)</span></label>
                  <input
                    type="number"
                    className="field-input w-full"
                    placeholder="e.g. 7"
                    min="1"
                    required
                    value={studentForm.rollNo}
                    onChange={e => setStudentForm({ ...studentForm, rollNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Standard *</label>
                  <select
                    className="filter-select w-full"
                    value={studentForm.standard}
                    onChange={e => setStudentForm({ ...studentForm, standard: e.target.value })}
                  >
                    <option value="STD_11">Standard 11</option>
                    <option value="STD_12">Standard 12</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Division *</label>
                  <select
                    className="filter-select w-full"
                    value={studentForm.division}
                    onChange={e => setStudentForm({ ...studentForm, division: e.target.value })}
                  >
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label">Academic Science Stream Group *</label>
                <select
                  className="filter-select w-full"
                  value={studentForm.streamGroup}
                  onChange={e => setStudentForm({ ...studentForm, streamGroup: e.target.value })}
                  style={{ height: 42 }}
                >
                  <option value="GROUP_A">Group A — PCM (Physics, Chemistry, Mathematics) · Engineering / JEE Track</option>
                  <option value="GROUP_B">Group B — PCB (Physics, Chemistry, Biology) · Medical / NEET Track</option>
                  <option value="GROUP_AB">Group AB — PCMB (Physics, Chemistry, Mathematics, Biology) · Combined Track</option>
                </select>
              </div>
            </div>

            {/* Section 3: Contact Details */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#123B5D', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                3. Contact Information &amp; Official Records
              </div>
              <div className="form-grid-3" style={{ marginBottom: 14 }}>
                <div>
                  <label className="field-label">Primary Mobile Contact *</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    placeholder="+91 99000 12345"
                    required
                    value={studentForm.contactNo}
                    onChange={e => setStudentForm({ ...studentForm, contactNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Official Email Address</label>
                  <input
                    type="email"
                    className="field-input w-full"
                    placeholder="student@ggzv.edu.in"
                    value={studentForm.email}
                    onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Admission / Enrollment Date</label>
                  <input
                    type="date"
                    className="field-input w-full"
                    value={studentForm.admissionDate}
                    onChange={e => setStudentForm({ ...studentForm, admissionDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="field-label">School / Institution</label>
                <input
                  type="text"
                  className="field-input w-full"
                  value={studentForm.schoolName}
                  disabled
                  style={{ background: '#F8FAFC', color: '#64748B' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 18 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setActiveTab('active-students'); setFormError(null); }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ minWidth: 160, fontWeight: 700 }}>
                Save &amp; Enroll Student
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── 6. REGISTER ALUMNI FORM TAB ── */}
      {activeTab === 'register-alumni' && (
        <div className="card" style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 32px' }}>
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 16, marginBottom: 24 }}>
            <div className="card__title" style={{ fontSize: 20, marginBottom: 4 }}>Register Alumni Record</div>
            <div className="card__desc" style={{ fontSize: 13.5 }}>
              Archive a graduated student record with their university and higher education pursuit in MongoDB
            </div>
          </div>

          {formError && (
            <div className="banner banner-danger" style={{ marginBottom: 20 }}>
              <span>⚠️ {formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="banner banner-success" style={{ marginBottom: 20 }}>
              <span>✅ {formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateAlumni}>
            <div className="form-grid-3" style={{ marginBottom: 18 }}>
              <div>
                <label className="field-label">First Name *</label>
                <input
                  type="text"
                  className="field-input w-full"
                  required
                  value={alumniForm.firstName}
                  onChange={e => setAlumniForm({ ...alumniForm, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Middle Name</label>
                <input
                  type="text"
                  className="field-input w-full"
                  value={alumniForm.middleName}
                  onChange={e => setAlumniForm({ ...alumniForm, middleName: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Last Name *</label>
                <input
                  type="text"
                  className="field-input w-full"
                  required
                  value={alumniForm.lastName}
                  onChange={e => setAlumniForm({ ...alumniForm, lastName: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label">Roll Number *</label>
                <input
                  type="number"
                  className="field-input w-full"
                  min="1"
                  required
                  value={alumniForm.rollNo}
                  onChange={e => setAlumniForm({ ...alumniForm, rollNo: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Past Standard</label>
                <select
                  className="filter-select w-full"
                  value={alumniForm.standard}
                  onChange={e => setAlumniForm({ ...alumniForm, standard: e.target.value })}
                >
                  <option value="STD_12">Standard 12</option>
                  <option value="STD_11">Standard 11</option>
                </select>
              </div>
              <div>
                <label className="field-label">Division</label>
                <select
                  className="filter-select w-full"
                  value={alumniForm.division}
                  onChange={e => setAlumniForm({ ...alumniForm, division: e.target.value })}
                >
                  <option value="A">Division A</option>
                  <option value="B">Division B</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Academic Stream Group</label>
                <select
                  className="filter-select w-full"
                  value={alumniForm.streamGroup}
                  onChange={e => setAlumniForm({ ...alumniForm, streamGroup: e.target.value })}
                >
                  <option value="GROUP_A">Group A — PCM (Physics, Chemistry, Maths)</option>
                  <option value="GROUP_B">Group B — PCB (Physics, Chemistry, Biology)</option>
                  <option value="GROUP_AB">Group AB — PCMB (Both Tracks)</option>
                </select>
              </div>

              <div>
                <label className="field-label">Graduation Batch Year *</label>
                <input
                  type="number"
                  className="field-input w-full"
                  placeholder="e.g. 2024"
                  required
                  value={alumniForm.graduationYear}
                  onChange={e => setAlumniForm({ ...alumniForm, graduationYear: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Contact Number</label>
                <input
                  type="text"
                  className="field-input w-full"
                  placeholder="+91 98765 43210"
                  value={alumniForm.contactNo}
                  onChange={e => setAlumniForm({ ...alumniForm, contactNo: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Email Address</label>
                <input
                  type="email"
                  className="field-input w-full"
                  placeholder="alumni@email.com"
                  value={alumniForm.email}
                  onChange={e => setAlumniForm({ ...alumniForm, email: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Current Pursuit / College / University *</label>
                <input
                  type="text"
                  className="field-input w-full"
                  placeholder="e.g. B.Tech Computer Science (IIT Bombay) / MBBS (BJ Medical College)"
                  required
                  value={alumniForm.currentPursuit}
                  onChange={e => setAlumniForm({ ...alumniForm, currentPursuit: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 18 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setActiveTab('alumni'); setFormError(null); }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                Save Alumni Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── 7. VIEW PROFILE MODAL (WITH DIRECT UPDATE BUTTON!) ── */}
      {viewingStudent && (
        <div
          className="modal-overlay is-open"
          onClick={e => { if (e.target.classList.contains('modal-overlay')) setViewingStudent(null); }}
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
                  {viewingStudent.fullName ? viewingStudent.fullName.split(' ').map(n => n[0]).slice(0, 2).join('') : 'ST'}
                </div>
                <div>
                  <div className="card__title" style={{ fontSize: 18 }}>{viewingStudent.fullName}</div>
                  <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                    Roll No <span className="num" style={{ fontWeight: 800, color: '#123B5D' }}>#{viewingStudent.rollNo}</span>
                    &nbsp;·&nbsp;Std {String(viewingStudent.standard).replace('STD_', '')}-{viewingStudent.division}
                    &nbsp;·&nbsp;<span className="chip chip-success" style={{ padding: '1px 8px', fontSize: 11 }}>{viewingStudent.status}</span>
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setViewingStudent(null)}>✕</button>
            </div>

            <div style={{ padding: '6px 0 16px' }}>
              <div className="detail-panel__row">
                <span>Academic Stream</span>
                <span>{renderStreamChip(viewingStudent.streamGroup)}</span>
              </div>
              <div className="detail-panel__row">
                <span>Core Subjects</span>
                <span style={{ fontWeight: 600 }}>
                  {viewingStudent.streamGroup === 'GROUP_B'
                    ? 'Physics, Chemistry, Biology'
                    : viewingStudent.streamGroup === 'GROUP_AB'
                    ? 'Physics, Chemistry, Maths, Biology'
                    : 'Physics, Chemistry, Mathematics'}
                </span>
              </div>
              <div className="detail-panel__row">
                <span>Contact Number</span>
                <span className="num" style={{ fontWeight: 600 }}>{viewingStudent.contactNo || '—'}</span>
              </div>
              <div className="detail-panel__row">
                <span>Email Address</span>
                <span style={{ color: '#123B5D' }}>{viewingStudent.email || '—'}</span>
              </div>
              <div className="detail-panel__row">
                <span>Admission Date</span>
                <span className="num">{viewingStudent.admissionDate ? String(viewingStudent.admissionDate).split('T')[0] : '—'}</span>
              </div>
              <div className="detail-panel__row">
                <span>Attendance Rate</span>
                <span className="num" style={{ color: '#059669', fontWeight: 700 }}>
                  {viewingStudent.attendancePercent || 95}%
                </span>
              </div>
              {viewingStudent.status === 'ALUMNI' && (
                <>
                  <div className="detail-panel__row">
                    <span>Graduation Batch</span>
                    <span className="num" style={{ fontWeight: 700, color: '#7C3AED' }}>{viewingStudent.graduationYear}</span>
                  </div>
                  <div className="detail-panel__row">
                    <span>Current Pursuit / College</span>
                    <span style={{ fontWeight: 700, color: '#1E293B' }}>{viewingStudent.currentPursuit || '—'}</span>
                  </div>
                </>
              )}
            </div>

            {/* Modal Actions: UPDATE BUTTON INSIDE VIEW MODAL */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontWeight: 700, color: '#123B5D', borderColor: '#CBD5E1' }}
                onClick={() => {
                  setEditError(null);
                  setEditingStudent({ ...viewingStudent });
                  setViewingStudent(null);
                }}
              >
                ✏️ Update Record
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setViewingStudent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. EDIT PROFILE MODAL (ACTIVE STUDENTS & ALUMNI) ── */}
      {editingStudent && (
        <div
          className="modal-overlay is-open"
          onClick={e => { if (e.target.classList.contains('modal-overlay')) { setEditingStudent(null); setEditError(null); } }}
        >
          <div className="modal-box" style={{ maxWidth: 760 }}>
            <div className="modal-box__head">
              <div>
                <div className="card__title">
                  {editingStudent.status === 'ALUMNI' ? 'Edit Alumni Profile' : 'Edit Student Profile'}
                </div>
                <div className="card__desc">Update all fields for Roll No #{editingStudent.rollNo} directly in MongoDB</div>
              </div>
              <button className="modal-close" onClick={() => { setEditingStudent(null); setEditError(null); }}>✕</button>
            </div>

            <form onSubmit={handleUpdateStudent}>
              {editError && (
                <div className="banner banner-danger" style={{ marginTop: 14, marginBottom: 4 }}>
                  <span>⚠️ {editError}</span>
                </div>
              )}

              {/* Section 1: Identity */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#123B5D', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, marginTop: 16 }}>
                  1. Student Identity
                </div>
                <div className="form-grid-3">
                  <div>
                    <label className="field-label">First Name *</label>
                    <input
                      type="text"
                      className="field-input w-full"
                      required
                      value={editingStudent.firstName || ''}
                      onChange={e => setEditingStudent({ ...editingStudent, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Middle Name</label>
                    <input
                      type="text"
                      className="field-input w-full"
                      value={editingStudent.middleName || ''}
                      onChange={e => setEditingStudent({ ...editingStudent, middleName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Last Name *</label>
                    <input
                      type="text"
                      className="field-input w-full"
                      required
                      value={editingStudent.lastName || ''}
                      onChange={e => setEditingStudent({ ...editingStudent, lastName: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Academic & Stream */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#123B5D', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                  2. Academic Class &amp; Stream
                </div>
                <div className="form-grid-3" style={{ marginBottom: 12 }}>
                  <div>
                    <label className="field-label">Roll Number * <span style={{ color: '#64748B', fontWeight: 400 }}>(Unique per class)</span></label>
                    <input
                      type="number"
                      className="field-input w-full"
                      min="1"
                      required
                      value={editingStudent.rollNo}
                      onChange={e => setEditingStudent({ ...editingStudent, rollNo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Standard *</label>
                    <select
                      className="filter-select w-full"
                      value={editingStudent.standard}
                      onChange={e => setEditingStudent({ ...editingStudent, standard: e.target.value })}
                    >
                      <option value="STD_11">Standard 11</option>
                      <option value="STD_12">Standard 12</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Division *</label>
                    <select
                      className="filter-select w-full"
                      value={editingStudent.division}
                      onChange={e => setEditingStudent({ ...editingStudent, division: e.target.value })}
                    >
                      <option value="A">Division A</option>
                      <option value="B">Division B</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="field-label">Academic Science Stream Group *</label>
                  <select
                    className="filter-select w-full"
                    value={editingStudent.streamGroup}
                    onChange={e => setEditingStudent({ ...editingStudent, streamGroup: e.target.value })}
                    style={{ height: 42 }}
                  >
                    <option value="GROUP_A">Group A — PCM (Physics, Chemistry, Mathematics) · Engineering / JEE Track</option>
                    <option value="GROUP_B">Group B — PCB (Physics, Chemistry, Biology) · Medical / NEET Track</option>
                    <option value="GROUP_AB">Group AB — PCMB (Physics, Chemistry, Mathematics, Biology) · Combined Track</option>
                  </select>
                </div>
              </div>

              {/* Section 3: Contact & Records */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#123B5D', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                  3. Contact Information &amp; Official Records
                </div>
                <div className="form-grid-3" style={{ marginBottom: 12 }}>
                  <div>
                    <label className="field-label">Primary Mobile Contact *</label>
                    <input
                      type="text"
                      className="field-input w-full"
                      required
                      value={editingStudent.contactNo || ''}
                      onChange={e => setEditingStudent({ ...editingStudent, contactNo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Official Email Address</label>
                    <input
                      type="email"
                      className="field-input w-full"
                      value={editingStudent.email || ''}
                      onChange={e => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Admission / Enrollment Date</label>
                    <input
                      type="date"
                      className="field-input w-full"
                      value={editingStudent.admissionDate ? String(editingStudent.admissionDate).split('T')[0] : ''}
                      onChange={e => setEditingStudent({ ...editingStudent, admissionDate: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="field-label">School / Institution</label>
                  <input
                    type="text"
                    className="field-input w-full"
                    value={editingStudent.schoolName || 'G.G. Zadafiya Vidhyalaya'}
                    disabled
                    style={{ background: '#F8FAFC', color: '#64748B' }}
                  />
                </div>
              </div>

              {/* Alumni-only fields */}
              {editingStudent.status === 'ALUMNI' && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                    4. Alumni Information
                  </div>
                  <div className="form-grid-2">
                    <div>
                      <label className="field-label">Graduation / Batch Year</label>
                      <input
                        type="number"
                        className="field-input w-full"
                        value={editingStudent.graduationYear || ''}
                        onChange={e => setEditingStudent({ ...editingStudent, graduationYear: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="field-label">Current Pursuit / College / University *</label>
                      <input
                        type="text"
                        className="field-input w-full"
                        value={editingStudent.currentPursuit || ''}
                        onChange={e => setEditingStudent({ ...editingStudent, currentPursuit: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setEditingStudent(null); setEditError(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  Save Changes in Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
