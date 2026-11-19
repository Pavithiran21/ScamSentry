import { apiRequest } from './client';

export const MY_REPORTS_PAGE_SIZE = 10;

export function listMyReports({ page }) {
  return apiRequest(`/reports?page=${page}&size=${MY_REPORTS_PAGE_SIZE}&sort=-createdAt`);
}

export function getMyReport(id) {
  return apiRequest(`/reports/${encodeURIComponent(id)}`);
}

/** Clears the "New" tag and the tab dot for a decided report. */
export function markReportSeen(id) {
  return apiRequest(`/reports/${encodeURIComponent(id)}/seen`, { method: 'POST' });
}
