import { IconFlag, IconHistory, IconListDetails, IconLock, IconUserX } from '@tabler/icons-react';
import { useState } from 'react';
import { changePassword } from '../../api/profile';
import { setAccessToken } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { PasswordField } from '../../components/Fields';
import { FormAlert } from '../../components/FormAlert';
import { useServerForm } from '../../hooks/useServerForm';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatDate } from '../../lib/dates';
import { useToast } from '../../toast/ToastContext';
import { changePasswordSchema } from '../auth/authSchemas';
import { DeleteAccountDialog } from './DeleteAccountDialog';

const DEMO_LOCKED = "Demo accounts can't change their password or be deleted.";

/**
 * /account for a User or a Moderator (design section 12): change password, and delete the
 * account through a password dialog. A demo account sees both locked; if a request is sent
 * anyway, the server answers 403 DEMO_ACCOUNT_LOCKED and the same notice shows.
 */
export function AccountPage() {
  usePageTitle('Your account');
  const { user } = useAuth();
  const [lockedByServer, setLockedByServer] = useState(false);
  const locked = user.isDemo || lockedByServer;

  if (locked) {
    return <DemoLockedAccount user={user} />;
  }
  return <RealAccount user={user} onLocked={() => setLockedByServer(true)} />;
}

function RealAccount({ user, onLocked }) {
  const { showToast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const form = useServerForm(changePasswordSchema, {
    defaultValues: { currentPassword: '', newPassword: '' },
    fieldForCode: { WRONG_PASSWORD: 'currentPassword' },
  });
  const { errors, isSubmitting } = form.formState;
  const isModerator = user.role === 'moderator';

  async function onSubmit(values) {
    form.setFormError(null);
    try {
      const { accessToken } = await changePassword(values);
      // Every other session was signed out; this tab keeps going with the new token.
      setAccessToken(accessToken);
      form.reset();
      showToast('Password changed · other devices signed out', { icon: IconLock });
    } catch (error) {
      if (error.code === 'DEMO_ACCOUNT_LOCKED') {
        onLocked();
      } else {
        form.handleServerError(error);
      }
    }
  }

  return (
    <main className="main top" id="main">
      <div className="auth2">
        <section className="authform" aria-labelledby="account-title">
          <h1 id="account-title">Your account</h1>
          <p className="muted mt-1 mb-5 break-words">
            {user.email} · member since {formatDate(user.createdAt)}
          </p>
          <h2 className="mb-3 text-xl">Change password</h2>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <PasswordField
              id="account-current"
              label="Current password"
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              registration={form.register('currentPassword')}
            />
            <PasswordField
              id="account-new"
              label="New password"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              hint={errors.newPassword ? null : 'Use at least 8 characters, with a number. Your other devices are signed out.'}
              registration={form.register('newPassword')}
            />
            <FormAlert error={form.formError} />
            <button type="submit" className="btn btn-copper wide" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        </section>
        <aside className="card" aria-labelledby="delete-title">
          <h2 id="delete-title">Delete account</h2>
          <p className="muted mb-3 text-[15px]">Removes your account for good. This can&apos;t be undone.</p>
          {isModerator ? (
            <ul className="ticks">
              <li>
                <span className="t-ic" aria-hidden="true">
                  <IconListDetails />
                </span>
                <div>
                  <b>Your decisions</b>
                  <div className="muted">Stay on the reports you decided, shown to others as another moderator.</div>
                </div>
              </li>
            </ul>
          ) : (
            <ul className="ticks">
              <li>
                <span className="t-ic" aria-hidden="true">
                  <IconHistory />
                </span>
                <div>
                  <b>Your history</b>
                  <div className="muted">Every check and its saved message is deleted.</div>
                </div>
              </li>
              <li>
                <span className="t-ic" aria-hidden="true">
                  <IconFlag />
                </span>
                <div>
                  <b>Reports you sent</b>
                  <div className="muted">
                    Stay with moderators until reviewed, without your email. Their message copy is deleted 30 days
                    after the review.
                  </div>
                </div>
              </li>
            </ul>
          )}
          <button type="button" className="btn btn-line btn-danger-line wide mt-4" onClick={() => setDeleteOpen(true)}>
            <IconUserX aria-hidden="true" /> Delete account…
          </button>
        </aside>
      </div>
      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onLocked={onLocked} />
    </main>
  );
}

function DemoLockedAccount({ user }) {
  return (
    <main className="main top" id="main">
      <section className="single" aria-labelledby="account-title">
        <h1 id="account-title">Your account</h1>
        <p className="muted mt-1 mb-4 break-words">{user.email} · demo account</p>
        <div className="notice info" role="status">
          <IconLock aria-hidden="true" />
          <div>
            <b>{DEMO_LOCKED}</b> Everything else works as for a real account.
          </div>
        </div>
        <div className="mt-4">
          <PasswordField id="demo-current" label="Current password" disabled />
          <PasswordField id="demo-new" label="New password" disabled />
        </div>
        <button type="button" className="btn btn-copper wide" disabled>
          Save new password
        </button>
        <button type="button" className="btn btn-line wide mt-2.5" disabled>
          <IconUserX aria-hidden="true" /> Delete account…
        </button>
      </section>
    </main>
  );
}
