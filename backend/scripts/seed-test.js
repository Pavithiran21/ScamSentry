/**
 * Seeds the accounts the Playwright tests need into scamsentry_test: two moderators (the
 * tests can't sign up as one, and the two-moderator race needs a second one) and the two demo
 * accounts (for the demo-lock tests). Users are made through the public API by each test, so
 * nothing else is seeded.
 * Run it with the test env file; any other database is refused:
 *
 *   $env:ENV_FILE='..\.env.test'; npm run seed:test
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { env } = require('../src/config/env'); // loads ENV_FILE into process.env
const { connectDb, disconnectDb } = require('../src/db/mongoose');
const { BCRYPT_ROUNDS } = require('../src/modules/auth/auth.service');
const { DEMO_EMAIL_DOMAIN } = require('../src/modules/demo/demoAddress');
const { UserModel } = require('../src/modules/users/user.model');
const { TEST_DATABASE } = require('./databases');

const MODERATOR_EMAILS = ['moderator@e2e.scamsentry.test', 'moderator2@e2e.scamsentry.test'];

async function main() {
  const password = process.env.E2E_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Set E2E_PASSWORD (at least 8 characters) in the test env file; make-env.js writes it.');
  }

  await connectDb();
  try {
    const name = mongoose.connection.name;
    if (name !== TEST_DATABASE) {
      throw new Error(`seed:test only runs on "${TEST_DATABASE}", not "${name}" (${env.NODE_ENV}).`);
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    for (const email of MODERATOR_EMAILS) {
      await UserModel.findOneAndUpdate({ email }, { email, passwordHash, role: 'moderator', isDemo: false }, { upsert: true });
    }

    // The two demo accounts, without data: the tests check the demo lock and "Log in as" with them.
    const demoHash = await bcrypt.hash(env.DEMO_PASSWORD ?? password, BCRYPT_ROUNDS);
    const demoAccounts = [
      { email: `user@${DEMO_EMAIL_DOMAIN}`, role: 'user' },
      { email: `moderator@${DEMO_EMAIL_DOMAIN}`, role: 'moderator' },
    ];
    for (const account of demoAccounts) {
      await UserModel.findOneAndUpdate({ email: account.email }, { ...account, passwordHash: demoHash, isDemo: true }, { upsert: true });
    }
    console.log(
      `Seeded ${name}: ${MODERATOR_EMAILS.join(', ')} (Moderator, password = E2E_PASSWORD) and the demo accounts ${demoAccounts.map((a) => a.email).join(', ')}.`,
    );
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
