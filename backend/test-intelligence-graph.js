const prisma = require('./src/config/db');
const intelligenceService = require('./src/modules/intelligence/intelligence.service');

async function testIntelligenceEngine() {
  console.log('====================================================');
  console.log('🧠 SCLIP Intelligence & Dependency Graph Verification');
  console.log('====================================================\n');

  try {
    // 1. Test Global Dependency Graph
    console.log('🌐 1. Fetching Global Dependency Graph:');
    const globalGraph = await intelligenceService.getGlobalDependencyGraph();
    console.log(`   • Total License Type Nodes: ${globalGraph.nodes.length}`);
    console.log(`   • Total Statutory Rules (Edges): ${globalGraph.edges.length}\n`);

    console.log('   🔗 Statutory Dependency Links:');
    globalGraph.edges.forEach((edge, i) => {
      console.log(
        `      ${i + 1}. [${edge.sourceCode}] ──(${edge.isBlocking ? 'BLOCKING' : 'NON-BLOCKING'})──▶ [${edge.targetCode}]`
      );
    });
    console.log('\n');

    // 2. Test Cycle Detection Validation
    console.log('🛡️  2. Testing Circular Dependency Protection:');
    const tradeLicense = await prisma.licenseType.findUnique({ where: { code: 'TRADE_LICENSE' } });
    const fssaiLicense = await prisma.licenseType.findUnique({ where: { code: 'FSSAI_LICENSE' } });

    if (tradeLicense && fssaiLicense) {
      try {
        // FSSAI depends on Trade License in seed.
        // Attempting to make Trade License depend on FSSAI must fail!
        console.log(`   Attempting illegal inverse cycle: Trade License -> FSSAI...`);
        await intelligenceService.createDependency({
          licenseTypeId: tradeLicense.id,
          prerequisiteLicenseTypeId: fssaiLicense.id,
          isBlocking: true,
        });
        console.error('❌ Cycle detection failed: Circular rule was allowed!');
        process.exit(1);
      } catch (cycleErr) {
        console.log(`   ✅ Circular reference successfully blocked: "${cycleErr.message}"\n`);
      }
    }

    // 3. Test Location Dependency Graph & Cascading Failure Propagation
    console.log('📍 3. Testing Location Dependency Graph & Cascading Failure Propagation:');
    const org = await prisma.organization.findFirst({
      include: { locations: true },
    });

    if (!org) {
      console.error('❌ No organization found.');
      process.exit(1);
    }

    for (const loc of org.locations) {
      console.log('----------------------------------------------------');
      console.log(`Location: ${loc.name} (${loc.type}, ${loc.state})`);
      console.log('----------------------------------------------------');

      const locGraph = await intelligenceService.getLocationDependencyGraph(loc.id, org.id);

      console.log(`   📊 Node Summary:`);
      console.log(`      • Total Evaluated:     ${locGraph.summary.totalLicenses}`);
      console.log(`      • Mandatory:           ${locGraph.summary.mandatoryLicenses}`);
      console.log(`      • Valid:               ${locGraph.summary.validCount}`);
      console.log(`      • Expired:             ${locGraph.summary.expiredCount}`);
      console.log(`      • Missing:             ${locGraph.summary.missingCount}`);
      console.log(`      • Cascading Blocked:   ${locGraph.summary.cascadingBlockedCount}`);

      if (locGraph.activeRiskChains.length > 0) {
        console.log(`\n   🚨 Active Cascading Risk Chains Detected (${locGraph.activeRiskChains.length}):`);
        locGraph.activeRiskChains.forEach((chain, i) => {
          console.log(`      ${i + 1}. [${chain.targetCode}] BLOCKED by [${chain.blockedByCode}]`);
          console.log(`         Reason: ${chain.reason}`);
          console.log(`         Action: ${chain.recommendation}`);
        });
      } else {
        console.log(`\n   ✅ No cascading dependency failures detected.`);
      }
      console.log('\n');
    }

    console.log('====================================================');
    console.log('🎯 Intelligence & Dependency Graph Verification Passed!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Intelligence engine test failed:', err);
    process.exit(1);
  }
}

testIntelligenceEngine();
