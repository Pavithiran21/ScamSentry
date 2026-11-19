import { IconFlag, IconHistory, IconMail, IconRadar2 } from '@tabler/icons-react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { PasswordField, TextField } from '../../components/Fields';
import { FormAlert } from '../../components/FormAlert';
import { useServerForm } from '../../hooks/useServerForm';
import { usePageTitle } from '../../hooks/usePageTitle';
import { USER_DAILY_CHECKS } from '../../lib/limits';
import { signupSchema } from './authSchemas';

/** Sign up: email and password only (no name, no time zone: times use the browser's zone). */
export function SignupPage() {
  usePageTitle('Create your account');
  const { register } = useAuth();
  const form = useServerForm(signupSchema, {
    defaultValues: { email: '', password: '' },
    fieldForCode: { EMAIL_TAKEN: 'email' },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values) {
    form.setFormError(null);
    try {
      await register(values);
    } catch (error) {
      form.handleServerError(error);
    }
  }

  return (
    <main className="main top" id="main">
      <div className="auth2">
        <section className="authform" aria-labelledby="signup-title">
          <h1 id="signup-title">Create your account</h1>
          <p className="muted mt-1 mb-5">{USER_DAILY_CHECKS} checks a day, saved history and reports.</p>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <TextField
              id="signup-email"
              label="Email"
              icon={IconMail}
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              registration={form.register('email')}
            />
            <PasswordField
              id="signup-password"
              label="Password"
              autoComplete="new-password"
              error={errors.password?.message}
              hint={errors.password ? null : 'Use at least 8 characters, with a number.'}
              registration={form.register('password')}
            />
            <FormAlert error={form.formError} />
            <button type="submit" className="btn btn-copper wide" disabled={isSubmitting}>
              {isSubmitting ? 'Creating your account…' : 'Create account'}
            </button>
          </form>
          <p className="mt-4.5 text-[15px]">
            Already have an account?{' '}
            <Link className="link-c" to="/login">
              Log in
            </Link>
          </p>
        </section>
        <aside className="card" aria-labelledby="adds-title">
          <h2 id="adds-title">What an account adds</h2>
          <p className="muted mb-3 text-[15px]">Your checks, kept private to you.</p>
          <ul className="ticks">
            <li>
              <span className="t-ic" aria-hidden="true">
                <IconRadar2 />
              </span>
              <div>
                <b>{USER_DAILY_CHECKS} checks a day</b>
                <div className="muted">Instead of 3 for a guest.</div>
              </div>
            </li>
            <li>
              <span className="t-ic" aria-hidden="true">
                <IconHistory />
              </span>
              <div>
                <b>A saved history</b>
                <div className="muted">Look back at any check. Delete it all whenever you like.</div>
              </div>
            </li>
            <li>
              <span className="t-ic" aria-hidden="true">
                <IconFlag />
              </span>
              <div>
                <b>Report a wrong verdict</b>
                <div className="muted">A moderator reviews it and you see the result here.</div>
              </div>
            </li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
