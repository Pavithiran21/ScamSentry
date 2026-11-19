/**
 * Runs the report-text purge once, now, against the database in backend/.env (or ENV_FILE),
 * and prints the run summary. The same job runs every day inside the backend (PURGE_CRON).
 *
 * Usage: npm run job:purge
 */
const { connectDb, disconnectDb } = require('../src/db/mongoose');
const { purgeReportText } = require('../src/modules/jobs/purgeReportText');

async function main() {
  await connectDb();
  try {
    console.log(JSON.stringify(await purgeReportText()));
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
