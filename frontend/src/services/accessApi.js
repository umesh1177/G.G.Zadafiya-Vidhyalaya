import { API_ROOT } from './apiConfig';

export const accessApi = {
  /**
   * Get master tabs & subjects configuration
   */
  async getConfig() {
    const res = await fetch(`${API_ROOT}/api/access/config`);
    if (!res.ok) throw new Error(`Failed to fetch access config (${res.status})`);
    return await res.json();
  },

  /**
   * Get all faculties with current permissions and stats
   */
  async getFaculties(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.role) query.append('role', params.role);
    if (params.subject) query.append('subject', params.subject);

    const res = await fetch(`${API_ROOT}/api/access/faculties?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch faculties (${res.status})`);
    return await res.json();
  },

  /**
   * Get single faculty access details and recent logs
   */
  async getFacultyAccess(id) {
    const res = await fetch(`${API_ROOT}/api/access/faculty/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch faculty access (${res.status})`);
    return await res.json();
  },

  /**
   * Update faculty permissions (tabs, exam subjects, lt subjects)
   */
  async updateFacultyAccess(id, data) {
    const res = await fetch(`${API_ROOT}/api/access/faculty/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to update access permissions');
    }
    return json;
  },

  /**
   * Get paginated access history records
   */
  async getAccessHistory(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.facultyId) query.append('facultyId', params.facultyId);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`${API_ROOT}/api/access/history?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch access history (${res.status})`);
    return await res.json();
  },
};
