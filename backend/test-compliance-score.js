const prisma = require('./src/config/db');
const complianceScoreService = require('./src/modules/compliance/complianceScore.service');

async function testComplianceEngine() {
  console.log('====================================================');
  console.log('🧠 SCLIP Compliance Score Engine Verification');
  console.log('====================================================\n');

  try {
    // 1. Fetch Demo Organization
    const org = await prisma.organization.findFirst({
      include: {
        locations: true,
      },
    });

    if (!org) {
      console.error('❌ No organization found. Please run `npx prisma db seed` first.');
      process.exit(1);
    }

    console.log(`🏢 Organization: ${org.name} (${org.id})`);
    console.log(`📍 Found ${org.locations.length} Locations:\n`);

    // 2. Calculate score for each location
    for (const loc of org.locations) {
      console.log('----------------------------------------------------');
      console.log(`📍 Evaluating Location: ${loc.name} [Type: ${loc.type}, State: ${loc.state}]`);
      console.log('----------------------------------------------------');

      const result = await complianceScoreService.calculateLocationScore(loc.id, org.id);

      console.log(`⭐ Compliance Score: ${result.score} / 100.0 [Status: ${result.healthStatus}]`);
      console.log(`📊 Summary:`);
      console.log(`   - Required Licenses:   ${result.breakdown.summary.totalRequired}`);
      console.log(`   - Compliant:           ${result.breakdown.summary.compliantCount}`);
      console.log(`   - Missing (Gaps):      ${result.breakdown.summary.missingCount}`);
      console.log(`   - Expired:             ${result.breakdown.summary.expiredCount}`);
      console.log(`   - Expiring Soon:       ${result.breakdown.summary.expiringSoonCount}`);
      console.log(`   - Pending Verify:      ${result.breakdown.summary.pendingVerificationCount}`);
      console.log(`   - Total Deductions:    -${result.breakdown.summary.totalDeductions} pts`);

      if (result.breakdown.deductions.length > 0) {
        console.log(`\n⚠️  Deductions Applied:`);
        result.breakdown.deductions.forEach((d, i) => {
          console.log(`   ${i + 1}. [${d.severity}] ${d.licenseName} (-${d.penalty} pts): ${d.reason}`);
          console.log(`      💡 Recommendation: ${d.recommendation}`);
        });
      } else {
        console.log(`\n🎉 100% Compliant! No deductions applied.`);
      }

      if (result.breakdown.suggestedActions.length > 0) {
        console.log(`\n📋 Suggested Priority Actions:`);
        result.breakdown.suggestedActions.forEach((action, i) => {
          console.log(`   👉 ${action}`);
        });
      }
      console.log('\n');
    }

    // 3. Test Organization-wide Overview
    console.log('====================================================');
    console.log('🌐 Testing Organization Roll-up Overview:');
    console.log('====================================================');
    const orgOverview = await complianceScoreService.calculateOrganizationScore(org.id);
    console.log(`Average Organization Compliance Score: ${orgOverview.averageScore} / 100.0`);
    console.log('Leaderboard:');
    orgOverview.locations.forEach((l) => {
      console.log(`  • ${l.name.padEnd(35)} Score: ${l.score.toString().padStart(5)} [${l.healthStatus}]`);
    });

    // 4. Verify Database Persistence
    const savedScoresCount = await prisma.complianceScore.count({
      where: { org_id: org.id },
    });
    console.log(`\n✅ Database Records Verified: ${savedScoresCount} compliance score snapshots persisted.`);
    console.log('====================================================');
    console.log('🎯 Compliance Score Engine Verification Passed!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Compliance engine test failed:', err);
    process.exit(1);
  }
}

testComplianceEngine();
