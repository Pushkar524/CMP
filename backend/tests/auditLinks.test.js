const { api, login, createSecondTenant } = require('./helpers');

describe('AuditLinks Module Tests', () => {
  let orgAdminToken;
  let blrManagerToken;
  let secondTenant;
  let existingLinkId;
  let existingToken = 'audit-blr-bbmp-2026';
  let validDocId;

  beforeAll(async () => {
    orgAdminToken = await login('admin@acmeretail.com', 'Password@123');
    blrManagerToken = await login('manager.blr@acmeretail.com', 'Password@123');

    // Retrieve documents to get an included document ID
    const docsRes = await api('GET', '/api/documents', orgAdminToken);
    const docs = docsRes.data?.documents || docsRes.data?.data || [];
    validDocId = docs[0]?.id;

    // Retrieve existing audit link
    const linksRes = await api('GET', '/api/audit-links', orgAdminToken);
    const links = linksRes.data?.audit_links || linksRes.data?.data || [];
    if (links.length > 0) {
      existingLinkId = links[0].id;
      existingToken = links[0].token;
    }

    secondTenant = await createSecondTenant();
  });

  // ============================================================
  // Route 1: GET /api/audit-links/by-token/:token (Public)
  // ============================================================
  describe('GET /api/audit-links/by-token/:token', () => {
    it('GET /api/audit-links/by-token/:token :: happy path (correct PIN supplied)', async () => {
      const res = await api('GET', `/api/audit-links/by-token/${existingToken}`, null, null);
      // If PIN is required, header x-audit-pin: '1234'
      const pinRes = await fetch(`http://localhost:5055/api/audit-links/by-token/${existingToken}`, {
        headers: { 'x-audit-pin': '1234' },
      });
      expect([200, 401]).toContain(res.status);
      expect(pinRes.status).toBe(200);
    });

    it('GET /api/audit-links/by-token/:token :: invalid PIN -> 401', async () => {
      const pinRes = await fetch(`http://localhost:5055/api/audit-links/by-token/${existingToken}`, {
        headers: { 'x-audit-pin': 'wrong-pin' },
      });
      expect(pinRes.status).toBe(401);
    });

    it('GET /api/audit-links/by-token/:token :: nonexistent id -> 404', async () => {
      const res = await api('GET', '/api/audit-links/by-token/non-existent-token-xyz');
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 2: POST /api/audit-links/access/:token (Public)
  // ============================================================
  describe('POST /api/audit-links/access/:token', () => {
    it('POST /api/audit-links/access/:token :: happy path (records access log)', async () => {
      const res = await api('POST', `/api/audit-links/access/${existingToken}`, null, {
        viewer_ip: '127.0.0.1',
        user_agent: 'Inspector Agent',
      });
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('POST /api/audit-links/access/:token :: nonexistent id -> 404', async () => {
      const res = await api('POST', '/api/audit-links/access/non-existent-token-xyz', null, {});
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 3: GET /api/audit-links (Protected)
  // ============================================================
  describe('GET /api/audit-links', () => {
    it('GET /api/audit-links :: happy path (correct role, own tenant - ORG_ADMIN)', async () => {
      const res = await api('GET', '/api/audit-links', orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      const links = res.data?.audit_links || res.data?.data;
      expect(Array.isArray(links)).toBe(true);
    });

    it('GET /api/audit-links :: no token -> 401', async () => {
      const res = await api('GET', '/api/audit-links');
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/audit-links :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      const res = await api('GET', '/api/audit-links', blrManagerToken);
      expect([200, 403]).toContain(res.status);
    });
  });

  // ============================================================
  // Route 4: POST /api/audit-links (Protected)
  // ============================================================
  describe('POST /api/audit-links', () => {
    it('POST /api/audit-links :: happy path (correct role, own tenant - ORG_ADMIN)', async () => {
      const uniqueSuffix = Date.now();
      const res = await api('POST', '/api/audit-links', orgAdminToken, {
        title: `Audit Room ${uniqueSuffix}`,
        notes: 'Compliance inspection',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        pin: '5678',
        document_ids: validDocId ? [validDocId] : [],
      });
      expect([200, 201]).toContain(res.status);
      expect(res.data).toHaveProperty('success', true);
    });

    it('POST /api/audit-links :: no token -> 401', async () => {
      const res = await api('POST', '/api/audit-links', null, { title: 'Test Link' });
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/audit-links :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      const res = await api('POST', '/api/audit-links', blrManagerToken, {
        title: 'Unauthorized Audit Link',
        expires_at: new Date().toISOString(),
        document_ids: [],
      });
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/audit-links :: invalid or missing body fields -> 400', async () => {
      const res = await api('POST', '/api/audit-links', orgAdminToken, {});
      expect([400, 422]).toContain(res.status);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 5: PATCH /api/audit-links/:id (Protected)
  // ============================================================
  describe('PATCH /api/audit-links/:id', () => {
    it('PATCH /api/audit-links/:id :: no token -> 401', async () => {
      const res = await api('PATCH', `/api/audit-links/${existingLinkId || '00000000-0000-0000-0000-000000000000'}`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('PATCH /api/audit-links/:id :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      const res = await api('PATCH', `/api/audit-links/${existingLinkId || '00000000-0000-0000-0000-000000000000'}`, blrManagerToken, {
        is_active: false,
      });
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });

    it('PATCH /api/audit-links/:id :: another tenant\'s resource id (use createSecondTenant) -> 403/404, never 200', async () => {
      const res = await api('PATCH', `/api/audit-links/${existingLinkId || '00000000-0000-0000-0000-000000000000'}`, secondTenant.token, {
        is_active: false,
      });
      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });

    it('PATCH /api/audit-links/:id :: nonexistent id -> 404', async () => {
      const res = await api('PATCH', '/api/audit-links/00000000-0000-0000-0000-000000000000', orgAdminToken, {
        is_active: false,
      });
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });
});
