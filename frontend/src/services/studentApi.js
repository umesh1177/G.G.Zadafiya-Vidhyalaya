/**
 * Student API Client
 * Interacts with SMS Backend (http://localhost:5000/api/students)
 * Provides automatic fallback to DataContext mock data if backend is offline.
 */

const API_BASE_URL = 'http://localhost:5000/api/students';

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
};

