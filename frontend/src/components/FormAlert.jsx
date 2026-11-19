import { IconAlertCircle, IconHandStop, IconWifiOff } from '@tabler/icons-react';
import { isNetworkError, isUnexpected } from '../lib/apiErrors';

/**
 * A form's error that belongs to no field, shown above its button (UI-UX.md "States"):
 *   429 RATE_LIMITED  "Too many attempts." (the fields keep what was typed)
 *   no connection     "Couldn't reach ScamSentry."
 *   500 or unknown    "Something went wrong on our side" with the reference id
 *   anything else     the API's own message, word for word
 */
export function FormAlert({ error }) {
  if (!error || error.code === 'SESSION_ENDED') {
    return null;
  }
  if (error.code === 'RATE_LIMITED') {
    return (
      <div className="notice bad mb-4" role="alert">
        <IconHandStop aria-hidden="true" />
        <div>
          <b>Too many attempts.</b> Please wait a few minutes and try again.
        </div>
      </div>
    );
  }
  if (isNetworkError(error)) {
    return (
      <div className="notice bad mb-4" role="alert">
        <IconWifiOff aria-hidden="true" />
        <div>
          <b>Couldn&apos;t reach ScamSentry.</b> Check your connection and try again.
        </div>
      </div>
    );
  }
  if (isUnexpected(error)) {
    return (
      <div className="notice bad mb-4" role="alert">
        <IconAlertCircle aria-hidden="true" />
        <div>
          <b>Something went wrong on our side.</b> Try again in a minute.
          {error.requestId && <> Reference: {error.requestId}.</>}
        </div>
      </div>
    );
  }
  return (
    <div className="notice bad mb-4" role="alert">
      <IconAlertCircle aria-hidden="true" />
      <div>{error.message}</div>
    </div>
  );
}
