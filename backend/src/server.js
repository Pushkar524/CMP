const app = require('./app');
const config = require('./config/env');
const prisma = require('./config/db');

const { startExpiryScheduler } = require('./modules/eventTracking/jobs/expiryScheduler.job');
const { startComplianceScoreScheduler } = require('./modules/eventTracking/jobs/complianceScore.job');

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`🚀 SCLIP Server running in ${config.nodeEnv} mode on port ${PORT}`);

  // Start background cron jobs
  startExpiryScheduler();
  startComplianceScoreScheduler();
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
