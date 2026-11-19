/**
 * Shared by seed-dev.js and seed-demo.js. The seeds build their data through the real
 * services (the check pipeline, reports, moderator decisions with their transaction), so
 * seeded data looks exactly like data the app wrote. Afterwards only the dates are moved
 * back, so History and the queue show a few days of activity.
 *
 * The checker model is always the local stub (e2e/mocks/llm-stub.js) during a seed, never Groq: this file must be
 * required before anything from src/, because the env file never overrides a variable that is
 * already set.
 */
process.env.LLM_BASE_URL = process.env.SEED_LLM_BASE_URL ?? 'http://localhost:8080/llm/v1';
process.env.LLM_API_KEY = 'not-used-by-the-stub';

const bcrypt = require('bcryptjs');
const { Types } = require('mongoose');
const { env } = require('../src/config/env');
const { BCRYPT_ROUNDS } = require('../src/modules/auth/auth.service');
const { PasswordResetTokenModel } = require('../src/modules/auth/passwordResetToken.model');
const { RefreshTokenModel } = require('../src/modules/auth/refreshToken.model');
const { CheckModel } = require('../src/modules/checks/check.model');
const checkService = require('../src/modules/checks/check.service');
const { VerdictCacheModel } = require('../src/modules/checks/verdictCache.model');
const { DEMO_EMAIL_DOMAIN } = require('../src/modules/demo/demoAddress');
const moderationService = require('../src/modules/moderation/moderation.service');
const { QuotaCounterModel } = require('../src/modules/quota/quotaCounter.model');
const { ReportModel } = require('../src/modules/reports/report.model');
const reportService = require('../src/modules/reports/report.service');
const { UserModel } = require('../src/modules/users/user.model');
const { SAMPLE_MESSAGES } = require('./sample-messages');

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function daysAgo(days, extraHours = 0) {
  return new Date(Date.now() - days * DAY_MS - extraHours * HOUR_MS);
}

async function ensureModelStub() {
  const url = new URL('/__admin/health', process.env.LLM_BASE_URL);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (response.ok) return;
  } catch {
    // reported below
  }
  throw new Error(`The model stand-in is not running at ${url.origin}. Start it with: node e2e/mocks/llm-stub.js`);
}

async function demoPasswordHash() {
  if (!env.DEMO_PASSWORD) {
    throw new Error('Set DEMO_PASSWORD in .env first (seeded accounts use the demo-only password).');
  }
  return bcrypt.hash(env.DEMO_PASSWORD, BCRYPT_ROUNDS);
}

function actor(user) {
  return { id: String(user._id), role: user.role };
}

/** Runs a real check for a user and dates it back. Returns the saved check's id. */
async function seedCheck(user, text, checkedAt) {
  const { check } = await checkService.checkMessage({ actor: actor(user), deviceId: null, ipAddress: '127.0.0.1' }, text);
  await CheckModel.collection.updateOne({ _id: new Types.ObjectId(check.id) }, { $set: { checkedAt } });
  return check.id;
}

async function seedReport(user, checkId, { suggestedVerdict, reason, createdAt }) {
  const report = await reportService.createReport(actor(user), checkId, { suggestedVerdict, reason });
  await ReportModel.collection.updateOne(
    { _id: new Types.ObjectId(report.id) },
    { $set: { createdAt, updatedAt: createdAt, consentAt: createdAt } },
  );
  return report.id;
}

/** A moderator decision through the real service (transaction included), then dated back. */
async function seedDecision(moderator, reportId, { action, verdict, note, decidedAt, seen }) {
  await moderationService.decide(actor(moderator), reportId, { action, verdict, note });
  await ReportModel.collection.updateOne(
    { _id: new Types.ObjectId(reportId) },
    {
      $set: {
        'decision.decidedAt': decidedAt,
        purgeAt: new Date(decidedAt.getTime() + moderationService.PURGE_AFTER_DAYS * DAY_MS),
        reporterSeen: seen,
        updatedAt: decidedAt,
      },
    },
  );
}

/**
 * The demo data, one account per role (Guest has none):
 *   user@demo.scamsentry.test       9 checks over 10 days; reports: Parcel fee (open),
 *                                   Real OTP (confirmed, seen), Card statement (overturned
 *                                   to Safe, not seen yet: "1 new update")
 *   moderator@demo.scamsentry.test  the queue: 3 open reports (Parcel fee, Courier update,
 *                                   "Hi Mom"), 2 decided, 1 decided 35 days ago whose copy
 *                                   of the message has been purged
 *   other@demo.scamsentry.test      a second user, so the queue holds other people's reports
 * Returns the created users by role.
 */
async function seedDemoData(passwordHash) {
  const user = await UserModel.create({ email: `user@${DEMO_EMAIL_DOMAIN}`, passwordHash, role: 'user', isDemo: true });
  const moderator = await UserModel.create({ email: `moderator@${DEMO_EMAIL_DOMAIN}`, passwordHash, role: 'moderator', isDemo: true });
  const other = await UserModel.create({ email: `other@${DEMO_EMAIL_DOMAIN}`, passwordHash, role: 'user', isDemo: true });
  const m = SAMPLE_MESSAGES;

  // The demo user's History
  await seedCheck(user, m.fakeBankKyc, daysAgo(9, 3));
  await seedCheck(user, m.friendDinner, daysAgo(8, 5));
  const parcel = await seedCheck(user, m.parcelFee, daysAgo(6, 2));
  await seedCheck(user, m.jobOffer, daysAgo(5, 6));
  const realOtp = await seedCheck(user, m.realOtp, daysAgo(4, 4));
  const cardStatement = await seedCheck(user, m.cardStatement, daysAgo(3, 7));
  await seedCheck(user, m.lotteryPrize, daysAgo(2, 1));
  await seedCheck(user, m.amazonLookalike, daysAgo(1, 2));
  await seedCheck(user, m.electricityCut, daysAgo(0, 3));

  // The other user's checks
  const taxRefund = await seedCheck(other, m.taxRefund, daysAgo(40));
  const courier = await seedCheck(other, m.courierUpdate, daysAgo(3, 1));
  const hiMum = await seedCheck(other, m.hiMum, daysAgo(2, 4));
  await seedCheck(other, m.promptInjection, daysAgo(1, 5));

  // Reports, oldest first
  const taxReport = await seedReport(other, taxRefund, {
    suggestedVerdict: 'suspicious',
    reason: 'I did file my return this year, so a refund could be real.',
    createdAt: daysAgo(39),
  });
  const otpReport = await seedReport(user, realOtp, {
    suggestedVerdict: 'suspicious',
    reason: "I didn't try to log in when this came.",
    createdAt: daysAgo(4, 2),
  });
  const cardReport = await seedReport(user, cardStatement, {
    suggestedVerdict: 'safe',
    reason: 'This is my real card bill and the link is the HDFC website.',
    createdAt: daysAgo(3, 5),
  });
  await seedReport(user, parcel, {
    suggestedVerdict: 'likely_scam',
    reason: "I haven't ordered anything that India Post would deliver.",
    createdAt: daysAgo(2, 6),
  });
  await seedReport(other, courier, {
    suggestedVerdict: 'suspicious',
    reason: "I'm not expecting a package this week.",
    createdAt: daysAgo(2, 2),
  });
  await seedReport(other, hiMum, {
    suggestedVerdict: 'likely_scam',
    reason: 'My son never asks like this. It is the "Hi Mom" scam.',
    createdAt: daysAgo(1, 8),
  });

  // Decisions
  await seedDecision(moderator, taxReport, {
    action: 'confirm',
    note: 'Refunds go to the bank account on file; the link is not incometax.gov.in.',
    decidedAt: daysAgo(35),
    seen: true,
  });
  await seedDecision(moderator, otpReport, {
    action: 'confirm',
    note: 'A real HDFC one-time code message. It warns you not to share the code and has no link.',
    decidedAt: daysAgo(3, 1),
    seen: true,
  });
  await seedDecision(moderator, cardReport, {
    action: 'overturn',
    verdict: 'safe',
    note: 'Real HDFC statement alert. The link goes to hdfcbank.com.',
    decidedAt: daysAgo(1, 1),
    seen: false,
  });

  return { user, moderator, other };
}

/** Today's counters of the seeded accounts go back to zero, so a demo starts with 30 checks left. */
async function resetQuota(users) {
  await QuotaCounterModel.deleteMany({ key: { $in: users.map((user) => `user:${user._id}`) } });
}

/**
 * Removes the accounts whose email matches the pattern, with their checks, reports, tokens,
 * quota counters and the verdict corrections their reports caused, so a seed can run again
 * on the development database without touching real accounts.
 */
async function removeUsers(emailPattern) {
  const users = await UserModel.find({ email: emailPattern }).lean();
  const ids = users.map((user) => user._id);
  const reports = await ReportModel.find({ reporterId: { $in: ids } }).select('_id').lean();
  await VerdictCacheModel.deleteMany({ reportId: { $in: reports.map((report) => report._id) } });
  await ReportModel.deleteMany({ reporterId: { $in: ids } });
  await CheckModel.deleteMany({ userId: { $in: ids } });
  await QuotaCounterModel.deleteMany({ key: { $in: ids.map((id) => `user:${id}`) } });
  await RefreshTokenModel.deleteMany({ userId: { $in: ids } });
  await PasswordResetTokenModel.deleteMany({ userId: { $in: ids } });
  await UserModel.deleteMany({ _id: { $in: ids } });
  return users.length;
}

module.exports = {
  daysAgo,
  ensureModelStub,
  demoPasswordHash,
  seedCheck,
  seedDemoData,
  resetQuota,
  removeUsers,
};
