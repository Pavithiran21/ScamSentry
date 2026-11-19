const nodemailer = require('nodemailer');
const { env } = require('../../config/env');
const { isTestAddress } = require('../demo/demoAddress');

// Plain SMTP settings from .env. SMTP_* is the main sender (Brevo for real emails, Ethereal in
// tests). DEMO_SMTP_* is an Ethereal inbox used only for .test addresses (demo and dev
// accounts), so their emails can be read in the Ethereal web inbox and never reach Brevo.
// Switching providers changes only .env, never this code.
function createSender({ host, port, user, pass, from }) {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return (message) => transporter.sendMail({ from, ...message });
}

const mainSender = createSender({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  user: env.SMTP_USER,
  pass: env.SMTP_PASS,
  from: env.SMTP_FROM,
});

const testAddressSender = env.DEMO_SMTP_HOST
  ? createSender({
      host: env.DEMO_SMTP_HOST,
      port: env.DEMO_SMTP_PORT,
      user: env.DEMO_SMTP_USER,
      pass: env.DEMO_SMTP_PASS,
      from: env.DEMO_SMTP_FROM ?? env.SMTP_FROM,
    })
  : null;

/** message: { to, subject, text, html } */
async function sendEmail(message) {
  const send = testAddressSender && isTestAddress(message.to) ? testAddressSender : mainSender;
  await send(message);
}

module.exports = { sendEmail };
