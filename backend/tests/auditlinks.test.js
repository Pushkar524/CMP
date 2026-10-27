const bcrypt = require('bcryptjs');
const { verifySafeDatabaseUrl, api } = require('./helpers');
const { seedFindings, prisma } = require('./seed-findings');

verifySafeDatabaseUrl();

describe('Audit Links Findings (Prompt C)', () => {
  let seeded;

  beforeAll(async () => {
    seeded = await seedFindings();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('F-04 :: adminA POST /api/audit-links with {pin:"482910"} -> DB pin_hash must be non-null', async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const res = await api('POST', '/api/audit-links', seeded.tokens.adminA, {
      title: 'Audit Link F-04 Test',
      pin: '482910',
      document_ids: [seeded.ids.docBOM],
      expires_at: future,
    });

    const linkId = res.data?.audit_link?.id || res.data?.data?.id;
    expect(linkId).toBeDefined();

    const linkInDb = await prisma.auditLink.findUnique({ where: { id: linkId } });
    expect(linkInDb).not.toBeNull();
    expect(linkInDb.pin_hash).not.toBeNull();
  });

  it('F-13 :: GET /api/audit-links/by-token/<token> excludes pin_hash and admin email', async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const createRes = await api('POST', '/api/audit-links', seeded.tokens.adminA, {
      title: 'Audit Link F-13 Test',
      pin: '482910',
      document_ids: [seeded.ids.docBOM],
      expires_at: future,
    });

    const linkId = createRes.data?.audit_link?.id || createRes.data?.data?.id;
    const token = createRes.data?.audit_link?.token || createRes.data?.data?.token;

    // As instructed: set pin_hash directly via Prisma (bcrypt hash of "482910") and test against that
    const hashedPin = await bcrypt.hash('482910', 10);
    await prisma.auditLink.update({
      where: { id: linkId },
      data: { pin_hash: hashedPin },
    });

    // 1. GET with no PIN
    const resNoPin = await api('GET', `/api/audit-links/by-token/${token}`);
    const bodyNoPinStr = typeof resNoPin.data === 'string' ? resNoPin.data : JSON.stringify(resNoPin.data || {});
    expect(bodyNoPinStr).not.toContain('pin_hash');
    expect(bodyNoPinStr).not.toContain(seeded.users.adminA.email);

    // 2. GET with correct PIN (x-audit-pin header)
    const url = `http://localhost:5055/api/audit-links/by-token/${token}`;
    const resWithPinFetch = await fetch(url, {
      method: 'GET',
      headers: {
        'x-audit-pin': '482910',
      },
    });
    const dataWithPin = await resWithPinFetch.text();
    expect(dataWithPin).not.toContain('pin_hash');
    expect(dataWithPin).not.toContain(seeded.users.adminA.email);
  });

  it('F-08 :: adminB POST /api/audit-links with document_ids:[<tenant A doc id>] -> must be 4xx', async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const res = await api('POST', '/api/audit-links', seeded.tokens.adminB, {
      title: 'Cross-Tenant Audit Link F-08',
      document_ids: [seeded.ids.docBOM], // Document belongs to Tenant A
      expires_at: future,
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('F-09 :: send 20 wrong PINs to one token -> at least one 429', async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const createRes = await api('POST', '/api/audit-links', seeded.tokens.adminA, {
      title: 'Rate Limit F-09 Test',
      pin: '482910',
      document_ids: [seeded.ids.docBOM],
      expires_at: future,
    });

    const linkId = createRes.data?.audit_link?.id || createRes.data?.data?.id;
    const token = createRes.data?.audit_link?.token || createRes.data?.data?.token;

    const hashedPin = await bcrypt.hash('482910', 10);
    await prisma.auditLink.update({
      where: { id: linkId },
      data: { pin_hash: hashedPin },
    });

    const statuses = [];
    const url = `http://localhost:5055/api/audit-links/by-token/${token}`;
    for (let i = 0; i < 20; i++) {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'x-audit-pin': `wrong_${i}`,
        },
      });
      statuses.push(res.status);
    }

    expect(statuses).toContain(429);
  });

  it('F-11 :: after a public GET by-token, an AuditLinkAccessLog row must exist for that link', async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const createRes = await api('POST', '/api/audit-links', seeded.tokens.adminA, {
      title: 'Access Log F-11 Test',
      document_ids: [seeded.ids.docBOM],
      expires_at: future,
    });

    const linkId = createRes.data?.audit_link?.id || createRes.data?.data?.id;
    const token = createRes.data?.audit_link?.token || createRes.data?.data?.token;

    await api('GET', `/api/audit-links/by-token/${token}`);

    const logRow = await prisma.auditLinkAccessLog.findFirst({
      where: { audit_link_id: linkId },
    });

    expect(logRow).not.toBeNull();
    expect(logRow).toBeDefined();
  });
});
