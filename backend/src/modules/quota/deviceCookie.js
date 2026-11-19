const { randomUUID } = require('node:crypto');
const { env } = require('../../config/env');

const DEVICE_COOKIE = 'ss_device';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * The guest's anonymous device id: a random UUID in a first-party, HTTP-only cookie. It
 * identifies nothing about the person (no fingerprinting). Clearing cookies gives a new id,
 * which is why the per-network limit is the hard backstop.
 * Returns the id, setting a new cookie when there is none (or it is not one of ours).
 */
function readOrCreateDeviceId(req, res) {
  const current = req.cookies?.[DEVICE_COOKIE];
  if (typeof current === 'string' && UUID_PATTERN.test(current)) {
    return current;
  }
  const deviceId = randomUUID();
  res.cookie(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
    maxAge: ONE_YEAR_MS,
  });
  return deviceId;
}

/** Who is checking, as the quota sees it: { actor, deviceId, ipAddress }. */
function callerOf(req, res) {
  const actor = req.user ?? null;
  return {
    actor,
    deviceId: actor ? null : readOrCreateDeviceId(req, res),
    ipAddress: req.ip,
  };
}

module.exports = { callerOf };
