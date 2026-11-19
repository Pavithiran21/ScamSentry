import { zodResolver } from '@hookform/resolvers/zod';
import { IconFlagCheck } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { reportCheck } from '../../api/checks';
import { queryKeys } from '../../api/queryKeys';
import { Dialog } from '../../components/Dialog';
import { FieldError } from '../../components/Fields';
import { FormAlert } from '../../components/FormAlert';
import { VerdictTag } from '../../components/VerdictTag';
import { applyFieldErrors } from '../../lib/apiErrors';
import { VERDICTS, verdictInfo } from '../../lib/verdicts';
import { useToast } from '../../toast/ToastContext';

// The same rules and words as the backend's createReportSchema (UI-UX "Validation messages").
const reportSchema = z.object({
  suggestedVerdict: z.enum(VERDICTS, 'Pick what the verdict should be.'),
  reason: z.string().trim().max(500, 'Use at most 500 characters.'),
  consent: z.literal(true, 'Tick the box to share this message with a moderator.'),
});

function shortPreview(text) {
  const oneLine = (text ?? '').replace(/\s+/g, ' ').trim();
  return oneLine.length > 40 ? `${oneLine.slice(0, 39).trimEnd()}…` : oneLine;
}

/**
 * "Report a wrong verdict": the correct verdict (the current one is disabled and marked Current),
 * an optional reason and the consent box, because the report keeps a copy of the message for a
 * moderator. 409 ALREADY_REPORTED closes the dialog, shows the error toast and reloads the
 * check, so its footer switches to "Reported · waiting for review".
 */
export function ReportDialog({ open, check, onClose }) {
  const queryClient = useQueryClient();
  const { showToast, showError } = useToast();
  const form = useForm({
    resolver: zodResolver(reportSchema),
    defaultValues: { suggestedVerdict: undefined, reason: '', consent: false },
  });
  const { errors } = form.formState;

  function refreshCheck() {
    queryClient.invalidateQueries({ queryKey: queryKeys.checks });
    queryClient.invalidateQueries({ queryKey: queryKeys.reports });
  }

  const mutation = useMutation({
    mutationFn: (values) =>
      reportCheck(check.id, {
        suggestedVerdict: values.suggestedVerdict,
        reason: values.reason || undefined,
        consent: values.consent,
      }),
    onSuccess: () => {
      refreshCheck();
      showToast('Report sent to a moderator', { icon: IconFlagCheck });
      close();
    },
    onError: (error) => {
      if (error.code === 'ALREADY_REPORTED') {
        refreshCheck();
        showError(error.message);
        close();
      } else if (applyFieldErrors(error, form.setError, ['suggestedVerdict', 'reason', 'consent'])) {
        // shown under the fields
      } else if (error.code !== 'RATE_LIMITED' && error.code !== 'SESSION_ENDED') {
        showError("Couldn't send your report. Try again.");
      }
    },
  });

  function close() {
    form.reset();
    mutation.reset();
    onClose();
  }

  const showAlert = mutation.error?.code === 'RATE_LIMITED';

  return (
    <Dialog open={open} onClose={close} titleId="report-title">
      <h2 id="report-title">Report a wrong verdict</h2>
      <p className="muted mb-3 text-[15px]">
        We said <VerdictTag verdict={check.verdict} withIcon={false} /> for “{shortPreview(check.text)}”
      </p>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <fieldset className="field" aria-describedby={errors.suggestedVerdict ? 'report-verdict-error' : undefined}>
          <legend className="lbl">What should it be?</legend>
          <div className="seg">
            {VERDICTS.map((verdict) => {
              const { label, Icon } = verdictInfo(verdict);
              const isCurrent = verdict === check.verdict;
              return (
                <label key={verdict}>
                  <input type="radio" value={verdict} disabled={isCurrent} {...form.register('suggestedVerdict')} />
                  <span className={`opt s-${verdict}`}>
                    {!isCurrent && <Icon aria-hidden="true" />} {label}
                    {isCurrent && <span className="orig">Current</span>}
                  </span>
                </label>
              );
            })}
          </div>
          <FieldError id="report-verdict-error" message={errors.suggestedVerdict?.message} />
        </fieldset>
        <div className={errors.reason ? 'field bad' : 'field'}>
          <label className="lbl" htmlFor="report-reason">
            Why? (optional)
          </label>
          <textarea
            id="report-reason"
            className="textarea"
            rows={2}
            maxLength={500}
            aria-invalid={errors.reason ? 'true' : undefined}
            aria-describedby={errors.reason ? 'report-reason-error' : undefined}
            {...form.register('reason')}
          />
          <FieldError id="report-reason-error" message={errors.reason?.message} />
        </div>
        <label className={errors.consent ? 'consent bad' : 'consent'}>
          <input
            type="checkbox"
            aria-invalid={errors.consent ? 'true' : undefined}
            aria-describedby={errors.consent ? 'report-consent-error' : undefined}
            {...form.register('consent')}
          />
          <span>I agree to share this message with a moderator. It&apos;s deleted 30 days after the review.</span>
        </label>
        <FieldError id="report-consent-error" message={errors.consent?.message} />
        {showAlert && (
          <div className="mt-4">
            <FormAlert error={mutation.error} />
          </div>
        )}
        <div className="acts">
          <button type="button" className="btn btn-line" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn btn-copper" disabled={mutation.isPending}>
            {mutation.isPending ? 'Sending…' : 'Send report'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
