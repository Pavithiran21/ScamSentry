import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { FormAlert } from '../../components/FormAlert';
import { SkeletonPanel } from '../../components/StatePanels';
import { usePageTitle } from '../../hooks/usePageTitle';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { useDemoAccounts } from './useDemoAccounts';

const ROLE_TEXT = {
  User: { what: 'Check, history, report a verdict', button: 'btn btn-copper sm' },
  Moderator: { what: 'Review queue, confirm or overturn', button: 'btn btn-char sm' },
};

/**
 * /demo, demo mode only (DEMO_MODE=true on the backend; a 404 from GET /demo/accounts means it is
 * off, and so does this page). One "Log in as" button per role with a login; the demo password
 * is shown on purpose. Guest has no account: the Check page signed out is its demo.
 */
export function DemoPage() {
  usePageTitle('Try the demo');
  const { demoLogin } = useAuth();
  const demo = useDemoAccounts();
  const [busyRole, setBusyRole] = useState(null);
  const [error, setError] = useState(null);

  if (demo.isError) {
    return <NotFoundPage />;
  }

  async function logInAs(role) {
    setBusyRole(role);
    setError(null);
    try {
      await demoLogin(role); // GuestOnly then sends the role to its start page
    } catch (loginError) {
      setError(loginError);
      setBusyRole(null);
    }
  }

  const accounts = demo.data?.accounts ?? [];
  const password = accounts[0]?.password;

  return (
    <main className="main top" id="main">
      <section className="single" aria-labelledby="demo-title">
        <h1 id="demo-title">Try the demo</h1>
        <p className="muted mt-1 mb-2">
          Real roles and rules. Demo accounts can&apos;t change their email or password, and their emails go to a
          throwaway test inbox.
        </p>
        {demo.isPending && <SkeletonPanel label="Loading the demo accounts" rows={3} />}
        <FormAlert error={error} />
        {accounts.map((account) => (
          <div key={account.role} className="demo-row">
            <div>
              <b>{account.role}</b>
              <div className="muted text-sm">{ROLE_TEXT[account.role]?.what}</div>
              <code>{account.email}</code>
            </div>
            <button
              type="button"
              className={ROLE_TEXT[account.role]?.button ?? 'btn btn-line sm'}
              disabled={busyRole !== null}
              onClick={() => logInAs(account.role)}
            >
              {busyRole === account.role ? 'Logging in…' : `Log in as ${account.role}`}
            </button>
          </div>
        ))}
        {password && (
          <p className="hint mt-3">
            Password for both: <code className="mono">{password}</code>
          </p>
        )}
        <p className="mt-2.5 text-[15px]">
          <b>Guest</b> has no account:{' '}
          <Link className="link-c" to="/">
            open the check page signed out
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
