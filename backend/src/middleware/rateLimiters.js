const { ipKeyGenerator, rateLimit } = require('express-rate-limit');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// Short-window limits for the account endpoints, kept in memory (fine for one backend
// process). The daily check quota is different: it is stored in MongoDB (see modules/quota).
// Over the limit, the request fails with the shared error format and status 429.
// RATE_LIMITS_ENABLED=false (Playwright runs only) skips every limiter here.
function limiter(options) {
  return rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => !env.RATE_LIMITS_ENABLED,
    handler: (_req, _res, next) => {
      next(new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a few minutes and try again.'));
    },
    ...options,
  });
}

function emailFromBody(req) {
  const email = req.body?.email;
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/** Login: at most 20 tries per IP address in 15 minutes. */
const loginIpLimiter = limiter({ windowMs: FIFTEEN_MINUTES, limit: 20 });

/** Login: at most 5 failed tries per account in 15 minutes, from any IP (stops password guessing on one account). */
const loginAccountLimiter = limiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = emailFromBody(req);
    return email ? `email:${email}` : ipKeyGenerator(req.ip ?? '');
  },
});

const registerLimiter = limiter({ windowMs: ONE_HOUR, limit: 10 });

const forgotPasswordLimiter = limiter({ windowMs: FIFTEEN_MINUTES, limit: 5 });

const resetPasswordLimiter = limiter({ windowMs: FIFTEEN_MINUTES, limit: 10 });

/** Reports: generous for real use, stops a script flooding the review queue. */
const reportLimiter = limiter({
  windowMs: ONE_HOUR,
  limit: 30,
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip ?? '')),
});

module.exports = {
  loginIpLimiter,
  loginAccountLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  reportLimiter,
};
