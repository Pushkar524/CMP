const { api, login, createSecondTenant } = require('./helpers');

describe('Notifications Module Tests', () => {
  let orgAdminToken;
  let blrManagerToken;
  let secondTenant;
  let existingNotificationId;

  beforeAll(async () => {
    orgAdminToken = await login('admin@acmeretail.com', 'Password@123');
    blrManagerToken = await login('manager.blr@acmeretail.com', 'Password@123');

    // Create a test alert to have an existing notification
    await api('POST', '/api/notifications/test', orgAdminToken, {
      title: 'Initial Seed Alert',
      message: 'Initial alert for testing',
    });

    const notifRes = await api('GET', '/api/notifications', orgAdminToken);
    const notifications = notifRes.data?.data?.notifications || notifRes.data?.notifications || notifRes.data?.data || [];
    existingNotificationId = notifications[0]?.id;

    secondTenant = await createSecondTenant();
  });

  // ============================================================
  // Route 1: GET /api/notifications
  // ============================================================
  describe('GET /api/notifications', () => {
    it('GET /api/notifications :: happy path (correct role, own tenant - ORG_ADMIN)', async () => {
      const res = await api('GET', '/api/notifications', orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('GET /api/notifications :: happy path (correct role, own tenant - LOCATION_MANAGER)', async () => {
      const res = await api('GET', '/api/notifications', blrManagerToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('GET /api/notifications :: no token -> 401', async () => {
      const res = await api('GET', '/api/notifications');
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 2: GET /api/notifications/unread-count
  // ============================================================
  describe('GET /api/notifications/unread-count', () => {
    it('GET /api/notifications/unread-count :: happy path (correct role, own tenant)', async () => {
      const res = await api('GET', '/api/notifications/unread-count', orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data).toHaveProperty('unreadCount');
    });

    it('GET /api/notifications/unread-count :: no token -> 401', async () => {
      const res = await api('GET', '/api/notifications/unread-count');
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 3: PATCH /api/notifications/read-all
  // ============================================================
  describe('PATCH /api/notifications/read-all', () => {
    it('PATCH /api/notifications/read-all :: happy path (correct role, own tenant)', async () => {
      const res = await api('PATCH', '/api/notifications/read-all', orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('PATCH /api/notifications/read-all :: no token -> 401', async () => {
      const res = await api('PATCH', '/api/notifications/read-all');
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 4: PATCH /api/notifications/:id/read
  // ============================================================
  describe('PATCH /api/notifications/:id/read', () => {
    it('PATCH /api/notifications/:id/read :: no token -> 401', async () => {
      const res = await api('PATCH', `/api/notifications/${existingNotificationId || '00000000-0000-0000-0000-000000000000'}/read`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('PATCH /api/notifications/:id/read :: another tenant\'s resource id (use createSecondTenant) -> 403/404, never 200', async () => {
      const res = await api('PATCH', `/api/notifications/${existingNotificationId || '00000000-0000-0000-0000-000000000000'}/read`, secondTenant.token);
      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });

    it('PATCH /api/notifications/:id/read :: nonexistent id -> 404', async () => {
      const res = await api('PATCH', '/api/notifications/00000000-0000-0000-0000-000000000000/read', orgAdminToken);
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 5: DELETE /api/notifications/:id
  // ============================================================
  describe('DELETE /api/notifications/:id', () => {
    it('DELETE /api/notifications/:id :: no token -> 401', async () => {
      const res = await api('DELETE', `/api/notifications/${existingNotificationId || '00000000-0000-0000-0000-000000000000'}`);
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('DELETE /api/notifications/:id :: another tenant\'s resource id (use createSecondTenant) -> 403/404, never 200', async () => {
      const res = await api('DELETE', `/api/notifications/${existingNotificationId || '00000000-0000-0000-0000-000000000000'}`, secondTenant.token);
      expect([403, 404]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });

    it('DELETE /api/notifications/:id :: nonexistent id -> 404', async () => {
      const res = await api('DELETE', '/api/notifications/00000000-0000-0000-0000-000000000000', orgAdminToken);
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 6: POST /api/notifications/test
  // ============================================================
  describe('POST /api/notifications/test', () => {
    it('POST /api/notifications/test :: happy path (correct role, own tenant)', async () => {
      const res = await api('POST', '/api/notifications/test', orgAdminToken, {
        title: 'Ad-hoc Alert',
        message: 'This is a test notification',
      });
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('POST /api/notifications/test :: no token -> 401', async () => {
      const res = await api('POST', '/api/notifications/test', null, {
        title: 'Unauthorized Test',
      });
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 7: GET /api/notifications/preferences
  // ============================================================
  describe('GET /api/notifications/preferences', () => {
    it('GET /api/notifications/preferences :: happy path (correct role, own tenant)', async () => {
      const res = await api('GET', '/api/notifications/preferences', orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('GET /api/notifications/preferences :: no token -> 401', async () => {
      const res = await api('GET', '/api/notifications/preferences');
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 8: PUT /api/notifications/preferences
  // ============================================================
  describe('PUT /api/notifications/preferences', () => {
    it('PUT /api/notifications/preferences :: happy path (correct role, own tenant)', async () => {
      const res = await api('PUT', '/api/notifications/preferences', orgAdminToken, {
        preferences: [
          {
            alert_type: 'EXPIRY_WARNING',
            email_enabled: true,
            in_app_enabled: true,
          },
        ],
      });
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('PUT /api/notifications/preferences :: no token -> 401', async () => {
      const res = await api('PUT', '/api/notifications/preferences', null, {});
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route 9: POST /api/notifications/sweep
  // ============================================================
  describe('POST /api/notifications/sweep', () => {
    it('POST /api/notifications/sweep :: happy path (correct role, own tenant - ORG_ADMIN)', async () => {
      const res = await api('POST', '/api/notifications/sweep', orgAdminToken);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
    });

    it('POST /api/notifications/sweep :: no token -> 401', async () => {
      const res = await api('POST', '/api/notifications/sweep');
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/notifications/sweep :: LOCATION_MANAGER on an ORG_ADMIN route -> 403', async () => {
      // Mutating route: rule requires LOCATION_MANAGER -> 403 test
      const res = await api('POST', '/api/notifications/sweep', blrManagerToken);
      expect(res.status).toBe(403);
      expect(res.data).toHaveProperty('success', false);
    });
  });
});
