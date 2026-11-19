import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

/**
 * { showToast(message, { icon?, action? }), showError(message) }
 * action is { label, onClick }, for example "Next report" after a decision.
 */
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return toast;
}
