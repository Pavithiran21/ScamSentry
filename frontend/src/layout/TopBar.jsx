import {
  IconFlag,
  IconHistory,
  IconInfoCircle,
  IconListDetails,
  IconLogin,
  IconLogout,
  IconMenu2,
  IconRadar2,
  IconUserCircle,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { getSummary } from '../api/moderation';
import { getMe } from '../api/profile';
import { getQuota } from '../api/quota';
import { queryKeys } from '../api/queryKeys';
import { homePathFor, useAuth } from '../auth/AuthContext';
import { Logo } from '../components/Logo';
import { formatAgeWords } from '../lib/dates';
import { quotaSummary } from '../lib/limits';
import { NARROW_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { AccountMenu } from './AccountMenu';

/**
 * The charcoal top bar (DESIGN-REGISTRY "App shell"):
 *   guest       logo, How it works, Log in, Sign up free (inBand: transparent, inside the home band)
 *   account     logo and How it works (Log in, Sign up); plain: logo only (Forgot, Reset, /demo)
 *   User        copper pill tabs Check, History, My reports (dot for an unseen result), avatar menu
 *   Moderator   one Review queue tab, "12 open · oldest 2 days", the Moderator badge, avatar menu
 * Below 860 px the tabs move behind the menu button, which opens a full-width sheet.
 */
export function TopBar({ variant = 'guest', inBand = false }) {
  const { user, logout } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const narrow = useMediaQuery(NARROW_QUERY);
  const location = useLocation();

  // A link in the sheet changes the page: close the sheet. Widening the window closes it too.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setSheetOpen(false);
  }
  if (sheetOpen && !narrow) {
    setSheetOpen(false);
  }
  const showSheet = sheetOpen && narrow;

  // Esc in the sheet closes it and puts focus back on the menu button.
  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    menuButtonRef.current?.focus();
  }, []);
  const toggleSheet = useCallback(() => setSheetOpen((value) => !value), []);

  if (user) {
    return (
      <SignedInBar
        user={user}
        onLogout={logout}
        sheetOpen={showSheet}
        onToggleSheet={toggleSheet}
        onCloseSheet={closeSheet}
        menuButtonRef={menuButtonRef}
      />
    );
  }

  const showMenuButton = variant === 'guest';
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Logo to="/" size={inBand ? 36 : 34} />
        <nav className="nav-r" aria-label="Main">
          {variant !== 'plain' && (
            <Link className="link" to="/#how">
              How it works
            </Link>
          )}
          {variant === 'guest' && (
            <>
              <Link className="btn btn-ghost-w sm-login" to="/login">
                Log in
              </Link>
              <Link className="btn btn-copper hide-sm" to="/signup">
                Sign up free
              </Link>
            </>
          )}
          {showMenuButton && (
            <MenuButton buttonRef={menuButtonRef} open={showSheet} onToggle={toggleSheet} />
          )}
        </nav>
      </div>
      {showSheet && (
        <Sheet onClose={closeSheet}>
          <Link to="/#how">
            <IconInfoCircle aria-hidden="true" /> How it works
          </Link>
          <Link to="/login">
            <IconLogin aria-hidden="true" /> Log in
          </Link>
          <Link to="/signup">
            <IconUserPlus aria-hidden="true" /> Sign up free
          </Link>
        </Sheet>
      )}
    </header>
  );
}

function SignedInBar({ user, onLogout, sheetOpen, onToggleSheet, onCloseSheet, menuButtonRef }) {
  const isModerator = user.role === 'moderator';
  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: getMe, enabled: !isModerator });
  const quotaQuery = useQuery({ queryKey: queryKeys.quota(user.id), queryFn: getQuota, enabled: !isModerator });
  const summaryQuery = useQuery({ queryKey: queryKeys.modSummary, queryFn: getSummary, enabled: isModerator });

  const unseen = meQuery.data?.unseenReports ?? 0;
  const quota = quotaSummary(quotaQuery.data);
  const accountLine = isModerator ? 'Moderator' : `User${quota ? ` · ${quota.text}` : ''}`;

  const tabs = isModerator
    ? [{ to: '/review', label: 'Review queue', Icon: IconListDetails }]
    : [
        { to: '/', label: 'Check', Icon: IconRadar2, end: true },
        { to: '/history', label: 'History', Icon: IconHistory },
        { to: '/reports', label: 'My reports', Icon: IconFlag, unseen },
      ];

  return (
    <header className="topbar">
      <div className="topbar-in">
        <Logo to={homePathFor(user)} />
        <nav className="tabs" aria-label="Main">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end}>
              <tab.Icon aria-hidden="true" /> {tab.label}
              {tab.unseen > 0 && <UnseenDot count={tab.unseen} />}
            </NavLink>
          ))}
        </nav>
        <div className="nav-r">
          {isModerator && summaryQuery.data && (
            <span className="pill-info hide-sm">{summaryLine(summaryQuery.data)}</span>
          )}
          {isModerator && <span className="tag t-mod hide-sm">Moderator</span>}
          <AccountMenu user={user} accountLine={accountLine} onLogout={onLogout} />
          <MenuButton buttonRef={menuButtonRef} open={sheetOpen} onToggle={onToggleSheet} />
        </div>
      </div>
      {sheetOpen && (
        <Sheet onClose={onCloseSheet}>
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end}>
              <tab.Icon aria-hidden="true" /> {tab.label}
              {tab.unseen > 0 && (
                <span className="tag t-cop ml-auto">
                  {tab.unseen} new
                </span>
              )}
            </NavLink>
          ))}
          <NavLink to="/account">
            <IconUserCircle aria-hidden="true" /> Account
          </NavLink>
          <div className="who-line">
            <b>{user.email}</b>
            <div className="muted text-sm">{accountLine}</div>
          </div>
          <button type="button" className="logout" onClick={onLogout}>
            <IconLogout aria-hidden="true" /> Log out
          </button>
        </Sheet>
      )}
    </header>
  );
}

/** "12 open · oldest 2 days" from GET /moderation/summary. */
function summaryLine(summary) {
  if (!summary.open) {
    return 'No open reports';
  }
  return summary.oldestOpenAt
    ? `${summary.open} open · oldest ${formatAgeWords(summary.oldestOpenAt)}`
    : `${summary.open} open`;
}

function UnseenDot({ count }) {
  return (
    <>
      <span className="dot" aria-hidden="true" />
      <span className="sr">{count === 1 ? '1 new update' : `${count} new updates`}</span>
    </>
  );
}

function MenuButton({ buttonRef, open, onToggle }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="icon-btn menu-btn"
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      aria-controls="phone-menu"
      onClick={onToggle}
    >
      {open ? <IconX aria-hidden="true" /> : <IconMenu2 aria-hidden="true" />}
    </button>
  );
}

/** The phone menu: a full-width sheet under the header. Esc closes it. */
function Sheet({ onClose, children }) {
  const sheetRef = useRef(null);
  useEffect(() => {
    sheetRef.current?.querySelector('a, button')?.focus();
    function handleKey(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);
  return (
    <nav ref={sheetRef} id="phone-menu" className="sheet" aria-label="Menu">
      {children}
    </nav>
  );
}
