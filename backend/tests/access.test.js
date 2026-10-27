const { verifySafeDatabaseUrl, api } = require('./helpers');
const { seedFindings, prisma } = require('./seed-findings');

verifySafeDatabaseUrl();

describe('Access Control Findings (Prompt B)', () => {
  let seeded;

  beforeAll(async () => {
    seeded = await seedFindings();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('F-01 :: GET /api/compliance/locations/<BOM id>', async () => {
    const res = await api('GET', `/api/compliance/locations/${seeded.ids.locBOM}`, seeded.tokens.managerBLR);
    expect(res.status).toBe(403);
  });

  it('F-01 :: POST /api/compliance/locations/<BOM id>/recalculate', async () => {
    const res = await api('POST', `/api/compliance/locations/${seeded.ids.locBOM}/recalculate`, seeded.tokens.managerBLR);
    expect(res.status).toBe(403);
  });

  it('F-01 :: GET /api/compliance/locations/<BOM id>/history', async () => {
    const res = await api('GET', `/api/compliance/locations/${seeded.ids.locBOM}/history`, seeded.tokens.managerBLR);
    expect(res.status).toBe(403);
  });

  it('F-05/06 :: GET /api/documents/<BOM doc id>/download', async () => {
    const res = await api('GET', `/api/documents/${seeded.ids.docBOM}/download`, seeded.tokens.managerBLR);
    expect(res.status).toBe(403);
  });

  it('F-05/06 :: GET /api/documents/<BOM doc id>/file', async () => {
    const res = await api('GET', `/api/documents/${seeded.ids.docBOM}/file`, seeded.tokens.managerBLR);
    expect(res.status).toBe(403);
  });

  it('F-07 :: PATCH /api/tenancy/locations/<BOM id>', async () => {
    const res = await api('PATCH', `/api/tenancy/locations/${seeded.ids.locBOM}`, seeded.tokens.managerBLR, { name: 'x' });
    expect(res.status).toBe(403);
  });

  it('F-07 :: PATCH /api/tenancy/locations/<BLR id>', async () => {
    const res = await api('PATCH', `/api/tenancy/locations/${seeded.ids.locBLR}`, seeded.tokens.managerBLR, { gstin: 'x' });
    expect(res.status).toBe(403);
  });

  it('F-02 :: POST /api/notifications/sweep', async () => {
    const res = await api('POST', '/api/notifications/sweep', seeded.tokens.managerBLR);
    expect(res.status).toBe(403);
  });
});
