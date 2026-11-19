import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

/**
 * { user, isLoading, sessionEnded, signOutReason, login, register, demoLogin, logout,
 *   startSession, endSessionLocally }
 * user is { id, email, role: 'user' | 'moderator', isDemo, createdAt } or null for a guest.
 */
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return auth;
}

/** Where a role starts: a User on Check, a Moderator on the review queue. */
export function homePathFor(user) {
  return user?.role === 'moderator' ? '/review' : '/';
}
