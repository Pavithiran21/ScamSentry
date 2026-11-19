const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

// Reads the run's Ethereal inbox over IMAP. Mail to .test addresses (the pool and demo accounts)
// goes to the DEMO_SMTP_* inbox, which make-env.js creates new for every run, so it starts empty.

function inboxConfig() {
  return {
    host: 'imap.ethereal.email',
    port: 993,
    secure: true,
    auth: { user: process.env.DEMO_SMTP_USER, pass: process.env.DEMO_SMTP_PASS },
    logger: false,
  };
}

/** Waits for the newest message to `to` whose subject matches, and returns it parsed. */
async function waitForMail({ to, subject, timeoutMs = 30_000 }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await findMail({ to, subject });
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`No mail to ${to} matching ${subject} within ${timeoutMs / 1000} s`);
}

async function findMail({ to, subject }) {
  const imap = new ImapFlow(inboxConfig());
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock('INBOX');
    try {
      const uids = await imap.search({ to }, { uid: true });
      for (const uid of [...(uids || [])].reverse()) {
        const message = await imap.fetchOne(String(uid), { source: true }, { uid: true });
        // A message still being delivered can come back without its source; the next poll gets it.
        if (!message?.source) continue;
        const parsed = await simpleParser(message.source);
        if (subject.test(parsed.subject ?? '')) return parsed;
      }
      return null;
    } finally {
      lock.release();
    }
  } finally {
    await imap.logout();
  }
}

module.exports = { waitForMail };
