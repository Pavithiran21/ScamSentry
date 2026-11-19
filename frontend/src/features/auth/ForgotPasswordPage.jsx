import { IconMail, IconMailCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { forgotPassword } from '../../api/auth';
import { TextField } from '../../components/Fields';
import { FormAlert } from '../../components/FormAlert';
import { useServerForm } from '../../hooks/useServerForm';
import { usePageTitle } from '../../hooks/usePageTitle';
import { forgotPasswordSchema } from './authSchemas';

/**
 * Forgot password. The API answers 202 whether or not the email has an account, so the page
 * says the same thing either way and never reveals who has signed up.
 */
export function ForgotPasswordPage() {
  usePageTitle('Forgot password');
  const [sent, setSent] = useState(false);
  const form = useServerForm(forgotPasswordSchema, { defaultValues: { email: '' } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values) {
    form.setFormError(null);
    try {
      await forgotPassword(values);
      setSent(true);
    } catch (error) {
      form.handleServerError(error);
    }
  }

  return (
    <main className="main top" id="main">
      <section className="single" aria-labelledby="forgot-title">
        <h1 id="forgot-title">Forgot password?</h1>
        <p className="muted mt-1 mb-5">We&apos;ll email you a link to choose a new one.</p>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <TextField
            id="forgot-email"
            label="Email"
            icon={IconMail}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            registration={form.register('email')}
          />
          <FormAlert error={form.formError} />
          <button type="submit" className="btn btn-char wide" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        {sent && (
          <div className="notice ok mt-4" role="status">
            <IconMailCheck aria-hidden="true" />
            <div>
              <b>Check your inbox.</b> If an account exists, a link is on its way. It works once and expires in 30
              minutes.
            </div>
          </div>
        )}
        <p className="mt-4.5 text-[15px]">
          <Link className="link-c" to="/login">
            Back to Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
