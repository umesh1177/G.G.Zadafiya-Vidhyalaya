import { API_ROOT } from './apiConfig';

const API_BASE_URL = `${API_ROOT}/api/notices`;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export function readNoticeAttachmentAsPayload(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const nameLower = String(file.name || '').toLowerCase();
    const mimeLower = String(file.type || '').toLowerCase();
    const isPdf = mimeLower === 'application/pdf' || nameLower.endsWith('.pdf');
    const isImage =
      mimeLower.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif)$/i.test(nameLower);

    if (!isPdf && !isImage) {
      reject(new Error(`"${file.name}" is not supported. Upload Image (PNG/JPG/WEBP) or PDF files only.`));
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      reject(new Error(`"${file.name}" exceeds maximum size of 10 MB.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = typeof reader.result === 'string' ? reader.result : '';
      resolve({
        fileName: file.name,
        mimeType: file.type || (isPdf ? 'application/pdf' : 'image/png'),
        fileType: isPdf ? 'PDF' : 'IMAGE',
        size: file.size,
        base64Data,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read file "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

export function getNoticeAttachmentUrl(noticeId, attachmentId, download = false) {
  return `${API_BASE_URL}/${noticeId}/attachments/${attachmentId}${download ? '?download=1' : ''}`;
}

export const noticeApi = {
  async getRecipients() {
    const res = await fetch(`${API_BASE_URL}/recipients`, { method: 'GET', cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load faculty list');
    return json.data || [];
  },

  async getNotices(params = {}) {
    const sp = new URLSearchParams();
    if (params.viewerRole) sp.append('viewerRole', params.viewerRole);
    if (params.viewerId) sp.append('viewerId', params.viewerId);
    if (params.viewerEmpCode) sp.append('viewerEmpCode', params.viewerEmpCode);
    if (params.viewerEmail) sp.append('viewerEmail', params.viewerEmail);
    if (params.box) sp.append('box', params.box);
    if (params.senderRole) sp.append('senderRole', params.senderRole);
    if (params.type) sp.append('type', params.type);
    if (params.search) sp.append('search', params.search);

    const qs = sp.toString();
    const res = await fetch(qs ? `${API_BASE_URL}?${qs}` : API_BASE_URL, {
      method: 'GET',
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch notices');
    return json.data || [];
  },

  async createNotice(payload) {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to send notice');
    return json.data;
  },

  async deleteNotice(id) {
    const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to delete notice');
    return true;
  },
};

