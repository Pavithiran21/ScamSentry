/**
 * Development data on the scamsentry database only (any other database is refused):
 *   dev@scamsentry.test         a normal user with three checks
 *   moderator@scamsentry.test   a moderator (the way to make one here is this seed or
 *                               seed:moderator; never sign-up)
 *   plus everything seed:demo creates (the @demo.scamsentry.test accounts and their data)
 * Every account uses DEMO_PASSWORD. Running it again replaces these accounts and their data.
 * The model stand-in must be running (node e2e/mocks/llm-stub.js).
 *
 * Usage: npm run seed:dev
 */
const helpers = require('./seed-helpers');
const mongoose = require('mongoose');
const { connectDb, disconnectDb } = require('../src/db/mongoose');
const { purgeReportText } = require('../src/modules/jobs/purgeReportText');
const { UserModel } = require('../src/modules/users/user.model');
const { DEV_DATABASE } = require('./databases');
const { SAMPLE_MESSAGES } = require('./sample-messages');

// Every account on a .test domain: the dev accounts and the demo accounts.
const SEEDED_EMAILS = /@(?:demo\.)?scamsentry\.test$/i;

async function main() {
  await helpers.ensureModelStub();
  const passwordHash = await helpers.demoPasswordHash();

  await connectDb();
  try {
    if (mongoose.connection.name !== DEV_DATABASE) {
      throw new Error(`seed:dev only runs on "${DEV_DATABASE}", not "${mongoose.connection.name}".`);
    }
    const removed = await helpers.removeUsers(SEEDED_EMAILS);

    const dev = await UserModel.create({ email: 'dev@scamsentry.test', passwordHash, role: 'user' });
    await UserModel.create({ email: 'moderator@scamsentry.test', passwordHash, role: 'moderator' });
    await helpers.seedCheck(dev, SAMPLE_MESSAGES.fakeBankKyc, helpers.daysAgo(2));
    await helpers.seedCheck(dev, SAMPLE_MESSAGES.parcelFee, helpers.daysAgo(1));
    await helpers.seedCheck(dev, SAMPLE_MESSAGES.friendDinner, helpers.daysAgo(0, 2));

    const { user, other } = await helpers.seedDemoData(passwordHash);
    await helpers.resetQuota([dev, user, other]);
    const { purged } = await purgeReportText();

    console.log(
      `Seeded ${DEV_DATABASE} (replaced ${removed} .test accounts): dev@scamsentry.test (User), ` +
        `moderator@scamsentry.test (Moderator) and the demo accounts, password = DEMO_PASSWORD; ${purged} message copy purged.`,
    );
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
