const { logger } = require('../../utils/logger');
const { sendEmail } = require('./mailer');
const { passwordResetEmail } = require('./templates');

/**
 * Sends the password reset email. ScamSentry sends no other email (PROJECTS.md).
 * A failure is logged with the user id and the error code only, never the address.
 * Returns true if the email was handed to the SMTP server.
 */
async function sendPasswordResetEmail(user, resetLink) {
  try {
    await sendEmail({ to: user.email, ...passwordResetEmail(resetLink) });
    return true;
  } catch (error) {
    const errorCode = typeof error?.code === 'string' ? error.code : 'UNKNOWN';
    logger.error({ type: 'password_reset', userId: user.id, errorCode }, 'Email could not be sent');
    return false;
  }
}

module.exports = { sendPasswordResetEmail };
