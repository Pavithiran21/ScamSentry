import { apiRequest } from './client';

/** { id, email, role, isDemo, createdAt, unseenReports } */
export function getMe() {
  return apiRequest('/me');
}

/** Returns { accessToken }: the other sessions are signed out, this one gets a new token. */
export function changePassword({ currentPassword, newPassword }) {
  return apiRequest('/me/password', { method: 'POST', body: { currentPassword, newPassword } });
}

export function deleteAccount({ password }) {
  return apiRequest('/me', { method: 'DELETE', body: { password } });
}
