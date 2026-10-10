const test = require('node:test');
const assert = require('node:assert/strict');

// Pure compliance evaluation helper modeling the engine's exact calculation logic
function calculateScore({ requiredRules, latestDocMap, dependencies, now = new Date() }) {
  const suggestions = [];
  const gaps = [];
  let earnedPoints = 0;
  const ruleCount = requiredRules.length;
  const maxPoints = Math.max(ruleCount * 25, 100);

  for (const rule of requiredRules) {
    const lt = rule.license_type;
    const matchingDoc = latestDocMap.get(rule.license_type_id);

    if (!matchingDoc) {
      gaps.push(lt ? lt.name : 'Unknown License');
      suggestions.push({
        type: 'GAP',
        severity: 'HIGH',
        title: `Missing Mandatory License: ${lt?.name || 'Required License'}`,
      });
    } else {
      let docScore = 0;

      if (matchingDoc.status === 'VERIFIED') {
        if (lt?.is_lifetime_valid || !matchingDoc.expiry_date) {
          docScore = 25;
        } else {
          const daysLeft = Math.ceil(
            (new Date(matchingDoc.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysLeft < 0) {
            docScore = 0;
            suggestions.push({
              type: 'EXPIRED',
              severity: 'CRITICAL',
              title: `Expired License: ${lt?.name}`,
            });
          } else if (daysLeft <= 30) {
            docScore = 15;
            suggestions.push({
              type: 'EXPIRING_SOON',
              severity: 'MEDIUM',
              title: `Expiring in ${daysLeft} days: ${lt?.name}`,
            });
          } else {
            docScore = 25;
          }
        }
      } else if (matchingDoc.status === 'PENDING_VERIFICATION') {
        docScore = 10;
        suggestions.push({
          type: 'PENDING',
          severity: 'LOW',
          title: `Verification Pending: ${lt?.name}`,
        });
      } else {
        docScore = 0;
      }

      // Check Cascading Dependency Risk
      const depOnThis = dependencies.filter((d) => d.license_type_id === matchingDoc.license_type_id);
      for (const dep of depOnThis) {
        const prereqDoc = latestDocMap.get(dep.prerequisite_license_type_id);
        const prereqLt = dep.prerequisite_license_type;
        const isPrereqLapsed =
          !prereqDoc ||
          prereqDoc.status === 'EXPIRED' ||
          prereqDoc.status === 'REJECTED' ||
          (prereqDoc.expiry_date && new Date(prereqDoc.expiry_date) < now);

        if (isPrereqLapsed && dep.is_blocking) {
          docScore = Math.max(0, docScore - 15);
          suggestions.push({
            type: 'CASCADING_RISK',
            severity: 'CRITICAL',
            title: `Cascading Risk: ${lt?.name} blocked by ${prereqLt?.name || 'Prerequisite'}`,
          });
        }
      }

      earnedPoints += docScore;
    }
  }

  const finalScore = Math.min(100, Math.round((earnedPoints / maxPoints) * 100));

  return {
    score: finalScore,
    breakdown: {
      totalMandatory: ruleCount,
      gapsCount: gaps.length,
      earnedPoints,
      maxPoints,
      gaps,
    },
    suggestions,
  };
}

test('Compliance Score Engine Suite', async (t) => {
  const now = new Date('2026-10-01T00:00:00Z');

  await t.test('100% score when all 4 mandatory licenses are verified and healthy', () => {
    const requiredRules = [
      { license_type_id: 'lt-1', license_type: { name: 'Trade License', is_lifetime_valid: false } },
      { license_type_id: 'lt-2', license_type: { name: 'Fire NOC', is_lifetime_valid: false } },
      { license_type_id: 'lt-3', license_type: { name: 'PAN', is_lifetime_valid: true } },
      { license_type_id: 'lt-4', license_type: { name: 'GST', is_lifetime_valid: true } },
    ];

    const latestDocMap = new Map([
      ['lt-1', { status: 'VERIFIED', expiry_date: new Date('2027-01-01T00:00:00Z') }],
      ['lt-2', { status: 'VERIFIED', expiry_date: new Date('2027-06-01T00:00:00Z') }],
      ['lt-3', { status: 'VERIFIED', expiry_date: null }],
      ['lt-4', { status: 'VERIFIED', expiry_date: null }],
    ]);

    const result = calculateScore({ requiredRules, latestDocMap, dependencies: [], now });
    assert.strictEqual(result.score, 100);
    assert.strictEqual(result.breakdown.gapsCount, 0);
    assert.strictEqual(result.suggestions.length, 0);
  });

  await t.test('detects GAPS and lowers score when mandatory licenses are missing', () => {
    const requiredRules = [
      { license_type_id: 'lt-1', license_type: { name: 'Trade License', is_lifetime_valid: false } },
      { license_type_id: 'lt-2', license_type: { name: 'Fire NOC', is_lifetime_valid: false } },
    ];

    const latestDocMap = new Map([
      ['lt-1', { status: 'VERIFIED', expiry_date: new Date('2027-01-01T00:00:00Z') }],
    ]);

    const result = calculateScore({ requiredRules, latestDocMap, dependencies: [], now });
    // 2 rules -> maxPoints = max(50, 100) = 100. lt-1 gives 25 points. Result = 25%
    assert.strictEqual(result.score, 25);
    assert.strictEqual(result.breakdown.gapsCount, 1);
    assert.strictEqual(result.breakdown.gaps[0], 'Fire NOC');
    assert.ok(result.suggestions.some((s) => s.type === 'GAP'));
  });

  await t.test('penalizes license expiring within 30 days from 25 to 15 points', () => {
    const requiredRules = [
      { license_type_id: 'lt-1', license_type: { name: 'Trade License', is_lifetime_valid: false } },
      { license_type_id: 'lt-2', license_type: { name: 'Fire NOC', is_lifetime_valid: false } },
      { license_type_id: 'lt-3', license_type: { name: 'PAN', is_lifetime_valid: true } },
      { license_type_id: 'lt-4', license_type: { name: 'GST', is_lifetime_valid: true } },
    ];

    const latestDocMap = new Map([
      ['lt-1', { status: 'VERIFIED', expiry_date: new Date('2026-10-15T00:00:00Z') }], // 14 days left -> 15 pts
      ['lt-2', { status: 'VERIFIED', expiry_date: new Date('2027-06-01T00:00:00Z') }], // 25 pts
      ['lt-3', { status: 'VERIFIED', expiry_date: null }], // 25 pts
      ['lt-4', { status: 'VERIFIED', expiry_date: null }], // 25 pts
    ]);

    const result = calculateScore({ requiredRules, latestDocMap, dependencies: [], now });
    // 15 + 25 + 25 + 25 = 90 / 100 -> 90%
    assert.strictEqual(result.score, 90);
    assert.ok(result.suggestions.some((s) => s.type === 'EXPIRING_SOON'));
  });

  await t.test('applies cascading risk penalty (-15 points) when blocking prerequisite has lapsed', () => {
    const requiredRules = [
      { license_type_id: 'lt-fire', license_type: { name: 'Fire NOC', is_lifetime_valid: false } },
      { license_type_id: 'lt-lift', license_type: { name: 'Lift License', is_lifetime_valid: false } },
      { license_type_id: 'lt-3', license_type: { name: 'PAN', is_lifetime_valid: true } },
      { license_type_id: 'lt-4', license_type: { name: 'GST', is_lifetime_valid: true } },
    ];

    // Fire NOC depends on Lift License
    const dependencies = [
      {
        license_type_id: 'lt-fire',
        prerequisite_license_type_id: 'lt-lift',
        prerequisite_license_type: { name: 'Lift License' },
        is_blocking: true,
      },
    ];

    // Lift License is EXPIRED
    const latestDocMap = new Map([
      ['lt-lift', { license_type_id: 'lt-lift', status: 'EXPIRED', expiry_date: new Date('2026-09-01T00:00:00Z') }],
      ['lt-fire', { license_type_id: 'lt-fire', status: 'VERIFIED', expiry_date: new Date('2027-01-01T00:00:00Z') }],
      ['lt-3', { license_type_id: 'lt-3', status: 'VERIFIED', expiry_date: null }],
      ['lt-4', { license_type_id: 'lt-4', status: 'VERIFIED', expiry_date: null }],
    ]);

    const result = calculateScore({ requiredRules, latestDocMap, dependencies, now });
    // lt-lift = 0 pts
    // lt-fire = 25 - 15 (cascading penalty) = 10 pts
    // lt-3 = 25 pts
    // lt-4 = 25 pts
    // total = 60 / 100 -> 60%
    assert.strictEqual(result.score, 60);
    const cascadingSuggestion = result.suggestions.find((s) => s.type === 'CASCADING_RISK');
    assert.ok(cascadingSuggestion, 'Must generate CASCADING_RISK suggestion');
  });
});
