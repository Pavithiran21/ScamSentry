import { Navigate, Outlet, useLocation } from 'react-router';
import { Splash } from '../components/StatePanels';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { homePathFor, useAuth } from './AuthContext';

/**
 * Pages that need an account (History, My reports, Account, the review queue). A guest goes to
 * Log in and comes back here after. Someone who just logged out or deleted their account goes
 * to Check instead, which is where they meant to end up.
 */
export function RequireSignedIn() {
  const { user, isLoading, signOutReason, sessionEnded } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Splash />;
  }
  if (!user) {
    if (signOutReason) {
      return <Navigate to="/" replace />;
    }
    // sessionEnded: a 401 ended the session here, so Log in says "Your session has ended."
    // (AppLayout sends the same state for pages that need no account).
    return <Navigate to="/login" replace state={{ from: location, sessionEnded }} />;
  }
  return <Outlet />;
}

/**
 * A page for one role, inside RequireSignedIn. The wrong role sees the 403 page ("Moderators
 * only" or "Not for moderators"). This only decides what is shown: the server refuses the
 * requests with 403 anyway.
 */
export function RequireRole({ role }) {
  const { user } = useAuth();
  if (user.role !== role) {
    return <ForbiddenPage variant={role === 'moderator' ? 'moderators-only' : 'not-for-moderators'} />;
  }
  return <Outlet />;
}

/** Log in, Sign up, Forgot password and /demo. Signed in, you go where you were going, or home. */
export function GuestOnly() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Splash />;
  }
  if (user) {
    const from = location.state?.from;
    const target = from && user.role === 'user' ? from.pathname + from.search : homePathFor(user);
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}
