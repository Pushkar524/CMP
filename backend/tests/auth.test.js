const { api, login, createSecondTenant } = require('./helpers');

describe('Auth Module Tests', () => {
  let orgAdminToken;
  let locManagerToken;

  beforeAll(async () => {
    orgAdminToken = await login('admin@acmeretail.com', 'Password@123');
    locManagerToken = await login('manager.blr@acmeretail.com', 'Password@123');
  });

  // ============================================================
  // Route: POST /api/auth/register
  // ============================================================
  describe('POST /api/auth/register', () => {
    it('POST /api/auth/register :: happy path (registers new organization and admin)', async () => {
      const uniqueSuffix = Date.now() + Math.random().toString(36).substring(2, 6);
      const res = await api('POST', '/api/auth/register', null, {
        organizationName: `Test Org ${uniqueSuffix}`,
        taxId: `GSTIN-${uniqueSuffix}`,
        adminName: `Admin ${uniqueSuffix}`,
        email: `admin_${uniqueSuffix}@neworg.test`,
        password: 'Password@123',
        industry: 'Retail',
        website: 'https://neworg.test',
        phone: '+919123456789',
        address: '123 Test Street, Bangalore',
        branches: [
          {
            name: `Branch 1 ${uniqueSuffix}`,
            code: `B1-${uniqueSuffix}`,
            type: 'STORE',
            state: 'Karnataka',
            managerName: `Manager ${uniqueSuffix}`,
            managerEmail: `mgr_${uniqueSuffix}@neworg.test`,
            managerPassword: 'Password@123',
          },
        ],
      });

      expect([200, 201]).toContain(res.status);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data).toHaveProperty('organization');
      expect(res.data?.data).toHaveProperty('admin');
    });

    it('POST /api/auth/register :: invalid or missing body fields (missing email and password)', async () => {
      const res = await api('POST', '/api/auth/register', null, {
        organizationName: 'Incomplete Org',
        adminName: 'Incomplete Admin',
      });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/auth/register :: invalid or missing body fields (malformed email)', async () => {
      const res = await api('POST', '/api/auth/register', null, {
        organizationName: 'Invalid Email Org',
        adminName: 'Admin',
        email: 'not-an-email',
        password: 'Password@123',
      });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/auth/register :: invalid or missing body fields (password less than 8 chars)', async () => {
      const res = await api('POST', '/api/auth/register', null, {
        organizationName: 'Short Password Org',
        adminName: 'Admin',
        email: 'valid@email.com',
        password: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/auth/register :: duplicate create (email already exists)', async () => {
      const res = await api('POST', '/api/auth/register', null, {
        organizationName: 'Duplicate Org',
        adminName: 'Admin Acme',
        email: 'admin@acmeretail.com',
        password: 'Password@123',
      });

      // Existing email registration must be rejected with 409 Conflict or 400 Bad Request
      expect([400, 409]).toContain(res.status);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route: POST /api/auth/login
  // ============================================================
  describe('POST /api/auth/login', () => {
    it('POST /api/auth/login :: happy path (ORG_ADMIN login)', async () => {
      const res = await api('POST', '/api/auth/login', null, {
        email: 'admin@acmeretail.com',
        password: 'Password@123',
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data).toHaveProperty('token');
      expect(res.data?.data?.user?.role).toBe('ORG_ADMIN');
    });

    it('POST /api/auth/login :: happy path (LOCATION_MANAGER login)', async () => {
      const res = await api('POST', '/api/auth/login', null, {
        email: 'manager.blr@acmeretail.com',
        password: 'Password@123',
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data).toHaveProperty('token');
      expect(res.data?.data?.user?.role).toBe('LOCATION_MANAGER');
    });

    it('POST /api/auth/login :: invalid or missing body fields (missing email)', async () => {
      const res = await api('POST', '/api/auth/login', null, {
        password: 'Password@123',
      });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/auth/login :: invalid or missing body fields (missing password)', async () => {
      const res = await api('POST', '/api/auth/login', null, {
        email: 'admin@acmeretail.com',
      });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/auth/login :: nonexistent id (nonexistent user email)', async () => {
      const res = await api('POST', '/api/auth/login', null, {
        email: 'nobody_exists_here_12345@acmeretail.com',
        password: 'Password@123',
      });

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/auth/login :: invalid credentials (incorrect password)', async () => {
      const res = await api('POST', '/api/auth/login', null, {
        email: 'admin@acmeretail.com',
        password: 'WrongPassword@999',
      });

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route: GET /api/auth/me
  // ============================================================
  describe('GET /api/auth/me', () => {
    it('GET /api/auth/me :: happy path (ORG_ADMIN token)', async () => {
      const res = await api('GET', '/api/auth/me', orgAdminToken);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data?.email).toBe('admin@acmeretail.com');
      expect(res.data?.data?.role).toBe('ORG_ADMIN');
      expect(res.data?.data).toHaveProperty('organization');
    });

    it('GET /api/auth/me :: happy path (LOCATION_MANAGER token)', async () => {
      const res = await api('GET', '/api/auth/me', locManagerToken);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success', true);
      expect(res.data?.data?.email).toBe('manager.blr@acmeretail.com');
      expect(res.data?.data?.role).toBe('LOCATION_MANAGER');
      expect(res.data?.data).toHaveProperty('locations');
    });

    it('GET /api/auth/me :: no token', async () => {
      const res = await api('GET', '/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('GET /api/auth/me :: invalid or malformed token', async () => {
      const res = await api('GET', '/api/auth/me', 'invalid.jwt.token.string');

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });
  });

  // ============================================================
  // Route: POST /api/auth/change-password
  // ============================================================
  describe('POST /api/auth/change-password', () => {
    it('POST /api/auth/change-password :: no token', async () => {
      const res = await api('POST', '/api/auth/change-password', null, {
        oldPassword: 'Password@123',
        newPassword: 'NewPassword@456',
      });

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/auth/change-password :: invalid or missing body fields (missing oldPassword)', async () => {
      const res = await api('POST', '/api/auth/change-password', orgAdminToken, {
        newPassword: 'NewPassword@456',
      });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/auth/change-password :: invalid or missing body fields (newPassword shorter than 8 chars)', async () => {
      const res = await api('POST', '/api/auth/change-password', orgAdminToken, {
        oldPassword: 'Password@123',
        newPassword: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/auth/change-password :: incorrect current password', async () => {
      const res = await api('POST', '/api/auth/change-password', orgAdminToken, {
        oldPassword: 'CompletelyWrongPassword@999',
        newPassword: 'NewPassword@456',
      });

      expect([400, 401]).toContain(res.status);
      expect(res.data).toHaveProperty('success', false);
    });

    it('POST /api/auth/change-password :: happy path (valid old and new password)', async () => {
      // Create a dedicated user via second tenant so we don't disrupt demo seed credentials
      const secondTenant = await createSecondTenant();
      const userToken = secondTenant.token;

      const changeRes = await api('POST', '/api/auth/change-password', userToken, {
        oldPassword: secondTenant.adminPassword,
        newPassword: 'UpdatedPassword@456',
      });

      expect(changeRes.status).toBe(200);
      expect(changeRes.data).toHaveProperty('success', true);

      // Verify login with new password works
      const loginRes = await api('POST', '/api/auth/login', null, {
        email: secondTenant.adminEmail,
        password: 'UpdatedPassword@456',
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.data?.data).toHaveProperty('token');
    });
  });
});
