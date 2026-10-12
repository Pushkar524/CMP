const test = require('node:test');
const assert = require('node:assert/strict');
const { authorizeRoles, verifyLocationAccess } = require('../src/middleware/rbac');
const { ForbiddenError } = require('../src/utils/errors');

test('RBAC Middleware Suite', async (t) => {
  await t.test('authorizeRoles allows authorized roles', () => {
    const middleware = authorizeRoles('ORG_ADMIN', 'LOCATION_MANAGER');
    const req = { user: { role: 'ORG_ADMIN' } };
    const res = {};
    let nextCalled = false;

    middleware(req, res, (err) => {
      assert.strictEqual(err, undefined);
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  await t.test('authorizeRoles rejects unauthorized roles with ForbiddenError', () => {
    const middleware = authorizeRoles('ORG_ADMIN');
    const req = { user: { role: 'LOCATION_MANAGER' } };
    const res = {};
    let errorCaught = null;

    middleware(req, res, (err) => {
      errorCaught = err;
    });

    assert.ok(errorCaught instanceof ForbiddenError);
  });

  await t.test('verifyLocationAccess automatically permits ORG_ADMIN across all locations', () => {
    const middleware = verifyLocationAccess('locationId', 'params');
    const req = {
      user: { role: 'ORG_ADMIN', accessibleLocationIds: [] },
      params: { locationId: 'any-location-uuid' },
    };
    const res = {};
    let nextCalled = false;

    middleware(req, res, (err) => {
      assert.strictEqual(err, undefined);
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  await t.test('verifyLocationAccess permits LOCATION_MANAGER for assigned location', () => {
    const middleware = verifyLocationAccess('locationId', 'params');
    const req = {
      user: {
        role: 'LOCATION_MANAGER',
        accessibleLocationIds: ['loc-blr-01', 'loc-blr-02'],
      },
      params: { locationId: 'loc-blr-01' },
    };
    const res = {};
    let nextCalled = false;

    middleware(req, res, (err) => {
      assert.strictEqual(err, undefined);
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  await t.test('verifyLocationAccess denies LOCATION_MANAGER for unassigned location', () => {
    const middleware = verifyLocationAccess('locationId', 'params');
    const req = {
      user: {
        role: 'LOCATION_MANAGER',
        accessibleLocationIds: ['loc-blr-01'],
      },
      params: { locationId: 'loc-bom-unauthorized' },
    };
    const res = {};
    let errorCaught = null;

    middleware(req, res, (err) => {
      errorCaught = err;
    });

    assert.ok(errorCaught instanceof ForbiddenError);
  });
});
