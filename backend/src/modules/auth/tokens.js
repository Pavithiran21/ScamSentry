const { createHash, randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../../config/env');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const ROLES = ['user', 'moderator'];

/** The token carries the role, so each request knows it without a database read. */
function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL,
    subject: String(user.id),
  });
}

/** Returns { id, role } from a valid access token; throws a jsonwebtoken error otherwise. */
function verifyAccessToken(token) {
  // Fixing the algorithm stops a forged token from choosing a weaker one (for example "none").
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof payload === 'string' || !payload.sub || !ROLES.includes(payload.role)) {
    throw new jwt.JsonWebTokenError('Token has no subject or role');
  }
  return { id: payload.sub, role: payload.role };
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Refresh and password-reset tokens are 32 random bytes. Only their SHA-256 hash is stored,
 * so someone who reads the database cannot use them. A fast hash is fine here (unlike for
 * passwords) because 256 random bits cannot be guessed.
 */
function createOpaqueToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}

module.exports = {
  REFRESH_TOKEN_TTL_MS,
  RESET_TOKEN_TTL_MS,
  ROLES,
  signAccessToken,
  verifyAccessToken,
  hashToken,
  createOpaqueToken,
};
