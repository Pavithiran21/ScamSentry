const { createHmac } = require('node:crypto');
const { ipKeyGenerator } = require('express-rate-limit');
const { DateTime } = require('luxon');
const { env } = require('../../config/env');
const { AppError } = require('../../utils/AppError');
const { quotaRepository } = require('./quota.repository');

/**
 * The daily check limits:
 *   guest: GUEST_DEVICE_DAILY_LIMIT per device (the ss_device cookie) and
 *          GUEST_NETWORK_DAILY_LIMIT per network (IP address), both must have room
 *   user:  USER_DAILY_LIMIT per account
 * A day is the calendar day in QUOTA_TIME_ZONE; resetAt is the next midnight there, in UTC.
 *
 * A check first reserves its place (reserveCheck) and gives it back (releaseCheck) if the
 * check fails on our side, so "Couldn't check right now" never uses up a free check.
 */

/** { day: '2026-11-09', resetAt: Date } for the moment now. */
function dayWindow(now = new Date()) {
  const local = DateTime.fromJSDate(now).setZone(env.QUOTA_TIME_ZONE);
  return {
    day: local.toISODate(),
    resetAt: local.startOf('day').plus({ days: 1 }).toUTC().toJSDate(),
  };
}

/**
 * The network counter's key. ipKeyGenerator (from express-rate-limit) turns an IPv6 address
 * into its /56 network, so one home connection can't get a fresh limit per address. The
 * result is stored only as an HMAC: the database never holds a readable IP address.
 */
function networkKey(ipAddress) {
  const network = ipKeyGenerator(ipAddress ?? '');
  return `ip:${createHmac('sha256', env.INPUT_HASH_SECRET).update(network).digest('hex')}`;
}

function limitsFor({ actor, deviceId, ipAddress }) {
  if (actor) {
    return [{ name: 'user', key: `user:${actor.id}`, limit: env.USER_DAILY_LIMIT }];
  }
  return [
    { name: 'device', key: `device:${deviceId}`, limit: env.GUEST_DEVICE_DAILY_LIMIT },
    { name: 'network', key: networkKey(ipAddress), limit: env.GUEST_NETWORK_DAILY_LIMIT },
  ];
}

const LIMIT_ERRORS = {
  device: (limit) => [
    'DEVICE_LIMIT_REACHED',
    `You've used today's ${limit} free checks. They come back tomorrow; sign up for ${env.USER_DAILY_LIMIT} a day.`,
  ],
  network: (limit) => [
    'NETWORK_LIMIT_REACHED',
    `This network has used its ${limit} free checks for today. They come back tomorrow.`,
  ],
  user: (limit) => ['USER_LIMIT_REACHED', `You've used today's ${limit} checks. They come back tomorrow.`],
};

function limitReached(limitInfo, resetAt) {
  const [code, message] = LIMIT_ERRORS[limitInfo.name](limitInfo.limit);
  const error = new AppError(429, code, message);
  error.retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
  return error;
}

/**
 * Takes one check from every counter that applies, or none at all. Each counter is one
 * atomic $inc; if a counter goes over its limit, that $inc is undone, the counters already
 * taken are given back, and a 429 says which limit was hit. Returns a reservation for
 * releaseCheck.
 */
async function reserveCheck(caller) {
  const { day, resetAt } = dayWindow();
  // Counters are kept one day past their own day, then the TTL index removes them.
  const expiresAt = new Date(resetAt.getTime() + 24 * 60 * 60 * 1000);
  const taken = [];

  for (const limitInfo of limitsFor(caller)) {
    const count = await quotaRepository.increment(limitInfo.key, day, expiresAt);
    if (count > limitInfo.limit) {
      await quotaRepository.decrement(limitInfo.key, day);
      for (const key of taken) {
        await quotaRepository.decrement(key, day);
      }
      throw limitReached(limitInfo, resetAt);
    }
    taken.push(limitInfo.key);
  }
  return { day, keys: taken };
}

async function releaseCheck(reservation) {
  for (const key of reservation.keys) {
    await quotaRepository.decrement(key, reservation.day);
  }
}

/** What the quota ring shows: { kind, resetAt, device?, network?, user? }, each { limit, used, remaining }. */
async function getQuota(caller) {
  if (caller.actor?.role === 'moderator') {
    throw new AppError(403, 'FORBIDDEN', 'Moderators review reports and have no check quota.');
  }
  const { day, resetAt } = dayWindow();
  const limits = limitsFor(caller);
  const counts = await quotaRepository.counts(
    limits.map((limitInfo) => limitInfo.key),
    day,
  );

  const quota = { kind: caller.actor ? 'user' : 'guest', resetAt: resetAt.toISOString() };
  for (const limitInfo of limits) {
    const used = Math.min(counts[limitInfo.key], limitInfo.limit);
    quota[limitInfo.name] = { limit: limitInfo.limit, used, remaining: limitInfo.limit - used };
  }
  return quota;
}

module.exports = { dayWindow, reserveCheck, releaseCheck, getQuota };
