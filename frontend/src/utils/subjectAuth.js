/**
 * Client-Side Subject Authorization Helper
 * Validates whether an Assistant Faculty or Subject Faculty has jurisdiction
 * to enter marks for a given test/exam subject.
 */

export function isSubjectAuthorized(userRole, userSubject, targetSubject) {
  const normRole = String(userRole || '').toLowerCase();
  if (normRole === 'principal') return true;
  if (!userSubject || !targetSubject) return false;

  const u = String(userSubject).toLowerCase();
  const t = String(targetSubject).toLowerCase();

  if (u === t) return true;

  const keywords = ['physics', 'chemistry', 'biology', 'mathematics', 'maths'];
  const userHas = keywords.filter((k) => u.includes(k));

  for (const k of userHas) {
    if (t.includes(k)) return true;
    if (k === 'mathematics' && t.includes('maths')) return true;
    if (k === 'maths' && t.includes('mathematics')) return true;
  }

  const words = u.split(/[\s—\/\-,]+/).filter((w) => w.length > 2);
  for (const w of words) {
    if (t.includes(w)) return true;
  }

  return false;
}

