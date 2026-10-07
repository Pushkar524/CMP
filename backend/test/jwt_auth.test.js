const test = require('node:test');
const assert = require('node:assert/strict');
const { signToken, verifyToken } = require('../src/utils/jwt');

test('JWT Authentication Suite', async (t) => {
  await t.test('signToken generates valid signed JWT and verifyToken recovers payload', () => {
    const payload = {
      userId: 'user-uuid-12345',
      orgId: 'org-uuid-67890',
      role: 'ORG_ADMIN',
    };

    const token = signToken(payload, '1h');
    assert.strictEqual(typeof token, 'string');
    assert.ok(token.split('.').length === 3, 'JWT should have 3 segments');

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.userId, payload.userId);
    assert.strictEqual(decoded.orgId, payload.orgId);
    assert.strictEqual(decoded.role, payload.role);
    assert.ok(decoded.exp, 'Decoded token should have expiration time');
  });

  await t.test('verifyToken throws error on tampered token string', () => {
    const payload = { userId: 'user-1', orgId: 'org-1', role: 'LOCATION_MANAGER' };
    const validToken = signToken(payload, '1h');
    const tamperedToken = validToken.substring(0, validToken.length - 5) + 'xxxxx';

    assert.throws(
      () => {
        verifyToken(tamperedToken);
      },
      /invalid signature|jwt malformed/i
    );
  });

  await t.test('verifyToken throws error on expired token', async () => {
    const payload = { userId: 'user-exp', orgId: 'org-exp', role: 'ORG_ADMIN' };
    // Issue token with -1s expiration
    const expiredToken = signToken(payload, -1);

    assert.throws(
      () => {
        verifyToken(expiredToken);
      },
      /jwt expired/i
    );
  });
});
