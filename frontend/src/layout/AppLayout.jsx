import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { TopBar } from './TopBar';

// Which signed-out top bar each page has (design section 09): Log in and Sign up keep
// "How it works"; Forgot, Reset and /demo show the logo only.
const PLAIN_PAGES = ['/forgot-password', '/reset-password', '/demo'];
const ACCOUNT_PAGES = ['/login', '/signup'];

function guestVariant(pathname) {
  if (PLAIN_PAGES.includes(pathname)) {
    return 'plain';
  }
  if (ACCOUNT_PAGES.includes(pathname)) {
    return 'account';
  }
  return 'guest';
}

/**
 * Every page: the top bar, the page and the footer. The signed-out Check page draws its own
 * charcoal band with the top bar inside it, so it gets no bar here.
 */
export function AppLayout() {
  const { user, sessionEnded } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isGuestHome = !user && location.pathname === '/';

  // A signed-in request got 401 and could not be refreshed (UI-UX "API code → screen"): go to
  // Log in, which says "Your session has ended.", and come back to this page afterwards. This
  // runs once per ended session (the ref); the flag itself stays until the next log in, so the
  // guard on a signed-in page sends the same state.
  const redirectedRef = useRef(false);
  useEffect(() => {
    if (!sessionEnded) {
      redirectedRef.current = false;
      return;
    }
    if (!redirectedRef.current) {
      redirectedRef.current = true;
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true, state: { from: location, sessionEnded: true } });
      }
    }
  }, [sessionEnded, location, navigate]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {!isGuestHome && <TopBar variant={guestVariant(location.pathname)} />}
      <Outlet />
      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="foot-in">
        <span>© 2026 ScamSentry</span>
        <Link className="link-c" to="/#how">
          How it works
        </Link>
        <Link className="link-c" to="/#privacy">
          Privacy
        </Link>
        <span>
          Lost money? Call <b>1930</b> or report at cybercrime.gov.in
        </span>
      </div>
    </footer>
  );
}
