const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const app = require('../src/app');
const prisma = require('../src/config/db');

test('End-to-End System Features & Use Cases Suite', async (t) => {
  let server;
  let baseUrl;
  let adminToken;
  let adminUser;
  let demoLocation;
  let demoLicenseType;
  let uploadedDocId;
  let auditToken;
  let auditLinkId;

  t.before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    demoLicenseType = await prisma.licenseType.findFirst();
  });

  t.after(async () => {
    if (uploadedDocId) {
      try {
        await prisma.document.delete({ where: { id: uploadedDocId } });
      } catch (_) {}
    }
    if (auditLinkId) {
      try {
        await prisma.auditLink.delete({ where: { id: auditLinkId } });
      } catch (_) {}
    }
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  // 1. Authentication & Session Flow
  await t.test('POST /api/auth/login authenticates seeded ORG_ADMIN', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@acmeretail.com',
        password: 'Password@123',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data?.token, 'Token must be present in response data');
    assert.strictEqual(body.data.user.role, 'ORG_ADMIN');
    assert.ok(body.data.organization?.id, 'User must belong to an organization');

    adminToken = body.data.token;
    adminUser = {
      ...body.data.user,
      org_id: body.data.organization.id,
    };

    // Grab a location scoped to the authenticated admin's organization
    demoLocation = await prisma.location.findFirst({
      where: { org_id: adminUser.org_id },
    });
    assert.ok(demoLocation, 'Organization must have at least one seeded location');
  });

  await t.test('GET /api/auth/me returns authenticated profile with valid token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.email, 'admin@acmeretail.com');
  });

  // 2. Tenancy & Organization Scoping
  await t.test('GET /api/tenancy/organization retrieves tenant organization details', async () => {
    const res = await fetch(`${baseUrl}/api/tenancy/organization`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.id, adminUser.org_id);
    assert.ok(body.data.name.length > 0);
  });

  await t.test('GET /api/tenancy/locations lists all managed locations for admin', async () => {
    const res = await fetch(`${baseUrl}/api/tenancy/locations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
  });

  // 3. Compliance Scoring & Intelligence Graphs
  await t.test('GET /api/compliance/organization/overview returns aggregate score and locations', async () => {
    const res = await fetch(`${baseUrl}/api/compliance/organization/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(typeof body.data.averageScore === 'number');
    assert.ok(Array.isArray(body.data.locations));
  });

  await t.test('GET /api/compliance/locations/:id calculates detailed compliance breakdown', async () => {
    assert.ok(demoLocation, 'Demo location must exist');
    const res = await fetch(`${baseUrl}/api/compliance/locations/${demoLocation.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data);
    assert.ok(typeof body.data.score === 'number');
    assert.ok(body.data.breakdown);
    assert.ok(body.data.breakdown.summary);
  });

  await t.test('GET /api/intelligence/locations/:id/graph returns cascading dependency tree', async () => {
    const res = await fetch(`${baseUrl}/api/intelligence/locations/${demoLocation.id}/graph`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data?.nodes));
    assert.ok(Array.isArray(body.data?.edges));
    assert.ok(Array.isArray(body.data?.activeRiskChains));
    assert.ok(body.data?.summary);
  });

  // 4. Document Upload Use Case (Multipart Form, SHA-256 Hashing, S3 Storage)
  await t.test('POST /api/documents uploads document with SHA-256 hash and S3 persistence', async () => {
    assert.ok(demoLocation && demoLicenseType, 'Location and License Type must be seeded');

    const fileContent = '--- COMPLIANCE CERTIFICATE TEST PAYLOAD ' + Date.now() + ' ---';
    const expectedHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    const blob = new Blob([fileContent], { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', blob, 'trade_license_test.txt');
    formData.append('license_type_id', demoLicenseType.id);
    formData.append('location_id', demoLocation.id);
    formData.append('issue_date', '2026-01-01');
    formData.append('expiry_date', '2027-01-01');

    const res = await fetch(`${baseUrl}/api/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formData,
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.document);
    assert.strictEqual(body.document.file_name, 'trade_license_test.txt');
    assert.strictEqual(body.document.sha256_hash, expectedHash);
    assert.strictEqual(body.document.status, 'PENDING_VERIFICATION');
    assert.ok(body.document.storage_key);

    uploadedDocId = body.document.id;
  });

  await t.test('GET /api/documents lists documents and includes newly uploaded file', async () => {
    const res = await fetch(`${baseUrl}/api/documents`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    const found = body.documents.find((d) => d.id === uploadedDocId);
    assert.ok(found, 'Uploaded document should be visible in document list');
  });

  await t.test('GET /api/documents/:id/download returns presigned S3 download URL', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${uploadedDocId}/download`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.url, 'Must return presigned url');
    assert.ok(body.url.startsWith('http'), 'Download URL should be valid HTTP(S) URL');
  });

  await t.test('GET /api/documents/:id/file streams exact uploaded file content inline', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${uploadedDocId}/file`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('COMPLIANCE CERTIFICATE TEST PAYLOAD'));
  });

  // 5. Document Verification Flow (Approve / Reject)
  await t.test('PATCH /api/documents/:id/verify approves document status to VERIFIED', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${uploadedDocId}/verify`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ approve: true }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.document.status, 'VERIFIED');
    assert.strictEqual(body.document.verified_by_id, adminUser.id);
  });

  await t.test('PATCH /api/documents/:id/verify rejects document with rejection reason', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${uploadedDocId}/verify`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        approve: false,
        reason: 'Expired seal on certificate page 2',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.document.status, 'REJECTED');
    assert.strictEqual(body.document.rejection_reason, 'Expired seal on certificate page 2');
  });

  // 6. Audit Data Room & Secure Share Link
  await t.test('POST /api/audit-links creates PIN-protected secure audit room', async () => {
    const res = await fetch(`${baseUrl}/api/audit-links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Annual Fire & Safety Audit 2026',
        document_ids: [uploadedDocId],
        expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        pin: '9876',
        notes: 'Audit package for external inspector',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.audit_link);
    assert.ok(body.audit_link.token);
    assert.strictEqual(body.audit_link.title, 'Annual Fire & Safety Audit 2026');

    auditToken = body.audit_link.token;
    auditLinkId = body.audit_link.id;
  });

  await t.test('GET /api/audit-links/by-token/:token requires correct PIN if protected', async () => {
    // 1. Without PIN or wrong PIN should fail (403 Forbidden)
    const badRes = await fetch(`${baseUrl}/api/audit-links/by-token/${auditToken}?pin=0000`);
    assert.strictEqual(badRes.status, 403);
    const badBody = await badRes.json();
    assert.strictEqual(badBody.success, false);

    // 2. With correct PIN should return data room documents
    const goodRes = await fetch(`${baseUrl}/api/audit-links/by-token/${auditToken}?pin=9876`);
    assert.strictEqual(goodRes.status, 200);
    const goodBody = await goodRes.json();
    assert.strictEqual(goodBody.success, true);
    assert.strictEqual(goodBody.data.title, 'Annual Fire & Safety Audit 2026');
    assert.ok(Array.isArray(goodBody.data.documents));
    assert.strictEqual(goodBody.data.documents.length, 1);
  });

  await t.test('POST /api/audit-links/access/:token records audit room access log', async () => {
    const res = await fetch(`${baseUrl}/api/audit-links/access/${auditToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewer_identifier: 'Inspector Sharma (Chief Fire Inspectorate)',
        pin: '9876',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  // 7. Notifications Subsystem
  await t.test('POST /api/notifications/test triggers in-app notification', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/test`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Document Verified Alert',
        message: 'Your Municipal Trade License was verified by administrator.',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data);
  });

  await t.test('GET /api/notifications retrieves notification list and unread count', async () => {
    const countRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(countRes.status, 200);
    const countBody = await countRes.json();
    assert.strictEqual(countBody.success, true);
    assert.ok(typeof countBody.data.unreadCount === 'number');

    const listRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(listRes.status, 200);
    const listBody = await listRes.json();
    assert.strictEqual(listBody.success, true);
    assert.ok(Array.isArray(listBody.data.notifications));
  });

  await t.test('PATCH /api/notifications/read-all marks all notifications as read', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  await t.test('GET and PUT /api/notifications/preferences manage user preferences', async () => {
    // 1. Get initial preferences
    const getRes = await fetch(`${baseUrl}/api/notifications/preferences`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(getRes.status, 200);
    const getBody = await getRes.json();
    assert.strictEqual(getBody.success, true);
    assert.ok(getBody.data);

    // 2. Update preferences
    const putRes = await fetch(`${baseUrl}/api/notifications/preferences`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_enabled: true,
        sms_enabled: true,
        in_app_enabled: true,
        expiry_warning: true,
        lapsed_license: true,
        cascading_risk: true,
      }),
    });
    assert.strictEqual(putRes.status, 200);
    const putBody = await putRes.json();
    assert.strictEqual(putBody.success, true);
    assert.strictEqual(putBody.data.sms_enabled, true);
  });

  await t.test('POST /api/notifications/sweep runs automated compliance expiry sweep', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/sweep`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(typeof body.data.documentsEvaluated === 'number');
  });

  // 8. Cleanup & Deletion Flow
  await t.test('DELETE /api/documents/:id deletes document and removes S3 file', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${uploadedDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    const checkDb = await prisma.document.findUnique({ where: { id: uploadedDocId } });
    assert.strictEqual(checkDb, null);

    uploadedDocId = null;
  });
});
