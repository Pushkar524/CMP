const app = require('./app');
const config = require('./config/env');
const prisma = require('./config/db');

const PORT = config.port;

const server = app.listen(PORT, async () => {
  console.log(`🚀 Compliance Management Platform API running in ${config.nodeEnv} mode on port ${PORT}`);

  // Initialize storage bucket on startup
  try {
    const storageService = require('./services/StorageService');
    await storageService.ensureBucketExists();
    console.log(`📦 Storage bucket '${config.storage.minio.bucket}' is ready (${config.storage.provider})`);
  } catch (err) {
    console.warn(`⚠️  Storage init warning: ${err.message}`);
  }

  // Initialize automated background scheduler
  try {
    const { initScheduler } = require('./jobs/scheduler');
    initScheduler();
  } catch (err) {
    console.warn(`⚠️  Scheduler init warning: ${err.message}`);
  }
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('\n[Compliance Platform] Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('[Compliance Platform] Server closed.');
    process.exit(0);
  });
});
