import { IconRefresh, IconServerOff, IconWifiOff } from '@tabler/icons-react';
import { isNetworkError } from '../lib/apiErrors';
import { LogoMark } from './Logo';

/** While the saved session is restored on first load. */
export function Splash() {
  return (
    <div className="splash" role="status">
      <LogoMark size={56} />
      <span className="sr">Loading ScamSentry</span>
    </div>
  );
}

/** Grey skeleton lines for a list or a report that is loading. */
export function SkeletonPanel({ label, rows = 4 }) {
  return (
    <div className="state" role="status">
      <span className="sr">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skel" style={{ width: index % 3 === 0 ? '60%' : index % 3 === 1 ? '100%' : '40%' }} />
      ))}
    </div>
  );
}

/** "No checks yet" style panel: a dashed badge, a heading, a line and an optional action. */
export function EmptyState({ icon: Icon, title, children, action, badgeClass = '' }) {
  return (
    <div className="state center">
      <div className={`badge ${badgeClass}`} aria-hidden="true">
        <Icon />
      </div>
      <h3>{title}</h3>
      {children && <p className="muted mx-auto max-w-xl text-[15px]">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/**
 * A list or page that failed to load. No connection gets "Couldn't reach ScamSentry"; anything
 * else gets "Something went wrong on our side" with the request id to quote.
 */
export function ErrorPanel({ error, onRetry }) {
  if (isNetworkError(error)) {
    return (
      <div className="state warn" role="alert">
        <h3>
          <IconWifiOff aria-hidden="true" /> Couldn&apos;t reach ScamSentry
        </h3>
        <p className="muted mb-3 text-[15px]">Check your connection and try again.</p>
        {onRetry && <RetryButton onRetry={onRetry} />}
      </div>
    );
  }
  return (
    <div className="state center" role="alert">
      <div className="badge" aria-hidden="true">
        <IconServerOff />
      </div>
      <h3>Something went wrong on our side</h3>
      <p className="muted mb-3 text-[15px]">
        Try again in a minute.
        {error?.requestId && (
          <>
            {' '}
            If it keeps happening, quote this reference: <b>{error.requestId}</b>.
          </>
        )}
      </p>
      {onRetry && <RetryButton onRetry={onRetry} />}
    </div>
  );
}

function RetryButton({ onRetry }) {
  return (
    <button type="button" className="btn btn-line sm" onClick={onRetry}>
      <IconRefresh aria-hidden="true" /> Try again
    </button>
  );
}
