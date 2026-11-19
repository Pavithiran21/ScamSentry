const { Schema, model } = require('mongoose');
const { VERDICTS } = require('./verdicts');

/**
 * One entry per message text (inputHash), so a repeat check costs no model call.
 *   source 'model':     the model's answer, valid only for the same modelKey
 *   source 'moderator': a moderator overturned the verdict; it wins for every later check
 *                       of this text, whatever the model or the rules say
 * Only the hash is stored, never the text.
 */
const verdictCacheSchema = new Schema(
  {
    inputHash: { type: String, required: true, unique: true },
    source: { type: String, enum: ['model', 'moderator'], required: true },
    verdict: { type: String, enum: VERDICTS, required: true },
    reasons: { type: [String], default: [] },
    modelKey: { type: String, default: null },
    // Set for source 'moderator': the report that changed it, and when.
    reportId: { type: Schema.Types.ObjectId, default: null },
    correctedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const VerdictCacheModel = model('VerdictCache', verdictCacheSchema, 'verdictCache');

module.exports = { VerdictCacheModel };
