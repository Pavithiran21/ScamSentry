import { IconArrowsExchange } from '@tabler/icons-react';
import { useId, useState } from 'react';
import { FieldError } from '../../components/Fields';
import { FormAlert } from '../../components/FormAlert';
import { VERDICTS, verdictInfo, verdictLabel } from '../../lib/verdicts';

const NOTE_REQUIRED = 'Add a short note for the record.';
const NOTE_TOO_LONG = 'Use at most 500 characters.';

/**
 * The moderator's decision (design section 08). It can't contradict itself: the original
 * verdict starts selected, "Confirm original" is enabled only while it stays selected, and
 * "Overturn to …" only once a different verdict is picked. The note is required. Both buttons
 * are disabled while the decision is saved. The server checks all of this again (422).
 */
export function DecisionForm({ report, saving, error, onDecide }) {
  const id = useId();
  const [choice, setChoice] = useState(report.verdict);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(null);
  const changed = choice !== report.verdict;

  function submit(action) {
    const trimmed = note.trim();
    if (!trimmed) {
      setNoteError(NOTE_REQUIRED);
      document.getElementById(`${id}-note`)?.focus();
      return;
    }
    if (trimmed.length > 500) {
      setNoteError(NOTE_TOO_LONG);
      return;
    }
    setNoteError(null);
    onDecide(action === 'overturn' ? { action, verdict: choice, note: trimmed } : { action, note: trimmed });
  }

  // A 400 or 422 from the server goes under the field it names.
  const serverNote = error?.details?.find((detail) => detail.field === 'note')?.message;
  const serverVerdict =
    error?.code === 'DECISION_MISMATCH' ? error.message : error?.details?.find((detail) => detail.field === 'verdict')?.message;
  const shownNoteError = noteError ?? serverNote;
  const formLevelError = error && !serverNote && !serverVerdict && error.code !== 'ALREADY_DECIDED' ? error : null;

  return (
    <form onSubmit={(event) => event.preventDefault()} noValidate className="flex flex-col gap-3.5">
      <fieldset aria-describedby={serverVerdict ? `${id}-verdict-error` : undefined}>
        <legend className="lbl">Your decision</legend>
        <div className="seg">
          {VERDICTS.map((verdict) => {
            const { label, Icon } = verdictInfo(verdict);
            const isOriginal = verdict === report.verdict;
            return (
              <label key={verdict}>
                <input
                  type="radio"
                  name={`${id}-verdict`}
                  value={verdict}
                  checked={choice === verdict}
                  onChange={() => setChoice(verdict)}
                />
                <span className={`opt s-${verdict}`}>
                  {!isOriginal && <Icon aria-hidden="true" />} {label}
                  {isOriginal && <span className="orig">Original</span>}
                </span>
              </label>
            );
          })}
        </div>
        <FieldError id={`${id}-verdict-error`} message={serverVerdict} />
      </fieldset>
      <div className={shownNoteError ? 'bad' : undefined}>
        <label className="lbl" htmlFor={`${id}-note`}>
          Note for the record (required)
        </label>
        <textarea
          id={`${id}-note`}
          className="textarea"
          rows={2}
          maxLength={500}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            if (noteError && event.target.value.trim()) {
              setNoteError(null);
            }
          }}
          aria-invalid={shownNoteError ? 'true' : undefined}
          aria-describedby={shownNoteError ? `${id}-note-error` : undefined}
        />
        <FieldError id={`${id}-note-error`} message={shownNoteError} />
      </div>
      <FormAlert error={formLevelError} />
      <div className="dec-row">
        <button type="button" className="btn btn-line" disabled={changed || saving} onClick={() => submit('confirm')}>
          Confirm original
        </button>
        <button type="button" className="btn btn-char" disabled={!changed || saving} onClick={() => submit('overturn')}>
          <IconArrowsExchange aria-hidden="true" />
          {changed ? `Overturn to ${verdictLabel(choice)}` : 'Overturn'}
        </button>
      </div>
      <p className="hint m-0">
        {changed ? (
          <>
            Overturn replaces the saved verdict for this message, so repeat checks show <b>{verdictLabel(choice)}</b>.
            Choose <b>{verdictLabel(report.verdict)}</b> again to enable <b>Confirm original</b> instead. Neither
            changes the user&apos;s own history.
          </>
        ) : (
          <>
            Keep <b>{verdictLabel(report.verdict)}</b> with <b>Confirm original</b>, or pick a different verdict to
            overturn it. Neither changes the user&apos;s own history.
          </>
        )}
      </p>
    </form>
  );
}
