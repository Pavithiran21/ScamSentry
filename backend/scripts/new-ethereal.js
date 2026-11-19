/**
 * Creates a brand-new Ethereal test account (fake SMTP: accepts mail, never delivers it)
 * and writes its SMTP settings into backend/.env (or ENV_FILE).
 * The same user name and password log in to the web inbox at https://ethereal.email/login.
 *
 * Usage: npm run ethereal:new              replaces SMTP_* (only for a test or demo env file)
 *        npm run ethereal:new -- --demo    fills DEMO_SMTP_*, the inbox for .test addresses
 * Also used by make-env.js, so every test run and every demo gets an empty inbox.
 */
const fs = require('node:fs');
const path = require('node:path');
const nodemailer = require('nodemailer');

function setEnvValue(text, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  return pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`;
}

/** Ethereal's account call is a plain web request over the internet: retry a dropped connection a few times. */
async function createTestAccountWithRetry(attempts = 4) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await nodemailer.createTestAccount();
    } catch (error) {
      if (attempt >= attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
}

/**
 * Creates the account, writes it into envFile and returns its user name.
 * prefix 'SMTP' replaces the main sender; 'DEMO_SMTP' fills the .test inbox and leaves the
 * main sender (Brevo) alone.
 */
async function writeNewEtherealAccount(envFile, prefix = 'SMTP') {
  if (!fs.existsSync(envFile)) {
    throw new Error(`No env file at ${envFile}`);
  }

  // Nodemailer keeps the first test account in memory and hands it out again on the next call
  // in the same process; make-env.js needs two different inboxes, so the cache is turned off.
  process.env.ETHEREAL_CACHE = 'no';
  const account = await createTestAccountWithRetry();

  let text = fs.readFileSync(envFile, 'utf8');
  text = setEnvValue(text, `${prefix}_HOST`, account.smtp.host);
  text = setEnvValue(text, `${prefix}_PORT`, String(account.smtp.port));
  text = setEnvValue(text, `${prefix}_USER`, account.user);
  text = setEnvValue(text, `${prefix}_PASS`, account.pass);
  text = setEnvValue(text, `${prefix}_FROM`, 'ScamSentry <no-reply@scamsentry.test>');
  fs.writeFileSync(envFile, text);

  return account.user;
}

async function main() {
  const envFile = process.env.ENV_FILE ?? path.resolve(__dirname, '../.env');
  const prefix = process.argv.includes('--demo') ? 'DEMO_SMTP' : 'SMTP';
  if (prefix === 'SMTP' && path.basename(envFile) === '.env') {
    throw new Error('backend/.env sends real email through Brevo; use --demo, or ENV_FILE for a test or demo file.');
  }
  const user = await writeNewEtherealAccount(envFile, prefix);

  // The password stays in the env file only.
  console.log(`New Ethereal inbox saved to ${path.basename(envFile)} (${prefix}_*).`);
  console.log(`Web inbox: https://ethereal.email/login (user ${user}, password = ${prefix}_PASS)`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { setEnvValue, writeNewEtherealAccount };
