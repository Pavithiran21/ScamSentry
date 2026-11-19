import { apiRequest } from './client';

export const QUEUE_PAGE_SIZE = 20;

/** { open, confirmed, overturned, oldestOpenAt } for the tab counts and the top-bar line. */
export function getSummary() {
  return apiRequest('/moderation/summary');
}

/** sort is 'createdAt' (oldest first) or '-createdAt' (newest first). */
export function listQueue({ status, sort, page }) {
  const params = new URLSearchParams({ status, sort, page: String(page), size: String(QUEUE_PAGE_SIZE) });
  return apiRequest(`/moderation/reports?${params}`);
}

export function getQueueReport(id) {
  return apiRequest(`/moderation/reports/${encodeURIComponent(id)}`);
}

/** { action: 'confirm' | 'overturn', verdict?, note }. 409 ALREADY_DECIDED if someone was first. */
export function decideReport(id, { action, verdict, note }) {
  return apiRequest(`/moderation/reports/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    body: { action, verdict, note },
  });
}
