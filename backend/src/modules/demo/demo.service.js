const { env } = require('../../config/env');
const { AppError } = require('../../utils/AppError');
const { createSession } = require('../auth/auth.service');
const { userRepository } = require('../users/user.repository');
const { DEMO_EMAIL_DOMAIN } = require('./demoAddress');

// One demo account per app role with a login (CLAUDE.md, "Demo accounts"). Guest has no
// account: its demo is the Check page while signed out. seed:demo creates these accounts.
const DEMO_ACCOUNTS = [
  { role: 'User', email: `user@${DEMO_EMAIL_DOMAIN}` },
  { role: 'Moderator', email: `moderator@${DEMO_EMAIL_DOMAIN}` },
];
const DEMO_ROLES = DEMO_ACCOUNTS.map((account) => account.role);

/**
 * What the /demo page shows: each account's email and the demo-only password (shown on
 * purpose, see CLAUDE.md), plus the Ethereal inbox that receives mail for .test addresses.
 * The route exists only when DEMO_MODE=true.
 */
function listAccounts() {
  return {
    accounts: DEMO_ACCOUNTS.map((account) => ({ ...account, password: env.DEMO_PASSWORD })),
    inbox: env.DEMO_SMTP_USER
      ? { url: 'https://ethereal.email/login', user: env.DEMO_SMTP_USER, password: env.DEMO_SMTP_PASS }
      : null,
  };
}

/**
 * Starts a session for a role's demo account without a password, so the "Log in as" button
 * never needs one. Only reachable with DEMO_MODE=true (see routes.js). Returns { user, session }.
 */
async function loginAs(role) {
  const account = DEMO_ACCOUNTS.find((item) => item.role === role);
  const user = await userRepository.findByEmail(account.email);
  // Only a real demo account: never a normal user who happens to have this email.
  if (!user || !user.isDemo) {
    throw new AppError(404, 'NOT_FOUND', 'The demo account is not set up. Run seed:demo first.');
  }
  return { user, session: await createSession(user) };
}

module.exports = { DEMO_ACCOUNTS, DEMO_ROLES, listAccounts, loginAs };
