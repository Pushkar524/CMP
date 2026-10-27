const { api, login, createSecondTenant } = require('./helpers');

describe('Compliance Module Tests', () => {
  let orgAdminToken;
  let blrManagerToken;
  let bomManagerToken;
  let blrLocationId;
  let bomLocationId;
  let secondTenant;
  let secondTenantLocationId;

  beforeAll(async () => {
    orgAdminToken = await login('admin@acmeretail.com', 'Password@123');
    blrManagerToken = await login('manager.blr@acmeretail.com', 'Password@123');
    bomManagerToken = await login('manager.bom@acmeretail.com', 'Password@123');

    // Fetch locations for Acme Retail
    const locRes = await api('GET', '/api/tenancy/locations', orgAdminToken);
    const locations = locRes.data?.data || [];
    const blrLoc = locations.find((l) => (l.code || '').includes('BLR') || (l.name || '').includes('BLR'));
    const bomLoc = locations.find((l) => (l.code || '').includes('BOM') || (l.name || '').includes('BOM'));

    blrLocationId = blrLoc ? blrLoc.id : locations[0]?.id;
    bomLocationId = bomLoc ? bomLoc.id : locations[1]?.id;

    // Create second tenant
    secondTenant = await createSecondTenant();
    const secondLocRes = await api('GET', '/api/tenancy/locations', secondTenant.token);
    const secondLocations = secondLocRes.data?.data || [];
    secondTenantLocationId = secondLocations[0]?.id;
  });

  // ============================================================
  // Route 1: GET /api/compliance/organization/overview
  // ============================================================
  describe('GET /api/compliance/organization/overview', () => {
    it('GET /api/compliance/organization/overview :: happy path (correct role, own tenant - ORG_ADMIN)', async () => {
      const res = await api('GET', '/api/compliance/organization/overview', orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data).toHaveProperty('averageScore');
    });

    it('GET /api/compliance/organization/overview :: happy path (correct role, own tenant - LOCATION_MANAGER)', async () => {
      const res = await api('GET', '/api/compliance/organization/overview', blrManagerToken);
      expect([200, 403]).toContain(res.status);
    });

    it('GET /api/compliance/organization/overview :: no token -> 401', async () => {
      const res = await api('GET', '/api/compliance/organization/overview');
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 2: GET /api/compliance/locations/:id
  // ============================================================
  describe('GET /api/compliance/locations/:id', () => {
    it('GET /api/compliance/locations/:id :: happy path (correct role, own tenant)', async () => {
      const res = await api('GET', `/api/compliance/locations/${blrLocationId}`, orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data).toHaveProperty('score');
    });

    it('GET /api/compliance/locations/:id :: no token -> 401', async () => {
      const res = await api('GET', `/api/compliance/locations/${blrLocationId}`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/compliance/locations/:id :: another tenant\'s resource id (use createSecondTenant) -> 403/404, never 200', async () => {
      const res = await api('GET', `/api/compliance/locations/${secondTenantLocationId}`, orgAdminToken);
      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });

    it('GET /api/compliance/locations/:id :: another location in the same org, as LOCATION_MANAGER -> 403', async () => {
      // BLR Manager requesting BOM warehouse score
      const res = await api('GET', `/api/compliance/locations/${bomLocationId}`, blrManagerToken);
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/compliance/locations/:id :: nonexistent id -> 404', async () => {
      const res = await api('GET', '/api/compliance/locations/00000000-0000-0000-0000-000000000000', orgAdminToken);
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 3: POST /api/compliance/locations/:id/recalculate
  // ============================================================
  describe('POST /api/compliance/locations/:id/recalculate', () => {
    it('POST /api/compliance/locations/:id/recalculate :: happy path (correct role, own tenant)', async () => {
      const res = await api('POST', `/api/compliance/locations/${blrLocationId}/recalculate`, orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data).toHaveProperty('score');
    });

    it('POST /api/compliance/locations/:id/recalculate :: no token -> 401', async () => {
      const res = await api('POST', `/api/compliance/locations/${blrLocationId}/recalculate`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/compliance/locations/:id/recalculate :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      // Mutating route: rule requires LOCATION_MANAGER -> 403 test
      const res = await api('POST', `/api/compliance/locations/${blrLocationId}/recalculate`, blrManagerToken);
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/compliance/locations/:id/recalculate :: another tenant\'s resource id (use createSecondTenant) -> 403/404, never 200', async () => {
      const res = await api('POST', `/api/compliance/locations/${secondTenantLocationId}/recalculate`, orgAdminToken);
      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });

    it('POST /api/compliance/locations/:id/recalculate :: another location in the same org, as LOCATION_MANAGER -> 403', async () => {
      const res = await api('POST', `/api/compliance/locations/${bomLocationId}/recalculate`, blrManagerToken);
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/compliance/locations/:id/recalculate :: nonexistent id -> 404', async () => {
      const res = await api('POST', '/api/compliance/locations/00000000-0000-0000-0000-000000000000/recalculate', orgAdminToken);
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 4: GET /api/compliance/locations/:id/history
  // ============================================================
  describe('GET /api/compliance/locations/:id/history', () => {
    it('GET /api/compliance/locations/:id/history :: happy path (correct role, own tenant)', async () => {
      const res = await api('GET', `/api/compliance/locations/${blrLocationId}/history`, orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      const history = res.data?.history || res.data?.data?.history || res.data?.data;
      expect(Array.isArray(history)).toBe(true);
    });

    it('GET /api/compliance/locations/:id/history :: no token -> 401', async () => {
      const res = await api('GET', `/api/compliance/locations/${blrLocationId}/history`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/compliance/locations/:id/history :: another tenant\'s resource id (use createSecondTenant) -> 403/404, never 200', async () => {
      const res = await api('GET', `/api/compliance/locations/${secondTenantLocationId}/history`, orgAdminToken);
      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });

    it('GET /api/compliance/locations/:id/history :: another location in the same org, as LOCATION_MANAGER -> 403', async () => {
      const res = await api('GET', `/api/compliance/locations/${bomLocationId}/history`, blrManagerToken);
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/compliance/locations/:id/history :: nonexistent id -> 404', async () => {
      const res = await api('GET', '/api/compliance/locations/00000000-0000-0000-0000-000000000000/history', orgAdminToken);
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });
});
