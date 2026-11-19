import { useEffect, useRef } from 'react';

/**
 * A centred dialog on a charcoal scrim, built on the native <dialog> element: showModal() traps
 * focus and makes the page behind inert, Esc closes it, and the browser returns focus to the
 * button that opened it. Destructive dialogs pass role="alertdialog" and focus their safe button
 * first through initialFocusRef ("Keep history").
 */
export function Dialog({ open, onClose, titleId, descriptionId, role = 'dialog', initialFocusRef, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      initialFocusRef?.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialFocusRef]);

  // Esc fires "cancel": let the parent close it, so React state and the element stay in step.
  function handleCancel(event) {
    event.preventDefault();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      role={role === 'alertdialog' ? 'alertdialog' : undefined}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={handleCancel}
    >
      {open && children}
    </dialog>
  );
}
