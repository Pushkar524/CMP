const { execSync, spawn } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// Load environment from backend/.env.test
const envPath = path.resolve(__dirname, '../.env.test');
dotenv.config({ path: envPath });

// Safety check function
function verifySafeDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
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

let serverProcess = null;

async function globalSetup() {
  console.log('\n============================================================');
  console.log('[Test Setup] Running Pre-Flight Safety Verification...');
  console.log('============================================================');
  verifySafeDatabaseUrl();
  console.log(`[Test Setup] Safety check passed: Verified local test database (${process.env.DATABASE_URL})`);

  // Step 1: Run migrations on cmp_test
  console.log('[Test Setup] Running prisma migrate deploy on cmp_test...');
  try {
    execSync('npx prisma migrate deploy', {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('[Test Setup] prisma migrate deploy failed:', err.message);
    throw new Error(`[Test Setup] Failed to run migrations on cmp_test: ${err.message}`);
  }

  // Step 2: Seed cmp_test database
  console.log('[Test Setup] Seeding database cmp_test...');
  try {
    execSync('node prisma/seed.js', {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('[Test Setup] Database seeding failed:', err.message);
    throw new Error(`[Test Setup] Failed to seed cmp_test: ${err.message}`);
  }

  // Step 3: Spawn backend server with .env.test
  const port = process.env.PORT || 5055;
  console.log(`[Test Setup] Spawning node src/server.js with .env.test on port ${port}...`);

  const parsedEnv = dotenv.config({ path: envPath }).parsed || {};
  serverProcess = spawn('node', ['src/server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, ...parsedEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (data) => {
    process.stdout.write(`[TEST SERVER] ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(`[TEST SERVER ERROR] ${data}`);
  });

  serverProcess.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`[TEST SERVER] Process exited unexpectedly with code ${code} signal ${signal}`);
    }
  });

  // Step 4: Wait for GET /health = 200
  const healthUrl = `http://localhost:${port}/health`;
  console.log(`[Test Setup] Polling ${healthUrl} for 200 OK...`);
  const startTime = Date.now();
  let isReady = false;

  while (Date.now() - startTime < 15000) {
    try {
      const res = await fetch(healthUrl);
      if (res.status === 200) {
        isReady = true;
        break;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (!isReady) {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    throw new Error(`[Test Setup] Server failed to become healthy at ${healthUrl} within 15 seconds.`);
  }

  console.log('[Test Setup] Test server is healthy and ready for tests!\n');

  // Return teardown function
  return async function() {
    console.log('\n============================================================');
    console.log('[Test Teardown] Shutting down test server...');
    console.log('============================================================');
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        setTimeout(resolve, 3000); // safety fallback
      });
      console.log('[Test Teardown] Test server terminated.');
    }
  };
}

module.exports = globalSetup;
module.exports.default = globalSetup;
