import { API_ROOT } from './apiConfig';

const API_BASE_URL = `${API_ROOT}/api/syllabus`;

function getLocalYmd() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const syllabusApi = {
  /**
   * Fetch syllabus chapters (isolated per facultyId when role !== 'principal')
   */
  async getSyllabus(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.standard) searchParams.append('standard', params.standard);
    if (params.division) searchParams.append('division', params.division);
    if (params.subject) searchParams.append('subject', params.subject);
    if (params.facultyId) searchParams.append('facultyId', params.facultyId);
    if (params.role) searchParams.append('role', params.role);

    const url = `${API_BASE_URL}?${searchParams.toString()}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch syllabus from server');
    }
    const json = await res.json();
    return json.data || [];
  },

  /**
   * Fetch Principal un-isolated all-subject syllabus overview with filters & charts data
   */
  async getPrincipalOverview(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.standard) searchParams.append('standard', params.standard);
    if (params.division) searchParams.append('division', params.division);
    if (params.subject) searchParams.append('subject', params.subject);
    if (params.facultyId) searchParams.append('facultyId', params.facultyId);
    if (params.day) searchParams.append('day', params.day);
    searchParams.append('date', params.date || getLocalYmd());
    searchParams.append('tzOffset', String(new Date().getTimezoneOffset()));

    const url = `${API_BASE_URL}/principal-overview?${searchParams.toString()}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch principal syllabus overview');
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Fetch all topics/subtopics/examples/exercises marked Finished TODAY (isolated by facultyId)
   */
  async getTodayFinished(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.subject) searchParams.append('subject', params.subject);
    if (params.facultyId) searchParams.append('facultyId', params.facultyId);
    if (params.role) searchParams.append('role', params.role);
    searchParams.append('date', params.date || getLocalYmd());
    searchParams.append('tzOffset', String(new Date().getTimezoneOffset()));

    const url = `${API_BASE_URL}/finished-today?${searchParams.toString()}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch today finished topics');
    }
    const json = await res.json();
    return json.data || [];
  },

  /**
   * Add a new chapter
   */
  async addChapter(chapterData) {
    const res = await fetch(`${API_BASE_URL}/chapter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chapterData),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to add chapter');
    }
    return json.data;
  },

  /**
   * Add a new topic or subtopic
   */
  async addTopic(topicData) {
    const res = await fetch(`${API_BASE_URL}/topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(topicData),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to add topic');
    }
    return json.data;
  },

  /**
   * Toggle status of an item (isolated to requesting facultyId in SyllabusProgress)
   */
  async toggleStatus(chapterId, itemNo, itemType, itemId = null, parentTopicNo = null, facultyMeta = {}) {
    const res = await fetch(`${API_BASE_URL}/toggle-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterId,
        itemNo,
        itemType,
        itemId,
        parentTopicNo,
        ...facultyMeta,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to update status');
    }
    return json.data;
  },

  /**
   * Delete chapter
   */
  async deleteChapter(chapterId) {
    const res = await fetch(`${API_BASE_URL}/chapter/${chapterId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Failed to delete chapter');
    }
    return true;
  },
};

