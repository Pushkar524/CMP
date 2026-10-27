const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { verifySafeDatabaseUrl, api } = require('./helpers');

// Ensure DATABASE_URL is verified against localhost
verifySafeDatabaseUrl();

const prisma = new PrismaClient();

/**
 * Seeds test data for multi-tenant and role-based finding verification.
 * Creates:
 * - Tenant A:
 *   - adminA (ORG_ADMIN)
 *   - managerBLR (LOCATION_MANAGER, assigned to BLR only)
 *   - managerBOM (LOCATION_MANAGER, assigned to BOM only)
 *   - locations: BLR (Karnataka) and BOM (Maharashtra)
 *   - one Document row in BOM inserted directly via Prisma (fake storage_key, no MinIO)
 * - Tenant B:
 *   - adminB (ORG_ADMIN)
 *
 * Logs in all 4 users and returns tokens and all generated IDs.
 *
 * @returns {Promise<{
 *   tokens: { adminA: string, managerBLR: string, managerBOM: string, adminB: string },
 *   ids: { orgA: string, orgB: string, adminA: string, managerBLR: string, managerBOM: string, adminB: string, locBLR: string, locBOM: string, docBOM: string, licenseType: string },
 *   users: { adminA: object, managerBLR: object, managerBOM: object, adminB: object },
 *   locations: { locBLR: object, locBOM: object },
 *   documents: { docBOM: object },
 *   orgs: { orgA: object, orgB: object },
 *   loginResponses: { adminA: object, managerBLR: object, managerBOM: object, adminB: object },
 *   prisma: PrismaClient
 * }>}
 */
async function seedFindings() {
  verifySafeDatabaseUrl();

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const defaultPassword = 'Password@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Create Tenant A Organization
  const orgA = await prisma.organization.create({
    data: {
      name: `Tenant A Findings ${uniqueSuffix}`,
      tax_id: `GSTIN-A-${uniqueSuffix.substring(0, 10).toUpperCase()}`,
      industry: 'Retail & Commercial',
      website: 'https://tenant-a.test',
      phone: '+919876543211',
      address: 'Plot A, Brigade Road, Bengaluru',
    },
  });

  // 2. Create Tenant B Organization
  const orgB = await prisma.organization.create({
    data: {
      name: `Tenant B Findings ${uniqueSuffix}`,
      tax_id: `GSTIN-B-${uniqueSuffix.substring(0, 10).toUpperCase()}`,
      industry: 'Logistics',
      website: 'https://tenant-b.test',
      phone: '+919876543212',
      address: 'Plot B, Andheri East, Mumbai',
    },
  });

  // 3. Create Locations for Tenant A: BLR and BOM
  const locBLR = await prisma.location.create({
    data: {
      org_id: orgA.id,
      name: `Bangalore Facility ${uniqueSuffix}`,
      code: `BLR-${uniqueSuffix.substring(0, 5).toUpperCase()}`,
      type: 'STORE',
      state: 'Karnataka',
      address: 'Indiranagar, Bengaluru, Karnataka 560038',
      current_compliance_score: 100.0,
    },
  });

  const locBOM = await prisma.location.create({
    data: {
      org_id: orgA.id,
      name: `Mumbai Facility ${uniqueSuffix}`,
      code: `BOM-${uniqueSuffix.substring(0, 5).toUpperCase()}`,
      type: 'WAREHOUSE',
      state: 'Maharashtra',
      address: 'Bhiwandi, Thane, Maharashtra 421302',
      current_compliance_score: 100.0,
    },
  });

  // 4. Create Users for Tenant A
  const adminA = await prisma.user.create({
    data: {
      org_id: orgA.id,
      name: `Admin A ${uniqueSuffix}`,
      email: `admin_a_${uniqueSuffix}@tenant-a.test`.toLowerCase(),
      password_hash: passwordHash,
      role: 'ORG_ADMIN',
    },
  });

  const managerBLR = await prisma.user.create({
    data: {
      org_id: orgA.id,
      name: `Manager BLR ${uniqueSuffix}`,
      email: `manager_blr_${uniqueSuffix}@tenant-a.test`.toLowerCase(),
      password_hash: passwordHash,
      role: 'LOCATION_MANAGER',
    },
  });

  const managerBOM = await prisma.user.create({
    data: {
      org_id: orgA.id,
      name: `Manager BOM ${uniqueSuffix}`,
      email: `manager_bom_${uniqueSuffix}@tenant-a.test`.toLowerCase(),
      password_hash: passwordHash,
      role: 'LOCATION_MANAGER',
    },
  });

  // 5. Create User for Tenant B
  const adminB = await prisma.user.create({
    data: {
      org_id: orgB.id,
      name: `Admin B ${uniqueSuffix}`,
      email: `admin_b_${uniqueSuffix}@tenant-b.test`.toLowerCase(),
      password_hash: passwordHash,
      role: 'ORG_ADMIN',
    },
  });

  // 6. Assign Location Access:
  // managerBLR assigned to BLR only
  await prisma.userLocationAccess.create({
    data: {
      user_id: managerBLR.id,
      location_id: locBLR.id,
    },
  });

  // managerBOM assigned to BOM only
  await prisma.userLocationAccess.create({
    data: {
      user_id: managerBOM.id,
      location_id: locBOM.id,
    },
  });

  // 7. Notification Preferences for all 4 users
  const alertTypes = ['EXPIRY_WARNING', 'LAPSED_LICENSE', 'CASCADING_RISK'];
  for (const user of [adminA, managerBLR, managerBOM, adminB]) {
    for (const alertType of alertTypes) {
      await prisma.notificationPreference.create({
        data: {
          user_id: user.id,
          alert_type: alertType,
          email_enabled: true,
          in_app_enabled: true,
        },
      });
    }
  }

  // 8. Find or create a LicenseType for Document insertion
  let licenseType = await prisma.licenseType.findFirst();
  if (!licenseType) {
    licenseType = await prisma.licenseType.create({
      data: {
        name: 'Municipal Trade License',
        code: `TRADE_${uniqueSuffix.toUpperCase()}`,
        description: 'Mandatory municipal commercial license',
        issuing_authority: 'Municipal Corporation',
        default_validity_months: 12,
        is_lifetime_valid: false,
      },
    });
  }

  // 9. Insert one Document row in BOM directly via Prisma (fake storage_key, no MinIO)
  const docBOM = await prisma.document.create({
    data: {
      org_id: orgA.id,
      location_id: locBOM.id,
      license_type_id: licenseType.id,
      file_name: `bom_compliance_license_${uniqueSuffix}.pdf`,
      storage_key: `documents/${orgA.id}/bom_compliance_license_${uniqueSuffix}.pdf`,
      file_size: 204800,
      mime_type: 'application/pdf',
      sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      issue_date: new Date('2026-01-01T00:00:00.000Z'),
      expiry_date: new Date('2027-01-01T00:00:00.000Z'),
      status: 'VERIFIED',
      uploaded_by_id: managerBOM.id,
      verified_by_id: adminA.id,
      verified_at: new Date('2026-01-02T00:00:00.000Z'),
    },
  });

  // 10. Log in all 4 users via HTTP API to retrieve tokens
  const loginAdminA = await api('POST', '/api/auth/login', null, {
    email: adminA.email,
    password: defaultPassword,
  });

  const loginManagerBLR = await api('POST', '/api/auth/login', null, {
    email: managerBLR.email,
    password: defaultPassword,
  });

  const loginManagerBOM = await api('POST', '/api/auth/login', null, {
    email: managerBOM.email,
    password: defaultPassword,
  });

  const loginAdminB = await api('POST', '/api/auth/login', null, {
    email: adminB.email,
    password: defaultPassword,
  });

  const tokens = {
    adminA: loginAdminA.data?.data?.token,
    managerBLR: loginManagerBLR.data?.data?.token,
    managerBOM: loginManagerBOM.data?.data?.token,
    adminB: loginAdminB.data?.data?.token,
  };

  const ids = {
    orgA: orgA.id,
    orgB: orgB.id,
    adminA: adminA.id,
    managerBLR: managerBLR.id,
    managerBOM: managerBOM.id,
    adminB: adminB.id,
    locBLR: locBLR.id,
    locBOM: locBOM.id,
    docBOM: docBOM.id,
    licenseType: licenseType.id,
  };

  return {
    tokens,
    ids,
    users: {
      adminA,
      managerBLR,
      managerBOM,
      adminB,
    },
    locations: {
      locBLR,
      locBOM,
    },
    documents: {
      docBOM,
    },
    orgs: {
      orgA,
      orgB,
    },
    loginResponses: {
      adminA: loginAdminA,
      managerBLR: loginManagerBLR,
      managerBOM: loginManagerBOM,
      adminB: loginAdminB,
    },
    prisma,
  };
}

module.exports = {
  seedFindings,
  prisma,
};

// ============================================================================
// Smoke Test
// ============================================================================
describe('Smoke test: seedFindings()', () => {
  let seedData;

  beforeAll(async () => {
    seedData = await seedFindings();
    console.log('\n================== SEED FINDINGS LOGIN STATUS ==================');
    console.log(`adminA      (${seedData.users.adminA.email}): Status ${seedData.loginResponses.adminA.status} (OK: ${seedData.loginResponses.adminA.ok})`);
    console.log(`managerBLR  (${seedData.users.managerBLR.email}): Status ${seedData.loginResponses.managerBLR.status} (OK: ${seedData.loginResponses.managerBLR.ok})`);
    console.log(`managerBOM  (${seedData.users.managerBOM.email}): Status ${seedData.loginResponses.managerBOM.status} (OK: ${seedData.loginResponses.managerBOM.ok})`);
    console.log(`adminB      (${seedData.users.adminB.email}): Status ${seedData.loginResponses.adminB.status} (OK: ${seedData.loginResponses.adminB.ok})`);
    console.log('================================================================\n');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('adminA (Tenant A ORG_ADMIN) logs in successfully with status 200', () => {
    expect(seedData.loginResponses.adminA.status).toBe(200);
    expect(typeof seedData.tokens.adminA).toBe('string');
    expect(seedData.tokens.adminA.length).toBeGreaterThan(10);
  });

  it('managerBLR (Tenant A LOCATION_MANAGER BLR) logs in successfully with status 200', () => {
    expect(seedData.loginResponses.managerBLR.status).toBe(200);
    expect(typeof seedData.tokens.managerBLR).toBe('string');
    expect(seedData.tokens.managerBLR.length).toBeGreaterThan(10);
  });

  it('managerBOM (Tenant A LOCATION_MANAGER BOM) logs in successfully with status 200', () => {
    expect(seedData.loginResponses.managerBOM.status).toBe(200);
    expect(typeof seedData.tokens.managerBOM).toBe('string');
    expect(seedData.tokens.managerBOM.length).toBeGreaterThan(10);
  });

  it('adminB (Tenant B ORG_ADMIN) logs in successfully with status 200', () => {
    expect(seedData.loginResponses.adminB.status).toBe(200);
    expect(typeof seedData.tokens.adminB).toBe('string');
    expect(seedData.tokens.adminB.length).toBeGreaterThan(10);
  });

  it('verifies seeded database entities and IDs for Tenant A and Tenant B', () => {
    expect(seedData.ids.orgA).toBeDefined();
    expect(seedData.ids.orgB).toBeDefined();
    expect(seedData.ids.orgA).not.toBe(seedData.ids.orgB);
    expect(seedData.ids.locBLR).toBeDefined();
    expect(seedData.ids.locBOM).toBeDefined();
    expect(seedData.ids.docBOM).toBeDefined();
    expect(seedData.ids.adminA).toBeDefined();
    expect(seedData.ids.managerBLR).toBeDefined();
    expect(seedData.ids.managerBOM).toBeDefined();
    expect(seedData.ids.adminB).toBeDefined();
  });
});
