import { IconTrash } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useNavigate } from 'react-router';
import { deleteCheck, deleteHistory } from '../../api/checks';
import { queryKeys } from '../../api/queryKeys';
import { Dialog } from '../../components/Dialog';
import { FormAlert } from '../../components/FormAlert';
import { useToast } from '../../toast/ToastContext';

/** "Delete your history?" Keep history is focused first, because the delete can't be undone. */
export function DeleteHistoryDialog({ open, total, onClose }) {
  const keepRef = useRef(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: deleteHistory,
    onSuccess: ({ deleted }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checks });
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      showToast(`History deleted · ${deleted} ${deleted === 1 ? 'check' : 'checks'} removed`, { icon: IconTrash });
      onClose();
    },
  });

  function close() {
    mutation.reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      role="alertdialog"
      titleId="delete-history-title"
      descriptionId="delete-history-text"
      initialFocusRef={keepRef}
    >
      <h2 id="delete-history-title">Delete your history?</h2>
      <p id="delete-history-text" className="muted text-[15px]">
        All {total} {total === 1 ? 'check' : 'checks'} and their saved messages are deleted for good. Reports you
        already sent stay with moderators until reviewed.
      </p>
      <div className="mt-4">
        <FormAlert error={mutation.error} />
      </div>
      <div className="acts">
        <button ref={keepRef} type="button" className="btn btn-line" onClick={close}>
          Keep history
        </button>
        <button type="button" className="btn btn-red" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          <IconTrash aria-hidden="true" /> {mutation.isPending ? 'Deleting…' : 'Delete history'}
        </button>
      </div>
    </Dialog>
  );
}

/** "Delete this check?" on a saved check. Back to History afterwards, with the toast. */
export function DeleteCheckDialog({ open, checkId, onClose }) {
  const keepRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: () => deleteCheck(checkId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.check(checkId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.checks });
      showToast('Check deleted', { icon: IconTrash });
      navigate('/history', { replace: true });
    },
  });

  function close() {
    mutation.reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      role="alertdialog"
      titleId="delete-check-title"
      descriptionId="delete-check-text"
      initialFocusRef={keepRef}
    >
      <h2 id="delete-check-title">Delete this check?</h2>
      <p id="delete-check-text" className="muted text-[15px]">
        This check and its saved message are deleted for good. If you reported it, the moderator&apos;s copy stays
        until the review.
      </p>
      <div className="mt-4">
        <FormAlert error={mutation.error} />
      </div>
      <div className="acts">
        <button ref={keepRef} type="button" className="btn btn-line" onClick={close}>
          Keep check
        </button>
        <button type="button" className="btn btn-red" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          <IconTrash aria-hidden="true" /> {mutation.isPending ? 'Deleting…' : 'Delete check'}
        </button>
      </div>
    </Dialog>
  );
}
