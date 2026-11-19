const { Schema, model } = require('mongoose');
const { VERDICTS } = require('./verdicts');

const spanSchema = new Schema({ start: Number, end: Number }, { _id: false });

// A red flag. evidence: where in the (cleaned) text it was found.
const flagSchema = new Schema(
  {
    code: { type: String, required: true },
    category: { type: String, required: true },
    label: String,
    detail: String,
    evidence: { type: [spanSchema], default: undefined },
  },
  { _id: false },
);

// One analysed link (see rules/links.js). Link text is message text: users only.
const linkSchema = new Schema(
  {
    text: String,
    start: Number,
    end: Number,
    host: String,
    domain: String,
    status: { type: String, enum: ['risky', 'cant_verify', 'official', 'no_issues'] },
    notes: [String],
    highlight: { type: spanSchema, default: null },
    codes: [String],
    brandId: String,
  },
  { _id: false },
);

/**
 * One check. What is stored depends on who checked (PROJECTS.md, "message text and privacy"):
 *   guest (userId null): only the input hash, the verdict and the flag codes, so nothing in
 *                        the database can show what the message said
 *   user:                also the text, the links, the reasons and the advice, for History;
 *                        deleted when the user deletes the check or the history
 * The verdict is the one given at the time; a later moderator correction never edits it.
 */
const checkSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  inputHash: { type: String, required: true, index: true },
  verdict: { type: String, enum: VERDICTS, required: true },
  riskLevel: { type: Number, required: true },
  // How the verdict was reached: the rules' level and score, and the model's own verdict
  // (null when a moderator correction decided it).
  ruleVerdict: { type: String, enum: VERDICTS, required: true },
  ruleScore: { type: Number, required: true },
  modelVerdict: { type: String, enum: [...VERDICTS, null], default: null },
  // 'rules+ai': the model was asked; 'cache': its earlier answer for this text was reused;
  // 'moderator': a moderator's correction for this text decided the verdict.
  source: { type: String, enum: ['rules+ai', 'cache', 'moderator'], required: true },
  rulesVersion: { type: Number, required: true },
  flags: { type: [flagSchema], default: [] },
  linkCount: { type: Number, required: true },
  linksAnalysed: { type: Number, required: true },
  // Users only:
  text: { type: String, default: undefined },
  links: { type: [linkSchema], default: undefined },
  reasons: { type: [String], default: undefined },
  advice: { type: [String], default: undefined },
  checkedAt: { type: Date, required: true, default: () => new Date() },
});

// History: a user's checks, newest first; _id breaks ties so pages never overlap.
checkSchema.index({ userId: 1, checkedAt: -1, _id: -1 });

const CheckModel = model('Check', checkSchema);

module.exports = { CheckModel };
