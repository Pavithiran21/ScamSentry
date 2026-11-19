/**
 * Gets scamsentry_test ready for a Playwright run, using the backend's own scripts:
 *   1. make-env.js test -> ScamSentry/.env.test (scamsentry_test on the same MongoDB, new JWT secret,
 *                          the model pointed at the local stub on :8080, new Ethereal inboxes,
 *                          new E2E_PASSWORD, rate limits off, the purge job's "now" override on)
 *   2. seed-test.js     -> the two test moderators and the demo accounts
 * Users are registered through the API by each test, so nothing else is seeded.
 *
 * Usage: npm test (runs this, then playwright test), or node prepare.js on its own.
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const backend = path.resolve(__dirname, '../backend');
const envFile = path.resolve(__dirname, '../.env.test');

function run(args, { withTestEnv = true } = {}) {
  const env = { ...process.env, ...(withTestEnv ? { ENV_FILE: envFile } : {}) };
  execFileSync(process.execPath, args, { cwd: backend, env, stdio: 'inherit' });
}

run(['scripts/make-env.js', 'test', ...process.argv.slice(2)], { withTestEnv: false });
run(['scripts/seed-test.js']);
console.log('Ready: run "npx playwright test".');
