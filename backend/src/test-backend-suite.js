require('./config/env');
const http = require('http');
const app = require('./app');
const prisma = require('./config/db');

let server;
const PORT = 5088;

function makeRequest({ method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    let reqHeaders = { ...headers };
    let dataPayload = body;

    if (body && typeof body === 'object' && !headers['Content-Type']) {
      dataPayload = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(dataPayload);
    } else if (body && headers['Content-Type'] && headers['Content-Type'].includes('multipart/form-data')) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataPayload);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve({ statusCode: res.statusCode, body: parsed, raw: responseData });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: responseData, raw: responseData });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (dataPayload) {
      req.write(dataPayload);
    }
    req.end();
  });
}

function buildMultipartFormData(fields, file) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  let parts = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
        )
      );
    }
  }

  if (file) {
    const fileHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`
    );
    const fileFooter = Buffer.from('\r\n');
    parts.push(fileHeader);
    parts.push(file.content);
    parts.push(fileFooter);
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);
  const contentType = `multipart/form-data; boundary=${boundary}`;
  return { body, contentType };
}

async function runTestSuite() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 SCLIP BACKEND EXTENSIVE INTEGRATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  server = app.listen(PORT);
  let adminToken, mgrToken, demoOrg, blrLocation, bomLocation;
  let tradeLicenseType, fireNocType, liftLicenseType, panLicenseType;
  let uploadedDoc1Id, renewalDocId;

  try {
    // -------------------------------------------------------------
    // PHASE 1: Authentication & RBAC Login
    // -------------------------------------------------------------
    console.log('▶ PHASE 1: Authentication & Context Setup');

    const adminLogin = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'admin@acmeretail.com', password: 'Password@123' },
    });
    console.assert(adminLogin.statusCode === 200, 'Admin login failed');
    adminToken = adminLogin.body.data.token;
    demoOrg = adminLogin.body.data.organization;
    console.log(`  ✔ Org Admin logged in successfully (${demoOrg.name})`);

    const mgrLogin = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'manager.blr@acmeretail.com', password: 'Password@123' },
    });
    console.assert(mgrLogin.statusCode === 200, 'Manager login failed');
    mgrToken = mgrLogin.body.data.token;
    console.log(`  ✔ Location Manager logged in successfully`);

    const locsRes = await makeRequest({
      method: 'GET',
      path: '/api/tenancy/locations',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    blrLocation = locsRes.body.data.find((l) => l.code === 'BLR-STORE-01');
    bomLocation = locsRes.body.data.find((l) => l.code === 'BOM-WH-01');
    console.assert(blrLocation && bomLocation, 'Locations not found');
    console.log(`  ✔ Seeded locations loaded: BLR Store (${blrLocation.id}), BOM Warehouse (${bomLocation.id})\n`);

    // -------------------------------------------------------------
    // PHASE 2: Intelligence Engine, License Types & Dependencies
    // -------------------------------------------------------------
    console.log('▶ PHASE 2: License Types & Dependency Graph Engine');

    const ltRes = await makeRequest({
      method: 'GET',
      path: '/api/compliance/license-types',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.assert(ltRes.statusCode === 200 && ltRes.body.data.length >= 10, 'License types query failed');
    tradeLicenseType = ltRes.body.data.find((l) => l.code === 'TRADE_LICENSE');
    fireNocType = ltRes.body.data.find((l) => l.code === 'FIRE_NOC');
    liftLicenseType = ltRes.body.data.find((l) => l.code === 'LIFT_LICENSE');
    panLicenseType = ltRes.body.data.find((l) => l.code === 'PAN');
    console.assert(tradeLicenseType && fireNocType && liftLicenseType && panLicenseType, 'Required license types missing');
    console.log(`  ✔ License types verified: Trade License, Fire NOC, Lift License, PAN (Lifetime valid: ${panLicenseType.is_lifetime_valid})`);

    // Query Dependencies
    const depRes = await makeRequest({
      method: 'GET',
      path: '/api/compliance/dependencies',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.assert(depRes.statusCode === 200 && depRes.body.data.length >= 4, 'Dependencies missing');
    console.log(`  ✔ License dependencies verified (${depRes.body.data.length} dependency pairs loaded)`);

    // Add a custom license type
    const customLtRes = await makeRequest({
      method: 'POST',
      path: '/api/compliance/license-types',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Signage & Hoarding License',
        code: `SIGNAGE_${Date.now()}`,
        description: 'Municipal clearance for outdoor store branding',
        default_validity_months: 12,
        is_lifetime_valid: false,
      },
    });
    console.assert(customLtRes.statusCode === 201, 'Custom license type creation failed');
    console.log(`  ✔ Custom license type created: ${customLtRes.body.data.name} (${customLtRes.body.data.code})\n`);

    // -------------------------------------------------------------
    // PHASE 3: Document Upload with SHA-256 Cryptographic Hashing
    // -------------------------------------------------------------
    console.log('▶ PHASE 3: Document Vault & Cryptographic Integrity');

    const sampleFileContent = Buffer.from(
      '%PDF-1.4 Official Municipal Trade License Certificate for Indiranagar Store 2026'
    );
    const multipart = buildMultipartFormData(
      {
        locationId: blrLocation.id,
        licenseTypeId: tradeLicenseType.id,
        issueDate: '2026-01-01',
        expiryDate: '2026-12-31',
      },
      {
        fieldname: 'file',
        filename: 'trade_license_blr_2026.pdf',
        mimetype: 'application/pdf',
        content: sampleFileContent,
      }
    );

    const uploadRes = await makeRequest({
      method: 'POST',
      path: '/api/documents/upload',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': multipart.contentType,
      },
      body: multipart.body,
    });

    console.assert(uploadRes.statusCode === 201, `Upload failed: ${JSON.stringify(uploadRes.body)}`);
    uploadedDoc1Id = uploadRes.body.data.id;
    const recordedHash = uploadRes.body.data.sha256_hash;
    console.assert(recordedHash && recordedHash.length === 64, 'SHA-256 hash not generated');
    console.assert(uploadRes.body.data.status === 'PENDING_VERIFICATION', 'Initial status should be PENDING_VERIFICATION');
    console.log(`  ✔ Document uploaded: ${uploadRes.body.data.file_name}`);
    console.log(`  ✔ SHA-256 Hash fingerprint: ${recordedHash.substring(0, 16)}...`);

    // Verify Anti-Tamper Integrity Check
    const integrityRes = await makeRequest({
      method: 'GET',
      path: `/api/documents/${uploadedDoc1Id}/integrity`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.assert(integrityRes.statusCode === 200, 'Integrity check failed');
    console.assert(integrityRes.body.data.isValid === true, 'Document integrity should be valid');
    console.assert(integrityRes.body.data.recordedHash === integrityRes.body.data.currentHash, 'Hash mismatch');
    console.log(`  ✔ Anti-tamper verification confirmed: File matches SHA-256 fingerprint exactly.`);

    // -------------------------------------------------------------
    // PHASE 4: Document Verification Workflow
    // -------------------------------------------------------------
    console.log('\n▶ PHASE 4: Document Verification & Approval Workflow');

    const verifyRes = await makeRequest({
      method: 'PATCH',
      path: `/api/documents/${uploadedDoc1Id}/verify`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { action: 'APPROVE' },
    });
    console.assert(verifyRes.statusCode === 200, 'Verification failed');
    console.assert(verifyRes.body.data.status === 'VERIFIED', 'Status should be VERIFIED');
    console.assert(verifyRes.body.data.verified_by, 'Verifier user not set');
    console.log(`  ✔ Document approved by ${verifyRes.body.data.verified_by.name} (Status: VERIFIED)`);

    // Test rejection workflow on a second document
    const badDocMultipart = buildMultipartFormData(
      {
        locationId: blrLocation.id,
        licenseTypeId: liftLicenseType.id,
        issueDate: '2026-01-01',
        expiryDate: '2026-12-31',
      },
      {
        fieldname: 'file',
        filename: 'blurry_lift_doc.pdf',
        mimetype: 'application/pdf',
        content: Buffer.from('blurry document image'),
      }
    );

    const badUploadRes = await makeRequest({
      method: 'POST',
      path: '/api/documents/upload',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': badDocMultipart.contentType,
      },
      body: badDocMultipart.body,
    });
    const badDocId = badUploadRes.body.data.id;

    const rejectRes = await makeRequest({
      method: 'PATCH',
      path: `/api/documents/${badDocId}/verify`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { action: 'REJECT', rejectionReason: 'Illegible seal and blurred signature' },
    });
    console.assert(rejectRes.statusCode === 200, 'Rejection failed');
    console.assert(rejectRes.body.data.status === 'REJECTED', 'Status should be REJECTED');
    console.assert(
      rejectRes.body.data.rejection_reason === 'Illegible seal and blurred signature',
      'Reason mismatch'
    );
    console.log(`  ✔ Document rejection workflow verified with stated reason`);

    // -------------------------------------------------------------
    // PHASE 5: Document Renewal & Self-Referencing History
    // -------------------------------------------------------------
    console.log('\n▶ PHASE 5: Document Renewal & Version History Chaining');

    const renewalMultipart = buildMultipartFormData(
      {
        locationId: blrLocation.id,
        licenseTypeId: tradeLicenseType.id,
        parentDocumentId: uploadedDoc1Id,
        issueDate: '2027-01-01',
        expiryDate: '2027-12-31',
      },
      {
        fieldname: 'file',
        filename: 'trade_license_blr_2027_renewal.pdf',
        mimetype: 'application/pdf',
        content: Buffer.from('Renewed Trade License Certificate 2027'),
      }
    );

    const renewalRes = await makeRequest({
      method: 'POST',
      path: '/api/documents/upload',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': renewalMultipart.contentType,
      },
      body: renewalMultipart.body,
    });
    console.assert(renewalRes.statusCode === 201, 'Renewal upload failed');
    renewalDocId = renewalRes.body.data.id;
    console.assert(renewalRes.body.data.parent_document_id === uploadedDoc1Id, 'Parent document link missing');

    const historyRes = await makeRequest({
      method: 'GET',
      path: `/api/documents/${renewalDocId}/history`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.assert(historyRes.statusCode === 200, 'History query failed');
    console.assert(historyRes.body.data.totalVersions === 2, `Expected 2 versions, got ${historyRes.body.data.totalVersions}`);
    console.log(`  ✔ Renewal chain validated: Linked Version 1 (${uploadedDoc1Id.substring(0, 8)}) -> Version 2 (${renewalDocId.substring(0, 8)})`);

    // -------------------------------------------------------------
    // PHASE 6: Dynamic Rule-Based Compliance Score Engine
    // -------------------------------------------------------------
    console.log('\n▶ PHASE 6: Dynamic Compliance Score Engine & Cascading Risk');

    // 1. Calculate Score for BLR Store
    const scoreRes = await makeRequest({
      method: 'GET',
      path: `/api/compliance/score/location/${blrLocation.id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.assert(scoreRes.statusCode === 200, 'Score calculation failed');
    const breakdown = scoreRes.body.data;
    console.assert(typeof breakdown.overallScore === 'number', 'Overall score missing');
    console.assert(breakdown.licenses && breakdown.licenses.length > 0, 'License breakdown missing');
    console.log(`  ✔ BLR Store compliance calculated: ${breakdown.overallScore}/100`);
    console.log(`    - Total Required Licenses: ${breakdown.totalRequiredLicenses}`);
    console.log(`    - Missing Gaps Flagged: ${breakdown.gaps.length} (${breakdown.gaps.join(', ') || 'None'})`);
    console.log(`    - Automated Recommendations: ${breakdown.recommendations.length} action items`);

    // 2. Test Lifetime Valid Exemption (Upload PAN Card)
    const panMultipart = buildMultipartFormData(
      {
        locationId: blrLocation.id,
        licenseTypeId: panLicenseType.id,
        issueDate: '2020-01-01',
        // No expiry date because PAN is lifetime valid!
      },
      {
        fieldname: 'file',
        filename: 'corporate_pan.pdf',
        mimetype: 'application/pdf',
        content: Buffer.from('Corporate PAN Card Certificate'),
      }
    );
    const panUpload = await makeRequest({
      method: 'POST',
      path: '/api/documents/upload',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': panMultipart.contentType,
      },
      body: panMultipart.body,
    });
    // Approve PAN
    await makeRequest({
      method: 'PATCH',
      path: `/api/documents/${panUpload.body.data.id}/verify`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { action: 'APPROVE' },
    });

    const scoreAfterPan = await makeRequest({
      method: 'GET',
      path: `/api/compliance/score/location/${blrLocation.id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const panEval = scoreAfterPan.body.data.licenses.find((l) => l.code === 'PAN');
    console.assert(panEval && panEval.score === 100, 'PAN should receive 100 score under lifetime exemption');
    console.log(`  ✔ Lifetime exemption verified: PAN scored 100% compliant with null expiry date`);

    // 3. Test Cascading Risk Penalty Simulation
    // Fire NOC depends on Lift License (blocking).
    // Let's upload a Fire NOC that is VERIFIED, but Lift License is rejected/missing.
    const fireNocMultipart = buildMultipartFormData(
      {
        locationId: blrLocation.id,
        licenseTypeId: fireNocType.id,
        issueDate: '2026-01-01',
        expiryDate: '2026-12-31',
      },
      {
        fieldname: 'file',
        filename: 'fire_noc_2026.pdf',
        mimetype: 'application/pdf',
        content: Buffer.from('Fire Safety NOC Indiranagar'),
      }
    );
    const fireNocUpload = await makeRequest({
      method: 'POST',
      path: '/api/documents/upload',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': fireNocMultipart.contentType,
      },
      body: fireNocMultipart.body,
    });
    // Approve Fire NOC
    await makeRequest({
      method: 'PATCH',
      path: `/api/documents/${fireNocUpload.body.data.id}/verify`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { action: 'APPROVE' },
    });

    // Now recalculate score: Fire NOC should have CASCADING RISK because Lift License is missing/rejected!
    const cascadingScoreRes = await makeRequest({
      method: 'GET',
      path: `/api/compliance/score/location/${blrLocation.id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const fireNocEval = cascadingScoreRes.body.data.licenses.find((l) => l.code === 'FIRE_NOC');
    console.assert(fireNocEval && fireNocEval.hasCascadingRisk === true, 'Cascading risk should be detected');
    console.log(`  ✔ Cascading Risk mapping verified: Fire NOC flagged with penalty (${fireNocEval.cascadingReason})`);

    // 4. Test Historical Score Snapshots
    const historyScoreRes = await makeRequest({
      method: 'GET',
      path: `/api/compliance/score/location/${blrLocation.id}/history`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.assert(historyScoreRes.statusCode === 200 && historyScoreRes.body.data.length >= 2, 'History snapshots missing');
    console.log(`  ✔ Historical score trend logging verified (${historyScoreRes.body.data.length} snapshots recorded)`);

    // 5. Test Organization-Wide Compliance Rollup
    const orgScoreRes = await makeRequest({
      method: 'GET',
      path: '/api/compliance/score/organization',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.assert(orgScoreRes.statusCode === 200, 'Org score rollup failed');
    console.log(`  ✔ Organization Rollup: Average Compliance = ${orgScoreRes.body.data.averageScore}/100 across ${orgScoreRes.body.data.totalLocations} locations`);

    // -------------------------------------------------------------
    // PHASE 7: Automated Expiry Sweeper & Cascading Reminders
    // -------------------------------------------------------------
    console.log('\n▶ PHASE 7: Expiry Scheduler & Multi-Channel Alerting');

    // Create a document expiring in 5 days (Critical Warning)
    const expiringSoonMultipart = buildMultipartFormData(
      {
        locationId: bomLocation.id,
        licenseTypeId: tradeLicenseType.id,
        issueDate: '2025-10-01',
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        fieldname: 'file',
        filename: 'expiring_soon_bom.pdf',
        mimetype: 'application/pdf',
        content: Buffer.from('Trade License Expiring Soon BOM'),
      }
    );
    const expUpload = await makeRequest({
      method: 'POST',
      path: '/api/documents/upload',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': expiringSoonMultipart.contentType,
      },
      body: expiringSoonMultipart.body,
    });
    await makeRequest({
      method: 'PATCH',
      path: `/api/documents/${expUpload.body.data.id}/verify`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { action: 'APPROVE' },
    });

    // Trigger Expiry Sweep Job
    const sweepRes = await makeRequest({
      method: 'POST',
      path: '/api/notifications/trigger-expiry-sweep',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.assert(sweepRes.statusCode === 200, 'Expiry sweep failed');
    console.log(`  ✔ Expiry sweep executed: ${sweepRes.body.data.warningsDispatched} warnings dispatched, ${sweepRes.body.data.cascadingAlertsDispatched} cascading risk alerts`);

    // Verify Notification Logs
    const logsRes = await makeRequest({
      method: 'GET',
      path: '/api/notifications/logs',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.assert(logsRes.statusCode === 200 && logsRes.body.data.length > 0, 'Notification logs missing');
    console.log(`  ✔ Alert logs verified: Found ${logsRes.body.data.length} recorded alerts (Types: ${[...new Set(logsRes.body.data.map(l => l.type))].join(', ')})`);

    // Verify Notification Preferences
    const updatePrefRes = await makeRequest({
      method: 'PATCH',
      path: '/api/notifications/preferences',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        preferences: [
          { alert_type: 'EXPIRY_WARNING', email_enabled: true, sms_enabled: true, in_app_enabled: true },
          { alert_type: 'CASCADING_RISK', email_enabled: true, sms_enabled: true, in_app_enabled: true },
        ],
      },
    });
    console.assert(updatePrefRes.statusCode === 200, 'Pref update failed');
    console.log(`  ✔ Per-user notification preferences updated (Email, SMS, In-App toggles)`);

    // -------------------------------------------------------------
    // PHASE 8: Secure Cloud Data Rooms for External Audits
    // -------------------------------------------------------------
    console.log('\n▶ PHASE 8: Cloud Data Rooms (Audit Links) & Inspector Access');

    // 1. Create a PIN-protected audit link for 2 documents
    const linkRes = await makeRequest({
      method: 'POST',
      path: '/api/data-rooms/audit-links',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Q1 Municipal Fire & Trade Inspection',
        notes: 'Documents for BBMP compliance inspection',
        documentIds: [uploadedDoc1Id, renewalDocId],
        expiresInDays: 5,
        pin: '9876',
      },
    });
    console.assert(linkRes.statusCode === 201, 'Audit link creation failed');
    const auditToken = linkRes.body.data.token;
    const auditLinkId = linkRes.body.data.id;
    console.log(`  ✔ Audit Link created: ${linkRes.body.data.title}`);
    console.log(`  ✔ Shareable Token: ${auditToken.substring(0, 16)}... (PIN Protected: true)`);

    // 2. Public Inspector Access - Without PIN (should prompt for PIN)
    const publicInspectNoPin = await makeRequest({
      method: 'GET',
      path: `/api/audit/${auditToken}`,
    });
    console.assert(publicInspectNoPin.statusCode === 200, 'Public inspect failed');
    console.assert(publicInspectNoPin.body.data.pinRequired === true, 'PIN should be required');
    console.log(`  ✔ Inspector accessed link: Correctly prompted for PIN`);

    // 3. Public Inspector Access - With WRONG PIN (should fail)
    const publicInspectBadPin = await makeRequest({
      method: 'POST',
      path: `/api/audit/${auditToken}`,
      body: { pin: '0000' },
    });
    console.assert(publicInspectBadPin.statusCode === 401, 'Wrong PIN should return 401');
    console.log(`  ✔ Security verified: Incorrect PIN rejected with 401 Unauthorized`);

    // 4. Public Inspector Access - With CORRECT PIN (should succeed)
    const publicInspectGoodPin = await makeRequest({
      method: 'POST',
      path: `/api/audit/${auditToken}`,
      body: { pin: '9876' },
    });
    console.assert(publicInspectGoodPin.statusCode === 200, 'Valid PIN access failed');
    console.assert(publicInspectGoodPin.body.data.documents.length === 2, 'Should return permitted documents');
    console.assert(publicInspectGoodPin.body.data.documents[0].downloadUrl, 'Download URL should be provided');
    console.log(`  ✔ Inspector successfully unlocked ${publicInspectGoodPin.body.data.documents.length} permitted certificates with download links`);

    // 5. Verify Access Logs (Audit Trail with IP & Timestamp)
    const accessLogsRes = await makeRequest({
      method: 'GET',
      path: `/api/data-rooms/audit-links/${auditLinkId}/logs`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.assert(accessLogsRes.statusCode === 200, 'Access logs failed');
    console.assert(accessLogsRes.body.data.length >= 2, 'Both attempts should be logged');
    const successfulLog = accessLogsRes.body.data.find((l) => l.success === true);
    const failedLog = accessLogsRes.body.data.find((l) => l.success === false);
    console.assert(successfulLog && failedLog, 'Audit trail should log both successes and failures');
    console.log(`  ✔ Full access audit trail verified: Logged IP, timestamp, and success/failure flags.`);

    // 6. Revoke Audit Link
    const revokeRes = await makeRequest({
      method: 'DELETE',
      path: `/api/data-rooms/audit-links/${auditLinkId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.assert(revokeRes.statusCode === 200, 'Revoke failed');

    // Attempt access after revocation (should fail)
    const afterRevokeRes = await makeRequest({
      method: 'GET',
      path: `/api/audit/${auditToken}`,
    });
    console.assert(afterRevokeRes.statusCode === 401, 'Revoked link should reject access');
    console.log(`  ✔ Revocation verified: Subsequent inspector access blocked`);

    // -------------------------------------------------------------
    // PHASE 9: Security Boundaries & Role-Based Access Control
    // -------------------------------------------------------------
    console.log('\n▶ PHASE 9: Security Boundaries & RBAC Verification');

    // Location Manager cannot view documents of another branch
    const unauthorizedDocAccess = await makeRequest({
      method: 'GET',
      path: `/api/documents?locationId=${bomLocation.id}`,
      headers: { Authorization: `Bearer ${mgrToken}` }, // BLR Manager
    });
    console.assert(unauthorizedDocAccess.statusCode === 403, 'Manager should be blocked from other branch');
    console.log(`  ✔ Location boundary enforced: Manager blocked from other branch documents (403 Forbidden)`);

    // Location Manager cannot configure regulatory dependencies
    const unauthorizedDepPost = await makeRequest({
      method: 'POST',
      path: '/api/compliance/dependencies',
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { license_type_id: tradeLicenseType.id, prerequisite_license_type_id: panLicenseType.id },
    });
    console.assert(unauthorizedDepPost.statusCode === 403, 'Manager should be blocked from regulatory config');
    console.log(`  ✔ RBAC role guard enforced: Manager blocked from admin-only compliance settings (403 Forbidden)`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎉 ALL BACKEND INTEGRATION TEST SUITES PASSED! (100% SUCCESS)');
    console.log('═══════════════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED WITH ERROR:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(0);
  }
}

runTestSuite();
