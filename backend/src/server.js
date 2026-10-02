const cron = require('node-cron');
const app = require('./app');
const config = require('./config/env');
const prisma = require('./config/db');

// Background Jobs
const { runExpirySweep } = require('./modules/eventTracking/jobs/expiryScheduler.job');
const { runComplianceScoreSnapshotJob } = require('./modules/eventTracking/jobs/complianceScore.job');

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`🚀 SCLIP Server running in ${config.nodeEnv} mode on port ${PORT}`);

  // Schedule Daily Automated Jobs (Runs every day at midnight 00:00)
  // In development, cron is initialized and can also be triggered on demand via API
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running scheduled daily compliance tasks...');
    try {
      await runExpirySweep();
      await runComplianceScoreSnapshotJob();
    } catch (err) {
      console.error('[Cron] Error executing daily jobs:', err);
    }
  });

  console.log('⏰ Automated Expiry Scheduler & Compliance Score Snapshot jobs scheduled.');
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('\n[SCLIP] Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('[SCLIP] Server closed.');
    process.exit(0);
  });
});
