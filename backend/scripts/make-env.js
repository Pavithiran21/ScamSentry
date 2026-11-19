/**
 * Writes a git-ignored env file for a Playwright run or a demo, copied from backend/.env with:
 *   - MONGODB_URI pointing at scamsentry_test or scamsentry_demo (same cluster and user)
 *   - a new random JWT_SECRET, so every token from an earlier run or demo is rejected (401)
 *   - the checker model pointed at the local stub e2e/mocks/llm-stub.js (never Groq: tests spend no quota)
 *   - two brand-new Ethereal inboxes (SMTP_* and DEMO_SMTP_*), so the run's mail starts empty
 *
 * The test file also gets E2E_PASSWORD, the password of the seeded test moderators.
 *
 * Usage: node scripts/make-env.js test [--rate-limits on]    -> ScamSentry/.env.test
 *        node scripts/make-env.js demo                       -> ScamSentry/.env.demo
 */
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { withDatabaseName } = require('../src/utils/mongoUri');
const { DEMO_DATABASE, TEST_DATABASE } = require('./databases');
const { setEnvValue, writeNewEtherealAccount } = require('./new-ethereal');

const projectRoot = path.resolve(__dirname, '../..');
const STUB_LLM_URL = 'http://localhost:8080/llm/v1';

const TARGETS = {
  test: {
    fileName: '.env.test',
    databaseName: TEST_DATABASE,
    values: { NODE_ENV: 'test', LOG_LEVEL: 'info', JOB_TIME_OVERRIDE_ENABLED: 'true', DEMO_MODE: 'true', LLM_TIMEOUT_MS: '3000' },
  },
  demo: {
    fileName: '.env.demo',
    databaseName: DEMO_DATABASE,
    values: { NODE_ENV: 'development', LOG_LEVEL: 'info', JOB_TIME_OVERRIDE_ENABLED: 'false', DEMO_MODE: 'true', RATE_LIMITS_ENABLED: 'true' },
  },
};

async function main() {
  const targetName = process.argv[2];
  const target = TARGETS[targetName];
  if (!target) {
    throw new Error(`Usage: node scripts/make-env.js <${Object.keys(TARGETS).join('|')}> [--rate-limits on]`);
  }

  const sourceFile = path.join(projectRoot, 'backend', '.env');
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`No .env at ${sourceFile}. See README.md.`);
  }

  let text = fs.readFileSync(sourceFile, 'utf8');
  const source = parseEnv(text);
  text = setEnvValue(text, 'MONGODB_URI', withDatabaseName(source.MONGODB_URI ?? '', target.databaseName));
  text = setEnvValue(text, 'JWT_SECRET', randomBytes(48).toString('base64url'));
  text = setEnvValue(text, 'LLM_BASE_URL', STUB_LLM_URL);
  text = setEnvValue(text, 'LLM_MODEL', 'scamsentry-stub');
  // The stub needs no key and ignores the reasoning setting; the Groq key never leaves .env.
  text = text.replace(/^LLM_API_KEY=.*\n?/m, '').replace(/^LLM_REASONING_EFFORT=.*\n?/m, '');
  for (const [key, value] of Object.entries(target.values)) {
    text = setEnvValue(text, key, value);
  }
  if (targetName === 'test') {
    const rateLimitsOn = process.argv.includes('--rate-limits') && process.argv.includes('on');
    text = setEnvValue(text, 'RATE_LIMITS_ENABLED', rateLimitsOn ? 'true' : 'false');
    // The password of the seeded test moderators (seed-test.js); new for every run.
    text = setEnvValue(text, 'E2E_PASSWORD', `E2e-${randomBytes(12).toString('base64url')}-1`);
  }

  const targetFile = path.join(projectRoot, target.fileName);
  fs.writeFileSync(targetFile, text);
  const mainInbox = await writeNewEtherealAccount(targetFile, 'SMTP');
  const testAddressInbox = await writeNewEtherealAccount(targetFile, 'DEMO_SMTP');

  console.log(
    `Wrote ${target.fileName}: database ${target.databaseName}, new login secret, model = local stub, ` +
      `new Ethereal inboxes ${mainInbox} (SMTP_*) and ${testAddressInbox} (DEMO_SMTP_*).`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
