const prisma = require('../../../config/db');
const intelligenceService = require('../../intelligence/intelligence.service');

/**
 * Sweeps all locations across organizations and takes automated daily compliance snapshots
 * @returns {Promise<object>}
 */
async function runComplianceScoreSnapshotJob() {
  console.log('[ComplianceScoreJob] 📊 Starting automated compliance score snapshots...');
  const locations = await prisma.location.findMany({
    select: { id: true, org_id: true, name: true },
  });

  let processedCount = 0;
  for (const loc of locations) {
    try {
      await intelligenceService.calculateLocationScore(loc.id, loc.org_id);
      processedCount++;
    } catch (err) {
      console.warn(`[ComplianceScoreJob] Failed score snapshot for ${loc.name}:`, err.message);
    }
  }

  console.log(`[ComplianceScoreJob] ✅ Snapshot completed for ${processedCount} locations.`);
  return {
    success: true,
    locationsProcessed: processedCount,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  runComplianceScoreSnapshotJob,
};
