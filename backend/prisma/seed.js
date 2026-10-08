const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clean existing records in reverse dependency order
  console.log('🧹 Cleaning up old data...');
  await prisma.notificationPreference.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.auditLinkAccessLog.deleteMany();
  await prisma.auditLinkDocument.deleteMany();
  await prisma.auditLink.deleteMany();
  await prisma.complianceScore.deleteMany();
  await prisma.document.deleteMany();
  await prisma.requiredLicenseType.deleteMany();
  await prisma.licenseTypeStateRule.deleteMany();
  await prisma.dependency.deleteMany();
  await prisma.licenseType.deleteMany();
  await prisma.userLocationAccess.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  await prisma.organization.deleteMany();

  // 2. Create Core Indian Regulatory License Types
  console.log('📜 Seeding License Types...');
  const tradeLicense = await prisma.licenseType.create({
    data: {
      name: 'Municipal Trade License',
      code: 'TRADE_LICENSE',
      description: 'Mandatory license from the local municipal corporation to carry out commercial trade or business.',
      issuing_authority: 'Municipal Corporation (e.g. BBMP / BMC)',
      default_validity_months: 12,
      is_lifetime_valid: false,
    },
  });

  const fireNoc = await prisma.licenseType.create({
    data: {
      name: 'Fire Safety No Objection Certificate (Fire NOC)',
      code: 'FIRE_NOC',
      description: 'Fire department clearance ensuring safety measures, exits, and fire extinguishing equipment are compliant.',
      issuing_authority: 'State Fire & Emergency Services',
      default_validity_months: 12,
      is_lifetime_valid: false,
    },
  });

  const liftLicense = await prisma.licenseType.create({
    data: {
      name: 'Lift / Elevator Operational License',
      code: 'LIFT_LICENSE',
      description: 'Clearance from the Electrical Inspectorate for safe elevator/escalator operations.',
      issuing_authority: 'Chief Electrical Inspectorate to Government (CEIG)',
      default_validity_months: 12,
      is_lifetime_valid: false,
    },
  });

  const buildingPlan = await prisma.licenseType.create({
    data: {
      name: 'Sanctioned Building Plan & Occupancy Certificate',
      code: 'BUILDING_PLAN_APPROVAL',
      description: 'Approved structural plan and occupancy certificate for commercial premises.',
      issuing_authority: 'Urban Development Authority / Town Planning',
      is_lifetime_valid: true,
    },
  });

  const gstRegistration = await prisma.licenseType.create({
    data: {
      name: 'Goods and Services Tax (GST) Registration Certificate',
      code: 'GST_REGISTRATION',
      description: 'GSTIN certificate for tax collection and inter-state commerce compliance.',
      issuing_authority: 'Central Board of Indirect Taxes and Customs (CBIC)',
      is_lifetime_valid: true,
    },
  });

  const panCard = await prisma.licenseType.create({
    data: {
      name: 'Permanent Account Number (PAN)',
      code: 'PAN',
      description: 'Corporate PAN card issued for business entity taxation.',
      issuing_authority: 'Income Tax Department of India',
      is_lifetime_valid: true,
    },
  });

  const fssaiLicense = await prisma.licenseType.create({
    data: {
      name: 'FSSAI Food Business License',
      code: 'FSSAI_LICENSE',
      description: 'License for food handling, storage, packaging, or cafeteria facilities.',
      issuing_authority: 'Food Safety and Standards Authority of India (FSSAI)',
      default_validity_months: 24,
      is_lifetime_valid: false,
    },
  });

  const shopEst = await prisma.licenseType.create({
    data: {
      name: 'Shops and Commercial Establishment Registration',
      code: 'SHOP_AND_ESTABLISHMENT',
      description: 'State labour department registration covering employee working hours, wages, and workplace conditions.',
      issuing_authority: 'State Department of Labour',
      default_validity_months: 12,
      is_lifetime_valid: false,
    },
  });

  const pollutionNoc = await prisma.licenseType.create({
    data: {
      name: 'Consent to Operate (Pollution Control NOC)',
      code: 'POLLUTION_NOC',
      description: 'State pollution control clearance for environmental compliance, waste management, and emissions.',
      issuing_authority: 'State Pollution Control Board (KSPCB / MPCB)',
      default_validity_months: 36,
      is_lifetime_valid: false,
    },
  });

  const dgftIec = await prisma.licenseType.create({
    data: {
      name: 'Importer-Exporter Code (DGFT IEC)',
      code: 'DGFT_IEC',
      description: 'Organization-wide import/export license from DGFT.',
      issuing_authority: 'Directorate General of Foreign Trade (DGFT)',
      is_lifetime_valid: true,
    },
  });

  // 3. Seed License Dependencies (Cascading Risk Graph)
  console.log('🔗 Seeding Cascading Risk Dependencies...');
  // FIRE_NOC requires LIFT_LICENSE (if multi-story with lifts)
  await prisma.dependency.create({
    data: {
      license_type_id: fireNoc.id,
      prerequisite_license_type_id: liftLicense.id,
      is_blocking: true,
    },
  });

  // FIRE_NOC requires BUILDING_PLAN_APPROVAL
  await prisma.dependency.create({
    data: {
      license_type_id: fireNoc.id,
      prerequisite_license_type_id: buildingPlan.id,
      is_blocking: true,
    },
  });

  // TRADE_LICENSE requires FIRE_NOC
  await prisma.dependency.create({
    data: {
      license_type_id: tradeLicense.id,
      prerequisite_license_type_id: fireNoc.id,
      is_blocking: true,
    },
  });

  // FSSAI requires TRADE_LICENSE
  await prisma.dependency.create({
    data: {
      license_type_id: fssaiLicense.id,
      prerequisite_license_type_id: tradeLicense.id,
      is_blocking: true,
    },
  });

  // 4. Seed Mandatory Rules per Location Type
  console.log('📌 Seeding Required License Types per Location Type...');
  const storeRequirements = [tradeLicense, fireNoc, shopEst, gstRegistration, panCard];
  for (const lt of storeRequirements) {
    await prisma.requiredLicenseType.create({
      data: {
        license_type_id: lt.id,
        location_type: 'STORE',
        is_mandatory: true,
      },
    });
  }

  const warehouseRequirements = [tradeLicense, fireNoc, pollutionNoc, buildingPlan, gstRegistration];
  for (const lt of warehouseRequirements) {
    await prisma.requiredLicenseType.create({
      data: {
        license_type_id: lt.id,
        location_type: 'WAREHOUSE',
        is_mandatory: true,
      },
    });
  }

  const officeRequirements = [shopEst, panCard, gstRegistration];
  for (const lt of officeRequirements) {
    await prisma.requiredLicenseType.create({
      data: {
        license_type_id: lt.id,
        location_type: 'OFFICE',
        is_mandatory: true,
      },
    });
  }

  const factoryRequirements = [tradeLicense, fireNoc, pollutionNoc, liftLicense, buildingPlan, gstRegistration];
  for (const lt of factoryRequirements) {
    await prisma.requiredLicenseType.create({
      data: {
        license_type_id: lt.id,
        location_type: 'FACTORY',
        is_mandatory: true,
      },
    });
  }

  // 5. Seed State-Specific Rules (e.g. Karnataka vs Maharashtra Shop & Est validity)
  console.log('🗺️ Seeding State-Specific Rules...');
  await prisma.licenseTypeStateRule.create({
    data: {
      license_type_id: shopEst.id,
      state: 'Karnataka',
      is_mandatory: true,
      validity_override_months: 60, // Karnataka 5-year renewal
    },
  });

  await prisma.licenseTypeStateRule.create({
    data: {
      license_type_id: shopEst.id,
      state: 'Maharashtra',
      is_mandatory: true,
      validity_override_months: 12, // Maharashtra annual renewal
    },
  });

  // 6. Seed Demo Organization
  console.log('🏢 Seeding Demo Organization...');
  const demoOrg = await prisma.organization.create({
    data: {
      name: 'Acme Retail India Pvt Ltd',
      tax_id: '29AAAAA0000A1Z5',
    },
  });

  // 7. Seed Demo Locations
  console.log('📍 Seeding Demo Locations...');
  const blrStore = await prisma.location.create({
    data: {
      org_id: demoOrg.id,
      name: 'Bangalore Flagship Store - Indiranagar',
      code: 'BLR-STORE-01',
      type: 'STORE',
      state: 'Karnataka',
      address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
      current_compliance_score: 92.5,
    },
  });

  const bomWarehouse = await prisma.location.create({
    data: {
      org_id: demoOrg.id,
      name: 'Mumbai Central Logistics Hub',
      code: 'BOM-WH-01',
      type: 'WAREHOUSE',
      state: 'Maharashtra',
      address: 'Bhiwandi Industrial Area, Thane, Maharashtra 421302',
      current_compliance_score: 78.0,
    },
  });

  const delHQ = await prisma.location.create({
    data: {
      org_id: demoOrg.id,
      name: 'Delhi Corporate Headquarters',
      code: 'DEL-HQ-01',
      type: 'OFFICE',
      state: 'Delhi',
      address: 'Barakhamba Road, Connaught Place, New Delhi 110001',
      current_compliance_score: 100.0,
    },
  });

  // 8. Seed Demo Users
  console.log('👤 Seeding Demo Users...');
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const orgAdmin = await prisma.user.create({
    data: {
      org_id: demoOrg.id,
      name: 'Pushkar Raj Purohit (Org Admin)',
      email: 'admin@acmeretail.com',
      password_hash: passwordHash,
      role: 'ORG_ADMIN',
    },
  });

  const blrManager = await prisma.user.create({
    data: {
      org_id: demoOrg.id,
      name: 'Pavan Kumar (Location Manager)',
      email: 'manager.blr@acmeretail.com',
      password_hash: passwordHash,
      role: 'LOCATION_MANAGER',
    },
  });

  const bomManager = await prisma.user.create({
    data: {
      org_id: demoOrg.id,
      name: 'Suhas Patel (Logistics Manager)',
      email: 'manager.bom@acmeretail.com',
      password_hash: passwordHash,
      role: 'LOCATION_MANAGER',
    },
  });

  // 9. Assign Location Access to Managers
  console.log('🔑 Assigning User Location Access...');
  await prisma.userLocationAccess.create({
    data: {
      user_id: blrManager.id,
      location_id: blrStore.id,
    },
  });

  await prisma.userLocationAccess.create({
    data: {
      user_id: bomManager.id,
      location_id: bomWarehouse.id,
    },
  });

  // 10. Seed Notification Preferences for Users
  console.log('🔔 Seeding Notification Preferences...');
  const alertTypes = ['EXPIRY_WARNING', 'LAPSED_LICENSE', 'CASCADING_RISK'];
  for (const user of [orgAdmin, blrManager, bomManager]) {
    for (const alertType of alertTypes) {
      await prisma.notificationPreference.create({
        data: {
          user_id: user.id,
          alert_type: alertType,
          email_enabled: true,
          in_app_enabled: true,
        },
      });
    }
  }

  console.log('\n✅ Database Seed Completed Successfully!');
  console.log('----------------------------------------------------');
  console.log('Organization:  Acme Retail India Pvt Ltd');
  console.log('Demo Users:');
  console.log('  1. Org Admin:         admin@acmeretail.com       (Password: Password@123)');
  console.log('  2. BLR Store Manager: manager.blr@acmeretail.com (Password: Password@123)');
  console.log('  3. BOM Hub Manager:   manager.bom@acmeretail.com (Password: Password@123)');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
