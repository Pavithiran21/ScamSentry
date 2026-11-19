const cron = require('node-cron');
const { env } = require('../../config/env');
const { logger } = require('../../utils/logger');
const { purgeReportText } = require('./purgeReportText');

/**
 * Runs the report-text purge once a day (PURGE_CRON, read in UTC). noOverlap skips a tick
 * while the previous run is still going; the job is idempotent anyway, so an overlap (or a
 * second backend process) would do no harm. On a free host that sleeps, call
 * POST /api/internal/jobs/purge-report-text from an outside cron instead.
 */
function startPurgeSchedule() {
  return cron.schedule(
    env.PURGE_CRON,
    async () => {
      try {
        await purgeReportText();
      } catch (error) {
        logger.error({ err: error, job: 'purge-report-text' }, 'Report text purge failed');
      }
    },
    { timezone: 'UTC', noOverlap: true, name: 'purge-report-text' },
  );
}

module.exports = { startPurgeSchedule };
