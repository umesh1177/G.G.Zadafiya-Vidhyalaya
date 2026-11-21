/**
 * Faculty API Client
 * Interacts with SMS Backend (http://localhost:5000/api/faculty)
 * Provides automatic fallback to local persistence if backend is offline.
 */

import { API_ROOT } from './apiConfig';

const API_BASE_URL = `${API_ROOT}/api/faculty`;

export const facultyApi = {
  /**
   * Fetch all faculty with filters
   */
  async getFaculty(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.role) params.append('role', filters.role);
    if (filters.status) params.append('status', filters.status);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const url = `${API_BASE_URL}?${params.toString()}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch faculty from server');
    }
    const json = await res.json();
    return (json.data || []).map((f) => ({
      ...f,
      id: f.id || f._id,
    }));
  },

  /**
   * Fetch single faculty details by ID
   */
  async getFacultyById(id) {
    const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch faculty details');
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Create new faculty member
   */
  async createFaculty(facultyData) {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(facultyData),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to register faculty member');
    }
    return json.data;
  },

  /**
   * Update faculty member
   */
  async updateFaculty(id, facultyData) {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(facultyData),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to update faculty member');
    }
    return json.data;
  },

  /**
   * Delete faculty member
   */
  async deleteFaculty(id) {
    const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to delete faculty member');
    }
    return true;
  },

  /**
   * Get faculty stats
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
   * Get direct URL to download Faculty Excel Template
   */
  getTemplateDownloadUrl() {
    return `${API_BASE_URL}/template`;
  },

  /**
   * Download Faculty Excel Template
   */
  async downloadTemplate() {
    const res = await fetch(`${API_BASE_URL}/template`);
    if (!res.ok) {
      throw new Error('Failed to download faculty Excel template');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'Faculty_Import_Template.xlsx';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 200);
    return true;
  },

  /**
   * Bulk upload faculty from Excel (supports previewOnly flag)
   */
  async bulkUpload(payload = {}) {
    const res = await fetch(`${API_BASE_URL}/bulk-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to process bulk faculty upload');
    }
    return json;
  },
};

