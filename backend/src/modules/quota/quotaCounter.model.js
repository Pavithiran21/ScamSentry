const { Schema, model } = require('mongoose');

/**
 * How many checks one device, network or user has made on one day.
 *   key: 'device:<cookie id>', 'ip:<HMAC of the IP address>' or 'user:<user id>'
 *   day: the calendar day in QUOTA_TIME_ZONE, for example '2026-11-09'
 * The unique index on { key, day } means there is exactly one counter to $inc, so parallel
 * checks can't both slip under the limit.
 */
const quotaCounterSchema = new Schema({
  key: { type: String, required: true },
  day: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

quotaCounterSchema.index({ key: 1, day: 1 }, { unique: true });
// TTL index: MongoDB deletes a day's counters once that day is over (plus a margin).
quotaCounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const QuotaCounterModel = model('QuotaCounter', quotaCounterSchema, 'quotaCounters');

module.exports = { QuotaCounterModel };
