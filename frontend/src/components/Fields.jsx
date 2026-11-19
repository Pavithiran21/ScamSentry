import { IconAlertCircle, IconEye, IconEyeOff, IconLock } from '@tabler/icons-react';
import { useState } from 'react';

/** The red line under a field, linked to it with aria-describedby. */
export function FieldError({ id, message }) {
  if (!message) {
    return null;
  }
  return (
    <div className="ferr" id={id}>
      <IconAlertCircle aria-hidden="true" /> {message}
    </div>
  );
}

function describedBy(...ids) {
  const list = ids.filter(Boolean);
  return list.length > 0 ? list.join(' ') : undefined;
}

/**
 * A labelled input with a leading icon (UI-UX.md "Labels": every input has a visible label;
 * errors use aria-invalid and aria-describedby). registration is react-hook-form's register(...).
 */
export function TextField({ id, label, icon: Icon, error, hint, registration, ...inputProps }) {
  const errorId = error ? `${id}-error` : null;
  const hintId = hint ? `${id}-hint` : null;
  return (
    <div className={error ? 'field bad' : 'field'}>
      <label className="lbl" htmlFor={id}>
        {label}
      </label>
      <div className="inp">
        {Icon && <Icon aria-hidden="true" />}
        <input
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(errorId, hintId)}
          {...registration}
          {...inputProps}
        />
      </div>
      <FieldError id={errorId} message={error} />
      {hint && (
        <div className="hint" id={hintId}>
          {hint}
        </div>
      )}
    </div>
  );
}

/** A password input with a Show/Hide button (44 px target, its name says what it does). */
export function PasswordField({ id, label, error, hint, registration, disabled, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const errorId = error ? `${id}-error` : null;
  const hintId = hint ? `${id}-hint` : null;
  return (
    <div className={error ? 'field bad' : 'field'}>
      <label className="lbl" htmlFor={id}>
        {label}
      </label>
      <div className={disabled ? 'inp' : 'inp has-reveal'}>
        <IconLock aria-hidden="true" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(errorId, hintId)}
          disabled={disabled}
          {...registration}
          {...inputProps}
        />
        {!disabled && (
          <button
            type="button"
            className="reveal"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? <IconEyeOff aria-hidden="true" /> : <IconEye aria-hidden="true" />}
          </button>
        )}
      </div>
      <FieldError id={errorId} message={error} />
      {hint && (
        <div className="hint" id={hintId}>
          {hint}
        </div>
      )}
    </div>
  );
}
