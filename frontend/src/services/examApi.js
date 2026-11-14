import { API_ROOT } from './apiConfig';

const API_BASE_URL = `${API_ROOT}/api/exams`;
const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;

export function readPdfFileAsPayload(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const isPdfMime = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfMime) {
      reject(new Error('Please select a valid PDF file (.pdf).'));
      return;
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      reject(new Error('Question paper PDF exceeds maximum size of 15 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        base64Data: typeof reader.result === 'string' ? reader.result : '',
      });
    };
    reader.onerror = () => reject(new Error('Failed to read the selected PDF file.'));
    reader.readAsDataURL(file);
  });
}

export function getQuestionPaperUrl(examIdOrNo, download = false) {
  return `${API_BASE_URL}/${examIdOrNo}/question-paper${download ? '?download=1' : ''}`;
}

export const examApi = {
  async getAllExams(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.standard) searchParams.append('standard', params.standard);
    if (params.division) searchParams.append('division', params.division);
    if (params.examType) searchParams.append('examType', params.examType);
    if (params.status) searchParams.append('status', params.status);
    if (params.subject) searchParams.append('subject', params.subject);
    if (params.facultyId) searchParams.append('facultyId', params.facultyId);
    if (params.createdByRole) searchParams.append('createdByRole', params.createdByRole);

    const qs = searchParams.toString();
    const url = qs ? `${API_BASE_URL}?${qs}` : API_BASE_URL;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch exam records');
    }
    return json.data || [];
  },

  async getExamById(idOrNo) {
    const res = await fetch(`${API_BASE_URL}/${idOrNo}`, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Exam record not found');
    }
    return json.data;
  },

  async createExam(payload) {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to create exam');
    }
    return json.data;
  },

  async updateExam(idOrNo, payload) {
    const res = await fetch(`${API_BASE_URL}/${idOrNo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to update exam');
    }
    return json.data;
  },

  async markExamCompleted(idOrNo) {
    const res = await fetch(`${API_BASE_URL}/${idOrNo}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to mark exam completed');
    }
    return json.data;
  },

  async uploadQuestionPaper(idOrNo, pdfPayload) {
    const res = await fetch(`${API_BASE_URL}/${idOrNo}/question-paper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pdfPayload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to upload question paper PDF');
    }
    return json.data;
  },

  async deleteExam(idOrNo) {
    const res = await fetch(`${API_BASE_URL}/${idOrNo}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to delete exam');
    }
    return true;
  },

  async getExamMarks(idOrNo, { group = 'A', includeAllStd = false } = {}) {
    const searchParams = new URLSearchParams();
    if (group) searchParams.append('group', group);
    if (includeAllStd) searchParams.append('includeAllStd', 'true');
    const url = `${API_BASE_URL}/${idOrNo}/marks?${searchParams.toString()}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch exam marks');
    }
    return json.data;
  },

  async saveExamMarks(idOrNo, { group = 'A', marks = [], assistantFacultyId = null, assistantName = '' }) {
    const res = await fetch(`${API_BASE_URL}/${idOrNo}/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group, marks, assistantFacultyId, assistantName }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to submit exam marks');
    }
    return {
      ...(json.data || {}),
      excelDownload: json.excelDownload || json.data?.excelDownload,
    };
  },

  async updateStudentMark(idOrNo, studentKey, payload) {
    const res = await fetch(`${API_BASE_URL}/${idOrNo}/marks/${studentKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json().then(j => {
      if (!res.ok) throw new Error(j.message || 'Failed to update student mark');
      return j.data;
    });
  },

  async getExamAnalysisSummary(params = {}) {
    const sp = new URLSearchParams();
    if (params.examType && params.examType !== 'ALL') sp.append('examType', params.examType);
    if (params.standard && params.standard !== 'ALL') sp.append('standard', params.standard);
    if (params.division && params.division !== 'ALL') sp.append('division', params.division);
    if (params.subject && params.subject !== 'ALL') sp.append('subject', params.subject);
    const qs = sp.toString();
    const url = qs ? `${API_BASE_URL}/analytics/summary?${qs}` : `${API_BASE_URL}/analytics/summary`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to fetch exam analysis summary');
    }
    return json.data;
  },

  async getExamDetailedAnalysis(idOrNo, { group = 'ALL' } = {}) {
    const sp = new URLSearchParams();
    if (group && group !== 'ALL') sp.append('group', group);
    const qs = sp.toString();
    const url = qs ? `${API_BASE_URL}/${idOrNo}/analytics?${qs}` : `${API_BASE_URL}/${idOrNo}/analytics`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to load detailed exam analytics');
    }
    return json.data;
  },

  async retrainExamModel() {
    const res = await fetch(`${API_BASE_URL}/ml/retrain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to retrain Exam ML model');
    }
    return json.data;
  },
};

