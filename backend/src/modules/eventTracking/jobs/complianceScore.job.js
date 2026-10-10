const cron = require('node-cron');
const prisma = require('../../../config/db');
const intelligenceService = require('../../intelligence/intelligence.service');

/**
 * Sweeps all locations across all organizations and recalculates
 * their compliance score, writing a daily historical snapshot row to `compliance_scores`.
 */
async function runComplianceScoreSnapshotSweep() {
  console.log('[Scheduler] 🧠 Starting daily compliance score snapshot recalculation...');

  try {
    const locations = await prisma.location.findMany({
      select: { id: true, org_id: true, name: true },
    });

    console.log(`[Scheduler] Recalculating score snapshots for ${locations.length} locations...`);

    for (const loc of locations) {
      try {
        await intelligenceService.calculateLocationScore(loc.id, loc.org_id, true);
      } catch (locErr) {
        console.warn(`[Scheduler] Warning recalculating score for ${loc.name}:`, locErr.message);
      }
    }

    console.log('[Scheduler] ✅ Compliance score snapshot sweep completed.');
  } catch (err) {
    console.error('[Scheduler] ❌ Error during compliance score sweep:', err);
  }
}

/**
 * Initializes and schedules the compliance score snapshot background job
 */
function startComplianceScoreScheduler(cronExpression = '0 2 * * *') {
  console.log(`[Scheduler] 🧠 Registering Compliance Score Snapshot Cron Job: '${cronExpression}'`);
  return cron.schedule(cronExpression, async () => {
    await runComplianceScoreSnapshotSweep();
  });
}

module.exports = {
  startComplianceScoreScheduler,
  runComplianceScoreSnapshotSweep,
};
