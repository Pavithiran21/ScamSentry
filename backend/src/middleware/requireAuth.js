const jwt = require('jsonwebtoken');
const { verifyAccessToken } = require('../modules/auth/tokens');
const { AppError } = require('../utils/AppError');

function readBearer(req) {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

function verifyOrThrow(token) {
  try {
    return verifyAccessToken(token);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please log in again.');
    }
    throw new AppError(401, 'TOKEN_INVALID', 'Please log in again.');
  }
}

/** Lets the request through only with a valid "Authorization: Bearer <access token>" header, and sets req.user = { id, role }. */
function requireAuth(req, _res, next) {
  const token = readBearer(req);
  if (!token) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Please log in.');
  }
  req.user = verifyOrThrow(token);
  next();
}

/**
 * For routes a guest may use too (checking a message, the quota). No header: a guest.
 * A header with a bad or expired token is still a 401, so the frontend refreshes the
 * session instead of the user silently being treated as a guest.
 */
function optionalAuth(req, _res, next) {
  const token = readBearer(req);
  req.user = token ? verifyOrThrow(token) : null;
  next();
}

/** The caller as the services see it: { id, role }, or null for a guest. */
function actorOf(req) {
  return req.user ?? null;
}

module.exports = { requireAuth, optionalAuth, actorOf };
