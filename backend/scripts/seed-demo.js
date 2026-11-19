/**
 * Seeds one demo account per app role with data that shows its main screens (see
 * seedDemoData in seed-helpers.js). Two modes, chosen by the database the env file points at;
 * any other database is refused:
 *   scamsentry_demo  drops the whole database and builds every index again (a demo from
 *                    scratch, run with ENV_FILE=..\.env.demo)
 *   scamsentry       the development database: removes and recreates only the
 *                    @demo.scamsentry.test accounts and their data, so other accounts stay
 * The model stand-in must be running (node e2e/mocks/llm-stub.js): every seeded check goes through the real pipeline.
 *
 * Usage: npm run seed:demo
 */
const helpers = require('./seed-helpers');
const mongoose = require('mongoose');
const { connectDb, disconnectDb } = require('../src/db/mongoose');
const { DEMO_EMAIL_DOMAIN } = require('../src/modules/demo/demoAddress');
const { purgeReportText } = require('../src/modules/jobs/purgeReportText');
const { DEMO_DATABASE, DEV_DATABASE } = require('./databases');

// Load every model, so every collection gets its indexes back after the drop.
require('../src/modules/auth/passwordResetToken.model');
require('../src/modules/auth/refreshToken.model');
require('../src/modules/checks/check.model');
require('../src/modules/checks/verdictCache.model');
require('../src/modules/quota/quotaCounter.model');
require('../src/modules/reports/report.model');
require('../src/modules/users/user.model');

const DEMO_EMAILS = new RegExp(`@${DEMO_EMAIL_DOMAIN.replaceAll('.', '\\.')}$`, 'i');

async function main() {
  await helpers.ensureModelStub();
  const passwordHash = await helpers.demoPasswordHash();

  await connectDb();
  try {
    const name = mongoose.connection.name;
    if (name === DEMO_DATABASE) {
      // Every demo starts from an empty database. connectDb() built the indexes before the
      // drop, so they are built again: the quota, the cache and the reports depend on them.
      await mongoose.connection.dropDatabase();
      await Promise.all(Object.values(mongoose.models).map((model) => model.createIndexes()));
    } else if (name === DEV_DATABASE) {
      await helpers.removeUsers(DEMO_EMAILS);
    } else {
      throw new Error(`seed:demo only runs on "${DEMO_DATABASE}" or "${DEV_DATABASE}", not "${name}".`);
    }

    const { user, moderator, other } = await helpers.seedDemoData(passwordHash);
    await helpers.resetQuota([user, other]);
    // The report decided 35 days ago is past its purge date: its message copy goes now.
    const { purged } = await purgeReportText();

    console.log(
      `Seeded ${name}: ${user.email} (User), ${moderator.email} (Moderator) and ${other.email}, ` +
        `password = DEMO_PASSWORD; 13 checks, 6 reports (3 open), ${purged} message copy purged.`,
    );
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
