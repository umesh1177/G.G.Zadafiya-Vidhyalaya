/**
 * Student API Client
 * Interacts with SMS Backend (http://localhost:5000/api/students)
 * Provides automatic fallback to DataContext mock data if backend is offline.
 */

import { API_ROOT } from './apiConfig';

const API_BASE_URL = `${API_ROOT}/api/students`;

export const studentApi = {
  /**
   * Fetch all students with query filters
   */
  async getStudents(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.standard) params.append('standard', filters.standard);
    if (filters.division) params.append('division', filters.division);
    if (filters.streamGroup) params.append('streamGroup', filters.streamGroup);
    if (filters.status) params.append('status', filters.status);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const url = `${API_BASE_URL}?${params.toString()}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch students from database');
    }
    const json = await res.json();
    const list = json.data || [];
    return list.map((s) => ({
      ...s,
      id: s.id || s._id,
      name: s.fullName || s.name || [s.firstName, s.lastName].filter(Boolean).join(' '),
      fullName: s.fullName || s.name || [s.firstName, s.lastName].filter(Boolean).join(' '),
    }));
  },

  /**
   * Fetch single student details by ID
   */
  async getStudentById(id) {
    const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch student details');
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Create new student record (with unique Roll No check)
   */
  async createStudent(studentData) {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to create student in database');
    }
    return json.data;
  },

  /**
   * Update student record
   */
  async updateStudent(id, studentData) {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to update student in database');
    }
    return json.data;
  },

  /**
   * Delete student record
   */
  async deleteStudent(id) {
    const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to delete student from database');
    }
    return true;
  },

  /**
   * Fetch student statistics (Active total, Group A, Group B, Group AB, Alumni)
   */
  async getStatistics() {
    const res = await fetch(`${API_BASE_URL}/statistics`, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch statistics');
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Get direct URL to download Student Excel Template
   */
  getTemplateDownloadUrl() {
    return `${API_BASE_URL}/template`;
  },

  /**
   * Download Student Excel Template
   */
  async downloadTemplate() {
    const res = await fetch(`${API_BASE_URL}/template`);
    if (!res.ok) {
      throw new Error('Failed to download student Excel template');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'Student_Import_Template.xlsx';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 200);
    return true;
  },

  /**
   * Bulk upload students from Excel (supports previewOnly flag)
   */
  async bulkUpload(payload = {}) {
    const res = await fetch(`${API_BASE_URL}/bulk-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to process bulk upload');
    }
    return json;
  },
};

