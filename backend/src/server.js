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
const handleShutdown = async (signal) => {
  console.log(`\n[Compliance Platform] Received ${signal}. Shutting down gracefully...`);
  try {
    await prisma.$disconnect();
  } catch (err) {
    console.error('Error disconnecting Prisma:', err.message);
  }
  server.close(() => {
    console.log('[Compliance Platform] Server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
