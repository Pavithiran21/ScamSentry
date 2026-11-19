const { Router } = require('express');
const { z } = require('zod');
const { env } = require('../../config/env');
const { requireJobSecret } = require('../../middleware/requireJobSecret');
const { AppError } = require('../../utils/AppError');
const { purgeReportText } = require('./purgeReportText');

// { "now": "2026-12-12T00:00:00Z" } runs the purge as if it were that moment. Accepted only
// with JOB_TIME_OVERRIDE_ENABLED=true (tests and hand checks; refused in production).
const purgeBodySchema = z.object({ now: z.iso.datetime({ offset: true }).optional() });

async function runPurge(req, res) {
  const { now } = purgeBodySchema.parse(req.body ?? {});
  if (now && !env.JOB_TIME_OVERRIDE_ENABLED) {
    throw new AppError(400, 'TIME_OVERRIDE_DISABLED', 'Running a job "as of" another time is turned off.');
  }
  res.json(await purgeReportText(now ? new Date(now) : new Date()));
}

// Mounted at /api/internal: called by an outside scheduler or by hand, never by the app.
const jobsRouter = Router();

jobsRouter.post('/jobs/purge-report-text', requireJobSecret, runPurge);

module.exports = { jobsRouter };
