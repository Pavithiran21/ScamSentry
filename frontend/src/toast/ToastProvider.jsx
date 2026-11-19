import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToastContext } from './ToastContext';

const SUCCESS_MS = 6000;
const MAX_TOASTS = 3;

/**
 * Toasts, bottom right (UI-UX.md "States"): a stone-white card with a brushed-copper top line and
 * the icon in a small copper shield. Success toasts are role="status" and leave on their own;
 * errors are role="alert" with a red line and shield, and stay until Dismiss is pressed.
 * Toast text never contains message text (privacy rule).
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...toast, id }].slice(-MAX_TOASTS));
      if (!toast.error) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), SUCCESS_MS),
        );
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo(
    () => ({
      showToast: (message, { icon, action } = {}) => push({ message, icon, action, error: false }),
      showError: (message) => push({ message, error: true }),
    }),
    [push],
  );

  return (
    <ToastContext value={value}>
      {children}
      <div className="toasts">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext>
  );
}

function Toast({ toast, onDismiss }) {
  const Icon = toast.error ? IconAlertCircle : (toast.icon ?? IconCircleCheck);
  return (
    <div className={toast.error ? 'toast err' : 'toast'} role={toast.error ? 'alert' : 'status'}>
      <span className="shield" aria-hidden="true">
        <Icon stroke={2.2} />
      </span>
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="act"
          onClick={() => {
            onDismiss();
            toast.action.onClick();
          }}
        >
          {toast.action.label}
        </button>
      )}
      {toast.error && (
        <button type="button" className="act" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
}
