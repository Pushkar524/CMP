const { verifySafeDatabaseUrl, api } = require('./helpers');
const { seedFindings, prisma } = require('./seed-findings');

verifySafeDatabaseUrl();

describe('Notification Deduplication Findings (Prompt D)', () => {
  let seeded;

  beforeAll(async () => {
    seeded = await seedFindings();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('F-12 :: two documents with same filename expiring in 10 days at different locations produce 2 notifications for admin', async () => {
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const commonFileName = `license_${uniqueId}.pdf`;

    // Create a license type whose name matches the filename so doc.license_type.name contains doc.file_name
    const licenseType = await prisma.licenseType.create({
      data: {
        name: commonFileName,
        code: `LIC_${uniqueId.toUpperCase()}`,
        issuing_authority: 'Testing Authority',
        default_validity_months: 12,
        is_lifetime_valid: false,
      },
    });

    // Create Document 1 at BLR location
    await prisma.document.create({
      data: {
        org_id: seeded.ids.orgA,
        location_id: seeded.ids.locBLR,
        license_type_id: licenseType.id,
        file_name: commonFileName,
        storage_key: `documents/${seeded.ids.orgA}/blr_${commonFileName}`,
        file_size: 10240,
        mime_type: 'application/pdf',
        sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        status: 'VERIFIED',
        issue_date: new Date(),
        expiry_date: tenDaysFromNow,
        uploaded_by_id: seeded.ids.adminA,
      },
    });

    // Create Document 2 at BOM location with identical filename
    await prisma.document.create({
      data: {
        org_id: seeded.ids.orgA,
        location_id: seeded.ids.locBOM,
        license_type_id: licenseType.id,
        file_name: commonFileName,
        storage_key: `documents/${seeded.ids.orgA}/bom_${commonFileName}`,
        file_size: 10240,
        mime_type: 'application/pdf',
        sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        status: 'VERIFIED',
        issue_date: new Date(),
        expiry_date: tenDaysFromNow,
        uploaded_by_id: seeded.ids.adminA,
      },
    });

    // Run the expiry sweep as adminA
    const sweepRes = await api('POST', '/api/notifications/sweep', seeded.tokens.adminA);
    expect(sweepRes.status).toBe(200);

    // Each document must produce its own notification (2 rows for the admin, not 1)
    const notifications = await prisma.notificationLog.findMany({
      where: {
        user_id: seeded.ids.adminA,
        type: 'EXPIRY_WARNING',
        content: { contains: commonFileName },
      },
    });

    expect(notifications.length).toBe(2);
  });
});
