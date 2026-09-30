// Initial seed data aligned with backend/prisma/schema.prisma and README.md

export const initialOrganizations = [
  {
    id: "org-1",
    name: "Apex Retail Group India Ltd.",
    tax_id: "29AABCA1234F1Z8",
  },
  {
    id: "org-2",
    name: "IndoCargo Logistics Pvt. Ltd.",
    tax_id: "27AABCI9876K1Z2",
  }
];

export const initialUsers = [
  {
    id: "user-1",
    org_id: "org-1",
    name: "Anantha Krishna",
    email: "anantha@apexretail.in",
    role: "ORG_ADMIN",
    assignedLocations: ["loc-1", "loc-2", "loc-3", "loc-4"],
  },
  {
    id: "user-2",
    org_id: "org-1",
    name: "Pushkar Raj (Store Lead)",
    email: "pushkar@apexretail.in",
    role: "LOCATION_MANAGER",
    assignedLocations: ["loc-1", "loc-3"], // Bangalore Store & Hub
  },
  {
    id: "user-3",
    org_id: "org-1",
    name: "Govt. Inspector V. Sharma",
    email: "inspector.sharma@bbmp.gov.in",
    role: "EXTERNAL_INSPECTOR",
    assignedLocations: [],
  }
];

export const initialLocations = [
  {
    id: "loc-1",
    org_id: "org-1",
    name: "Indiranagar Flagship Store",
    code: "BLR-STR-01",
    type: "STORE",
    state: "Karnataka",
    address: "100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, 560038",
    current_compliance_score: 92.5,
    manager_name: "Pushkar Raj",
  },
  {
    id: "loc-2",
    org_id: "org-1",
    name: "Andheri Central Fulfillment Warehouse",
    code: "MUM-WH-02",
    type: "WAREHOUSE",
    state: "Maharashtra",
    address: "MIDC Industrial Area, Andheri East, Mumbai, 400093",
    current_compliance_score: 64.0, // Alert: cascading risk
    manager_name: "Pavan Kumar",
  },
  {
    id: "loc-3",
    org_id: "org-1",
    name: "Whitefield Tech Park Distribution Hub",
    code: "BLR-HUB-03",
    type: "WAREHOUSE",
    state: "Karnataka",
    address: "EPIP Zone, Whitefield, Bengaluru, 560066",
    current_compliance_score: 78.0,
    manager_name: "Pushkar Raj",
  },
  {
    id: "loc-4",
    org_id: "org-1",
    name: "Connaught Place Regional Corporate Office",
    code: "DEL-CORP-04",
    type: "OFFICE",
    state: "Delhi",
    address: "Barakhamba Road, Connaught Place, New Delhi, 110001",
    current_compliance_score: 98.0,
    manager_name: "Suhas Patel",
  }
];

export const initialLicenseTypes = [
  {
    id: "lt-1",
    name: "Municipal Trade License",
    code: "TRADE_LICENSE",
    issuing_authority: "BBMP / BMC Local Municipal Corp",
    default_validity_months: 12,
    is_lifetime_valid: false,
    description: "Mandatory municipal operating permit for commercial establishments."
  },
  {
    id: "lt-2",
    name: "Fire Safety NOC (No Objection Certificate)",
    code: "FIRE_NOC",
    issuing_authority: "State Fire & Emergency Services",
    default_validity_months: 12,
    is_lifetime_valid: false,
    description: "Fire prevention and building safety compliance clearance."
  },
  {
    id: "lt-3",
    name: "Permanent Account Number (PAN)",
    code: "PAN",
    issuing_authority: "Income Tax Department of India",
    default_validity_months: null,
    is_lifetime_valid: true,
    description: "Corporate entity tax identifier with lifetime validity."
  },
  {
    id: "lt-4",
    name: "GST Registration Certificate",
    code: "GST_REG",
    issuing_authority: "Goods and Services Tax Network (GSTN)",
    default_validity_months: null,
    is_lifetime_valid: true,
    description: "Indirect tax registration across active operating states."
  },
  {
    id: "lt-5",
    name: "Lift & Escalator Safety Inspection Clearance",
    code: "LIFT_CLEARANCE",
    issuing_authority: "Chief Electrical Inspectorate",
    default_validity_months: 12,
    is_lifetime_valid: false,
    description: "Mandatory prerequisite for Fire NOC in multi-story warehouses and stores."
  },
  {
    id: "lt-6",
    name: "DGFT Importer-Exporter Code (IEC)",
    code: "DGFT_IEC",
    issuing_authority: "Directorate General of Foreign Trade",
    default_validity_months: null,
    is_lifetime_valid: true,
    description: "Organization-level key business identifier for international shipments."
  },
  {
    id: "lt-7",
    name: "FSSAI Food Business Operator License",
    code: "FSSAI_LICENSE",
    issuing_authority: "Food Safety and Standards Authority of India",
    default_validity_months: 24,
    is_lifetime_valid: false,
    description: "Mandatory food hygiene and storage certification for packaged goods."
  },
  {
    id: "lt-8",
    name: "State Pollution Control Board Consent to Operate (CTO)",
    code: "SPCB_CTO",
    issuing_authority: "Karnataka / Maharashtra SPCB",
    default_validity_months: 36,
    is_lifetime_valid: false,
    description: "Environmental emissions, effluent, and waste clearance."
  }
];

// Dependency graph: prerequisite_license_type_id must be valid, else dependent is penalized
export const initialDependencies = [
  {
    id: "dep-1",
    license_type_id: "lt-2", // Fire NOC depends on
    prerequisite_license_type_id: "lt-5", // Lift Clearance
    is_blocking: true,
    description: "Fire NOC cannot be renewed or maintained valid if Lift Clearance has lapsed."
  },
  {
    id: "dep-2",
    license_type_id: "lt-1", // Trade License depends on
    prerequisite_license_type_id: "lt-2", // Fire NOC
    is_blocking: true,
    description: "Municipal Trade License mandates active Fire Department NOC."
  },
  {
    id: "dep-3",
    license_type_id: "lt-7", // FSSAI License depends on
    prerequisite_license_type_id: "lt-1", // Trade License
    is_blocking: false,
    description: "FSSAI premises registration requires an active local Municipal Trade License."
  }
];

// Rules for required license types per location type and state
export const initialRequiredRules = [
  { id: "req-1", license_type_id: "lt-1", location_type: "STORE", state: null, is_mandatory: true },
  { id: "req-2", license_type_id: "lt-2", location_type: "STORE", state: null, is_mandatory: true },
  { id: "req-3", license_type_id: "lt-4", location_type: "STORE", state: null, is_mandatory: true },
  { id: "req-4", license_type_id: "lt-7", location_type: "STORE", state: null, is_mandatory: true },
  { id: "req-5", license_type_id: "lt-1", location_type: "WAREHOUSE", state: null, is_mandatory: true },
  { id: "req-6", license_type_id: "lt-2", location_type: "WAREHOUSE", state: null, is_mandatory: true },
  { id: "req-7", license_type_id: "lt-5", location_type: "WAREHOUSE", state: null, is_mandatory: true },
  { id: "req-8", license_type_id: "lt-8", location_type: "WAREHOUSE", state: "Maharashtra", is_mandatory: true },
  { id: "req-9", license_type_id: "lt-4", location_type: "OFFICE", state: null, is_mandatory: true }
];

export const initialDocuments = [
  {
    id: "doc-1",
    org_id: "org-1",
    location_id: "loc-1",
    license_type_id: "lt-1",
    license_code: "TRADE_LICENSE",
    license_name: "Municipal Trade License",
    file_name: "BBMP_Trade_License_2026_BLR01.pdf",
    storage_key: "sclip-docs/2026/01/bbmp_trade_lic_blr01.pdf",
    file_size: 1420580,
    mime_type: "application/pdf",
    sha256_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    issue_date: "2025-04-01",
    expiry_date: "2026-03-31",
    status: "VERIFIED",
    rejection_reason: null,
    uploaded_by_id: "user-2",
    uploaded_by_name: "Pushkar Raj",
    verified_by_id: "user-1",
    verified_by_name: "Anantha Krishna",
    verified_at: "2025-04-05T10:14:00Z",
    parent_document_id: "doc-prev-001",
    version: 2,
    has_renewals: true,
  },
  {
    id: "doc-2",
    org_id: "org-1",
    location_id: "loc-1",
    license_type_id: "lt-2",
    license_code: "FIRE_NOC",
    license_name: "Fire Safety NOC",
    file_name: "Karnataka_Fire_NOC_BLR01.pdf",
    storage_key: "sclip-docs/2025/11/karnataka_fire_noc_blr01.pdf",
    file_size: 2840192,
    mime_type: "application/pdf",
    sha256_hash: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
    issue_date: "2025-11-15",
    expiry_date: "2026-11-14",
    status: "VERIFIED",
    rejection_reason: null,
    uploaded_by_id: "user-2",
    uploaded_by_name: "Pushkar Raj",
    verified_by_id: "user-1",
    verified_by_name: "Anantha Krishna",
    verified_at: "2025-11-18T14:30:00Z",
    parent_document_id: null,
    version: 1,
  },
  {
    id: "doc-3",
    org_id: "org-1",
    location_id: "loc-2", // Mumbai Warehouse
    license_type_id: "lt-5", // Lift Clearance LAPSED!
    license_code: "LIFT_CLEARANCE",
    license_name: "Lift & Escalator Safety Clearance",
    file_name: "MH_Lift_Safety_Clearance_MUM02.pdf",
    storage_key: "sclip-docs/2024/08/mh_lift_mum02.pdf",
    file_size: 980120,
    mime_type: "application/pdf",
    sha256_hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    issue_date: "2024-08-10",
    expiry_date: "2025-08-09", // Expired
    status: "EXPIRED",
    rejection_reason: null,
    uploaded_by_id: "user-1",
    uploaded_by_name: "Anantha Krishna",
    verified_by_id: "user-1",
    verified_by_name: "Anantha Krishna",
    verified_at: "2024-08-12T09:00:00Z",
    parent_document_id: null,
    version: 1,
  },
  {
    id: "doc-4",
    org_id: "org-1",
    location_id: "loc-2", // Mumbai Warehouse -> Cascading Risk because prerequisite doc-3 lapsed!
    license_type_id: "lt-2",
    license_code: "FIRE_NOC",
    license_name: "Fire Safety NOC (Cascading Risk!)",
    file_name: "Mumbai_Fire_Dept_NOC_MUM02.pdf",
    storage_key: "sclip-docs/2025/01/mum_fire_noc_mum02.pdf",
    file_size: 3120400,
    mime_type: "application/pdf",
    sha256_hash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    issue_date: "2025-01-20",
    expiry_date: "2026-01-19",
    status: "VERIFIED",
    cascading_penalty_applied: true,
    rejection_reason: null,
    uploaded_by_id: "user-1",
    uploaded_by_name: "Anantha Krishna",
    verified_by_id: "user-1",
    verified_by_name: "Anantha Krishna",
    verified_at: "2025-01-25T11:20:00Z",
    parent_document_id: null,
    version: 1,
  },
  {
    id: "doc-5",
    org_id: "org-1",
    location_id: null, // Organization-Wide Document
    license_type_id: "lt-6",
    license_code: "DGFT_IEC",
    license_name: "DGFT Importer-Exporter Code",
    file_name: "DGFT_IEC_ApexRetail_OrgWide.pdf",
    storage_key: "sclip-docs/org-wide/dgft_iec_apex.pdf",
    file_size: 1104520,
    mime_type: "application/pdf",
    sha256_hash: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    issue_date: "2022-01-10",
    expiry_date: null, // Lifetime valid
    status: "VERIFIED",
    rejection_reason: null,
    uploaded_by_id: "user-1",
    uploaded_by_name: "Anantha Krishna",
    verified_by_id: "user-1",
    verified_by_name: "Anantha Krishna",
    verified_at: "2022-01-12T16:00:00Z",
    parent_document_id: null,
    version: 1,
  },
  {
    id: "doc-6",
    org_id: "org-1",
    location_id: "loc-3", // Bangalore Hub
    license_type_id: "lt-1",
    license_code: "TRADE_LICENSE",
    license_name: "Municipal Trade License",
    file_name: "BBMP_Trade_License_BLR03_Draft.pdf",
    storage_key: "sclip-docs/2026/02/trade_lic_blr03.pdf",
    file_size: 1845000,
    mime_type: "application/pdf",
    sha256_hash: "c6a87c7e8c3395b282054ff837da236ecddca89ee1833777f5f9ebfa5f333333",
    issue_date: "2026-02-01",
    expiry_date: "2027-01-31",
    status: "PENDING_VERIFICATION", // Pending verification workflow
    rejection_reason: null,
    uploaded_by_id: "user-2",
    uploaded_by_name: "Pushkar Raj",
    verified_by_id: null,
    verified_by_name: null,
    verified_at: null,
    parent_document_id: null,
    version: 1,
  }
];

export const initialAuditLinks = [
  {
    id: "al-1",
    org_id: "org-1",
    created_by_id: "user-1",
    created_by_name: "Anantha Krishna",
    token: "audit-blr-bbmp-2026",
    pin_hash: "1234", // simple PIN for demo
    title: "BBMP Annual Compliance Review - Indiranagar Store",
    notes: "Only Municipal Trade License and Fire NOC shared for Inspector Sharma.",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    document_ids: ["doc-1", "doc-2"],
    access_logs: [
      {
        id: "log-1",
        accessed_at: "2026-09-28T11:24:10Z",
        ip_address: "103.21.144.92",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0",
        success: true
      },
      {
        id: "log-2",
        accessed_at: "2026-09-28T11:21:05Z",
        ip_address: "103.21.144.92",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0",
        success: false
      }
    ]
  },
  {
    id: "al-2",
    org_id: "org-1",
    created_by_id: "user-1",
    created_by_name: "Anantha Krishna",
    token: "audit-customs-dgft-exp",
    pin_hash: null, // No PIN required
    title: "Customs & DGFT Export Verification Data Room",
    notes: "Direct inspection link for pan-India DGFT & GST validation.",
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    document_ids: ["doc-5"],
    access_logs: [
      {
        id: "log-3",
        accessed_at: "2026-09-29T16:15:30Z",
        ip_address: "14.139.112.50",
        user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        success: true
      }
    ]
  }
];

export const initialNotificationLogs = [
  {
    id: "notif-1",
    type: "CASCADING_RISK",
    channel: "IN_APP",
    sent_at: "10 mins ago",
    title: "Cascading Risk Detected: Fire NOC",
    content: "Lift Safety Clearance expired for Mumbai Warehouse (MUM-WH-02). Downstream Fire NOC has been penalized -18 pts.",
    location_name: "Andheri Central Warehouse",
    read: false
  },
  {
    id: "notif-2",
    type: "EXPIRY_WARNING",
    channel: "EMAIL",
    sent_at: "3 hours ago",
    title: "30-Day Renewal Notice",
    content: "Municipal Trade License for Indiranagar Flagship Store expires within 30 days. Renewal queue active.",
    location_name: "Indiranagar Flagship",
    read: false
  },
  {
    id: "notif-3",
    type: "LAPSED_LICENSE",
    channel: "SMS",
    sent_at: "Yesterday",
    title: "Critical: Lift Clearance Lapsed",
    content: "Chief Electrical Inspectorate certificate lapsed on 09-Aug. Re-inspection required immediately.",
    location_name: "Andheri Central Warehouse",
    read: true
  }
];

export const initialNotificationPreferences = {
  email_enabled: true,
  sms_enabled: false,
  in_app_enabled: true,
  expiry_warning: true,
  lapsed_license: true,
  cascading_risk: true
};
