const path = require('path');
const dotenv = require('dotenv');

// Load environment from backend/.env.test
const envPath = path.resolve(__dirname, '../.env.test');
dotenv.config({ path: envPath });

// ============================================================
// SAFETY GUARD: Never run against Supabase or remote database
// ============================================================
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

verifySafeDatabaseUrl();

const PORT = process.env.PORT || 5055;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Login helper: returns JWT token
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>}
 */
async function login(email, password) {
  const res = await api('POST', '/api/auth/login', null, { email, password });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data?.data?.token;
}

/**
 * Universal API helper
 * @param {string} method HTTP method (GET, POST, PATCH, DELETE, etc.)
 * @param {string} path API path (e.g. /api/documents)
 * @param {string|null} token Optional Bearer token
 * @param {object|null} body Request body (JSON or null)
 * @returns {Promise<{ status: number, ok: boolean, data: any, headers: Headers }>}
 */
async function api(method, requestPath, token = null, body = null) {
  const url = `${BASE_URL}${requestPath.startsWith('/') ? '' : '/'}${requestPath}`;
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
    headers: response.headers,
  };
}

/**
 * Registers a fresh second organization via POST /api/auth/register
 * @returns {Promise<{ org: object, token: string, adminEmail: string, adminPassword: string }>}
 */
async function createSecondTenant() {
  const uniqueSuffix = Date.now() + Math.random().toString(36).substring(2, 7);
  const orgName = `Tenant Two Corp ${uniqueSuffix}`;
  const adminEmail = `admin_${uniqueSuffix}@tenant2.test`;
  const adminPassword = 'Password@123';

  const registerPayload = {
    organizationName: orgName,
    taxId: `GSTIN-${uniqueSuffix.substring(0, 10).toUpperCase()}`,
    adminName: `Tenant Two Admin`,
    email: adminEmail,
    password: adminPassword,
    industry: 'Logistics & Supply Chain',
    website: 'https://tenant2.test',
    phone: '+919876543210',
    address: 'Plot 42, Sector 18, Industrial Area',
    branches: [
      {
        name: `Tenant Two Warehouse ${uniqueSuffix.substring(0, 4)}`,
        code: `T2-WH1`,
        type: 'WAREHOUSE',
        state: 'Maharashtra',
        managerName: `T2 Manager`,
        managerEmail: `manager_${uniqueSuffix}@tenant2.test`,
        managerPassword: 'Password@123',
      },
    ],
  };

  const registerRes = await api('POST', '/api/auth/register', null, registerPayload);
  if (!registerRes.ok) {
    throw new Error(`Failed to create second tenant: ${registerRes.status} ${JSON.stringify(registerRes.data)}`);
  }

  const token = await login(adminEmail, adminPassword);
  return {
    org: registerRes.data?.data?.organization,
    token,
    adminEmail,
    adminPassword,
  };
}

module.exports = {
  verifySafeDatabaseUrl,
  login,
  api,
  createSecondTenant,
  PORT,
  BASE_URL,
};
