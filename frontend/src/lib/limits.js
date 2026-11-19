import { formatResetTime } from './dates';

// The daily limits (UI-UX.md "Daily limits"). The 429 screens are built in the browser from the
// error code and GET /quota's resetAt, because only the browser knows the viewer's time zone.

// What an account gets, for the "sign up for 30 a day" lines a guest sees. It mirrors the
// backend's USER_DAILY_LIMIT; the real limit is always enforced (and reported) by the server.
export const USER_DAILY_CHECKS = 30;

const LIMIT_KIND = {
  DEVICE_LIMIT_REACHED: 'device',
  NETWORK_LIMIT_REACHED: 'network',
  USER_LIMIT_REACHED: 'user',
};

/** 'device', 'network' or 'user' for a 429 limit code, else null. */
export function limitKind(code) {
  return LIMIT_KIND[code] ?? null;
}

/**
 * What the ring and the line beside it show, from GET /quota: { kind, remaining, limit, text }.
 * A guest has two counters; the ring follows the one with fewer checks left, so it reaches 0 at
 * the moment the next check would be refused.
 */
export function quotaSummary(quota) {
  if (!quota) {
    return null;
  }
  if (quota.kind === 'user' && quota.user) {
    const { remaining, limit } = quota.user;
    return { kind: 'user', remaining, limit, text: `${remaining} of ${limit} checks left today` };
  }
  const { device, network } = quota;
  if (!device || !network) {
    return null;
  }
  if (network.remaining < device.remaining) {
    const word = network.remaining === 1 ? 'check' : 'checks';
    return {
      kind: 'network',
      remaining: network.remaining,
      limit: network.limit,
      text: `${network.remaining} free ${word} left on this network today`,
    };
  }
  return {
    kind: 'device',
    remaining: device.remaining,
    limit: device.limit,
    text: `${device.remaining} of ${device.limit} free checks left today`,
  };
}

/** "at 12:00 am" in the viewer's time, or "tomorrow" when the reset time is not known. */
export function comeBackWhen(resetAt) {
  return resetAt ? `at ${formatResetTime(resetAt)}` : 'tomorrow';
}
