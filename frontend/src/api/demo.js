import { apiRequest } from './client';

// Both routes exist only when the backend runs with DEMO_MODE=true; otherwise they answer 404.
export function getDemoAccounts() {
  return apiRequest('/demo/accounts', { auth: false });
}

export function demoLogin(role) {
  return apiRequest('/demo/login', { method: 'POST', body: { role }, auth: false });
}
