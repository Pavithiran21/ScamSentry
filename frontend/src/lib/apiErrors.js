// Turning API errors (api/client.js ApiError) into what the user sees, following the
// "API code → screen" table in UI-UX.md. The backend's messages are the UI-UX texts, so they are
// shown word for word; unexpected errors get "Something went wrong on our side" with a reference.

export const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a few minutes and try again.';

/**
 * A 400, 409 or 422 with field details: show each message under its field and focus the first.
 * Returns true when at least one field got an error.
 */
export function applyFieldErrors(error, setError, fieldNames) {
  const details = (error?.details ?? []).filter((detail) => fieldNames.includes(detail.field));
  details.forEach((detail, index) => {
    setError(detail.field, { type: 'server', message: detail.message }, { shouldFocus: index === 0 });
  });
  return details.length > 0;
}

/** True when the request never reached the server (a dropped connection, the backend down). */
export function isNetworkError(error) {
  return error?.status === 0;
}

/** "Not found": a deleted item, a wrong id, or another user's item (they look the same, on purpose). */
export function isNotFound(error) {
  return error?.status === 404;
}

export function isForbidden(error) {
  return error?.status === 403;
}

/** A 500 or anything we did not expect: shown with its reference id. */
export function isUnexpected(error) {
  return Boolean(error) && (!error.status || error.status >= 500);
}

export function isSessionEnded(error) {
  return error?.code === 'SESSION_ENDED';
}
