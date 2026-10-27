const { api, login, createSecondTenant } = require('./helpers');

describe('Tenancy Module Tests', () => {
  let orgAdminToken;
  let blrManagerToken;
  let blrLocationId;
  let bomLocationId;
  let secondTenant;
  let secondTenantLocationId;

  beforeAll(async () => {
    orgAdminToken = await login('admin@acmeretail.com', 'Password@123');
    blrManagerToken = await login('manager.blr@acmeretail.com', 'Password@123');

    // Retrieve locations for Acme Retail
    const locRes = await api('GET', '/api/tenancy/locations', orgAdminToken);
    const locations = locRes.data?.data || [];
    const blrLoc = locations.find((l) => (l.code || '').includes('BLR') || (l.name || '').includes('BLR'));
    const bomLoc = locations.find((l) => (l.code || '').includes('BOM') || (l.name || '').includes('BOM'));

    blrLocationId = blrLoc ? blrLoc.id : (locations[0] ? locations[0].id : 'loc-blr');
    bomLocationId = bomLoc ? bomLoc.id : (locations[1] ? locations[1].id : 'loc-bom');

    // Create a second tenant for cross-tenant isolation tests
    secondTenant = await createSecondTenant();
    const secondLocRes = await api('GET', '/api/tenancy/locations', secondTenant.token);
    const secondLocations = secondLocRes.data?.data || [];
    secondTenantLocationId = secondLocations[0]?.id;
  });

  // ============================================================
  // Route 1: GET /api/tenancy/organization
  // ============================================================
  describe('GET /api/tenancy/organization', () => {
    it('GET /api/tenancy/organization :: happy path (ORG_ADMIN own tenant)', async () => {
      const res = await api('GET', '/api/tenancy/organization', orgAdminToken);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data).toHaveProperty('id');
      expect(res.data?.data).toHaveProperty('name', 'Acme Retail India Pvt Ltd');
    });

    it('GET /api/tenancy/organization :: happy path (LOCATION_MANAGER own tenant)', async () => {
      const res = await api('GET', '/api/tenancy/organization', blrManagerToken);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data).toHaveProperty('name', 'Acme Retail India Pvt Ltd');
    });

    it('GET /api/tenancy/organization :: no token -> 401', async () => {
      const res = await api('GET', '/api/tenancy/organization');

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 2: GET /api/tenancy/locations
  // ============================================================
  describe('GET /api/tenancy/locations', () => {
    it('GET /api/tenancy/locations :: happy path (ORG_ADMIN sees all org locations)', async () => {
      const res = await api('GET', '/api/tenancy/locations', orgAdminToken);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(Array.isArray(res.data?.data)).toBe(true);
      expect(res.data?.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /api/tenancy/locations :: happy path (LOCATION_MANAGER sees assigned locations)', async () => {
      const res = await api('GET', '/api/tenancy/locations', blrManagerToken);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(Array.isArray(res.data?.data)).toBe(true);
      // Manager should only see their assigned location(s), fewer than admin
      const hasOtherLocation = res.data?.data.some((l) => l.id === bomLocationId);
      expect(hasOtherLocation).toBe(false);
    });

    it('GET /api/tenancy/locations :: no token -> 401', async () => {
      const res = await api('GET', '/api/tenancy/locations');

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 3: POST /api/tenancy/locations
  // ============================================================
  describe('POST /api/tenancy/locations', () => {
    it('POST /api/tenancy/locations :: happy path (correct role, own tenant)', async () => {
      const uniqueSuffix = Date.now().toString(36);
      const res = await api('POST', '/api/tenancy/locations', orgAdminToken, {
        name: `Chennai Supercenter ${uniqueSuffix}`,
        code: `CHN-${uniqueSuffix.toUpperCase()}`,
        type: 'STORE',
        state: 'Tamil Nadu',
        city: 'Chennai',
        address: '100 Anna Salai',
        pincode: '600002',
      });

      expect([200, 201]).toContain(res.status);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data?.location).toHaveProperty('name', `Chennai Supercenter ${uniqueSuffix}`);
    });

    it('POST /api/tenancy/locations :: no token -> 401', async () => {
      const res = await api('POST', '/api/tenancy/locations', null, {
        name: 'Unauthorized Location',
      });

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/tenancy/locations :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      const res = await api('POST', '/api/tenancy/locations', blrManagerToken, {
        name: 'Forbidden Location',
        code: 'FORBIDDEN-01',
      });

      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/tenancy/locations :: invalid or missing body fields -> 400', async () => {
      const res = await api('POST', '/api/tenancy/locations', orgAdminToken, {
        // Missing required 'name' field
        type: 'STORE',
        state: 'Karnataka',
      });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/tenancy/locations :: duplicate create -> 409', async () => {
      // Trying to create a location with managerEmail that already belongs to an existing user
      const res = await api('POST', '/api/tenancy/locations', orgAdminToken, {
        name: 'Duplicate Manager Location',
        code: 'DUP-MGR-01',
        managerEmail: 'admin@acmeretail.com', // Already registered
        managerPassword: 'Password@123',
      });

      expect([400, 409]).toContain(res.status);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 4: PATCH /api/tenancy/locations/:locationId
  // ============================================================
  describe('PATCH /api/tenancy/locations/:locationId', () => {
    it('PATCH /api/tenancy/locations/:locationId :: happy path (correct role, own tenant)', async () => {
      const res = await api('PATCH', `/api/tenancy/locations/${blrLocationId}`, orgAdminToken, {
        phone: '+918023456789',
        city: 'Bengaluru',
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('PATCH /api/tenancy/locations/:locationId :: happy path (LOCATION_MANAGER on assigned location)', async () => {
      const res = await api('PATCH', `/api/tenancy/locations/${blrLocationId}`, blrManagerToken, {
        phone: '+918099887766',
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('PATCH /api/tenancy/locations/:locationId :: no token -> 401', async () => {
      const res = await api('PATCH', `/api/tenancy/locations/${blrLocationId}`, null, {
        phone: '+918000000000',
      });

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('PATCH /api/tenancy/locations/:locationId :: another tenant\'s resource id -> 403/404, never 200', async () => {
      // First tenant admin attempts to patch second tenant's location
      const res = await api('PATCH', `/api/tenancy/locations/${secondTenantLocationId}`, orgAdminToken, {
        name: 'Compromised Location Name',
      });

      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
      expect(res.data).toHaveProperty('success', false);
    });

    it('PATCH /api/tenancy/locations/:locationId :: another location in the same org, as LOCATION_MANAGER -> 403', async () => {
      // BLR Manager attempts to update BOM location
      const res = await api('PATCH', `/api/tenancy/locations/${bomLocationId}`, blrManagerToken, {
        name: 'Hacked Hub Name',
      });

      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('PATCH /api/tenancy/locations/:locationId :: nonexistent id -> 404', async () => {
      const res = await api('PATCH', '/api/tenancy/locations/00000000-0000-0000-0000-000000000000', orgAdminToken, {
        city: 'Nonexistent',
      });

      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 5: GET /api/tenancy/users
  // ============================================================
  describe('GET /api/tenancy/users', () => {
    it('GET /api/tenancy/users :: happy path (correct role, own tenant)', async () => {
      const res = await api('GET', '/api/tenancy/users', orgAdminToken);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(Array.isArray(res.data?.data)).toBe(true);
      expect(res.data?.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/tenancy/users :: no token -> 401', async () => {
      const res = await api('GET', '/api/tenancy/users');

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/tenancy/users :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      const res = await api('GET', '/api/tenancy/users', blrManagerToken);

      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 6: POST /api/tenancy/users
  // ============================================================
  describe('POST /api/tenancy/users', () => {
    it('POST /api/tenancy/users :: happy path (correct role, own tenant)', async () => {
      const uniqueSuffix = Date.now().toString(36);
      const res = await api('POST', '/api/tenancy/users', orgAdminToken, {
        name: `Assistant Manager ${uniqueSuffix}`,
        email: `asst_${uniqueSuffix}@acmeretail.com`,
        password: 'Password@123',
        role: 'LOCATION_MANAGER',
        locationIds: [blrLocationId],
      });

      expect([200, 201]).toContain(res.status);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data).toHaveProperty('email', `asst_${uniqueSuffix}@acmeretail.com`);
    });

    it('POST /api/tenancy/users :: no token -> 401', async () => {
      const res = await api('POST', '/api/tenancy/users', null, {
        name: 'Unauthorized User',
      });

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/tenancy/users :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      const res = await api('POST', '/api/tenancy/users', blrManagerToken, {
        name: 'Disallowed User',
        email: 'disallowed@acmeretail.com',
        password: 'Password@123',
        role: 'LOCATION_MANAGER',
      });

      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/tenancy/users :: invalid or missing body fields -> 400', async () => {
      const res = await api('POST', '/api/tenancy/users', orgAdminToken, {
        name: 'Missing Fields User',
        // Missing email, password, and role
      });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/tenancy/users :: duplicate create -> 409', async () => {
      const res = await api('POST', '/api/tenancy/users', orgAdminToken, {
        name: 'Duplicate Admin',
        email: 'admin@acmeretail.com', // Already registered
        password: 'Password@123',
        role: 'ORG_ADMIN',
      });

      expect([400, 409]).toContain(res.status);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 7: POST /api/tenancy/assign-location
  // ============================================================
  describe('POST /api/tenancy/assign-location', () => {
    let testUserId;

    beforeAll(async () => {
      const userRes = await api('POST', '/api/tenancy/users', orgAdminToken, {
        name: 'Assignment Test User',
        email: `assign_test_${Date.now()}@acmeretail.com`,
        password: 'Password@123',
        role: 'LOCATION_MANAGER',
      });
      testUserId = userRes.data?.data?.id;
    });

    it('POST /api/tenancy/assign-location :: happy path (correct role, own tenant)', async () => {
      const res = await api('POST', '/api/tenancy/assign-location', orgAdminToken, {
        userId: testUserId,
        locationId: bomLocationId,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('POST /api/tenancy/assign-location :: no token -> 401', async () => {
      const res = await api('POST', '/api/tenancy/assign-location', null, {
        userId: testUserId,
        locationId: bomLocationId,
      });

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/tenancy/assign-location :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      const res = await api('POST', '/api/tenancy/assign-location', blrManagerToken, {
        userId: testUserId,
        locationId: bomLocationId,
      });

      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/tenancy/assign-location :: another tenant\'s resource id -> 403/404, never 200', async () => {
      // First tenant admin attempts to assign second tenant's location to own user
      const res = await api('POST', '/api/tenancy/assign-location', orgAdminToken, {
        userId: testUserId,
        locationId: secondTenantLocationId,
      });

      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/tenancy/assign-location :: nonexistent id -> 404', async () => {
      const res = await api('POST', '/api/tenancy/assign-location', orgAdminToken, {
        userId: '00000000-0000-0000-0000-000000000000',
        locationId: bomLocationId,
      });

      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });
});
