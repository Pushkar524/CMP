const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('Express App HTTP Routes Suite', async (t) => {
  let server;
  let baseUrl;

  t.before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  t.after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  await t.test('GET /health returns 200 and UP status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'UP');
    assert.strictEqual(data.service, 'SCLIP Core API');
  });

  await t.test('GET /unknown-route returns 404 with structured error', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-endpoint`);
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Endpoint not found'));
  });

  await t.test('POST /api/auth/login without body returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Email and password are required.');
  });
});
