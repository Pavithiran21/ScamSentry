import { IconLinkOff } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { resetPassword } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';
import { PasswordField } from '../../components/Fields';
import { FormAlert } from '../../components/FormAlert';
import { useServerForm } from '../../hooks/useServerForm';
import { usePageTitle } from '../../hooks/usePageTitle';
import { resetPasswordSchema } from './authSchemas';

// The reset token in the emailed link: 32 random bytes, base64url (backend auth.schemas.js).
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * /reset-password?token=… from the emailed link. It opens signed in too, so the link works in
 * any browser. A used, expired or broken link shows the "This link has expired" page. A reset
 * signs out every session (server side), so this tab forgets its login too.
 */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [expired, setExpired] = useState(!TOKEN_PATTERN.test(token));
  usePageTitle(expired ? 'This link has expired' : 'Choose a new password');
  const { user, endSessionLocally } = useAuth();
  const navigate = useNavigate();
  const form = useServerForm(resetPasswordSchema, { defaultValues: { password: '', confirm: '' } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values) {
    form.setFormError(null);
    try {
      await resetPassword({ token, password: values.password });
      if (user) {
        endSessionLocally(null);
      }
      navigate('/login', { replace: true, state: { note: 'password-reset' } });
    } catch (error) {
      const tokenRefused =
        error.code === 'RESET_LINK_EXPIRED' || error.details?.some((detail) => detail.field === 'token');
      if (tokenRefused) {
        setExpired(true);
      } else {
        form.handleServerError(error);
      }
    }
  }

  if (expired) {
    return (
      <main className="main top" id="main">
        <section className="single" aria-labelledby="expired-title">
          <h1 id="expired-title">This link has expired</h1>
          <p className="muted mt-1 mb-5">Reset links work once and last 30 minutes.</p>
          <div className="notice bad" role="alert">
            <IconLinkOff aria-hidden="true" />
            <div>
              <b>This link has expired or was already used.</b>
            </div>
          </div>
          <Link className="btn btn-copper wide mt-4" to="/forgot-password">
            Send a new link
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="main top" id="main">
      <section className="single" aria-labelledby="reset-title">
        <h1 id="reset-title">Choose a new password</h1>
        <p className="muted mt-1 mb-5">Use at least 8 characters, with a number.</p>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <PasswordField
            id="reset-password"
            label="New password"
            autoComplete="new-password"
            error={errors.password?.message}
            registration={form.register('password')}
          />
          <PasswordField
            id="reset-confirm"
            label="Confirm password"
            autoComplete="new-password"
            error={errors.confirm?.message}
            registration={form.register('confirm')}
          />
          <FormAlert error={form.formError} />
          <button type="submit" className="btn btn-copper wide" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </section>
    </main>
  );
}
