const { AppError } = require('./AppError');

// Role checks live in the service layer: every service function that needs a role calls
// assertRole first, so the rule holds whichever route or script calls the service.

const ROLE_MESSAGES = {
  user: 'Not for moderators. This page is for user accounts.',
  moderator: 'Moderators only.',
};

/** actor: { id, role } from the access token, or null for a guest. */
function assertRole(actor, role) {
  if (!actor) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Please log in.');
  }
  if (actor.role !== role) {
    throw new AppError(403, 'FORBIDDEN', ROLE_MESSAGES[role]);
  }
}

module.exports = { assertRole };
