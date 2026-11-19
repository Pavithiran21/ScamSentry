const { isDuplicateKeyError } = require('../../utils/mongoErrors');
const { QuotaCounterModel } = require('./quotaCounter.model');

const quotaRepository = {
  /**
   * Adds one to a counter in one atomic step and returns the new count. The first check of
   * the day creates the counter (upsert). If two first checks race, MongoDB may refuse one
   * insert with a duplicate-key error; that request simply tries once more and then finds
   * the counter the other one created.
   */
  async increment(key, day, expiresAt) {
    for (const attempt of [1, 2]) {
      try {
        const counter = await QuotaCounterModel.findOneAndUpdate(
          { key, day },
          { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
          { upsert: true, returnDocument: 'after', lean: true },
        );
        return counter.count;
      } catch (error) {
        if (!isDuplicateKeyError(error) || attempt === 2) {
          throw error;
        }
      }
    }
    return Number.POSITIVE_INFINITY;
  },

  /** Gives one check back (never below zero). */
  async decrement(key, day) {
    await QuotaCounterModel.updateOne({ key, day, count: { $gt: 0 } }, { $inc: { count: -1 } });
  },

  /** { [key]: count } for today's counters of these keys; a key with no counter is 0. */
  async counts(keys, day) {
    const counters = await QuotaCounterModel.find({ key: { $in: keys }, day }).lean();
    const result = Object.fromEntries(keys.map((key) => [key, 0]));
    for (const counter of counters) {
      result[counter.key] = counter.count;
    }
    return result;
  },

  async deleteForKey(key) {
    await QuotaCounterModel.deleteMany({ key });
  },
};

module.exports = { quotaRepository };
