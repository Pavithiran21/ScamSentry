import { IconError404 } from '@tabler/icons-react';
import { Link } from 'react-router';
import { homePathFor, useAuth } from '../auth/AuthContext';
import { EmptyState } from '../components/StatePanels';
import { usePageTitle } from '../hooks/usePageTitle';

/** A wrong address, or a saved check or report that is gone or someone else's (the API says 404). */
export function NotFoundPanel() {
  const { user } = useAuth();
  const isModerator = user?.role === 'moderator';
  return (
    <EmptyState
      icon={IconError404}
      title="We can't find that page"
      action={
        <Link className="btn btn-copper sm" to={homePathFor(user)}>
          {isModerator ? 'Go to the review queue' : 'Go to Check'}
        </Link>
      }
    >
      The link may be old or mistyped.
    </EmptyState>
  );
}

export function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <main className="main top" id="main">
      <div className="mx-auto max-w-xl pt-6">
        <h1 className="sr">Page not found</h1>
        <NotFoundPanel />
      </div>
    </main>
  );
}
