import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  auth,
  tenancy,
  compliance,
  intelligence,
  documents,
  notifications,
  auditLinks,
  api,
} from '../src/services/api';

describe('Frontend API Contract & Integration Tests', () => {
  let originalFetch;
  let mockFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    localStorage.clear();
    localStorage.setItem('sclip_auth_token', 'mock-test-jwt-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ============================================================
  // Module: Auth
  // ============================================================
  describe('auth endpoints', () => {
    it('auth.login :: asserts POST /api/auth/login with credentials', async () => {
      // Backend: backend/src/modules/auth/auth.routes.js:12: router.post('/login', authLimiter, validate(loginSchema), ...)
      // Frontend: frontend/src/services/api.js:90: fetchAPI('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { token: 'jwt-token-123', user: { id: 'u-1', email: 'admin@acme.com' } } }),
      });

      const res = await auth.login('admin@acme.com', 'Password@123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/auth/login');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({
        email: 'admin@acme.com',
        password: 'Password@123',
      });
      expect(localStorage.getItem('sclip_auth_token')).toBe('jwt-token-123');
      expect(localStorage.getItem('sclip_user_id')).toBe('u-1');
    });

    it('auth.register :: asserts POST /api/auth/register with payload', async () => {
      // Backend: backend/src/modules/auth/auth.routes.js:15: router.post('/register', authLimiter, validate(registerSchema), ...)
      // Frontend: frontend/src/services/api.js:105: fetchAPI('/api/auth/register', { method: 'POST', body: JSON.stringify(...) })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { organization: { id: 'org-1' }, user: { id: 'u-1' } } }),
      });

      const payload = {
        organizationName: 'Acme Logistics',
        taxId: 'GSTIN123',
        adminName: 'Admin Acme',
        email: 'admin@acme.com',
        password: 'Password@123',
        industry: 'Logistics',
        website: 'https://acme.com',
        phone: '+919988776655',
        address: '123 Acme Way',
        branches: [{ name: 'Branch 1', managerName: 'Mgr', managerEmail: 'm@acme.com', managerPassword: 'Password@123' }],
      };

      await auth.register(payload);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/auth/register');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual(payload);
    });

    it('auth.getCurrentUser :: asserts GET /api/auth/me with Bearer token', async () => {
      // Backend: backend/src/modules/auth/auth.routes.js:20: router.get('/me', authenticateJWT, tenantScope, ...)
      // Frontend: frontend/src/services/api.js:124: fetchAPI('/api/auth/me')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { user: { id: 'u-1', email: 'admin@acme.com' } } }),
      });

      const res = await auth.getCurrentUser();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/auth/me');
      expect(options.headers.Authorization).toBe('Bearer mock-test-jwt-token');
      expect(res.data.user.email).toBe('admin@acme.com');
    });

    it('auth.logout :: clears localStorage credentials', () => {
      // Frontend: frontend/src/services/api.js:133: logout: () => { localStorage.removeItem(...) }
      localStorage.setItem('sclip_auth_token', 'test-token');
      localStorage.setItem('sclip_user_id', 'test-uid');

      auth.logout();

      expect(localStorage.getItem('sclip_auth_token')).toBeNull();
      expect(localStorage.getItem('sclip_user_id')).toBeNull();
    });
  });

  // ============================================================
  // Module: Tenancy
  // ============================================================
  describe('tenancy endpoints', () => {
    it('tenancy.getLocations :: asserts GET /api/tenancy/locations', async () => {
      // Backend: backend/src/modules/tenancy/tenancy.routes.js:18: router.get('/locations', ...)
      // Frontend: frontend/src/services/api.js:145: fetchAPI('/api/tenancy/locations')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 'loc-1', name: 'Bangalore Store' }] }),
      });

      const locations = await tenancy.getLocations();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/tenancy/locations');
      expect(locations).toEqual([{ id: 'loc-1', name: 'Bangalore Store' }]);
    });

    it('tenancy.getOrganization :: asserts GET /api/tenancy/organization', async () => {
      // Backend: backend/src/modules/tenancy/tenancy.routes.js:13: router.get('/organization', ...)
      // Frontend: frontend/src/services/api.js:150: fetchAPI('/api/tenancy/organization')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'org-1', name: 'Acme Retail' } }),
      });

      const org = await tenancy.getOrganization();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/tenancy/organization');
      expect(org).toEqual({ id: 'org-1', name: 'Acme Retail' });
    });

    it('tenancy.createLocation :: asserts POST /api/tenancy/locations with body', async () => {
      // Backend: backend/src/modules/tenancy/tenancy.routes.js:23: router.post('/locations', authorizeRoles('ORG_ADMIN'), ...)
      // Frontend: frontend/src/services/api.js:156: fetchAPI('/api/tenancy/locations', { method: 'POST', body: ... })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { location: { id: 'loc-2', name: 'Mumbai Hub' } } }),
      });

      const payload = { name: 'Mumbai Hub', code: 'BOM-01', type: 'WAREHOUSE' };
      await tenancy.createLocation(payload);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/tenancy/locations');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual(payload);
    });

    it('tenancy.updateLocation :: asserts PATCH /api/tenancy/locations/:id with body', async () => {
      // Backend: backend/src/modules/tenancy/tenancy.routes.js:27: router.patch('/locations/:locationId', ...)
      // Frontend: frontend/src/services/api.js:162: fetchAPI(`/api/tenancy/locations/${locationId}`, { method: 'PATCH', body: ... })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'loc-1', city: 'Bengaluru' } }),
      });

      const updatePayload = { city: 'Bengaluru', phone: '+919988001122' };
      await tenancy.updateLocation('loc-1', updatePayload);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/tenancy/locations/loc-1');
      expect(options.method).toBe('PATCH');
      expect(JSON.parse(options.body)).toEqual(updatePayload);
    });

    it('tenancy.getUsers :: asserts GET /api/tenancy/users', async () => {
      // Backend: backend/src/modules/tenancy/tenancy.routes.js:32: router.get('/users', authorizeRoles('ORG_ADMIN'), ...)
      // Frontend: frontend/src/services/api.js:169: fetchAPI('/api/tenancy/users')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 'u-1', email: 'admin@acme.com' }] }),
      });

      const users = await tenancy.getUsers();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/tenancy/users');
      expect(users).toEqual([{ id: 'u-1', email: 'admin@acme.com' }]);
    });

    it('tenancy.createUser :: asserts POST /api/tenancy/users with body', async () => {
      // Backend: backend/src/modules/tenancy/tenancy.routes.js:36: router.post('/users', authorizeRoles('ORG_ADMIN'), ...)
      // Frontend: frontend/src/services/api.js:174: fetchAPI('/api/tenancy/users', { method: 'POST', body: ... })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'u-2', email: 'mgr@acme.com' } }),
      });

      const userPayload = { name: 'Manager Bob', email: 'mgr@acme.com', password: 'Password@123', role: 'LOCATION_MANAGER' };
      await tenancy.createUser(userPayload);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/tenancy/users');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual(userPayload);
    });

    it('tenancy.assignLocationAccess :: asserts POST /api/tenancy/assign-location with body', async () => {
      // Backend: backend/src/modules/tenancy/tenancy.routes.js:40: router.post('/assign-location', authorizeRoles('ORG_ADMIN'), ...)
      // Frontend: frontend/src/services/api.js:181: fetchAPI('/api/tenancy/assign-location', { method: 'POST', body: ... })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Location access assigned successfully.' }),
      });

      await tenancy.assignLocationAccess('u-2', 'loc-1');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/tenancy/assign-location');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ userId: 'u-2', locationId: 'loc-1' });
    });
  });

  // ============================================================
  // Module: Compliance
  // ============================================================
  describe('compliance endpoints', () => {
    it('compliance.calculateLocationScore :: asserts GET /api/compliance/locations/:id', async () => {
      // Backend: backend/src/modules/compliance/complianceScore.routes.js:13: router.get('/locations/:locationId', ...)
      // Frontend: frontend/src/services/api.js:194: fetchAPI(`/api/compliance/locations/${locationId}`)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { location_id: 'loc-1', score: 85.5 } }),
      });

      const res = await compliance.calculateLocationScore('loc-1');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/compliance/locations/loc-1');
      expect(res).toEqual({ location_id: 'loc-1', score: 85.5 });
    });

    it('compliance.recalculateLocationScore :: asserts POST /api/compliance/locations/:id/recalculate', async () => {
      // Backend: backend/src/modules/compliance/complianceScore.routes.js:16: router.post('/locations/:locationId/recalculate', ...)
      // Frontend: frontend/src/services/api.js:199: fetchAPI(`/api/compliance/locations/${locationId}/recalculate`, { method: 'POST' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { score: 90.0 } }),
      });

      await compliance.recalculateLocationScore('loc-1');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/compliance/locations/loc-1/recalculate');
      expect(options.method).toBe('POST');
    });

    it('compliance.getLocationHistory :: asserts GET /api/compliance/locations/:id/history', async () => {
      // Backend: backend/src/modules/compliance/complianceScore.routes.js:19: router.get('/locations/:locationId/history', ...)
      // Frontend: frontend/src/services/api.js:207: fetchAPI(`/api/compliance/locations/${locationId}/history${params}`)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ score: 80, recorded_at: '2026-01-01' }] }),
      });

      const history = await compliance.getLocationHistory('loc-1', 10);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/compliance/locations/loc-1/history?limit=10');
      expect(history).toEqual([{ score: 80, recorded_at: '2026-01-01' }]);
    });

    it('compliance.getOrganizationOverview :: asserts GET /api/compliance/organization/overview', async () => {
      // Backend: backend/src/modules/compliance/complianceScore.routes.js:10: router.get('/organization/overview', ...)
      // Frontend: frontend/src/services/api.js:212: fetchAPI('/api/compliance/organization/overview')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { avgScore: 82.5, totalLocations: 3 } }),
      });

      const overview = await compliance.getOrganizationOverview();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/compliance/organization/overview');
      expect(overview).toEqual({ avgScore: 82.5, totalLocations: 3 });
    });
  });

  // ============================================================
  // Module: Intelligence
  // ============================================================
  describe('intelligence endpoints', () => {
    it('intelligence.getLicenseTypes :: asserts GET /api/intelligence/license-types', async () => {
      // Backend: backend/src/modules/intelligence/intelligence.routes.js:11: router.get('/license-types', ...)
      // Frontend: frontend/src/services/api.js:223: fetchAPI('/api/intelligence/license-types')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 'lt-1', name: 'Trade License' }] }),
      });

      const types = await intelligence.getLicenseTypes();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/intelligence/license-types');
      expect(types).toEqual([{ id: 'lt-1', name: 'Trade License' }]);
    });

    it('intelligence.getDependencies :: asserts GET /api/intelligence/dependencies', async () => {
      // Backend: backend/src/modules/intelligence/intelligence.routes.js:14: router.get('/dependencies', ...)
      // Frontend: frontend/src/services/api.js:228: fetchAPI('/api/intelligence/dependencies')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ parent_license_id: 'lt-1', child_license_id: 'lt-2' }] }),
      });

      const deps = await intelligence.getDependencies();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/intelligence/dependencies');
      expect(deps).toEqual([{ parent_license_id: 'lt-1', child_license_id: 'lt-2' }]);
    });

    it('intelligence.getRequiredRules :: asserts GET /api/intelligence/rules with query params', async () => {
      // Backend: backend/src/modules/intelligence/intelligence.routes.js:17: router.get('/rules', ...)
      // Frontend: frontend/src/services/api.js:236: fetchAPI(`/api/intelligence/rules${params}`)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ location_type: 'STORE', state: 'Karnataka' }] }),
      });

      const rules = await intelligence.getRequiredRules('STORE', 'Karnataka');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/intelligence/rules?locationType=STORE&state=Karnataka');
      expect(rules).toEqual([{ location_type: 'STORE', state: 'Karnataka' }]);
    });

    it('intelligence.getGlobalGraph :: asserts GET /api/intelligence/graph', async () => {
      // Backend: backend/src/modules/intelligence/intelligence.routes.js:20: router.get('/graph', ...)
      // Frontend: frontend/src/services/api.js:241: fetchAPI('/api/intelligence/graph')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { nodes: [], edges: [] } }),
      });

      const graph = await intelligence.getGlobalGraph();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/intelligence/graph');
      expect(graph).toEqual({ nodes: [], edges: [] });
    });

    it('intelligence.getLocationAiAudit :: asserts GET /api/intelligence/locations/:id/ai-audit', async () => {
      // Backend: backend/src/modules/intelligence/intelligence.routes.js:26: router.get('/locations/:locationId/ai-audit', ...)
      // Frontend: frontend/src/services/api.js:250: fetchAPI(`/api/intelligence/locations/${locationId}/ai-audit`)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { riskSummary: 'Low Risk', recommendations: [] } }),
      });

      const audit = await intelligence.getLocationAiAudit('loc-1');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/intelligence/locations/loc-1/ai-audit');
      expect(audit).toEqual({ riskSummary: 'Low Risk', recommendations: [] });
    });
  });

  // ============================================================
  // Module: Documents
  // ============================================================
  describe('documents endpoints', () => {
    it('documents.getDocuments :: asserts GET /api/documents', async () => {
      // Backend: backend/src/modules/documents/document.routes.js:13: router.get('/', ...)
      // Frontend: frontend/src/services/api.js:261: fetchAPI('/api/documents')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, documents: [{ id: 'doc-1', file_name: 'license.pdf' }] }),
      });

      const res = await documents.getDocuments();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/documents');
      expect(res.documents).toEqual([{ id: 'doc-1', file_name: 'license.pdf' }]);
    });

    it('documents.verifyDocument :: asserts PATCH /api/documents/:id/verify with approve and reason', async () => {
      // Backend: backend/src/modules/documents/document.routes.js:24: router.patch('/:id/verify', authorizeRoles('ORG_ADMIN'), ...)
      // Frontend: frontend/src/services/api.js:314: fetchAPI(`/api/documents/${docId}/verify`, { method: 'PATCH', body: JSON.stringify({ approve, reason }) })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Document verified.' }),
      });

      await documents.verifyDocument('doc-1', true, 'Meets all criteria');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/documents/doc-1/verify');
      expect(options.method).toBe('PATCH');
      expect(JSON.parse(options.body)).toEqual({ approve: true, reason: 'Meets all criteria' });
    });

    it('documents.deleteDocument :: asserts DELETE /api/documents/:id', async () => {
      // Backend: backend/src/modules/documents/document.routes.js:37: router.delete('/:id', authorizeRoles('ORG_ADMIN'), ...)
      // Frontend: frontend/src/services/api.js:331: fetchAPI(`/api/documents/${docId}`, { method: 'DELETE' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Document deleted successfully.' }),
      });

      await documents.deleteDocument('doc-1');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/documents/doc-1');
      expect(options.method).toBe('DELETE');
    });

    it('documents.getDocumentDownloadUrl :: asserts GET /api/documents/:id/download', async () => {
      // Backend: backend/src/modules/documents/document.routes.js:31: router.get('/:id/download', ...)
      // Frontend: frontend/src/services/api.js:344: fetchAPI(`/api/documents/${docId}/download`)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, url: 'https://minio.test/bucket/doc-1.pdf' }),
      });

      const downloadUrl = await documents.getDocumentDownloadUrl('doc-1');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/documents/doc-1/download');
      expect(downloadUrl).toBe('https://minio.test/bucket/doc-1.pdf');
    });
  });

  // ============================================================
  // Module: Notifications
  // ============================================================
  describe('notifications endpoints', () => {
    it('notifications.getNotifications :: asserts GET /api/notifications with pagination', async () => {
      // Backend: backend/src/modules/notifications/notification.routes.js:12: router.get('/', ...)
      // Frontend: frontend/src/services/api.js:358: fetchAPI(`/api/notifications?${params}`)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { notifications: [{ id: 'notif-1', title: 'Expiry alert' }] } }),
      });

      const res = await notifications.getNotifications({ page: 2, limit: 10 });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/notifications?page=2&limit=10');
      expect(res.notifications).toEqual([{ id: 'notif-1', title: 'Expiry alert' }]);
    });

    it('notifications.getUnreadCount :: asserts GET /api/notifications/unread-count', async () => {
      // Backend: backend/src/modules/notifications/notification.routes.js:15: router.get('/unread-count', ...)
      // Frontend: frontend/src/services/api.js:363: fetchAPI('/api/notifications/unread-count')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { unreadCount: 5 } }),
      });

      const res = await notifications.getUnreadCount();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/notifications/unread-count');
      expect(res.data.unreadCount).toBe(5);
    });

    it('notifications.markAsRead :: asserts PATCH /api/notifications/:id/read', async () => {
      // Backend: backend/src/modules/notifications/notification.routes.js:18: router.patch('/:id/read', ...)
      // Frontend: frontend/src/services/api.js:367: fetchAPI(`/api/notifications/${notificationId}/read`, { method: 'PATCH' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Notification marked as read.' }),
      });

      await notifications.markAsRead('notif-1');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/notifications/notif-1/read');
      expect(options.method).toBe('PATCH');
    });

    it('notifications.markAllAsRead :: asserts PATCH /api/notifications/read-all', async () => {
      // Backend: backend/src/modules/notifications/notification.routes.js:21: router.patch('/read-all', ...)
      // Frontend: frontend/src/services/api.js:373: fetchAPI('/api/notifications/read-all', { method: 'PATCH' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'All notifications marked as read.' }),
      });

      await notifications.markAllAsRead();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/notifications/read-all');
      expect(options.method).toBe('PATCH');
    });

    it('notifications.deleteNotification :: asserts DELETE /api/notifications/:id', async () => {
      // Backend: backend/src/modules/notifications/notification.routes.js:24: router.delete('/:id', ...)
      // Frontend: frontend/src/services/api.js:379: fetchAPI(`/api/notifications/${notificationId}`, { method: 'DELETE' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Notification deleted.' }),
      });

      await notifications.deleteNotification('notif-1');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/notifications/notif-1');
      expect(options.method).toBe('DELETE');
    });

    it('notifications.getPreferences :: asserts GET /api/notifications/preferences', async () => {
      // Backend: backend/src/modules/notifications/notification.routes.js:27: router.get('/preferences', ...)
      // Frontend: frontend/src/services/api.js:393: fetchAPI('/api/notifications/preferences')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { email_enabled: true, in_app_enabled: true } }),
      });

      const prefs = await notifications.getPreferences();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/notifications/preferences');
      expect(prefs).toEqual({ email_enabled: true, in_app_enabled: true });
    });

    it('notifications.updatePreferences :: asserts PUT /api/notifications/preferences with body', async () => {
      // Backend: backend/src/modules/notifications/notification.routes.js:30: router.put('/preferences', ...)
      // Frontend: frontend/src/services/api.js:405: fetchAPI('/api/notifications/preferences', { method: 'PUT', body: ... })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { email_enabled: false } }),
      });

      await notifications.updatePreferences({ email_enabled: false });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/notifications/preferences');
      expect(options.method).toBe('PUT');
      expect(JSON.parse(options.body)).toEqual({ email_enabled: false });
    });

    it('notifications.runSweep :: asserts POST /api/notifications/sweep', async () => {
      // Backend: backend/src/modules/notifications/notification.routes.js:33: router.post('/sweep', ...)
      // Frontend: frontend/src/services/api.js:413: fetchAPI('/api/notifications/sweep', { method: 'POST' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Notification sweep completed.' }),
      });

      await notifications.runSweep();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/notifications/sweep');
      expect(options.method).toBe('POST');
    });
  });

  // ============================================================
  // Module: Audit Links
  // ============================================================
  describe('auditLinks endpoints', () => {
    it('auditLinks.getAuditLinks :: asserts GET /api/audit-links', async () => {
      // Backend: backend/src/modules/auditLinks/auditLink.routes.js:12: router.get('/', ...)
      // Frontend: frontend/src/services/api.js:425: fetchAPI('/api/audit-links')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, audit_links: [{ id: 'link-1', title: 'Q1 Audit' }] }),
      });

      const res = await auditLinks.getAuditLinks();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('/api/audit-links');
      expect(res.audit_links).toEqual([{ id: 'link-1', title: 'Q1 Audit' }]);
    });

    it('auditLinks.createAuditLink :: asserts POST /api/audit-links with payload', async () => {
      // Backend: backend/src/modules/auditLinks/auditLink.routes.js:15: router.post('/', ...)
      // Frontend: frontend/src/services/api.js:430: fetchAPI('/api/audit-links', { method: 'POST', body: ... })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, audit_link: { id: 'link-2', token: 'tok-abc' } }),
      });

      const linkPayload = {
        title: 'Safety Audit',
        notes: 'Inspection bundle',
        expires_at: '2026-12-31T23:59:59.000Z',
        document_ids: ['doc-1', 'doc-2'],
        pin: '1234',
      };
      await auditLinks.createAuditLink(linkPayload);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/audit-links');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual(linkPayload);
    });

    it('auditLinks.revokeAuditLink :: asserts PATCH /api/audit-links/:id with { is_active: false }', async () => {
      // Backend: backend/src/modules/auditLinks/auditLink.routes.js:18: router.patch('/:id', ...)
      // Frontend: frontend/src/services/api.js:436: fetchAPI(`/api/audit-links/${linkId}`, { method: 'PATCH', body: JSON.stringify({ is_active: false }) })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Audit link revoked.' }),
      });

      await auditLinks.revokeAuditLink('link-1');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/audit-links/link-1');
      expect(options.method).toBe('PATCH');
      expect(JSON.parse(options.body)).toEqual({ is_active: false });
    });

    it('auditLinks.getAuditByToken :: asserts GET /api/audit-links/by-token/:token with x-audit-pin header', async () => {
      // Backend: backend/src/modules/auditLinks/auditLink.routes.js:21: router.get('/by-token/:token', ...)
      // Frontend: frontend/src/services/api.js:444: fetchAPI(`/api/audit-links/by-token/${token}`, { headers })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { title: 'Q1 Audit', documents: [] } }),
      });

      await auditLinks.getAuditByToken('audit-tok-xyz', '9988');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/audit-links/by-token/audit-tok-xyz');
      expect(options.headers['x-audit-pin']).toBe('9988');
    });

    it('auditLinks.recordAuditAccess :: asserts POST /api/audit-links/access/:token', async () => {
      // Backend: backend/src/modules/auditLinks/auditLink.routes.js:24: router.post('/access/:token', ...)
      // Frontend: frontend/src/services/api.js:448: fetchAPI(`/api/audit-links/access/${token}`, { method: 'POST', body: ... })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await auditLinks.recordAuditAccess('audit-tok-xyz', { success: true });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/audit-links/access/audit-tok-xyz');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ success: true });
    });
  });

  // ============================================================
  // CONTRACT BUG CHECKS on api Wrapper Object (Return Shapes)
  // ============================================================
  describe('api wrapper return shape contract checks', () => {
    it('api.getUsers :: returns array of users from backend { success: true, data: [...] }', async () => {
      // Backend: backend/src/modules/tenancy/tenancy.controller.js:72: res.status(200).json({ success: true, data: result })
      // result is an array of users: [{ id: 'u-1', email: 'admin@acme.com' }]
      // Frontend: frontend/src/services/api.js:485: return data.users || []
      // FINDING: tenancy.getUsers() returns array `data` directly. `data.users` evaluates to undefined!
      // This test asserts the correct behaviour: returning the list of users from the server.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 'u-1', name: 'Admin Acme', email: 'admin@acme.com', role: 'ORG_ADMIN' },
            { id: 'u-2', name: 'BLR Manager', email: 'mgr@acme.com', role: 'LOCATION_MANAGER' },
          ],
        }),
      });

      const users = await api.getUsers();

      // Assert the expected contract: api.getUsers() must return the array of 2 users
      expect(Array.isArray(users)).toBe(true);
      expect(users).toHaveLength(2);
      expect(users[0].email).toBe('admin@acme.com');
    });

    it('api.getDocuments :: returns array of documents from backend { success: true, documents: [...] }', async () => {
      // Backend: backend/src/modules/documents/document.controller.js:49: res.status(200).json({ success: true, documents: result })
      // Frontend: frontend/src/services/api.js:531: return data.documents || []
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          documents: [
            { id: 'doc-1', file_name: 'FSSAI.pdf', status: 'VERIFIED' },
            { id: 'doc-2', file_name: 'Trade.pdf', status: 'PENDING' },
          ],
        }),
      });

      const docs = await api.getDocuments();

      expect(Array.isArray(docs)).toBe(true);
      expect(docs).toHaveLength(2);
      expect(docs[0].file_name).toBe('FSSAI.pdf');
    });

    it('api.getAuditLinks :: returns array of audit links from backend { success: true, audit_links: [...] }', async () => {
      // Backend: backend/src/modules/auditLinks/auditLink.controller.js:7: res.status(200).json({ success: true, audit_links: links })
      // Frontend: frontend/src/services/api.js:575: return data.audit_links || []
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          audit_links: [
            { id: 'link-1', title: 'Q1 External Review', token: 'token-abc' },
          ],
        }),
      });

      const links = await api.getAuditLinks();

      expect(Array.isArray(links)).toBe(true);
      expect(links).toHaveLength(1);
      expect(links[0].title).toBe('Q1 External Review');
    });

    it('api.getNotifications :: returns array of notifications from backend { success: true, data: { notifications: [...] } }', async () => {
      // Backend: backend/src/modules/notifications/notification.controller.js:12: res.status(200).json({ success: true, data: { notifications, pagination } })
      // Frontend: frontend/src/services/api.js:595: return data.notifications || []
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            notifications: [
              { id: 'n-1', title: 'License Expiry Warning', type: 'EXPIRY_WARNING' },
            ],
            pagination: { page: 1, limit: 20, total: 1 },
          },
        }),
      });

      const notifs = await api.getNotifications();

      expect(Array.isArray(notifs)).toBe(true);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].title).toBe('License Expiry Warning');
    });
  });
});
