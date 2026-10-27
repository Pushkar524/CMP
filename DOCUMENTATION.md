# Comprehensive System Documentation: Compliance Management Platform (CMP)

---

## 1. Executive Summary & Architecture Overview

The **Compliance Management Platform (CMP)** is a multi-tenant enterprise regulatory compliance and governance solution designed to track, calculate, verify, and audit statutory permits, licenses, and documentation across multi-facility distributed organizations.

### 1.1 High-Level Architecture
The application follows a decoupled client-server architecture:
- **Frontend Layer:** React 18 Single-Page Application (SPA) built with Vite, Tailwind CSS v4, Lucide Icons, and responsive component design.
- **Backend API Layer:** RESTful Express.js service adhering to a modular layered architecture (Routes → Controllers → Services → Data Access Layer).
- **Persistence Layer:** PostgreSQL accessed via Prisma ORM v5 with relation-based tenant scoping and cascading referential integrity.
- **Storage Layer:** Dual-mode S3-compatible object storage supporting local MinIO and cloud-hosted storage (e.g., Supabase S3, AWS S3) with SHA-256 cryptographic tamper detection.
- **Intelligence Engine:** Directed Acyclic Graph (DAG) for statutory license dependencies, state-specific validity overrides, and cascading risk evaluation.

```mermaid
graph TD
    Client[Web Browser / External Inspector] -->|HTTPS / REST| Vite[React 18 SPA]
    Vite -->|Proxy /api/*| Express[Express.js API Server]
    
    subgraph Express Middleware Pipeline
        Express --> Auth[authenticateJWT]
        Auth --> Tenant[tenantScope]
        Tenant --> RBAC[authorizeRoles & verifyLocationAccess]
        RBAC --> Validation[Zod Schema Validation]
    end

    Validation --> Controllers[Module Controllers]
    Controllers --> Services[Business Services]
    
    Services --> Prisma[Prisma ORM Client]
    Services --> Storage[StorageService: S3 / MinIO]
    Services --> Email[EmailService: Resend / Nodemailer]
    Services --> Intelligence[Compliance & DAG Engine]

    Prisma --> Postgres[(PostgreSQL / Supabase)]
    Storage --> Bucket[(S3 / MinIO Bucket)]
```

---

## 2. Technical Stack Specifications

| Layer | Component | Version / Tech | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | Framework | React 18.3.1 | Functional components with hooks & Context API |
| | Build Tool | Vite 5.4.11 | Fast HMR development and production bundler |
| | Routing | React Router v6 | Declarative client-side routing & code-splitting |
| | Styling | Tailwind CSS v4 | Utility-first CSS with CSS custom variables |
| | Typography | Google Fonts | DM Sans applied globally across UI |
| **Backend** | Runtime | Node.js 20+ | CommonJS modular server |
| | Framework | Express 4.21.1 | HTTP routing, custom error handling, middleware |
| | ORM | Prisma 5.22.0 | Type-safe query builder and database migrations |
| | Database | PostgreSQL 15+ | Relational multi-tenant database |
| | Authentication | JWT (jsonwebtoken 9.0) | Stateless Bearer token authentication |
| | Cryptography | bcryptjs & crypto | Blowfish password hashing & SHA-256 file hashing |
| | File Uploads | Multer 1.4.5 | Multipart file handling with memory storage |
| | Object Storage | AWS SDK S3 v3 | S3 Put/Get presigned URL and streaming client |
| | Scheduling | node-cron 3.0.3 | Automated expiry sweeps & compliance updates |
| | Validation | Zod 4.6.7 | Runtime schema validation |

---

## 3. Database & Data Model Architecture

The database is structured into 4 cohesive functional domains in [`backend/prisma/schema.prisma`](file:///home/krishnanantha/major-project/CMP-P1/backend/prisma/schema.prisma):

```mermaid
erDiagram
    ORGANIZATION ||--o{ LOCATION : operates
    ORGANIZATION ||--o{ USER : employs
    ORGANIZATION ||--o{ DOCUMENT : owns
    ORGANIZATION ||--o{ AUDIT_LINK : generates
    
    LOCATION ||--o{ USER_LOCATION_ACCESS : scoped_to
    USER ||--o{ USER_LOCATION_ACCESS : granted
    LOCATION ||--o{ DOCUMENT : stores
    LOCATION ||--o{ COMPLIANCE_SCORE : tracks
    
    LICENSE_TYPE ||--o{ REQUIRED_LICENSE_TYPE : mandates
    LICENSE_TYPE ||--o{ LICENSE_TYPE_STATE_RULE : overrides
    LICENSE_TYPE ||--o{ DEPENDENCY : prerequisite_for
    LICENSE_TYPE ||--o{ DOCUMENT : categorizes
    
    DOCUMENT ||--o{ AUDIT_LINK_DOCUMENT : includes
    AUDIT_LINK ||--o{ AUDIT_LINK_DOCUMENT : contains
    AUDIT_LINK ||--o{ AUDIT_LINK_ACCESS_LOG : logs
    
    USER ||--o{ NOTIFICATION_LOG : receives
    USER ||--o{ NOTIFICATION_PREFERENCE : configures
```

### 3.1 Tenancy & Access Control Module
- **`Organization`**: Multi-tenant isolation boundary (`id`, `name`, `tax_id`, `industry`, `website`, `phone`, `address`).
- **`Location`**: Physical facility (`STORE`, `WAREHOUSE`, `OFFICE`, `FACTORY`) with state classification, operating parameters, and cached `current_compliance_score`.
- **`User`**: System principals (`ORG_ADMIN`, `LOCATION_MANAGER`, `EXTERNAL_INSPECTOR`).
- **`UserLocationAccess`**: Many-to-many junction mapping location managers to specific facility IDs.

### 3.2 Intelligence & Regulatory Rules Engine
- **`LicenseType`**: Master statutory permits (e.g., Trade License, Fire NOC, Factory License, GST Registration, FSSAI).
- **`Dependency`**: Prerequisite rule graph (e.g., Trade License requires Fire NOC; Fire NOC requires Sanctioned Building Plan).
- **`RequiredLicenseType`**: Mandates which license types are required based on location type (`STORE`, `WAREHOUSE`, etc.).
- **`LicenseTypeStateRule`**: State-level statutory overrides (e.g., Karnataka 5-year renewal vs Maharashtra 1-year renewal).
- **`ComplianceScore`**: Audit log of historical score evaluations containing detailed JSON breakdown snapshots.

### 3.3 Document Core Module
- **`Document`**: Statutory record metadata containing:
  - `storage_key`: Tenant-isolated S3 object path (`documents/{orgId}/{uuid}_{fileName}`).
  - `sha256_hash`: Cryptographic checksum to prevent tampering.
  - `status`: Lifecycle enum (`PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`, `EXPIRED`).
  - `parent_document_id`: Self-referencing renewal chain linking superseded documents to active revisions.

### 3.4 Data Rooms & Notifications Module
- **`AuditLink`**: Ephemeral public access link protected by 24-byte hex token, optional bcrypt-hashed PIN, and expiration timestamp.
- **`AuditLinkDocument`**: Junction table specifying exact documents exposed in each data room.
- **`AuditLinkAccessLog`**: Immutable access logs tracking IP addresses, user agents, and timestamps.
- **`NotificationLog` & `NotificationPreference`**: User alert channels (`IN_APP`, `EMAIL`) and alert categories (`EXPIRY_WARNING`, `LAPSED_LICENSE`, `CASCADING_RISK`).

---

## 4. Backend Modular API Architecture

The backend code is organized into feature modules under [`backend/src/modules/`](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/):

### 4.1 Authentication Module (`/api/auth`)
- **`POST /api/auth/register`**: Atomically creates Organization, default branches/locations, Org Admin user, and default notification preferences in a single database transaction.
- **`POST /api/auth/login`**: Validates credentials using `bcrypt.compare`, signs a JWT payload (`userId`, `orgId`, `role`), and returns user and organization profiles.
- **`GET /api/auth/me`**: Returns the authenticated user's current session, organization details, and accessible location IDs.

### 4.2 Tenancy Module (`/api/tenancy`)
- **`GET /api/tenancy/organization`**: Organization profile metadata.
- **`PATCH /api/tenancy/organization`**: Updates enterprise address, tax ID, or industry details (`ORG_ADMIN` only).
- **`GET /api/tenancy/locations`**: Returns locations within the tenant's scope.
- **`POST /api/tenancy/locations`**: Provisions a new store, warehouse, or factory.
- **`PATCH /api/tenancy/locations/:locationId`**: Updates location metadata and operating configurations.
- **`GET /api/tenancy/users`**: Lists all tenant users and their assigned facility access lists.
- **`POST /api/tenancy/users`**: Provisions location managers and inspectors.
- **`POST /api/tenancy/locations/assign-access`**: Binds a user to facility scopes.

### 4.3 Compliance Engine Module (`/api/compliance`)
- **`GET /api/compliance/organization/overview`**: Roll-up compliance score across all facilities, overall health grade, active risk counts, and AI-suggested remediation items.
- **`GET /api/compliance/locations/:id`**: Returns real-time score, statutory category breakdown, critical gaps, and unblocked tasks.
- **`POST /api/compliance/locations/:id/recalculate`**: Forces real-time re-evaluation of location compliance score and persists a history snapshot.
- **`GET /api/compliance/locations/:id/history`**: Returns historical timeline for score trend charts.

#### Compliance Scoring Algorithm
The compliance score engine computes a score from 0 to 100 based on statutory requirements:
1. **Mandatory Permit Base (70% weight):**
   $$\text{Base Score} = \left( \frac{\text{Verified Mandatory Documents}}{\text{Required Mandatory Licenses}} \right) \times 70$$
2. **Prerequisite Dependency Health (20% weight):**
   Calculates cascading risk. If document $A$ is valid, but prerequisite license $B$ has lapsed, document $A$ is penalized.
3. **Imminent Expiry Proximity (10% weight):**
   Licenses expiring within 30 days lose proportional score points to incentivize proactive renewal.
4. **Hard Penalties:**
   Any active statutory permit in `REJECTED` or `EXPIRED` status caps the maximum possible facility score.

### 4.4 Intelligence & Regulatory Graph (`/api/intelligence`)
- **`GET /api/intelligence/license-types`**: Master catalog of statutory Indian licenses.
- **`GET /api/intelligence/dependencies`**: Prerequisite graph edges.
- **`GET /api/intelligence/rules`**: Location-type and state-specific statutory rule matrices.
- **`GET /api/intelligence/graph`**: Full dependency risk graph topology for visualization.
- **`GET /api/intelligence/locations/:id/graph`**: Scoped DAG showing green (compliant), amber (at-risk), and red (blocking violation) nodes.

### 4.5 Document Core Module (`/api/documents`)
- **`POST /api/documents`**: Multi-part upload handling:
  1. Computes SHA-256 hash from file buffer.
  2. Generates tenant-isolated storage key.
  3. Uploads stream to S3 / MinIO.
  4. Creates database record in `PENDING_VERIFICATION` status.
- **`GET /api/documents`**: Paginated and filtered document registry.
- **`PATCH /api/documents/:id/verify`**: Org Admin approval marking document as `VERIFIED`.
- **`PATCH /api/documents/:id/reject`**: Documents rejection with audit reason.
- **`GET /api/documents/:id/download`**: Generates pre-signed S3 download URL valid for 60 minutes.
- **`GET /api/documents/:id/file`**: Streams binary file directly with correct MIME content headers.

### 4.6 Audit Data Rooms (`/api/audit-links`)
- **`POST /api/audit-links`**: Creates an ephemeral data room link with expiry and optional bcrypt PIN.
- **`GET /api/audit-links`**: Lists active and expired audit links for the organization.
- **`PATCH /api/audit-links/:id`**: Instantly revokes a data room link (`is_active: false`).
- **`GET /api/audit-links/by-token/:token`** *(Public)*: Validates link active status, expiry, and optional `x-audit-pin` header, returning authorized documents.
- **`GET /api/audit-links/by-token/:token/documents/:docId/download`** *(Public)*: Inspector download link.

### 4.7 Notification & Cron Engine (`/api/notifications`)
- **`GET /api/notifications`**: Paginated in-app alerts for the authenticated user.
- **`GET /api/notifications/unread-count`**: Header badge counter.
- **`PATCH /api/notifications/:id/read`** & **`PATCH /api/notifications/mark-all-read`**: Status updates.
- **`POST /api/notifications/sweep`**: On-demand compliance sweep checking expiration dates across all documents.
- **Automated Cron Jobs ([`scheduler.js`](file:///home/krishnanantha/major-project/CMP-P1/backend/src/jobs/scheduler.js)):**
  - Midnight cron (`0 0 * * *`): Evaluates upcoming document expiries (30-day window) and lapsed documents, dispatching in-app alerts and emails.

---

## 5. Security & Isolation Controls

```mermaid
flowchart TD
    Req[Incoming Request] --> A[authenticateJWT]
    A -->|Verify Bearer Token| B[Extract req.user & req.user.org_id]
    B --> C[tenantScope Middleware]
    C -->|Force org_id scope on query context| D{Endpoint Requirements}
    D -->|Role Restriction| E[authorizeRoles: ORG_ADMIN]
    D -->|Facility Scope| F[verifyLocationAccess: User assigned to locationId?]
    E --> G[Controller & Service Logic]
    F --> G
```

1. **Multi-Tenant Scoping:**
   [`backend/src/middleware/tenantScope.js`](file:///home/krishnanantha/major-project/CMP-P1/backend/src/middleware/tenantScope.js) attaches the tenant `org_id` from the verified JWT payload to `req.orgId`. Controllers and services strictly query `where: { org_id: req.user.org_id }`.
2. **Role-Based Access Control (RBAC):**
   [`backend/src/middleware/rbac.js`](file:///home/krishnanantha/major-project/CMP-P1/backend/src/middleware/rbac.js) guards critical administrative routes (`ORG_ADMIN` required for tenant settings, link revocation, and user provisioning).
3. **Location Isolation:**
   `verifyLocationAccess` ensures location managers cannot inspect or modify facilities outside their assigned scope.
4. **Data Integrity & Immutability:**
   Every document upload computes and stores an immutable SHA-256 cryptographic digest to detect unauthorized storage modification.

---

## 6. Frontend Architecture & Design System

The frontend application in [`frontend/src/`](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/) is built with modern React principles:

### 6.1 State Management & Context
- **`AuthContext` ([`AuthContext.jsx`](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/context/AuthContext.jsx)):** Holds the current authenticated user session, organization metadata, assigned location scopes, and token persistence in `localStorage`.
- **`NotificationContext` ([`NotificationContext.jsx`](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/context/NotificationContext.jsx)):** Manages real-time alert polling, badge counters, and toast popups.

### 6.2 Key Views & Pages
- **`Dashboard` ([`Dashboard.jsx`](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Dashboard/Dashboard.jsx)):** Top-level statutory summary, overall compliance gauge, critical alerts banner, and quick-upload CTA.
- **`Locations` ([`Locations.jsx`](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Locations/Locations.jsx)):** Grid view of all facilities with state badges, operating types, current score badges, and location manager assignments.
- **`Documents` ([`Documents.jsx`](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Documents/Documents.jsx)):** Document registry with tabbed filtering (`All`, `Pending Verification`, `Verified`, `Expiring Soon`, `Rejected`), version history inspection, download triggers, and verify/reject modals.
- **`ComplianceScore` ([`ComplianceScore.jsx`](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/ComplianceScore/ComplianceScore.jsx)):** Multi-tab facility analysis:
  - *Engine Breakdown:* Score breakdown gauges, missing mandatory license lists, and AI remediation advice.
  - *Dependency Graph:* Visual interactive DAG showing prerequisite chains and blocking statuses.
  - *Trend Timeline:* Historical compliance trend chart tracking score changes over time.
  - *Statutory Calendar:* Compliance milestones and tax deadlines.
- **`AuditLinks` ([`AuditLinks.jsx`](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/AuditLinks/AuditLinks.jsx)):** Management interface to generate time-bound, PIN-protected public audit rooms and revoke active links.
- **`AuditView` ([`AuditView.jsx`](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/AuditView/AuditView.jsx)):** Clean, unauthenticated external inspector interface for reviewing and downloading verified audit room documents.

### 6.3 Reusable UI Components
- **`ScoreGauge.jsx`:** Animated circular SVG gauge rendering scores from 0 to 100 with dynamic color transitions (Red < 50, Amber 50–79, Green 80+).
- **`DependencyGraph.jsx`:** Custom Canvas/SVG graph rendering regulatory prerequisite chains with dependency arrows and status badges.
- **`TrendChart.jsx`:** Historical line chart displaying score trajectories over time.
- **`Skeletons.jsx`:** High-fidelity loading skeletons and buffering indicators.

---

## 7. Environment & Configuration Reference

### 7.1 Backend Configuration (`backend/.env`)

```ini
# Core
PORT=5000
NODE_ENV=development

# Database (Prisma)
# Note: For Supabase, use port 6543 (Transaction Pooler) with pgbouncer=true for runtime queries
DATABASE_URL="postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5"

# JWT Authentication
JWT_SECRET="your-secure-random-32-character-secret"
JWT_EXPIRES_IN="7d"

# Storage Configuration (S3 / MinIO)
STORAGE_PROVIDER="s3" # Options: 's3' or 'minio'
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_S3_BUCKET="sclip-documents"
AWS_REGION="ap-south-1"
S3_ENDPOINT="https://[project-id].storage.supabase.co/storage/v1/s3"

# Email Configuration
EMAIL_PROVIDER="resend" # Options: 'resend' or 'nodemailer'
RESEND_API_KEY="re_your_resend_api_key"
RESEND_FROM="Compliance Platform <alerts@yourdomain.com>"
```

### 7.2 Frontend Configuration (`frontend/.env`)

```ini
# Leave empty in development to leverage Vite proxy
VITE_API_BASE=""
```

---

## 8. Verification & Operational Workflows

### 8.1 Running Locally with Docker (MinIO + Local Postgres)
```bash
# 1. Start local Postgres and MinIO
docker compose up -d

# 2. Run database migrations & seed demo data
cd backend
npm run migrate
npm run seed

# 3. Start backend API (port 5000)
npm run dev

# 4. Start frontend Vite dev server (port 5173)
cd ../frontend
npm run dev
```

### 8.2 Automated Test Suites (Vitest)
The test suite utilizes embedded Postgres and independent safety guards to prevent running tests against live production databases:
```bash
cd backend
# Runs full test suite against isolated local database
npx vitest run --config tests/vitest.config.mjs
```
