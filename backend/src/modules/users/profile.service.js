const bcrypt = require('bcryptjs');
const { AppError } = require('../../utils/AppError');
const { authRepository } = require('../auth/auth.repository');
const { BCRYPT_ROUNDS, createSession } = require('../auth/auth.service');
const { checkRepository } = require('../checks/check.repository');
const { quotaRepository } = require('../quota/quota.repository');
const { reportRepository } = require('../reports/report.repository');
const { userRepository } = require('./user.repository');

// The access token can outlive a deleted account by a few minutes; treat that as logged out.
function accountGone() {
  return new AppError(401, 'UNAUTHENTICATED', 'Please log in.');
}

function ensureNotDemo(user) {
  if (user.isDemo) {
    throw new AppError(403, 'DEMO_ACCOUNT_LOCKED', 'Demo accounts cannot change their password or be deleted.');
  }
}

// A wrong password here is a form error (400), not 401: the frontend logs the user out
// on any 401, and a typo must not end their session.
async function verifyPassword(user, password, field) {
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    const message = "That password isn't right.";
    throw new AppError(400, 'WRONG_PASSWORD', message, [{ field, message }]);
  }
}

async function findUser(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw accountGone();
  }
  return user;
}

/** The account, plus the number of decided reports the user hasn't opened (the dot on My reports). */
async function getMe(actor) {
  const user = await findUser(actor.id);
  const unseenReports = user.role === 'user' ? await reportRepository.countUnseen(user.id) : 0;
  return { user, unseenReports };
}

/** Changes the password, signs out every other session and returns a new session for this one. */
async function changePassword(actor, { currentPassword, newPassword }) {
  const user = await findUser(actor.id);
  ensureNotDemo(user);
  await verifyPassword(user, currentPassword, 'currentPassword');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await userRepository.updatePasswordHash(user.id, passwordHash);
  await authRepository.deleteAllRefreshTokens(user.id);
  return createSession(user);
}

/**
 * Permanently removes the account and the user's personal data: every saved check (with its
 * text), the quota counter and the tokens. Reports stay so a moderator can still finish
 * them, but no longer point at the user; their message copy is purged as usual, 30 days
 * after the decision.
 */
async function deleteAccount(actor, password) {
  const user = await findUser(actor.id);
  ensureNotDemo(user);
  await verifyPassword(user, password, 'password');

  // The user's own data first and the user record after it, so if a step fails
  // the account still exists and the user can simply try again.
  await checkRepository.deleteAllOwned(user.id);
  await reportRepository.anonymiseReporter(user.id);
  await quotaRepository.deleteForKey(`user:${user.id}`);
  await authRepository.deleteAllResetTokens(user.id);
  await userRepository.deleteById(user.id);
  await authRepository.deleteAllRefreshTokens(user.id);
}

module.exports = { getMe, changePassword, deleteAccount };
