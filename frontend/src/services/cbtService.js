import { API_ROOT } from './apiConfig';

/**
 * CBT Service - Computer Based Test API client with local fallback
 */

const LOCAL_CBT_STORAGE = 'sms_cbt_exams_cache_v1';
const LOCAL_ATTEMPT_STORAGE = 'sms_cbt_attempts_cache_v1';

export async function fetchCbtExams(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_ROOT}/api/cbt/exams?${query}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.exams) {
        localStorage.setItem(LOCAL_CBT_STORAGE, JSON.stringify(data.exams));
        return data.exams;
      }
    }
  } catch (err) {
    console.warn('API fetchCbtExams failed, using cached/fallback data:', err);
  }

  // Fallback to cache
  const cached = localStorage.getItem(LOCAL_CBT_STORAGE);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
  }
  return [];
}

export async function fetchCbtExamById(id) {
  try {
    const res = await fetch(`${API_ROOT}/api/cbt/exams/${id}`);
    if (res.ok) {
      const data = await res.json();
      return data.exam;
    }
  } catch (err) {
    console.warn('API fetchCbtExamById failed:', err);
  }
  return null;
}

export async function createCbtExam(examData) {
  const res = await fetch(`${API_ROOT}/api/cbt/exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(examData),
  });
  return await res.json();
}

export async function updateCbtExam(id, updates) {
  const res = await fetch(`${API_ROOT}/api/cbt/exams/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return await res.json();
}

export async function deleteCbtExam(id) {
  const res = await fetch(`${API_ROOT}/api/cbt/exams/${id}`, {
    method: 'DELETE',
  });
  return await res.json();
}

export async function startCbtExam(id, studentInfo) {
  const res = await fetch(`${API_ROOT}/api/cbt/exams/${id}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentInfo),
  });
  return await res.json();
}

export async function saveCbtProgress(id, progressData) {
  const res = await fetch(`${API_ROOT}/api/cbt/exams/${id}/save-progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(progressData),
  });
  return await res.json();
}

export async function recordCbtViolation(id, violationData) {
  const res = await fetch(`${API_ROOT}/api/cbt/exams/${id}/violation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(violationData),
  });
  return await res.json();
}

export async function submitCbtExam(id, submissionData) {
  const res = await fetch(`${API_ROOT}/api/cbt/exams/${id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submissionData),
  });
  return await res.json();
}

export async function grantCbtRetry(id, retryData) {
  const res = await fetch(`${API_ROOT}/api/cbt/exams/${id}/grant-retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(retryData),
  });
  return await res.json();
}

export async function evaluateCbtExam(id) {
  const res = await fetch(`${API_ROOT}/api/cbt/exams/${id}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return await res.json();
}

export async function fetchCbtAnalysis(id) {
  const res = await fetch(`${API_ROOT}/api/cbt/exams/${id}/analysis`);
  return await res.json();
}

export async function fetchCbtLiveMonitor(id) {
  const res = await fetch(`${API_ROOT}/api/cbt/exams/${id}/live-monitor`);
  return await res.json();
}

export async function extractCbtPaper(payload) {
  const res = await fetch(`${API_ROOT}/api/cbt/exams/extract-paper`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

