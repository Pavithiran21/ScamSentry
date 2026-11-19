import { IconHistory, IconWifi } from '@tabler/icons-react';
import { Link } from 'react-router';
import { BigQuotaRing } from '../../components/QuotaRing';
import { USER_DAILY_CHECKS, comeBackWhen } from '../../lib/limits';

/**
 * The card shown when a daily limit is used up (design section 04). Which card depends on which
 * limit was hit: this device (3), this network (10) or the account (30). The reset time is the
 * server's resetAt, in the viewer's own time.
 */
export function LimitCard({ kind, limit, resetAt }) {
  const when = comeBackWhen(resetAt);

  if (kind === 'network') {
    return (
      <div className="card mx-auto w-full max-w-md text-center" role="alert">
        <BigQuotaRing remaining={0} limit={limit} label="0 checks left on this network" />
        <span className="tag t-gray">
          <IconWifi aria-hidden="true" /> This network
        </span>
        <h2 className="mt-2 mb-1 text-xl">This network has used its {limit} free checks</h2>
        <p className="muted mb-3.5 text-[15px]">
          Everyone on the same Wi-Fi, office or mobile network shares them. They come back {when}. Your own account
          isn&apos;t shared.
        </p>
        <Link className="btn btn-copper wide" to="/signup">
          Sign up free
        </Link>
        <Link className="btn btn-line wide mt-2" to="/login">
          Log in
        </Link>
      </div>
    );
  }

  if (kind === 'user') {
    return (
      <div className="card mx-auto w-full max-w-md text-center" role="alert">
        <BigQuotaRing remaining={0} limit={limit} label={`0 of ${limit} checks left`} />
        <span className="tag t-cop">Signed in</span>
        <h2 className="mt-2 mb-1 text-xl">You&apos;ve used today&apos;s {limit} checks</h2>
        <p className="muted mb-3.5 text-[15px]">
          Checks come back {when}. Your history is still here to read.
        </p>
        <Link className="btn btn-line wide" to="/history">
          <IconHistory aria-hidden="true" /> Open History
        </Link>
      </div>
    );
  }

  return (
    <div className="card mx-auto w-full max-w-md text-center" role="alert">
      <BigQuotaRing remaining={0} limit={limit} label={`0 of ${limit} checks left`} />
      <span className="tag t-gray">This device</span>
      <h2 className="mt-2 mb-1 text-xl">You&apos;ve used today&apos;s {limit} free checks</h2>
      <p className="muted mb-3.5 text-[15px]">
        Free checks come back {when}. Sign up for {USER_DAILY_CHECKS} checks a day and a saved history.
      </p>
      <Link className="btn btn-copper wide" to="/signup">
        Sign up free
      </Link>
      <div className="hint">Clearing cookies won&apos;t add more: limits also apply per network.</div>
    </div>
  );
}
