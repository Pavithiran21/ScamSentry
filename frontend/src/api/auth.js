import { apiRequest } from './client';

// Log in, sign up and the password-reset requests send no token: a 401 here is a wrong
// password, not an ended session.
export function login({ email, password }) {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password }, auth: false });
}

export function register({ email, password }) {
  return apiRequest('/auth/register', { method: 'POST', body: { email, password }, auth: false });
}

export function logout() {
  return apiRequest('/auth/logout', { method: 'POST', auth: false });
}

export function forgotPassword({ email }) {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
}

export function resetPassword({ token, password }) {
  return apiRequest('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false });
}
