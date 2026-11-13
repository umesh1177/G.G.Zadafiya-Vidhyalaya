import { API_ROOT } from './apiConfig';

const API_BASE_URL = `${API_ROOT}/api/reports`;

export const reportApi = {
  async createFacultyReport(payload) {
    const res = await fetch(`${API_BASE_URL}/faculty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to generate report for faculty');
    }
    return json.data;
  },

  async getFacultyReports(params = {}) {
    const sp = new URLSearchParams();
    if (params.subject) sp.append('subject', params.subject);
    if (params.standard) sp.append('standard', params.standard);
    if (params.alertStatus) sp.append('alertStatus', params.alertStatus);
    if (params.reportType) sp.append('reportType', params.reportType);
    if (params.ltId) sp.append('ltId', params.ltId);
    if (params.examId) sp.append('examId', params.examId);

    const qs = sp.toString();
    const url = qs ? `${API_BASE_URL}/faculty?${qs}` : `${API_BASE_URL}/faculty`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch faculty reports');
    }
    return json.data || [];
  },

  async acknowledgeFacultyReport(id) {
    const res = await fetch(`${API_BASE_URL}/faculty/${id}/acknowledge`, {
      method: 'PUT',
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to acknowledge report');
    }
    return json.data;
  },
};

