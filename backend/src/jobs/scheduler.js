const cron = require('node-cron');
const notificationService = require('../modules/notifications/notification.service');

/**
 * Initializes recurring automated compliance sweeps
 */
function initScheduler() {
  console.log('⏰ [Scheduler] Registering automated compliance jobs...');

  // Daily automated sweep at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ [Scheduler] Executing scheduled daily expiry and compliance sweep...');
    try {
      const summary = await notificationService.runExpirySweep();
      console.log(`✅ [Scheduler] Sweep completed: ${summary.alertsDispatched} notifications dispatched across ${summary.documentsEvaluated} documents.`);
    } catch (err) {
      console.error('❌ [Scheduler] Scheduled sweep failed:', err.message);
    }
  });

  // Run an initial sweep 3 seconds after startup so in-app notifications are populated
  setTimeout(async () => {
    try {
      console.log('⏰ [Scheduler] Running initial startup expiry sweep...');
      const summary = await notificationService.runExpirySweep();
      console.log(`✅ [Scheduler] Initial sweep evaluated ${summary.documentsEvaluated} documents, dispatched ${summary.alertsDispatched} notifications.`);
    } catch (err) {
      console.warn('⚠️ [Scheduler] Initial sweep notice:', err.message);
    }
  }, 3000);
}

module.exports = { initScheduler };
