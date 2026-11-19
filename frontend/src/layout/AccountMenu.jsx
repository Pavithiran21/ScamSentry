import { IconLogout, IconUserCircle } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { initialsOf } from '../lib/initials';

/**
 * The avatar button and its menu (email, the account line, Account, Log out). The button's name
 * starts with its visible initials ("AR, account menu"), as WCAG 2.5.3 asks. Esc or a click
 * outside closes the menu and returns focus to the button; arrow keys move between the items.
 */
export function AccountMenu({ user, accountLine, onLogout }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const initials = initialsOf(user.email);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    function handlePointer(event) {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event) {
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={user.role === 'moderator' ? 'who mod hide-sm' : 'who hide-sm'}
        aria-label={`${initials}, account menu`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {initials}
      </button>
      {open && (
        <div ref={menuRef} className="menu" role="menu" aria-label="Account" onKeyDown={handleKeyDown}>
          <div className="who-info">
            <b>{user.email}</b>
            <div className="muted">{accountLine}</div>
          </div>
          <Link role="menuitem" to="/account" onClick={() => setOpen(false)}>
            <IconUserCircle aria-hidden="true" /> Account
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <IconLogout aria-hidden="true" /> Log out
          </button>
        </div>
      )}
    </>
  );
}
