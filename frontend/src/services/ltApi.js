const API_BASE_URL = 'http://localhost:5000/api/lt';

export const ltApi = {
  async getAllLts(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.subject) searchParams.append('subject', params.subject);
    if (params.standard) searchParams.append('standard', params.standard);
    if (params.status) searchParams.append('status', params.status);

    const qs = searchParams.toString();
    const url = qs ? `${API_BASE_URL}?${qs}` : API_BASE_URL;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch Lecture Tests');
    }
    return json.data || [];
  },

  async getLtById(id) {
    const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to load Lecture Test details');
    }
    return json.data;
  },

  async createLt(payload) {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to create Lecture Test');
    }
    return json.data;
  },

  async updateLt(id, payload) {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to update Lecture Test');
    }
    return json.data;
  },

  async deleteLt(id) {
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to delete Lecture Test');
    }
    return true;
  },

  async getLtMarks(id) {
    const res = await fetch(`${API_BASE_URL}/${id}/marks`, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch LT marks');
    }
    return json.data || [];
  },

  async saveLtMarks(id, marks, assistantFacultyId = null, assistantName = '') {
    const res = await fetch(`${API_BASE_URL}/${id}/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marks, assistantFacultyId, assistantName }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to save LT marks');
    }
    return json.data;
  },

  async getAnalyticsOverview() {
    const res = await fetch(`${API_BASE_URL}/analytics/overview`, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch LT analytics overview');
    }
    return json.data;
  },

  async getLtAnalysisDetail(id) {
    const res = await fetch(`${API_BASE_URL}/${id}/analysis`, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch LT analysis detail');
    }
    return json.data;
  },

  async retrainLtModel() {
    const res = await fetch(`${API_BASE_URL}/analytics/retrain`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to retrain LT ML models');
    }
    return json.data;
  },

  async getAvailableWeeks() {
    const res = await fetch(`${API_BASE_URL}/analytics/weeks`, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch available weeks');
    }
    return json.data || [];
  },

  async getWeeklyReport(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    const url = qs ? `${API_BASE_URL}/analytics/weekly-report?${qs}` : `${API_BASE_URL}/analytics/weekly-report`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to generate weekly report');
    }
    return json.data;
  },

  async getMonthlyReport(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    const url = qs ? `${API_BASE_URL}/analytics/monthly-report?${qs}` : `${API_BASE_URL}/analytics/monthly-report`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to generate monthly report');
    }
    return json.data;
  },

  async getStudentPerformance(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    const url = qs ? `${API_BASE_URL}/analytics/student-performance?${qs}` : `${API_BASE_URL}/analytics/student-performance`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch student performance');
    }
    return json.data;
  },

  async savePrintedReport(payload) {
    const res = await fetch(`${API_BASE_URL}/analytics/saved-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to save report to ledger');
    }
    return json.data;
  },

  async getSavedReports(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    const url = qs ? `${API_BASE_URL}/analytics/saved-reports?${qs}` : `${API_BASE_URL}/analytics/saved-reports`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch saved reports');
    }
    return json.data || [];
  },

  async getSavedReportById(id) {
    const res = await fetch(`${API_BASE_URL}/analytics/saved-reports/${id}`, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch report details');
    }
    return json.data;
  },
};
