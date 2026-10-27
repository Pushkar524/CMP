const assert = require('assert');

function verifySafeDatabaseUrl(dbUrl) {
  if (!dbUrl) {
    throw new Error('[SAFETY GUARD] CRITICAL: DATABASE_URL is not set in .env.test');
  }
  const lower = dbUrl.toLowerCase();
  if (lower.includes('supabase')) {
    throw new Error(`[SAFETY GUARD] CRITICAL: DATABASE_URL contains "supabase". Aborting to protect hosted database! URL: ${dbUrl}`);
  }
  try {
    const parsed = new URL(dbUrl);
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      throw new Error(`[SAFETY GUARD] CRITICAL: DATABASE_URL hostname is "${parsed.hostname}". Tests may only run against localhost! URL: ${dbUrl}`);
    }
  } catch (err) {
    if (!err.message.includes('[SAFETY GUARD]')) {
      throw new Error(`[SAFETY GUARD] Invalid DATABASE_URL format: ${err.message}`);
    }
    throw err;
  }
}

// 1. Test Supabase URL throws
assert.throws(() => {
  verifySafeDatabaseUrl('postgresql://postgres:pass@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres');
}, /contains "supabase"/);

// 2. Test Remote Host throws
assert.throws(() => {
  verifySafeDatabaseUrl('postgresql://postgres:pass@db.production.company.com:5432/mydb');
}, /Tests may only run against localhost/);

// 3. Test Localhost passes
assert.doesNotThrow(() => {
  verifySafeDatabaseUrl('postgresql://postgres:postgres@localhost:5432/cmp_test');
});

// 4. Test 127.0.0.1 passes
assert.doesNotThrow(() => {
  verifySafeDatabaseUrl('postgresql://postgres:postgres@127.0.0.1:5432/cmp_test');
});

console.log('All safety guard assertions passed successfully!');
