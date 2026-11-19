// Demo accounts all use this reserved .test domain, so no real person can own such an address.
const DEMO_EMAIL_DOMAIN = 'demo.scamsentry.test';

/**
 * Any address on a .test domain (the demo accounts, dev@scamsentry.test, the seeded
 * moderator). Mail to these goes to the Ethereal inbox in DEMO_SMTP_*, never through Brevo,
 * because nobody can receive mail there.
 */
function isTestAddress(email) {
  return typeof email === 'string' && /@[^@\s]+\.test$/i.test(email);
}

module.exports = { DEMO_EMAIL_DOMAIN, isTestAddress };
