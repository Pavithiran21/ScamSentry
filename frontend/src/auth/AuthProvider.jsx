import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as authApi from '../api/auth';
import { refreshSession, setAccessToken, setSessionEndedHandler } from '../api/client';
import * as demoApi from '../api/demo';
import { AuthContext } from './AuthContext';

/**
 * Holds the signed-in user (or null for a guest). The access token itself stays inside
 * api/client.js. On first load the refresh cookie restores the session, so a page reload keeps
 * you signed in. The role in user.role only decides what is shown: the server checks it again
 * on every request.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionEnded, setSessionEnded] = useState(false);
  // Why the user ended the session on purpose ('logged-out', 'account-deleted'), or null. The
  // guards then send them to Check instead of to Log in. Pages don't navigate themselves after
  // a sign-out: React Router renders a navigation after the "no user" render, so the guard's
  // redirect would win.
  const [signOutReason, setSignOutReason] = useState(null);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    refreshSession().then((session) => {
      if (!cancelled) {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cached server data belongs to one person (History, reports, the review queue). When who is
  // signed in changes, the guards have already unmounted the signed-in pages in that render, so
  // every query nobody is using is dropped here: the next account never sees the last one's data.
  // The quota ring stays mounted on Check, so its key includes the user id (api/queryKeys.js).
  const previousUserId = useRef(undefined);
  useEffect(() => {
    const userId = user?.id ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      queryClient.removeQueries({ predicate: (query) => query.getObserversCount() === 0 });
    }
    previousUserId.current = userId;
  }, [user, queryClient]);

  // A signed-in request got 401 and the refresh failed: the token was signed with an old secret,
  // the account is gone, or the session expired. App.jsx then shows Log in with the notice.
  useEffect(() => {
    setSessionEndedHandler(() => {
      if (!userRef.current) {
        return; // Already signed out (a request that was in flight during logout).
      }
      setAccessToken(null);
      setUser(null);
      setSessionEnded(true);
    });
  }, []);

  const startSession = useCallback((session) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setSessionEnded(false);
    setSignOutReason(null);
  }, []);

  /** Forgets the session in this tab, after the server has already ended it. */
  const endSessionLocally = useCallback((reason = null) => {
    setAccessToken(null);
    setUser(null);
    setSignOutReason(reason);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      sessionEnded,
      signOutReason,
      login: async (credentials) => startSession(await authApi.login(credentials)),
      register: async (input) => startSession(await authApi.register(input)),
      // Demo mode only: the "Log in as" buttons on /demo.
      demoLogin: async (role) => startSession(await demoApi.demoLogin(role)),
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // The session ends in this tab anyway; the cookie expires on its own.
        }
        endSessionLocally('logged-out');
      },
      startSession,
      endSessionLocally,
    }),
    [user, isLoading, sessionEnded, signOutReason, startSession, endSessionLocally],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
