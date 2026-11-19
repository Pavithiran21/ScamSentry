const { Schema, model } = require('mongoose');
const { VERDICTS } = require('../checks/verdicts');

const REPORT_STATUSES = ['open', 'confirmed', 'overturned'];

const decisionSchema = new Schema(
  {
    action: { type: String, enum: ['confirm', 'overturn'], required: true },
    verdict: { type: String, enum: VERDICTS, required: true },
    note: { type: String, required: true },
    moderatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    decidedAt: { type: Date, required: true },
  },
  { _id: false },
);

/**
 * A signed-in user's "this verdict is wrong". It keeps its own copy of the check (text,
 * flags, links, reasons), taken with the user's consent, so the moderator can review it even
 * if the user deletes their history. The copy of the text is purged 30 days after the
 * decision (purgeAt); the verdicts and notes stay.
 */
const reportSchema = new Schema(
  {
    checkId: { type: Schema.Types.ObjectId, ref: 'Check', required: true },
    // Set to null when the reporter deletes their account: the report is kept, anonymised.
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    inputHash: { type: String, required: true },

    // The copy of the check at report time.
    text: { type: String, default: undefined },
    links: { type: Array, default: undefined },
    reasons: { type: [String], default: undefined },
    flags: { type: Array, default: [] },
    verdict: { type: String, enum: VERDICTS, required: true },
    riskLevel: { type: Number, required: true },
    checkedAt: { type: Date, required: true },

    suggestedVerdict: { type: String, enum: VERDICTS, required: true },
    reason: { type: String, default: null },
    consentAt: { type: Date, required: true },

    status: { type: String, enum: REPORT_STATUSES, required: true, default: 'open' },
    decision: { type: decisionSchema, default: null },
    // false from the decision until the reporter opens the report ("1 new update").
    reporterSeen: { type: Boolean, default: true },
    purgeAt: { type: Date, default: null },
    textPurgedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// At most one open report per check: a second "Report wrong verdict" gets 409.
reportSchema.index({ checkId: 1 }, { unique: true, partialFilterExpression: { status: 'open' } });
// The review queue tabs, oldest first.
reportSchema.index({ status: 1, createdAt: 1, _id: 1 });
// My reports, newest first.
reportSchema.index({ reporterId: 1, createdAt: -1, _id: -1 });
// The daily purge.
reportSchema.index({ purgeAt: 1 });

const ReportModel = model('Report', reportSchema);

module.exports = { REPORT_STATUSES, ReportModel };
