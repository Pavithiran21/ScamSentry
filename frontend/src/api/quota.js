import { apiRequest } from './client';

/** Today's checks left: { kind: 'guest' | 'user', resetAt, device?, network?, user? }. */
export function getQuota() {
  return apiRequest('/quota');
}
