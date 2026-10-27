const { api, login, createSecondTenant } = require('./helpers');

describe('Intelligence Module Tests', () => {
  let orgAdminToken;
  let blrManagerToken;
  let bomManagerToken;
  let blrLocationId;
  let bomLocationId;
  let existingLicenseTypeId;
  let existingDependencyId;
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

    // Fetch license types
    const ltRes = await api('GET', '/api/intelligence/license-types', orgAdminToken);
    const licenseTypes = ltRes.data?.data || ltRes.data || [];
    existingLicenseTypeId = licenseTypes[0]?.id;

    // Fetch dependencies
    const depRes = await api('GET', '/api/intelligence/dependencies', orgAdminToken);
    const dependencies = depRes.data?.data || depRes.data || [];
    existingDependencyId = dependencies[0]?.id;

    secondTenant = await createSecondTenant();
    const secondLocRes = await api('GET', '/api/tenancy/locations', secondTenant.token);
    secondTenantLocationId = secondLocRes.data?.data?.[0]?.id;
  });

  // ============================================================
  // Route 1: GET /api/intelligence/graph
  // ============================================================
  describe('GET /api/intelligence/graph', () => {
    it('GET /api/intelligence/graph :: happy path (correct role, own tenant)', async () => {
      const res = await api('GET', '/api/intelligence/graph', orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('GET /api/intelligence/graph :: no token -> 401', async () => {
      const res = await api('GET', '/api/intelligence/graph');
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 2: GET /api/intelligence/license-types
  // ============================================================
  describe('GET /api/intelligence/license-types', () => {
    it('GET /api/intelligence/license-types :: happy path (correct role, own tenant)', async () => {
      const res = await api('GET', '/api/intelligence/license-types', orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      const list = res.data?.data || res.data;
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });

    it('GET /api/intelligence/license-types :: no token -> 401', async () => {
      const res = await api('GET', '/api/intelligence/license-types');
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 3: GET /api/intelligence/license-types/:id
  // ============================================================
  describe('GET /api/intelligence/license-types/:id', () => {
    it('GET /api/intelligence/license-types/:id :: happy path (correct role, own tenant)', async () => {
      const res = await api('GET', `/api/intelligence/license-types/${existingLicenseTypeId}`, orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('GET /api/intelligence/license-types/:id :: no token -> 401', async () => {
      const res = await api('GET', `/api/intelligence/license-types/${existingLicenseTypeId}`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/intelligence/license-types/:id :: nonexistent id -> 404', async () => {
      const res = await api('GET', '/api/intelligence/license-types/00000000-0000-0000-0000-000000000000', orgAdminToken);
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 4: GET /api/intelligence/dependencies
  // ============================================================
  describe('GET /api/intelligence/dependencies', () => {
    it('GET /api/intelligence/dependencies :: happy path (correct role, own tenant)', async () => {
      const res = await api('GET', '/api/intelligence/dependencies', orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      const list = res.data?.data || res.data;
      expect(Array.isArray(list)).toBe(true);
    });

    it('GET /api/intelligence/dependencies :: no token -> 401', async () => {
      const res = await api('GET', '/api/intelligence/dependencies');
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 5: GET /api/intelligence/rules
  // ============================================================
  describe('GET /api/intelligence/rules', () => {
    it('GET /api/intelligence/rules :: happy path (correct role, own tenant)', async () => {
      const res = await api('GET', '/api/intelligence/rules?location_type=STORE&state=Karnataka', orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('GET /api/intelligence/rules :: no token -> 401', async () => {
      const res = await api('GET', '/api/intelligence/rules');
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 6: GET /api/intelligence/locations/:id/graph
  // ============================================================
  describe('GET /api/intelligence/locations/:id/graph', () => {
    it('GET /api/intelligence/locations/:id/graph :: happy path (correct role, own tenant)', async () => {
      const res = await api('GET', `/api/intelligence/locations/${blrLocationId}/graph`, orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('GET /api/intelligence/locations/:id/graph :: no token -> 401', async () => {
      const res = await api('GET', `/api/intelligence/locations/${blrLocationId}/graph`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/intelligence/locations/:id/graph :: another location in the same org, as LOCATION_MANAGER -> 403', async () => {
      const res = await api('GET', `/api/intelligence/locations/${bomLocationId}/graph`, blrManagerToken);
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/intelligence/locations/:id/graph :: another tenant\'s resource id (use createSecondTenant) -> 403/404, never 200', async () => {
      const res = await api('GET', `/api/intelligence/locations/${secondTenantLocationId}/graph`, orgAdminToken);
      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });
  });

  // ============================================================
  // Route 7: GET /api/intelligence/locations/:id/ai-audit
  // ============================================================
  describe('GET /api/intelligence/locations/:id/ai-audit', () => {
    it('GET /api/intelligence/locations/:id/ai-audit :: no token -> 401', async () => {
      const res = await api('GET', `/api/intelligence/locations/${blrLocationId}/ai-audit`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/intelligence/locations/:id/ai-audit :: another location in the same org, as LOCATION_MANAGER -> 403', async () => {
      const res = await api('GET', `/api/intelligence/locations/${bomLocationId}/ai-audit`, blrManagerToken);
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/intelligence/locations/:id/ai-audit :: another tenant\'s resource id (use createSecondTenant) -> 403/404, never 200', async () => {
      const res = await api('GET', `/api/intelligence/locations/${secondTenantLocationId}/ai-audit`, orgAdminToken);
      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });
  });

  // ============================================================
  // Route 8: POST /api/intelligence/license-types
  // ============================================================
  describe('POST /api/intelligence/license-types', () => {
    it('POST /api/intelligence/license-types :: happy path (correct role, own tenant - ORG_ADMIN)', async () => {
      const uniqueSuffix = Date.now();
      const res = await api('POST', '/api/intelligence/license-types', orgAdminToken, {
        name: `Special Permit ${uniqueSuffix}`,
        code: `SP_${uniqueSuffix}`,
        description: 'Statutory test permit',
        issuing_authority: 'Municipal Dept',
        default_validity_months: 12,
      });
      expect([200, 201]).toContain(res.status);
      expect(res.data).toHaveProperty('success', true);
    });

    it('POST /api/intelligence/license-types :: no token -> 401', async () => {
      const res = await api('POST', '/api/intelligence/license-types', null, { name: 'Permit' });
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/intelligence/license-types :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      const res = await api('POST', '/api/intelligence/license-types', blrManagerToken, {
        name: 'Manager License Type',
        code: 'MGR_LT',
      });
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/intelligence/license-types :: invalid or missing body fields -> 400', async () => {
      const res = await api('POST', '/api/intelligence/license-types', orgAdminToken, {});
      expect([400, 422]).toContain(res.status);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 9: POST /api/intelligence/dependencies
  // ============================================================
  describe('POST /api/intelligence/dependencies', () => {
    it('POST /api/intelligence/dependencies :: no token -> 401', async () => {
      const res = await api('POST', '/api/intelligence/dependencies', null, {});
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/intelligence/dependencies :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      const res = await api('POST', '/api/intelligence/dependencies', blrManagerToken, {
        license_type_id: existingLicenseTypeId,
      });
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/intelligence/dependencies :: invalid or missing body fields -> 400', async () => {
      const res = await api('POST', '/api/intelligence/dependencies', orgAdminToken, {});
      expect([400, 422]).toContain(res.status);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 10: DELETE /api/intelligence/dependencies/:id
  // ============================================================
  describe('DELETE /api/intelligence/dependencies/:id', () => {
    it('DELETE /api/intelligence/dependencies/:id :: no token -> 401', async () => {
      const res = await api('DELETE', `/api/intelligence/dependencies/${existingDependencyId || '00000000-0000-0000-0000-000000000000'}`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('DELETE /api/intelligence/dependencies/:id :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      const res = await api('DELETE', `/api/intelligence/dependencies/${existingDependencyId || '00000000-0000-0000-0000-000000000000'}`, blrManagerToken);
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('DELETE /api/intelligence/dependencies/:id :: nonexistent id -> 404', async () => {
      const res = await api('DELETE', '/api/intelligence/dependencies/00000000-0000-0000-0000-000000000000', orgAdminToken);
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });
});
