const { randomUUID } = require('node:crypto');
const { logger } = require('../../utils/logger');
const { reportRepository } = require('../reports/report.repository');

/**
 * Deletes the message copy of every report decided more than 30 days ago (purgeAt has
 * passed). The verdicts, the user's reason and the moderator's note stay.
 *
 * Safe to run any number of times, and two runs at once: it is one updateMany whose filter
 * skips reports already purged, and MongoDB applies it to each report atomically. A run that
 * finds nothing to do just reports 0.
 *
 * now: the moment to purge "as of" (the job endpoint can pass another time in tests).
 * Returns { runId, purged, ranAt }. The log line holds counts only, never text or ids of users.
 */
async function purgeReportText(now = new Date()) {
  const runId = randomUUID();
  const purged = await reportRepository.purgeTextDue(now);
  logger.info({ job: 'purge-report-text', runId, purged }, 'Report text purge finished');
  return { runId, purged, ranAt: now.toISOString() };
}

module.exports = { purgeReportText };
