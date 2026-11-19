const { createApp } = require('./app');
const { env } = require('./config/env');
const { connectDb, disconnectDb } = require('./db/mongoose');
const { startPurgeSchedule } = require('./modules/jobs/scheduler');
const { logger } = require('./utils/logger');

// Load every model before connecting, so connectDb() builds all their indexes.
require('./modules/auth/passwordResetToken.model');
require('./modules/auth/refreshToken.model');
require('./modules/checks/check.model');
require('./modules/checks/verdictCache.model');
require('./modules/quota/quotaCounter.model');
require('./modules/reports/report.model');
require('./modules/users/user.model');

async function main() {
  await connectDb();

  const app = createApp();
  const server = app.listen(env.PORT, (error) => {
    if (error) {
      logger.fatal({ err: error }, 'Could not start the HTTP server');
      process.exit(1);
    }
    logger.info({ port: env.PORT }, 'ScamSentry API listening');
  });

  // Tests trigger the purge themselves through the job endpoint, so the schedule runs everywhere else.
  const purgeTask = env.NODE_ENV === 'test' ? null : startPurgeSchedule();

  const shutdown = (signal) => {
    logger.info({ signal }, 'Shutting down');
    purgeTask?.stop();
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.fatal({ err: error }, 'ScamSentry API failed to start');
  process.exit(1);
});
