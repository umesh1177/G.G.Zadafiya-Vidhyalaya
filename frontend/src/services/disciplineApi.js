const API_BASE_URL = 'http://localhost:5000/api/discipline';

export const disciplineApi = {
  async getTypes() {
    const res = await fetch(`${API_BASE_URL}/types`, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch remark types');
    return json.data || [];
  },

  async deleteCustomType(id) {
    const res = await fetch(`${API_BASE_URL}/types/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to delete custom remark type');
    return json.data || [];
  },

  async lookupStudent({ standard, division, rollNo }) {
    const params = new URLSearchParams();
    if (standard) params.append('standard', standard);
    if (division) params.append('division', division);
    if (rollNo !== undefined && rollNo !== null && String(rollNo).trim() !== '') {
      params.append('rollNo', String(rollNo).trim());
    }
    const res = await fetch(`${API_BASE_URL}/lookup-student?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to lookup student');
    return { found: Boolean(json.found), student: json.data || null };
  },

  async getAllRemarks(filters = {}) {
    const params = new URLSearchParams();
    if (filters.standard) params.append('standard', filters.standard);
    if (filters.division) params.append('division', filters.division);
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.rollNo) params.append('rollNo', String(filters.rollNo));
    if (filters.studentId) params.append('studentId', filters.studentId);

    const qs = params.toString();
    const res = await fetch(qs ? `${API_BASE_URL}?${qs}` : API_BASE_URL, {
      method: 'GET',
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch discipline remarks');
    return json.data || [];
  },

  async getPrincipalOverview(filters = {}) {
    const params = new URLSearchParams();
    if (filters.standard) params.append('standard', filters.standard);
    if (filters.division) params.append('division', filters.division);
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.minFlags) params.append('minFlags', String(filters.minFlags));

    const qs = params.toString();
    const res = await fetch(
      qs ? `${API_BASE_URL}/principal-overview?${qs}` : `${API_BASE_URL}/principal-overview`,
      { method: 'GET', cache: 'no-store' }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load discipline overview');
    return json.data;
  },

  async createRemark(payload) {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to save discipline remark');
    return json;
  },

  async updateRemark(id, data) {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update discipline remark');
    return json.data;
  },

  async deleteRemark(id) {
    const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to delete discipline remark');
    return true;
  },
};

