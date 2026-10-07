const test = require('node:test');
const assert = require('node:assert/strict');
const { tenantScope, validateTenantResource } = require('../src/middleware/tenantScope');
const { UnauthorizedError, ForbiddenError } = require('../src/utils/errors');

test('Tenant Scope Middleware Suite', async (t) => {
  await t.test('throws UnauthorizedError if req.user is absent or has no org_id', () => {
    const req = {};
    const res = {};
    let errorCaught = null;
    const next = (err) => {
      errorCaught = err;
    };

    tenantScope(req, res, next);
    assert.ok(errorCaught instanceof UnauthorizedError);
  });

  await t.test('attaches req.orgId and overwrites body.org_id with authenticated org_id', () => {
    const req = {
      user: { org_id: 'org-tenant-100' },
      body: { name: 'New Location' },
    };
    const res = {};
    let nextCalled = false;
    const next = (err) => {
      assert.strictEqual(err, undefined);
      nextCalled = true;
    };

    tenantScope(req, res, next);
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.orgId, 'org-tenant-100');
    assert.strictEqual(req.body.org_id, 'org-tenant-100');
  });

  await t.test('throws ForbiddenError if request body attempts cross-tenant manipulation', () => {
    const req = {
      user: { org_id: 'org-tenant-100' },
      body: { org_id: 'org-tenant-evil-999', name: 'Tampered Document' },
    };
    const res = {};
    let errorCaught = null;
    const next = (err) => {
      errorCaught = err;
    };

    tenantScope(req, res, next);
    assert.ok(errorCaught instanceof ForbiddenError);
  });

  await t.test('throws ForbiddenError if request query attempts cross-tenant parameter access', () => {
    const req = {
      user: { org_id: 'org-tenant-100' },
      query: { org_id: 'org-tenant-other-200' },
    };
    const res = {};
    let errorCaught = null;
    const next = (err) => {
      errorCaught = err;
    };

    tenantScope(req, res, next);
    assert.ok(errorCaught instanceof ForbiddenError);
  });

  await t.test('validateTenantResource helper succeeds when IDs match and throws ForbiddenError on mismatch', () => {
    assert.doesNotThrow(() => {
      validateTenantResource('org-abc', 'org-abc');
    });

    assert.throws(
      () => {
        validateTenantResource('org-abc', 'org-xyz');
      },
      ForbiddenError
    );
  });
});
