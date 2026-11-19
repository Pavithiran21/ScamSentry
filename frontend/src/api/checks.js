import { apiRequest } from './client';

/** Runs the hybrid check. Guest: 200 with check.id null. User: 201, saved to History. */
export function runCheck(text) {
  return apiRequest('/checks', { method: 'POST', body: { text } });
}

export function listChecks({ page, size }) {
  return apiRequest(`/checks?page=${page}&size=${size}&sort=-checkedAt`);
}

export function getCheck(id) {
  return apiRequest(`/checks/${encodeURIComponent(id)}`);
}

export function deleteCheck(id) {
  return apiRequest(`/checks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Deletes every saved check: { deleted }. Open reports keep their own copy. */
export function deleteHistory() {
  return apiRequest('/checks', { method: 'DELETE' });
}

export function reportCheck(id, { suggestedVerdict, reason, consent }) {
  return apiRequest(`/checks/${encodeURIComponent(id)}/reports`, {
    method: 'POST',
    body: { suggestedVerdict, reason, consent },
  });
}
