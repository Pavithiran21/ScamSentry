import { IconLockAccess } from '@tabler/icons-react';
import { Link } from 'react-router';
import { EmptyState } from '../components/StatePanels';
import { usePageTitle } from '../hooks/usePageTitle';

const VARIANTS = {
  // A User opens /review: the server answers 403 for every moderation request.
  'moderators-only': {
    title: 'Moderators only',
    text: "Your account can't open the review queue.",
    to: '/',
    back: 'Back to Check',
  },
  // A Moderator opens /history or /reports: saved checks belong to the people who made them.
  'not-for-moderators': {
    title: 'Not for moderators',
    text: 'Saved checks belong to the people who made them. A moderator account only sees reports.',
    to: '/review',
    back: 'Back to the review queue',
  },
};

export function ForbiddenPage({ variant }) {
  const page = VARIANTS[variant];
  usePageTitle(page.title);
  return (
    <main className="main top" id="main">
      <div className="mx-auto max-w-xl pt-6">
        <h1 className="sr">{page.title}</h1>
        <EmptyState
          icon={IconLockAccess}
          badgeClass="b-mod"
          title={page.title}
          action={
            <Link className="btn btn-line sm" to={page.to}>
              {page.back}
            </Link>
          }
        >
          {page.text}
        </EmptyState>
      </div>
    </main>
  );
}
