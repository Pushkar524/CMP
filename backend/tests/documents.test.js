const { api, login, createSecondTenant } = require('./helpers');

describe('Documents Module Tests', () => {
  let orgAdminToken;
  let blrManagerToken;
  let bomManagerToken;
  let secondTenant;
  let blrDocId;
  let secondTenantDocId;

  beforeAll(async () => {
    orgAdminToken = await login('admin@acmeretail.com', 'Password@123');
    blrManagerToken = await login('manager.blr@acmeretail.com', 'Password@123');
    bomManagerToken = await login('manager.bom@acmeretail.com', 'Password@123');

    // Retrieve documents for Acme Retail
    const docsRes = await api('GET', '/api/documents', orgAdminToken);
    const docs = docsRes.data?.documents || docsRes.data?.data || [];
    const blrDoc = docs.find((d) => d.file_name && d.file_name.includes('bbmp_trade'));
    blrDocId = blrDoc ? blrDoc.id : (docs[0]?.id || 'doc-blr-trade');

    // Create second tenant
    secondTenant = await createSecondTenant();
  });

  // ============================================================
  // Route 1: GET /api/documents
  // ============================================================
  describe('GET /api/documents', () => {
    it('GET /api/documents :: happy path (correct role, own tenant - ORG_ADMIN)', async () => {
      const res = await api('GET', '/api/documents', orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      const list = res.data?.documents || res.data?.data;
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });

    it('GET /api/documents :: happy path (correct role, own tenant - LOCATION_MANAGER)', async () => {
      const res = await api('GET', '/api/documents', blrManagerToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      const list = res.data?.documents || res.data?.data;
      expect(Array.isArray(list)).toBe(true);
    });

    it('GET /api/documents :: no token -> 401', async () => {
      const res = await api('GET', '/api/documents');
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 2: POST /api/documents (Upload)
  // ============================================================
  describe('POST /api/documents', () => {
    it('POST /api/documents :: no token -> 401', async () => {
      const res = await api('POST', '/api/documents', null, { title: 'Test Doc' });
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/documents :: another location in the same org, as LOCATION_MANAGER -> 403', async () => {
      // BLR Manager trying to upload for BOM location
      const locRes = await api('GET', '/api/tenancy/locations', orgAdminToken);
      const locations = locRes.data?.data || [];
      const bomLoc = locations.find((l) => (l.code || '').includes('BOM') || (l.name || '').includes('BOM'));
      const bomLocId = bomLoc ? bomLoc.id : 'loc-bom';

      const res = await api('POST', '/api/documents', blrManagerToken, {
        location_id: bomLocId,
        title: 'Unauthorized Document',
      });
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/documents :: invalid or missing body fields -> 400', async () => {
      const res = await api('POST', '/api/documents', orgAdminToken, {});
      expect([400, 422]).toContain(res.status);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 3: PATCH /api/documents/:id/verify
  // ============================================================
  describe('PATCH /api/documents/:id/verify', () => {
    it('PATCH /api/documents/:id/verify :: happy path (correct role, own tenant)', async () => {
      const res = await api('PATCH', `/api/documents/${blrDocId}/verify`, orgAdminToken, {
        approved: true,
        reason: 'Verified statutory compliance',
      });
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('PATCH /api/documents/:id/verify :: no token -> 401', async () => {
      const res = await api('PATCH', `/api/documents/${blrDocId}/verify`, null, {
        approved: true,
      });
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('PATCH /api/documents/:id/verify :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      const res = await api('PATCH', `/api/documents/${blrDocId}/verify`, blrManagerToken, {
        approved: true,
      });
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('PATCH /api/documents/:id/verify :: another tenant\'s resource id (use createSecondTenant) -> 403/404, never 200', async () => {
      const res = await api('PATCH', `/api/documents/${blrDocId}/verify`, secondTenant.token, {
        approved: true,
      });
      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });

    it('PATCH /api/documents/:id/verify :: nonexistent id -> 404', async () => {
      const res = await api('PATCH', '/api/documents/00000000-0000-0000-0000-000000000000/verify', orgAdminToken, {
        approved: true,
      });
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 4: GET /api/documents/:id/download
  // ============================================================
  describe('GET /api/documents/:id/download', () => {
    it('GET /api/documents/:id/download :: happy path (correct role, own tenant)', async () => {
      const res = await api('GET', `/api/documents/${blrDocId}/download`, orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data).toHaveProperty('url');
    });

    it('GET /api/documents/:id/download :: no token -> 401', async () => {
      const res = await api('GET', `/api/documents/${blrDocId}/download`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/documents/:id/download :: another tenant\'s resource id (use createSecondTenant) -> 403/404, never 200', async () => {
      const res = await api('GET', `/api/documents/${blrDocId}/download`, secondTenant.token);
      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });

    it('GET /api/documents/:id/download :: another location in the same org, as LOCATION_MANAGER -> 403', async () => {
      // BOM manager attempting to access BLR store document
      const res = await api('GET', `/api/documents/${blrDocId}/download`, bomManagerToken);
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/documents/:id/download :: nonexistent id -> 404', async () => {
      const res = await api('GET', '/api/documents/00000000-0000-0000-0000-000000000000/download', orgAdminToken);
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 5: GET /api/documents/:id/file
  // ============================================================
  describe('GET /api/documents/:id/file', () => {
    it('GET /api/documents/:id/file :: no token -> 401', async () => {
      const res = await api('GET', `/api/documents/${blrDocId}/file`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/documents/:id/file :: another tenant\'s resource id (use createSecondTenant) -> 403/404, never 200', async () => {
      const res = await api('GET', `/api/documents/${blrDocId}/file`, secondTenant.token);
      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });

    it('GET /api/documents/:id/file :: another location in the same org, as LOCATION_MANAGER -> 403', async () => {
      const res = await api('GET', `/api/documents/${blrDocId}/file`, bomManagerToken);
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/documents/:id/file :: nonexistent id -> 404', async () => {
      const res = await api('GET', '/api/documents/00000000-0000-0000-0000-000000000000/file', orgAdminToken);
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 6: DELETE /api/documents/:id
  // ============================================================
  describe('DELETE /api/documents/:id', () => {
    it('DELETE /api/documents/:id :: no token -> 401', async () => {
      const res = await api('DELETE', `/api/documents/${blrDocId}`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('DELETE /api/documents/:id :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      const res = await api('DELETE', `/api/documents/${blrDocId}`, blrManagerToken);
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('DELETE /api/documents/:id :: another tenant\'s resource id (use createSecondTenant) -> 403/404, never 200', async () => {
      const res = await api('DELETE', `/api/documents/${blrDocId}`, secondTenant.token);
      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });

    it('DELETE /api/documents/:id :: nonexistent id -> 404', async () => {
      const res = await api('DELETE', '/api/documents/00000000-0000-0000-0000-000000000000', orgAdminToken);
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });
});
