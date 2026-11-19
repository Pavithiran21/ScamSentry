import { IconUserX } from '@tabler/icons-react';
import { useRef } from 'react';
import { deleteAccount } from '../../api/profile';
import { useAuth } from '../../auth/AuthContext';
import { Dialog } from '../../components/Dialog';
import { PasswordField } from '../../components/Fields';
import { FormAlert } from '../../components/FormAlert';
import { useServerForm } from '../../hooks/useServerForm';
import { useToast } from '../../toast/ToastContext';
import { deleteAccountSchema } from '../auth/authSchemas';

/**
 * "Delete your account?": asks for the password, with "Keep my account" focused first. A wrong
 * password stays in the dialog ("That password isn't right."). After the delete the session is
 * gone on the server, so this tab forgets it and the guard returns to Check with the toast.
 */
export function DeleteAccountDialog({ open, onClose, onLocked }) {
  const keepRef = useRef(null);
  const { endSessionLocally } = useAuth();
  const { showToast } = useToast();
  const form = useServerForm(deleteAccountSchema, {
    defaultValues: { password: '' },
    fieldForCode: { WRONG_PASSWORD: 'password' },
  });
  const { errors, isSubmitting } = form.formState;

  function close() {
    form.reset();
    form.setFormError(null);
    onClose();
  }

  async function onSubmit(values) {
    form.setFormError(null);
    try {
      await deleteAccount(values);
      showToast('Account deleted', { icon: IconUserX });
      endSessionLocally('account-deleted');
    } catch (error) {
      if (error.code === 'DEMO_ACCOUNT_LOCKED') {
        close();
        onLocked();
      } else {
        form.handleServerError(error);
      }
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      role="alertdialog"
      titleId="delete-account-title"
      descriptionId="delete-account-text"
      initialFocusRef={keepRef}
    >
      <h2 id="delete-account-title">Delete your account?</h2>
      <p id="delete-account-text" className="muted mb-3 text-[15px]">
        Your account and all your saved checks are deleted for good. This can&apos;t be undone.
      </p>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <PasswordField
          id="delete-account-password"
          label="Your password"
          autoComplete="current-password"
          error={errors.password?.message}
          registration={form.register('password')}
        />
        <FormAlert error={form.formError} />
        <div className="acts">
          <button ref={keepRef} type="button" className="btn btn-line" onClick={close}>
            Keep my account
          </button>
          <button type="submit" className="btn btn-red" disabled={isSubmitting}>
            <IconUserX aria-hidden="true" /> {isSubmitting ? 'Deleting…' : 'Delete account'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
