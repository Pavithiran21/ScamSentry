// The one place that talks to the backend. Every call goes to /api on the same origin (the Vite
// dev server forwards it to the backend), so the refresh cookie and the guest device cookie are sent.
const BASE_URL = '/api';

export const NETWORK_MESSAGE = "Couldn't reach ScamSentry. Check your connection and try again.";
export const SESSION_ENDED_MESSAGE = 'Your session has ended. Please log in again.';

/**
 * An error answer from the API, in the shared format
 * { error: { code, message, details: [{ field, message }], requestId } }.
 * status is 0 when the server could not be reached at all.
 */
export class ApiError extends Error {
  constructor(status, code, message, details = [], requestId = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

// The access token lives only in memory: never in localStorage, where any injected script could
// read it. After a page reload the refresh cookie gets a new one.
let accessToken = null;
let refreshPromise = null;
let onSessionEnded = () => {};

export function setAccessToken(token) {
  accessToken = token;
}

export function hasAccessToken() {
  return accessToken !== null;
}

/** Called when a signed-in request gets 401 and the session can't be refreshed. */
export function setSessionEndedHandler(handler) {
  onSessionEnded = handler;
}

async function send(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    return await fetch(BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  }
}

async function toApiError(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Not JSON, for example the dev proxy's page when the backend is down.
  }
  const error = body?.error;
  // The Vite proxy answers 502/504 with no JSON when the backend is not running: to the user
  // that is the same as no connection.
  if (!error && (response.status === 502 || response.status === 504)) {
    return new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
  }
  return new ApiError(
    response.status,
    error?.code ?? 'UNKNOWN_ERROR',
    error?.message ?? 'Something went wrong on our side.',
    error?.details ?? [],
    error?.requestId ?? response.headers.get('X-Request-Id'),
  );
}

/**
 * Gets a new access token with the refresh cookie. Returns { user, accessToken }, or null when
 * there is no valid session.
 *
 * Only one refresh runs at a time: the backend rotates the cookie on every use, so a second
 * refresh sent in parallel (two queries failing together, or React StrictMode running an effect
 * twice) would carry an old cookie and be refused.
 */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await send('/auth/refresh', { method: 'POST', auth: false });
        if (!response.ok) {
          accessToken = null;
          return null;
        }
        const session = await response.json();
        accessToken = session.accessToken;
        return session;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/**
 * Sends a request and returns the parsed JSON body (undefined for 204).
 * Options: method, body (sent as JSON), auth (default true), signal.
 *
 * The token is sent whenever there is one. The guest routes (GET /quota, POST /checks) accept a
 * missing token as a guest, so the same call works signed in and signed out.
 *
 * A signed-in request that gets 401 (usually the 15-minute token expired) refreshes the session
 * once and retries. If that fails, the session has ended and the app goes to Log in. Requests
 * with auth: false (log in, sign up...) never do this, so a wrong password stays a normal error.
 */
export async function apiRequest(path, options = {}) {
  const auth = options.auth ?? true;
  let response = await send(path, options);

  if (response.status === 401 && auth) {
    const session = await refreshSession();
    if (session) {
      response = await send(path, options);
    }
    if (!session || response.status === 401) {
      onSessionEnded();
      throw new ApiError(401, 'SESSION_ENDED', SESSION_ENDED_MESSAGE);
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined;
  }
  return response.json();
}
