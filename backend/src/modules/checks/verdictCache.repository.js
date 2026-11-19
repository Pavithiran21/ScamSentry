const { isDuplicateKeyError } = require('../../utils/mongoErrors');
const { VerdictCacheModel } = require('./verdictCache.model');

const verdictCacheRepository = {
  findByHash(inputHash) {
    return VerdictCacheModel.findOne({ inputHash }).lean();
  },

  /**
   * Saves the model's answer for this text, unless a moderator correction is already there.
   * The filter skips a 'moderator' entry; the upsert then tries to insert a second entry for
   * the same hash, the unique index refuses it, and that duplicate-key error is ignored. So a
   * model answer can never overwrite a correction, even if both are written at the same moment.
   */
  async saveModelAnswer({ inputHash, verdict, reasons, modelKey }) {
    try {
      await VerdictCacheModel.updateOne(
        { inputHash, source: 'model' },
        { $set: { verdict, reasons, modelKey } },
        { upsert: true },
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }
  },

  /** A moderator's corrected verdict replaces whatever was cached. Runs inside the decision's transaction. */
  async saveCorrection({ inputHash, verdict, reportId, correctedAt }, session) {
    await VerdictCacheModel.updateOne(
      { inputHash },
      { $set: { source: 'moderator', verdict, reasons: [], modelKey: null, reportId, correctedAt } },
      { upsert: true, session },
    );
  },
};

module.exports = { verdictCacheRepository };
