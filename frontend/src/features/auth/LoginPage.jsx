import { IconCheck, IconCircleCheck, IconClockOff, IconMail, IconMinus } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { PasswordField, TextField } from '../../components/Fields';
import { FormAlert } from '../../components/FormAlert';
import { useServerForm } from '../../hooks/useServerForm';
import { usePageTitle } from '../../hooks/usePageTitle';
import { USER_DAILY_CHECKS } from '../../lib/limits';
import { loginSchema } from './authSchemas';
import { useDemoAccounts } from './useDemoAccounts';

/**
 * Log in (design section 09): a plain form on the stone page beside the "guest or account"
 * table. A wrong email or password shows under the password. After a 401 elsewhere, the page
 * says "Your session has ended." and goes back to where the user was once they log in.
 */
export function LoginPage() {
  usePageTitle('Log in');
  const { login } = useAuth();
  const location = useLocation();
  const { isDemoMode } = useDemoAccounts();
  const form = useServerForm(loginSchema, {
    defaultValues: { email: '', password: '' },
    fieldForCode: { INVALID_CREDENTIALS: 'password' },
  });
  const { errors, isSubmitting } = form.formState;
  const note = location.state?.note;

  async function onSubmit(values) {
    form.setFormError(null);
    try {
      await login(values);
      // GuestOnly sends the signed-in user on to the page they came from, or home.
    } catch (error) {
      form.handleServerError(error);
    }
  }

  return (
    <main className="main top" id="main">
      <div className="auth2">
        <section className="authform" aria-labelledby="login-title">
          <h1 id="login-title">Log in</h1>
          <p className="muted mt-1 mb-5">Welcome back.</p>
          {location.state?.sessionEnded && (
            <div className="notice info mb-4" role="status">
              <IconClockOff aria-hidden="true" />
              <div>
                <b>Your session has ended.</b> Please log in again.
              </div>
            </div>
          )}
          {note === 'password-reset' && (
            <div className="notice ok mb-4" role="status">
              <IconCircleCheck aria-hidden="true" />
              <div>
                <b>Password changed.</b> Log in with your new password.
              </div>
            </div>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <TextField
              id="login-email"
              label="Email"
              icon={IconMail}
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              registration={form.register('email')}
            />
            <PasswordField
              id="login-password"
              label="Password"
              autoComplete="current-password"
              error={errors.password?.message}
              registration={form.register('password')}
            />
            <div className="mb-4 text-[15px]">
              <Link className="link-c" to="/forgot-password">
                Forgot password?
              </Link>
            </div>
            <FormAlert error={form.formError} />
            <button type="submit" className="btn btn-copper wide" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>
          <p className="mt-4.5 text-[15px]">
            New here?{' '}
            <Link className="link-c" to="/signup" state={location.state?.from ? { from: location.state.from } : undefined}>
              Create a free account
            </Link>
          </p>
          {isDemoMode && (
            <p className="mt-1.5 text-[15px]">
              <Link className="link-c" to="/demo">
                Try the demo
              </Link>
            </p>
          )}
        </section>
        <GuestOrAccount />
      </div>
    </main>
  );
}

/** The reason to sign up: what a guest gets compared with an account. */
function GuestOrAccount() {
  return (
    <aside className="card" aria-labelledby="compare-title">
      <h2 id="compare-title">No account yet?</h2>
      <p className="muted mb-3 text-[15px]">Checking works without one. An account adds more.</p>
      <table className="cmp">
        <caption className="sr">Guest compared with an account</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr">Feature</span>
            </th>
            <th scope="col">Guest</th>
            <th scope="col">Account</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Checks a day</th>
            <td>3 per device</td>
            <td className="y">{USER_DAILY_CHECKS}</td>
          </tr>
          <tr>
            <th scope="row">Saved history</th>
            <td>
              <IconMinus aria-hidden="true" /> No
            </td>
            <td className="y">
              <IconCheck aria-hidden="true" /> Yes
            </td>
          </tr>
          <tr>
            <th scope="row">Report a wrong verdict</th>
            <td>
              <IconMinus aria-hidden="true" /> No
            </td>
            <td className="y">
              <IconCheck aria-hidden="true" /> Yes
            </td>
          </tr>
          <tr>
            <th scope="row">Your message is stored</th>
            <td>Never</td>
            <td>Only for your history; you can delete it</td>
          </tr>
        </tbody>
      </table>
      <Link className="btn btn-line wide mt-3.5" to="/signup">
        Create a free account
      </Link>
    </aside>
  );
}
