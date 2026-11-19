const { Router } = require('express');
const { env } = require('./config/env');
const { requireAuth } = require('./middleware/requireAuth');
const { authRouter } = require('./modules/auth/auth.routes');
const { checkRouter } = require('./modules/checks/check.routes');
const { demoRouter } = require('./modules/demo/demo.routes');
const { healthRouter } = require('./modules/health/health.routes');
const { jobsRouter } = require('./modules/jobs/jobs.routes');
const { moderationRouter } = require('./modules/moderation/moderation.routes');
const { quotaRouter } = require('./modules/quota/quota.routes');
const { reportRouter } = require('./modules/reports/report.routes');
const { profileRouter } = require('./modules/users/profile.routes');

// Every API route is mounted here, under /api (see app.js). Logging in only proves who the
// caller is; which role may do what is checked in each service (see BACKEND.md).
const apiRouter = Router();

// Public (a guest may call these; a signed-in caller is recognised when a token is sent)
apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/quota', quotaRouter);
apiRouter.use('/checks', checkRouter);
// "Log in as <role>" buttons: demos only (DEMO_MODE=true), never a normal run.
if (env.DEMO_MODE) {
  apiRouter.use('/demo', demoRouter);
}

// Logged in
apiRouter.use('/me', requireAuth, profileRouter);
apiRouter.use('/reports', requireAuth, reportRouter);
apiRouter.use('/moderation', requireAuth, moderationRouter);

// Internal jobs: protected by the X-Job-Secret header, not by a user login
apiRouter.use('/internal', jobsRouter);

module.exports = { apiRouter };
