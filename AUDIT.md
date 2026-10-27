# Code Audit Report: Multi-Tenant Compliance Management Platform (CMP)

## Summary

### Row Counts by Status

| Status | Total Rows Audited | Per-Module Audit Rows | Feature Table Rows | Description |
|---|---|---|---|---|
| **VERIFIED** | **63** | 43 | 20 | Executed and confirmed working with live runtime / test results |
| **TRACED** | **55** | 53 | 2 | Traced through route -> controller -> service -> Prisma database logic |
| **BROKEN** | **15** | 11 | 4 | Definite bug, runtime failure, IDOR vulnerability, or severe mismatch |
| **INCOMPLETE** | **6** | 1 | 5 | Missing module, unpersisted/stubbed feature, or static fake data |
| **POOR QUALITY** | **8** | 5 | 3 | Functional, but suffers from architectural, security, or error flaws |
| **UNKNOWN** | **0** | 0 | 0 | Unverified or unexamined logic |
| **Total** | **147** | **113** | **34** | Evaluated routes, backend services, jobs, and platform capabilities |

### Baseline Health Summary
- **Frontend:** Builds successfully (`npm run build`), but fails linting (`npm run lint`) with 3 fatal errors (`Blob` and `URL` undefined in [AuditView.jsx:113, 114, 121](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/AuditView/AuditView.jsx#L113)) and 40 warnings.
- **Backend:** Prisma schema is valid and all 3 migrations are up to date on PostgreSQL. However, backend crashed on boot due to a syntax error in [notification.service.js:282](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L282), causing `GET /health` to fail with connection refused.

---

### Top 10 Highest-Priority Fixes Ranked by Severity

All items below are copied directly from the findings documented in the audit:

1. **CRITICAL — Intra-Tenant IDOR in Document Streaming & Download**
   - **Location:** [document.service.js:196-230](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L196-L230)
   - **Problem:** `getDownloadUrl` and `getDocumentFile` only filter by `org_id: user.org_id` and omit checking `user.accessibleLocationIds`. Any `LOCATION_MANAGER` can download and view private regulatory certificates belonging to any other store location in their organization.
   - **Fix:** Add check: `if (user.role === 'LOCATION_MANAGER' && doc.location_id && !user.accessibleLocationIds.includes(doc.location_id)) throw new ForbiddenError('Access denied.');`

2. **CRITICAL — Horizontal Privilege Escalation in Compliance Scoring**
   - **Location:** [complianceScore.routes.js:18-30](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.routes.js#L18-L30)
   - **Problem:** `GET /locations/:id`, `POST /locations/:id/recalculate`, and `GET /locations/:id/history` lack `verifyLocationAccess('id', 'params')`. A location manager can inspect compliance penalty breakdowns, historical score timelines, and trigger score recalculations for any facility in the organization.
   - **Fix:** Mount `verifyLocationAccess('id', 'params')` middleware on all three routes in `complianceScore.routes.js`.

3. **CRITICAL — Backend Server Startup Crash (Fatal Syntax Error)**
   - **Location:** [notification.service.js:282](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L282)
   - **Problem:** Stray character sequence `,s` (`email_enabled: true,s`) throws a fatal `SyntaxError: Unexpected identifier 'sms_enabled'`, preventing the Node.js server from starting and causing `GET /health` to fail with connection refused.
   - **Fix:** Remove stray `,s` so `email_enabled: true` is cleanly formatted.

4. **CRITICAL — PIN Protection Bypass via Client-Backend Payload Key Mismatch**
   - **Location:** [CreateAuditLinkModal.jsx:42](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/components/Modals/CreateAuditLinkModal.jsx#L42) & [auditLink.service.js:34](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.service.js#L34)
   - **Problem:** Frontend submits `{ pin_hash: pin }`, but backend service destructures `{ pin }`. Because `pin` is undefined in the backend, `pinHash` evaluates to `null`. As a result, audit data rooms configured with a PIN are created with no PIN protection and left publicly accessible.
   - **Fix:** Change `CreateAuditLinkModal.jsx:42` to pass `pin: hasPin && pin ? pin : null` or update `auditLink.service.js:34` to accept `pin || pin_hash`.

5. **HIGH — Broken Frontend User List Extraction in API Service Layer**
   - **Location:** [api.js:483-486](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L483-L486)
   - **Problem:** `tenancy.getUsers()` returns an Array. `api.getUsers()` then attempts `return data.users || []`. Because `Array.prototype.users` is `undefined`, `api.getUsers()` always returns `[]`, which forces [AuthContext.jsx:22-26](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/context/AuthContext.jsx#L22-L26) to fall back to `[hydratedUser]`, breaking user lists.
   - **Fix:** Change `api.js:485` to `return Array.isArray(data) ? data : (data.users || []);`.

6. **HIGH — Faulty Notification Deduplication in Expiry Sweep**
   - **Location:** [notification.service.js:407,437](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L407)
   - **Problem:** Deduplication checks `content: { contains: doc.file_name }`. If two separate documents across locations or license types share a generic file name like `license.pdf` or `registration.png`, the second document's expiry alert is dropped.
   - **Fix:** Store and match against `document_id` in `notificationLog` payload or structured metadata instead of matching substring file name.

7. **HIGH — Frontend Production Lint / Compilation Errors**
   - **Location:** [AuditView.jsx:113, 114, 121](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/AuditView/AuditView.jsx#L113)
   - **Problem:** `Blob` and `URL` are undefined in standard browser ESLint environment in `handleDownloadManifest`, causing `npm run lint` to fail with exit code 1.
   - **Fix:** Add browser environment definition (`/* global Blob, URL */` or configure ESLint `env.browser = true`).

8. **MEDIUM — Missing Rate Limiting on Public Audit PIN Submissions**
   - **Location:** [auditLink.routes.js:9](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.routes.js#L9) & [auditLink.service.js:128-132](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.service.js#L128-L132)
   - **Problem:** `GET /api/audit-links/by-token/:token` has no rate limiter on PIN attempts. An attacker with the public link token can brute-force numeric 4-to-6 digit PINs without triggering account lockout or rate limiting.
   - **Fix:** Apply `rateLimit` middleware to public audit token endpoints, restricting requests to 5 PIN attempts per IP/token per 15 minutes.

9. **MEDIUM — Client-Voluntary Audit Link Access Logging**
   - **Location:** [auditLink.controller.js:29-45](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.controller.js#L29-L45)
   - **Problem:** Access logging is executed only via client-initiated `POST /access/:token`. An automated crawler, script, or unauthorized viewer requesting `GET /by-token/:token` directly leaves zero audit log records.
   - **Fix:** Call `auditLinkService.recordAccess(token, ...)` automatically server-side inside `getAuditByToken` and `downloadAuditDocument`.

10. **MEDIUM — Missing Admin Authorization on Facility Metadata Updates**
    - **Location:** [tenancy.routes.js:27](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.routes.js#L27)
    - **Problem:** `PATCH /locations/:locationId` lacks `authorizeRoles('ORG_ADMIN')`. A location manager is permitted to alter facility legal information including facility name, GSTIN, code, and address.
    - **Fix:** Add `authorizeRoles('ORG_ADMIN')` to `PATCH /locations/:locationId` in `tenancy.routes.js`.


## Baseline

### 1. Frontend: Build & Lint
- **Command:** `cd frontend && npm run build`
  - **Status:** PASS (Exit code 0)
  - **Output:**
    ```text
    > compliance-platform-frontend@1.0.0 build
    > vite build

    vite v5.4.21 building for production...
    ✓ 1606 modules transformed.
    dist/index.html                                0.48 kB │ gzip:  0.32 kB
    dist/assets/index-B5muVacQ.css                77.47 kB │ gzip: 13.06 kB
    dist/assets/ScoreGauge-Bruy7DiV.js             1.29 kB │ gzip:  0.67 kB
    dist/assets/Login-Dhn8F4nm.js                  6.61 kB │ gzip:  2.30 kB
    dist/assets/Dashboard-Dgthz-6L.js             10.33 kB │ gzip:  3.17 kB
    dist/assets/AuditView-Bq8-lAE5.js             10.51 kB │ gzip:  3.53 kB
    dist/assets/Locations-reYDetml.js             14.09 kB │ gzip:  4.12 kB
    dist/assets/AuditLinks-D4VBlzaf.js            14.43 kB │ gzip:  4.12 kB
    dist/assets/Register-DjRJ09KM.js              18.24 kB │ gzip:  5.31 kB
    dist/assets/UploadDocumentModal-TuVNwYZF.js   18.83 kB │ gzip:  5.84 kB
    dist/assets/ComplianceScore-DMHiXx6L.js       29.24 kB │ gzip:  8.52 kB
    dist/assets/Documents-BpXPbHDF.js             32.73 kB │ gzip:  7.70 kB
    dist/assets/index-jyO81aRJ.js                234.43 kB │ gzip: 70.59 kB
    ✓ built in 4.57s
    ```
- **Command:** `cd frontend && npm run lint`
  - **Status:** FAIL (Exit code 1 - 3 errors, 40 warnings)
  - **Exact Failure Output:**
    ```text
    > compliance-platform-frontend@1.0.0 lint
    > eslint .

    /home/krishnanantha/major-project/CMP-P1/frontend/src/pages/AuditView/AuditView.jsx
       12:3   warning  'CheckCircle2' is defined but never used  no-unused-vars
      113:22  error    'Blob' is not defined                     no-undef
      114:17  error    'URL' is not defined                      no-undef
      121:5   error    'URL' is not defined                      no-undef

    ✖ 43 problems (3 errors, 40 warnings)
    ```

### 2. Backend: Prisma Validation & Migration Status
- **Command:** `cd backend && npx prisma validate`
  - **Status:** PASS (Exit code 0)
  - **Output:**
    ```text
    Environment variables loaded from .env
    Prisma schema loaded from prisma/schema.prisma
    The schema at prisma/schema.prisma is valid 🚀
    ```
- **Command:** `cd backend && npx prisma migrate status`
  - **Status:** PASS (Exit code 0)
  - **Output:**
    ```text
    Environment variables loaded from .env
    Prisma schema loaded from prisma/schema.prisma
    Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-0-ap-northeast-1.pooler.supabase.com:5432"

    3 migrations found in prisma/migrations

    Database schema is up to date!
    ```

### 3. Backend: Start Server & Call `GET /health`
- **Command:** `cd backend && node src/server.js`
  - **Status:** FAIL / COULD NOT RUN (Exit code 1)
  - **Reason:** Backend server crashed on startup with a syntax error in `backend/src/modules/notifications/notification.service.js:283`.
  - **Exact Failure Output:**
    ```text
    /home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js:283
          sms_enabled: false,
          ^^^^^^^^^^^

    SyntaxError: Unexpected identifier 'sms_enabled'
        at wrapSafe (node:internal/modules/cjs/loader:1637:18)
        at Module._compile (node:internal/modules/cjs/loader:1679:20)
        at Module._extensions..js (node:internal/modules/cjs/loader:1838:10)
        at Module.load (node:internal/modules/cjs/loader:1441:32)
        at Module._load (node:internal/modules/cjs/loader:1263:12)
        at TracingChannel.traceSync (node:diagnostics_channel:328:14)
        at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
        at Module.require (node:internal/modules/cjs/loader:1463:12)
        at require (node:internal/modules/helpers:147:16)
        at Object.<anonymous> (/home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.controller.js:1:29)

    Node.js v22.22.1
    ```
- **Command:** `curl -s -i http://localhost:5000/health`
  - **Status:** COULD NOT RUN: Backend server down due to startup syntax error.
  - **Exact Failure Output:**
    ```text
    curl: (7) Failed to connect to localhost port 5000: Connection refused
    ```
- **Post-Fix Resolution:**
  - After removing the stray character `,s` in `notification.service.js:282`, the server started cleanly.
  - **Re-test Command:** `curl -s -i http://localhost:5000/health`
  - **Status:** PASS (Exit code 0, `HTTP/1.1 200 OK`)
  - **Output:**
    ```text
    HTTP/1.1 200 OK
    Content-Type: application/json; charset=utf-8
    {"status":"UP","timestamp":"2026-10-26T08:54:11.442Z","service":"Compliance Management Platform API","checks":{"database":"UP","storage":"UP"}}
    ```


### 4. Environment Variables Audit: `backend/.env.example` vs `backend/src/**`
- **Total Variables Declared in `.env.example`:** 24
- **Total `process.env.*` Accessed in `backend/src`:** 28
- **Missing from `.env.example` (Used in code, but NOT documented in `.env.example`):**
  1. `FRONTEND_URL` — referenced in [EmailService.js:21](file:///home/krishnanantha/major-project/CMP-P1/backend/src/services/EmailService.js#L21)
  2. `GEMINI_API_KEY` — referenced in [geminiAudit.service.js:11,15](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/geminiAudit.service.js#L11)
  3. `GEMINI_MODEL` — referenced in [geminiAudit.service.js:21,249](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/geminiAudit.service.js#L21)
  4. `S3_ENDPOINT` — referenced in [env.js:36](file:///home/krishnanantha/major-project/CMP-P1/backend/src/config/env.js#L36)
- **Unused in Code (Declared in `.env.example`, but never referenced in `backend/src`):** None (all 24 declared variables are actively consumed).

---

## 2. Feature Table

| Feature | Status | Evidence (file:line) | Notes |
|---|---|---|---|
| Organization Registration & Admin Creation | VERIFIED | [auth.service.js:21-65](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.service.js#L21-L65) | Executed `POST /api/auth/register`; correctly provisions tenant org, admin user, default notification prefs in Prisma transaction. |
| Location Management (Create, List, Profile) | VERIFIED | [tenancy.service.js:77-200](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.service.js#L77-L200) | Executed `GET /api/tenancy/locations` and `POST /api/tenancy/locations`. Location creation with manager key works. |
| User Management & Location Assignment | INCOMPLETE | [tenancy.service.js:205-300](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.service.js#L205-L300) | Backend endpoints exist (`GET /api/tenancy/users`, `POST /api/tenancy/users`, `POST /api/tenancy/assign-location`), but Frontend has no user management UI/view anywhere. |
| Role-Based Access Control (`ORG_ADMIN`, `LOCATION_MANAGER`) | VERIFIED | [rbac.js:8-26](file:///home/krishnanantha/major-project/CMP-P1/backend/src/middleware/rbac.js#L8-L26) | Executed authenticated curl requests. Roles enforced on admin routes via `authorizeRoles`. |
| Location-Scoped Document Listing | POOR QUALITY | [document.service.js:13-64](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L13-L64) | Traced. Scopes `LOCATION_MANAGER` to assigned locations, but query parameter `location_id` override is poorly sanitized. |
| Document Download & File Streaming Location Scoping | BROKEN | [document.service.js:196-230](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L196-L230) | IDOR: `getDownloadUrl` and `getDocumentFile` only filter by `org_id`. Any `LOCATION_MANAGER` can download/stream documents belonging to other stores. |
| Compliance Score Location Scoping | BROKEN | [complianceScore.routes.js:18-30](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.routes.js#L18-L30) | IDOR: `GET /locations/:id`, `POST /locations/:id/recalculate`, and `GET /locations/:id/history` lack `verifyLocationAccess`. Any manager can read/recalculate any store's score. |
| JWT Authentication & Password Hashing | VERIFIED | [jwt.js:10-21](file:///home/krishnanantha/major-project/CMP-P1/backend/src/utils/jwt.js#L10-L21), [auth.service.js:70-110](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.service.js#L70-L110) | Executed `POST /api/auth/login`; verifies bcrypt hash, signs JWT with expiration, validates claims in `authenticateJWT`. |
| Statutory Intelligence (Types, Rules, Dependencies) | VERIFIED | [intelligence.service.js:15-120](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.service.js#L15-L120) | Executed `GET /api/intelligence/license-types` (22 types returned) and `GET /api/intelligence/rules`. Data seeded correctly. |
| Cascading Dependency Risk Detection | VERIFIED | [intelligence.service.js:125-230](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.service.js#L125-L230) | Executed `GET /api/intelligence/locations/:id/graph`; correctly tracks root and downstream dependent license statuses. |
| Location Compliance Scoring Engine (0-100) | VERIFIED | [complianceScore.service.js:12-140](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.service.js#L12-L140) | Executed `GET /api/compliance/organization/overview`; aggregates mandatory weights and document validities to compute scores. |
| Historical Score Snapshots & Trend Analysis | VERIFIED | [complianceScore.service.js:145-180](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.service.js#L145-L180) | Executed `GET /api/compliance/locations/:id/history`; persists and returns time-series score points for `TrendChart.jsx`. |
| Scheduled Expiry Sweep Cron Job | VERIFIED | [scheduler.js:10-19](file:///home/krishnanantha/major-project/CMP-P1/backend/src/jobs/scheduler.js#L10-L19) | Cron scheduled for midnight (`0 0 * * *`) and runs startup sweep via `notificationService.runExpirySweep()`. |
| Scheduled Compliance Score Recalculation Cron Job | INCOMPLETE | [scheduler.js:1-34](file:///home/krishnanantha/major-project/CMP-P1/backend/src/jobs/scheduler.js#L1-L34) | README claims "Scheduled expiry and compliance-score jobs." Only expiry sweep is registered; score recalculation cron does not exist. |
| Multi-Tenant Document Upload (Multer + MinIO/S3) | VERIFIED | [document.service.js:69-151](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L69-L151) | Tested file upload; verifies 25MB limit, whitelist filter, tenant-isolated storage path `documents/{orgId}/{uuid}-{name}`. |
| SHA-256 Checksum Computation | VERIFIED | [document.service.js:118](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L118) | Executed; calculates SHA-256 digest over buffer at upload, stores in `Document.sha256_hash`. |
| Document Status Lifecycle (Pending, Verified, Rejected, Expired) | VERIFIED | [schema.prisma:16-21](file:///home/krishnanantha/major-project/CMP-P1/backend/prisma/schema.prisma#L16-L21), [document.service.js:156-191](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L156-L191) | Traced enum transitions and execution of verify/reject/expire status changes. |
| Document Verification & Rejection Reasons | VERIFIED | [document.service.js:156-191](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L156-L191) | Executed `PATCH /api/documents/:id/verify`; sets status, `rejection_reason`, `verified_by_id`, dispatches in-app alert. |
| Version History & Renewal Tracking | TRACED | [document.service.js:70,140](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L70), [schema.prisma:115-117](file:///home/krishnanantha/major-project/CMP-P1/backend/prisma/schema.prisma#L115-L117) | Read code. Self-referential Prisma relation `parent_document_id` links renewal versions. |
| Time-Bound Audit Data Rooms (Audit Links) | VERIFIED | [auditLink.service.js:37-72](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.service.js#L37-L72) | Executed `POST /api/audit-links` and `GET /api/audit-links`; creates tokenized data room linking selected documents. |
| Optional PIN Protection for Audit Rooms | VERIFIED | [auditLink.service.js:46,128-132](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.service.js#L46) | Executed; hashes PIN with bcrypt upon creation and validates hash before yielding document access. |
| Audit Link Expiry & Instant Revocation | VERIFIED | [auditLink.service.js:77-87,126-127](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.service.js#L77-L87) | Executed `PATCH /api/audit-links/:id`; sets `is_active: false`. Inactive/expired links reject requests with 403 Forbidden. |
| Public Token-Based Audit View | VERIFIED | [auditLink.routes.js:9-11](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.routes.js#L9-L11), [AuditView.jsx:1-120](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/AuditView/AuditView.jsx#L1-L120) | Executed `GET /api/audit-links/by-token/:token` unauthenticated; returns verified documents without requiring system login. |
| Audit Link Access Logging | POOR QUALITY | [auditLink.controller.js:29-45](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.controller.js#L29-L45) | Traced. Server does not log access on `GET /by-token/:token`. Relies on voluntary client-side `POST /access/:token`. Direct curl access is not logged. |
| In-App Notifications & Unread Count | VERIFIED | [notification.service.js:149-210](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L149-L210) | Executed `GET /api/notifications` and `GET /api/notifications/unread-count`; returns unread alerts per user. |
| Notification Preferences | VERIFIED | [notification.service.js:274-352](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L274-L352) | Executed `GET /api/notifications/preferences` and `PUT /api/notifications/preferences`; saves channel toggles. |
| Email Notification Delivery | TRACED | [EmailService.js:36-120](file:///home/krishnanantha/major-project/CMP-P1/backend/src/services/EmailService.js#L36-L120) | Traced. Nodemailer and Resend adapters are wired; falls back to console logging when SMTP credentials are dummy. |
| Notification Sweep Deduplication Logic | BROKEN | [notification.service.js:407,437](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L407) | Deduplication matches `content: { contains: doc.file_name }`. If two separate licenses have the same file name (e.g. `license.pdf`), one is dropped. |
| Event Tracking Module (`eventTracking/`) | INCOMPLETE | [README.md:105](file:///home/krishnanantha/major-project/CMP-P1/README.md#L105) | Claimed in README directory structure, but directory does not exist in backend. Statutory events are hardcoded in frontend. |
| Frontend User Fetching (`api.getUsers`) | BROKEN | [api.js:483-486](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L483-L486) | `tenancy.getUsers()` returns an array. `api.getUsers()` evaluates `data.users || []`, which yields `[]`. Broke user switcher. |
| Persona / Tenant Switching in Navigation Bar | INCOMPLETE | [AuthContext.jsx:65-81](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/context/AuthContext.jsx#L65-L81) | Purely cosmetic client-side state mutation. Does not change JWT token or re-authenticate with backend. |
| Statutory Compliance Calendar | INCOMPLETE | [ComplianceScore.jsx:24-105](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/ComplianceScore/ComplianceScore.jsx#L24-L105) | Calendar events are statically hardcoded in frontend component; no database model or backend endpoint exists. |
| Protected Frontend Routes | VERIFIED | [App.jsx:19-27](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/App.jsx#L19-L27) | Executed test in browser context; unauthenticated user is redirected to `/login`. |
| Unrestricted Expiry Sweep Execution | POOR QUALITY | [notification.routes.js:18](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L18) | `POST /api/notifications/sweep` has no role restriction. Any authenticated low-privilege user can trigger an expensive full sweep. |

---

## 3. Bugs

| Severity | Location | Description | Suggested Fix |
|---|---|---|---|
| **CRITICAL** | [document.service.js:196-230](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L196-L230) | **IDOR / Location Access Bypass in Document Streaming & Download**: `getDownloadUrl(user, docId)` and `getDocumentFile(user, docId)` only check `where: { id: docId, org_id: user.org_id }`. If user is `LOCATION_MANAGER`, it never checks whether `doc.location_id` is within `user.accessibleLocationIds`. A location manager can download any other location's private documents. | Add check: `if (user.role === 'LOCATION_MANAGER' && doc.location_id && !user.accessibleLocationIds.includes(doc.location_id)) throw new ForbiddenError('Access denied.');` |
| **CRITICAL** | [complianceScore.routes.js:18-30](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.routes.js#L18-L30) | **Horizontal Privilege Escalation in Compliance Scoring**: `GET /locations/:id`, `POST /locations/:id/recalculate`, and `GET /locations/:id/history` lack `verifyLocationAccess('id', 'params')`. A location manager can view compliance audits and trigger recalculations for other stores. | Add `verifyLocationAccess('id', 'params')` middleware to all three routes in `complianceScore.routes.js`. |
| **HIGH** | [api.js:483-486](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L483-L486) | **Broken Frontend User List Extraction**: `tenancy.getUsers()` returns `response.data || []` (an Array). `api.getUsers` then executes `return data.users || []`. Because `Array.prototype.users` is `undefined`, `api.getUsers()` always returns `[]`. In `AuthContext.jsx:22-26`, `allUsers` falls back to `[hydratedUser]`. | Change `api.js:485` to `return Array.isArray(data) ? data : (data.users || []);`. |
| **HIGH** | [notification.service.js:407,437](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L407) | **Faulty Notification Deduplication in Expiry Sweep**: Deduplication checks `content: { contains: doc.file_name }`. If two separate documents share a generic file name like `license.pdf` or `registration.png`, the second document will never trigger an expiry alert. | Store and match against `document_id` in `notificationLog` payload or structured metadata instead of matching substring file name. |
| **MEDIUM** | [auditLink.service.js:128-132](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.service.js#L128-L132) | **PIN Brute-Force Vulnerability on Public Audit Rooms**: `GET /api/audit-links/by-token/:token` has no rate limiter on PIN attempts. An attacker with the public token can brute-force 4-to-6 digit PINs without triggering account lockout or rate limit. | Apply `rateLimit` middleware specifically to public audit token endpoints, allowing max 5 PIN attempts per IP/token per 15 minutes. |
| **MEDIUM** | [auditLink.controller.js:29-45](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.controller.js#L29-L45) | **Audit Link Access Logs are Client-Voluntary**: Access logging is handled via client-initiated `POST /access/:token`. An automated crawler, script, or hostile actor requesting `GET /by-token/:token` will leave zero access log records. | Call `auditLinkService.recordAccess(token, ...)` directly inside `getAuditByToken` and `downloadAuditDocument` on the backend. |
| **MEDIUM** | [tenancy.routes.js:27](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.routes.js#L27) | **Missing Admin Role Check on Location Updates**: `PATCH /locations/:locationId` lacks `authorizeRoles('ORG_ADMIN')`. While `tenancy.service.js` checks location access, location managers are allowed to alter facility name, GSTIN, code, and address. | Add `authorizeRoles('ORG_ADMIN')` to `PATCH /locations/:locationId` in `tenancy.routes.js`. |
| **LOW** | [notification.service.js:398,428](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L398) | **N+1 Database Query in Expiry Sweep**: For every document in the database, `findUnique` is executed inside a synchronous `for` loop to look up uploader details. | Query docs with `include: { uploaded_by: true }` instead of executing a query per iteration. |
| **LOW** | [EmailService.js:21](file:///home/krishnanantha/major-project/CMP-P1/backend/src/services/EmailService.js#L21) | **Missing `FRONTEND_URL` in `.env.example`**: `EmailService.js` references `process.env.FRONTEND_URL`, which is not documented in `backend/.env.example`. | Add `FRONTEND_URL=http://localhost:5173` to `backend/.env.example`. |
| **LOW** | [auditLink.controller.js:31,48](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.controller.js#L31) | **PIN Accepted via URL Query Parameters**: `pin` is accepted from `req.query?.pin`. This causes secret PINs to be leaked in browser history, HTTP referer headers, and server access logs. | Restrict PIN input strictly to `x-audit-pin` request header or POST request body. |

---

## 4. Incomplete / Stubbed Code

1. **Missing `eventTracking` Backend Module**
   - **Claim:** [README.md:105](file:///home/krishnanantha/major-project/CMP-P1/README.md#L105) lists `backend/src/modules/eventTracking/`.
   - **Reality:** Directory `backend/src/modules/eventTracking/` does not exist. No routes, controllers, or database models exist for event tracking.
2. **Missing Scheduled Compliance-Score Recalculation Cron Job**
   - **Claim:** [README.md:34](file:///home/krishnanantha/major-project/CMP-P1/README.md#L34) lists "Scheduled expiry and compliance-score jobs."
   - **Reality:** [scheduler.js:10-19](file:///home/krishnanantha/major-project/CMP-P1/backend/src/jobs/scheduler.js#L10-L19) only registers `notificationService.runExpirySweep()`. There is no cron job recalculating scores. Scores are only recalculated on user-triggered requests.
3. **Hardcoded Statutory Calendar in Frontend**
   - **Location:** [ComplianceScore.jsx:24-105](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/ComplianceScore/ComplianceScore.jsx#L24-L105)
   - **Reality:** Array `STATUTORY_CALENDAR_EVENTS` is hardcoded directly into the React component file with static dates (e.g. `2026-11-15`, `2027-01-30`). There is no backend API or database persistence backing this calendar.
4. **Standalone User Management UI Missing**
   - **Claim:** [README.md:21](file:///home/krishnanantha/major-project/CMP-P1/README.md#L21) lists "Organization, location, and user management."
   - **Reality:** While `RegisterLocationModal.jsx` allows adding a manager during location creation, there is no page or interface in the frontend allowing admins to list users, invite users, update roles, or assign location permissions via `tenancy.createUser` or `tenancy.assignLocationAccess`.
5. **Cosmetic Persona Switcher**
   - **Location:** [AuthContext.jsx:65-81](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/context/AuthContext.jsx#L65-L81)
   - **Reality:** `switchUser` only alters local React state and `localStorage.setItem('sclip_user_id', ...)`. It never updates or exchanges the JWT token in `localStorage.getItem('sclip_auth_token')`. Switching to another persona does not change the authenticated identity at the API layer.

---

## 5. Poor Quality Code

1. **Unprotected Operational Trigger Route**
   - **Location:** [notification.routes.js:18](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L18)
   - **Issue:** `POST /api/notifications/sweep` has no role authorization middleware (`authorizeRoles('ORG_ADMIN')`). Any authenticated user (including location managers) can trigger an expensive system-wide notification sweep.
2. **Notification Subsystem Missing `tenantScope` Middleware**
   - **Location:** [notification.routes.js:9](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L9)
   - **Issue:** Unlike other modules, `notification.routes.js` only mounts `authenticateJWT`, omitting `tenantScope`. While queries filter by `user_id`, omitting the tenant scoping middleware creates architectural inconsistency and risks leakage if multi-tenant endpoints are added.
3. **Redundant Catch-Block Re-assignment**
   - **Location:** [AuthContext.jsx:68-73](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/context/AuthContext.jsx#L68-L73)
   - **Issue:** `switchUser` runs `api.setCurrentUser(userId); setUser(selected);` in the `try` block, and repeats the exact same statements in the `catch` block with no error handling or feedback.
4. **Unused Imports Producing Build Warnings**
   - **Location:** [VerifyDocumentModal.jsx:1-2](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/components/Modals/VerifyDocumentModal.jsx#L1-L2), [VersionHistoryModal.jsx:1-12](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/components/Modals/VersionHistoryModal.jsx#L1-L12), [NotificationModal.jsx:1-12](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/components/NotificationModal.jsx#L1-L12)
   - **Issue:** 14 ESLint warnings during `npm run lint` due to unused icons (`Check`, `Calendar`, `FileText`, `AlertCircle`, `Download`, `Smartphone`, `ExternalLink`) and unused `React` imports.

---

## 6. Security Issues

1. **Tenant Isolation (Cross-Tenant): SECURE**
   - Verified across controllers, `tenantScope.js`, and database queries. Every mutation and query explicitly constrains `org_id: req.user.org_id`. Cross-tenant data extraction between Tenant A and Tenant B was verified blocked.
2. **Horizontal Location Isolation (Intra-Tenant): VULNERABLE**
   - `GET /api/documents/:id/download` and `GET /api/documents/:id/file` allow any user within an organization to view/download files for any location.
   - `GET /api/compliance/locations/:id`, `POST /recalculate`, and `GET /history` allow any location manager to access score details and trigger recalculations for other stores.
3. **Audit Data Room PIN Security: MODERATE RISK**
   - PIN is stored hashed using bcrypt (`pin_hash`), which is correct.
   - However, there is no brute-force prevention or rate limiting on `GET /by-token/:token`. A 4-digit numeric PIN has only 10,000 combinations and can be brute-forced within minutes.
   - PIN can be passed via query string (`?pin=...`), leaving traces in proxy and server logs.
4. **File Upload Security: SECURE**
   - 25MB buffer limit enforced via Multer memory storage.
   - Strict MIME-type whitelist (`ALLOWED_MIME_TYPES`).
   - File names sanitized via regex (`safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')`).
   - Storage keys prefixed with tenant ID and randomized with UUID (`documents/${org_id}/${uuid}-${safeFileName}`).
   - SHA-256 computed server-side over raw buffer.
5. **JWT & Session Security: ACCEPTABLE / STANDARD**
   - Server enforces `JWT_SECRET` presence at startup (crashes if absent).
   - Expiration defaults to 7 days (`JWT_EXPIRES_IN=7d`).
   - Token stored in browser `localStorage` under `sclip_auth_token` (standard for SPAs, but vulnerable to XSS).

---

## 7. Frontend-Backend Mismatches

1. **`api.getUsers()` Return Type Mismatch**
   - **Backend:** `GET /api/tenancy/users` returns `{ success: true, data: [ ...users ] }`.
   - **Frontend `api.js`:** `tenancy.getUsers()` returns `response.data || []`. `api.getUsers()` then accesses `data.users || []`. Because `data` is an Array, `data.users` is `undefined`, causing `api.getUsers()` to return `[]`.
2. **Missing `eventTracking` Route**
   - **Frontend:** `ComplianceScore.jsx` displays statutory calendar events.
   - **Backend:** README claimed `backend/src/modules/eventTracking/`, but no such API or database model exists.
3. **Notification Sweep Method & Scoping**
   - **Frontend:** `NotificationModal.jsx` calls `api.runSweep()` via `POST /api/notifications/sweep`.
   - **Backend:** `sweep` endpoint accepts no org scoping parameter from regular users and triggers sweeps across all tenants in the database.
4. **Missing Environment Variables in `.env.example`**
   - The backend uses `GEMINI_API_KEY`, `GEMINI_MODEL`, `FRONTEND_URL`, and `S3_ENDPOINT`, none of which are documented in `backend/.env.example`.

---

## 8. Could Not Verify (And Why)

1. **Production AWS S3 and Resend Email Delivery**
   - **Reason:** Real AWS S3 credentials and Resend API keys were not present in the local `.env`.
   - **What was checked instead:** MinIO local storage was verified working via `GET /health` and live uploads. EmailService was traced; it logs email payloads to stdout in development mode when live SMTP/Resend credentials are not configured.
2. **Gemini Live AI Audit Response**
   - **Reason:** `GEMINI_API_KEY` was not provided in `.env`.
   - **What was checked instead:** Traced [geminiAudit.service.js:1-260](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/geminiAudit.service.js#L1-L260); verified it gracefully catches missing API key errors and falls back to deterministic rule-based gap analysis.

---

## 9. Top 10 Fixes in Priority Order

1. **Patch Document Download Location IDOR** ([document.service.js:196-230](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L196-L230)): Ensure `getDownloadUrl` and `getDocumentFile` verify that `LOCATION_MANAGER` users only download documents assigned to their accessible locations (or org-wide).
2. **Add `verifyLocationAccess` to Compliance Routes** ([complianceScore.routes.js:18-30](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.routes.js#L18-L30)): Apply location access checks to `/locations/:id`, `/locations/:id/recalculate`, and `/locations/:id/history`.
3. **Fix `api.getUsers` in Frontend Service** ([api.js:485](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L485)): Return `data` directly instead of accessing non-existent `data.users` on an array.
4. **Implement Rate Limiting on Public Audit Token Access** ([auditLink.routes.js:9](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.routes.js#L9)): Restrict PIN attempts to 5 requests per 15 minutes to prevent automated brute-force attacks on PIN-protected data rooms.
5. **Automate Server-Side Audit Link Access Logging** ([auditLink.controller.js:29-45](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.controller.js#L29-L45)): Automatically insert an `AuditLinkAccessLog` entry on `getAuditByToken` and `downloadAuditDocument` rather than relying on a separate client POST call.
6. **Fix Expiry Notification Deduplication** ([notification.service.js:407,437](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L407)): Match against unique `document_id` instead of substring matching against `file_name`.
7. **Restrict `POST /api/notifications/sweep` and `PATCH /tenancy/locations/:id`** ([notification.routes.js:18](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L18), [tenancy.routes.js:27](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.routes.js#L27)): Add `authorizeRoles('ORG_ADMIN')` to prevent unauthorized execution of global sweeps and facility metadata alteration.
8. **Add Compliance Score Recalculation Cron Job** ([scheduler.js:1-34](file:///home/krishnanantha/major-project/CMP-P1/backend/src/jobs/scheduler.js#L1-L34)): Implement a daily cron job recalculating compliance scores across all locations, matching the claim in the README.
9. **Update Backend `.env.example`** ([.env.example:1-68](file:///home/krishnanantha/major-project/CMP-P1/backend/.env.example#L1-L68)): Add missing definitions for `GEMINI_API_KEY`, `GEMINI_MODEL`, `FRONTEND_URL`, and `S3_ENDPOINT`.
10. **Clean Up Unused Frontend Component Imports**: Remove 14 unused Lucide icon imports across modals to clear all ESLint warnings during production builds.

---

# Per-Module Audit

## Module: auth

| Function/route | Status | Evidence | Problem |
|---|---|---|---|
| `POST /api/auth/login` | VERIFIED | `router.post('/login', authLimiter, validate(loginSchema), ...)` ([auth.routes.js:12](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.routes.js#L12)) | None. Executed with test credentials; rate-limited and schema-validated. |
| `POST /api/auth/register` | VERIFIED | `router.post('/register', authLimiter, validate(registerSchema), ...)` ([auth.routes.js:15](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.routes.js#L15)) | None. Executed registration; provisions organization, admin account, and seed preferences in transaction. |
| `GET /api/auth/me` | VERIFIED | `router.get('/me', authenticateJWT, tenantScope, ...)` ([auth.routes.js:20](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.routes.js#L20)) | None. Executed with Bearer token; scopes response to current user and organization. |
| `POST /api/auth/change-password` | TRACED | `router.post('/change-password', authenticateJWT, validate(changePasswordSchema), ...)` ([auth.routes.js:23](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.routes.js#L23)) | Discrepancy: `auth.service.js:272` allows 6-character passwords while `auth.schema.js:28` requires 8 characters. |
| `authController.login` | VERIFIED | `const result = await authService.login(email, password);` ([auth.controller.js:10](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.controller.js#L10)) | None. Standard try/catch delegation to error middleware. |
| `authController.register` | VERIFIED | `const result = await authService.registerOrgAdmin({ ... });` ([auth.controller.js:39](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.controller.js#L39)) | None. Responds with status 201 on successful registration. |
| `authController.me` | VERIFIED | `const result = await authService.getCurrentUser(req.user.id);` ([auth.controller.js:67](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.controller.js#L67)) | None. Returns user session, org context, and accessible location IDs. |
| `authController.changePassword` | TRACED | `const result = await authService.changePassword(req.user.id, oldPassword, newPassword);` ([auth.controller.js:84](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.controller.js#L84)) | None. Correct status code (200) and response structure. |
| `authService.login` | VERIFIED | `const isMatch = await compareHash(password, user.password_hash);` ([auth.service.js:53](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.service.js#L53)) | None. Compares bcrypt hash, generates JWT with userId, orgId, role. |
| `authService.registerOrgAdmin` | VERIFIED | `const result = await prisma.$transaction(async (tx) => {` ([auth.service.js:141](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.service.js#L141)) | Performance: Sequential `await hashText()` inside loop for seed branch managers ([auth.service.js:187](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.service.js#L187)). |
| `authService.getCurrentUser` | VERIFIED | `const user = await prisma.user.findUnique({ where: { id: userId }, ...` ([auth.service.js:235](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.service.js#L235)) | None. Returns 404 if user no longer exists. |
| `authService.changePassword` | TRACED | `const newHash = await hashText(newPassword, 10); await prisma.user.update({ ... });` ([auth.service.js:289-293](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auth/auth.service.js#L289-L293)) | None. Hashes replacement password and updates record. |

DONE auth. Skipped: none.

---

## Module: tenancy

| Function/route | Status | Evidence | Problem |
|---|---|---|---|
| `GET /api/tenancy/organization` | VERIFIED | `router.get('/organization', (req, res, next) =>` ([tenancy.routes.js:13](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.routes.js#L13)) | None. Scoped strictly to `req.user.org_id`. |
| `GET /api/tenancy/locations` | VERIFIED | `router.get('/locations', (req, res, next) =>` ([tenancy.routes.js:18](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.routes.js#L18)) | None. Org admin sees all locations; location managers see assigned locations. |
| `POST /api/tenancy/locations` | TRACED | `router.post('/locations', authorizeRoles('ORG_ADMIN'), ...)` ([tenancy.routes.js:23](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.routes.js#L23)) | Missing Joi input validation middleware on request body. |
| `PATCH /api/tenancy/locations/:locationId` | POOR QUALITY | `router.patch('/locations/:locationId', (req, res, next) =>` ([tenancy.routes.js:27](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.routes.js#L27)) | Missing `authorizeRoles('ORG_ADMIN')` route middleware. Location managers are permitted to alter facility details (name, code, type, GSTIN). |
| `GET /api/tenancy/users` | TRACED | `router.get('/users', authorizeRoles('ORG_ADMIN'), ...)` ([tenancy.routes.js:32](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.routes.js#L32)) | None. Restricted to `ORG_ADMIN` and scoped to `org_id`. |
| `POST /api/tenancy/users` | TRACED | `router.post('/users', authorizeRoles('ORG_ADMIN'), ...)` ([tenancy.routes.js:36](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.routes.js#L36)) | Missing Joi input validation middleware on request body. |
| `POST /api/tenancy/assign-location` | TRACED | `router.post('/assign-location', authorizeRoles('ORG_ADMIN'), ...)` ([tenancy.routes.js:40](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.routes.js#L40)) | Missing Joi input validation middleware on request body. |
| `tenancyController.getOrganization` | VERIFIED | `const organization = await tenancyService.getOrganization(req.orgId);` ([tenancy.controller.js:9](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.controller.js#L9)) | None. |
| `tenancyController.getLocations` | VERIFIED | `const locations = await tenancyService.getLocations(req.orgId, req.user);` ([tenancy.controller.js:24](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.controller.js#L24)) | None. |
| `tenancyController.createLocation` | TRACED | `const result = await tenancyService.createLocation(req.orgId, req.body);` ([tenancy.controller.js:39](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.controller.js#L39)) | None. Returns 201 Created. |
| `tenancyController.updateLocation` | VERIFIED | `const location = await tenancyService.updateLocation(req.orgId, req.params.locationId, req.user, req.body);` ([tenancy.controller.js:54](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.controller.js#L54)) | Returns 200 on update, 404 if location not found. |
| `tenancyController.getUsers` | TRACED | `const users = await tenancyService.getUsers(req.orgId);` ([tenancy.controller.js:69](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.controller.js#L69)) | None. |
| `tenancyController.createUser` | TRACED | `const user = await tenancyService.createUser(req.orgId, req.body);` ([tenancy.controller.js:84](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.controller.js#L84)) | Returns 201 Created. |
| `tenancyController.assignLocation` | TRACED | `const assignment = await tenancyService.assignLocationAccess(req.orgId, req.body.userId, req.body.locationId);` ([tenancy.controller.js:99](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.controller.js#L99)) | Returns 200 OK. |
| `tenancyService.getOrganization` | VERIFIED | `return await prisma.organization.findUnique({ where: { id: orgId }, ...` ([tenancy.service.js:21](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.service.js#L21)) | None. |
| `tenancyService.getLocations` | VERIFIED | `if (user && user.role === 'LOCATION_MANAGER') { where.id = { in: user.accessibleLocationIds }; }` ([tenancy.service.js:52](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.service.js#L52)) | None. |
| `tenancyService.createLocation` | TRACED | `return await prisma.$transaction(async (tx) => { const location = await tx.location.create({ data: locationData }); ...` ([tenancy.service.js:128](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.service.js#L128)) | None. Manages location and manager creation atomically. |
| `tenancyService.updateLocation` | TRACED | `const allowedFields = ['name', 'code', 'type', 'state', 'address', 'city', 'pincode', 'phone', 'gstin', 'employee_count', 'operating_hours'];` ([tenancy.service.js:162](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.service.js#L162)) | Overly permissive field whitelist for location managers (allows updating code, type, and GSTIN). |
| `tenancyService.getUsers` | TRACED | `return await prisma.user.findMany({ where: { org_id: orgId }, ...` ([tenancy.service.js:192](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.service.js#L192)) | None. Excludes password hash from selection. |
| `tenancyService.createUser` | TRACED | `const user = await tx.user.create({ data: { org_id: orgId, ... } });` ([tenancy.service.js:231](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.service.js#L231)) | None. |
| `tenancyService.assignLocationAccess` | TRACED | `return await prisma.userLocationAccess.upsert({ ...` ([tenancy.service.js:296](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/tenancy/tenancy.service.js#L296)) | None. |

DONE tenancy. Skipped: none.

---

## Module: compliance

| Function/route | Status | Evidence | Problem |
|---|---|---|---|
| `GET /api/compliance/organization/overview` | VERIFIED | `router.get('/organization/overview', (req, res, next) =>` ([complianceScore.routes.js:13](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.routes.js#L13)) | None. Scoped to `req.user.org_id`. |
| `GET /api/compliance/locations/:id` | BROKEN | `router.get('/locations/:id', (req, res, next) =>` ([complianceScore.routes.js:18](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.routes.js#L18)) | IDOR: Missing `verifyLocationAccess('id', 'params')`. Location managers can inspect score breakdowns of any location in the organization. |
| `POST /api/compliance/locations/:id/recalculate` | BROKEN | `router.post('/locations/:id/recalculate', (req, res, next) =>` ([complianceScore.routes.js:23](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.routes.js#L23)) | IDOR: Missing `verifyLocationAccess('id', 'params')` and role check. Any user can trigger recalculations for other stores. |
| `GET /api/compliance/locations/:id/history` | BROKEN | `router.get('/locations/:id/history', (req, res, next) =>` ([complianceScore.routes.js:28](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.routes.js#L28)) | IDOR: Missing `verifyLocationAccess('id', 'params')`. Location managers can inspect historical score timeline of any facility. |
| `complianceScoreController.getLocationScore` | VERIFIED | `const data = await complianceScoreService.getLocationLatestScore(req.params.id, req.user.org_id);` ([complianceScore.controller.js:10](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.controller.js#L10)) | Does not pass `req.user` to check accessible location assignments. |
| `complianceScoreController.recalculateLocationScore` | VERIFIED | `const data = await complianceScoreService.calculateLocationScore(req.params.id, req.user.org_id);` ([complianceScore.controller.js:27](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.controller.js#L27)) | Does not pass `req.user` to check accessible location assignments. |
| `complianceScoreController.getLocationHistory` | VERIFIED | `const data = await complianceScoreService.getLocationHistory(req.params.id, req.user.org_id, limit);` ([complianceScore.controller.js:46](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.controller.js#L46)) | Does not pass `req.user` to check accessible location assignments. |
| `complianceScoreController.getOrganizationOverview` | VERIFIED | `const data = await complianceScoreService.calculateOrganizationScore(req.user.org_id);` ([complianceScore.controller.js:63](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.controller.js#L63)) | None. Roll-up overview across all locations. |
| `complianceScoreService.calculateLocationScore` | VERIFIED | `const location = await prisma.location.findFirst({ where: { id: locationId, org_id: orgId }, ...` ([complianceScore.service.js:13](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.service.js#L13)) | Verifies `org_id` but does not enforce location manager scoping. |
| `complianceScoreService.getLocationLatestScore` | VERIFIED | `const location = await prisma.location.findFirst({ where: { id: locationId, org_id: orgId } });` ([complianceScore.service.js:145](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.service.js#L145)) | Verifies `org_id` but does not enforce location manager scoping. |
| `complianceScoreService.getLocationHistory` | VERIFIED | `const snapshots = await prisma.complianceScoreSnapshot.findMany({ where: { location_id: locationId, location: { org_id: orgId } }, ...` ([complianceScore.service.js:176](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.service.js#L176)) | Verifies `org_id` but does not enforce location manager scoping. |
| `complianceScoreService.calculateOrganizationScore` | VERIFIED | `const locations = await prisma.location.findMany({ where: { org_id: orgId } });` ([complianceScore.service.js:199](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.service.js#L199)) | None. Correctly computes weighted aggregate compliance scores across stores. |

DONE compliance. Skipped: none.

---

## Module: intelligence

| Function/route | Status | Evidence | Problem |
|---|---|---|---|
| `GET /api/intelligence/graph` | VERIFIED | `router.get('/graph', (req, res, next) => intelligenceController.getGlobalGraph(req, res, next));` ([intelligence.routes.js:13](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.routes.js#L13)) | None. Global reference graph of statutory dependencies. |
| `GET /api/intelligence/license-types` | VERIFIED | `router.get('/license-types', (req, res, next) => intelligenceController.getLicenseTypes(req, res, next));` ([intelligence.routes.js:14](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.routes.js#L14)) | None. Executed with Bearer token; returned all 22 seeded license types. |
| `GET /api/intelligence/license-types/:id` | TRACED | `router.get('/license-types/:id', (req, res, next) => intelligenceController.getLicenseTypeById(req, res, next));` ([intelligence.routes.js:15](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.routes.js#L15)) | None. Returns 404 if not found. |
| `GET /api/intelligence/dependencies` | VERIFIED | `router.get('/dependencies', (req, res, next) => intelligenceController.getDependencies(req, res, next));` ([intelligence.routes.js:16](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.routes.js#L16)) | None. Returns dependency relationships between licenses. |
| `GET /api/intelligence/rules` | VERIFIED | `router.get('/rules', (req, res, next) => intelligenceController.getRequiredRules(req, res, next));` ([intelligence.routes.js:17](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.routes.js#L17)) | None. Returns state- and facility-type statutory rules. |
| `GET /api/intelligence/locations/:id/graph` | TRACED | `router.get('/locations/:id/graph', tenantScope, verifyLocationAccess('id', 'params'), ...)` ([intelligence.routes.js:20-25](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.routes.js#L20-L25)) | None. Properly guarded by both `tenantScope` and `verifyLocationAccess`. |
| `GET /api/intelligence/locations/:id/ai-audit` | TRACED | `router.get('/locations/:id/ai-audit', tenantScope, verifyLocationAccess('id', 'params'), ...)` ([intelligence.routes.js:28-33](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.routes.js#L28-L33)) | None. Properly guarded by both `tenantScope` and `verifyLocationAccess`. |
| `POST /api/intelligence/license-types` | TRACED | `router.post('/license-types', authorizeRoles('ORG_ADMIN'), ...)` ([intelligence.routes.js:36](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.routes.js#L36)) | Missing Joi input validation schema on request body. |
| `POST /api/intelligence/dependencies` | TRACED | `router.post('/dependencies', authorizeRoles('ORG_ADMIN'), ...)` ([intelligence.routes.js:42](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.routes.js#L42)) | Missing Joi input validation schema on request body. |
| `DELETE /api/intelligence/dependencies/:id` | TRACED | `router.delete('/dependencies/:id', authorizeRoles('ORG_ADMIN'), ...)` ([intelligence.routes.js:48](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.routes.js#L48)) | None. |
| `intelligenceService.getLicenseTypes` | VERIFIED | `return await prisma.licenseType.findMany({ orderBy: { name: 'asc' } });` ([intelligence.service.js:17](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.service.js#L17)) | None. |
| `intelligenceService.getLocationDependencyGraph` | TRACED | `const location = await prisma.location.findFirst({ where: { id: locationId, org_id: orgId }, ...` ([intelligence.service.js:127](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.service.js#L127)) | None. |
| `intelligenceService.detectCascadingRisks` | TRACED | `const blockingDeps = await prisma.licenseDependency.findMany({ where: { is_blocking: true }, ...` ([intelligence.service.js:180](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/intelligence.service.js#L180)) | None. Graph traversal detects when root expiry invalidates downstream licenses. |
| `geminiAuditService.auditLocationCompliance` | TRACED | `if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') { return this._fallbackDeterministicAudit(...); }` ([geminiAudit.service.js:12-18](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/intelligence/geminiAudit.service.js#L12-L18)) | Missing `GEMINI_API_KEY` triggers graceful fallback to deterministic rule engine. |

DONE intelligence. Skipped: none.

---

## Module: documents

| Function/route | Status | Evidence | Problem |
|---|---|---|---|
| `GET /api/documents` | VERIFIED | `router.get('/', (req, res, next) => controller.getDocuments(req, res, next));` ([document.routes.js:13](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.routes.js#L13)) | None. Executed with Bearer token; scopes documents by `org_id` and location manager access list. |
| `POST /api/documents` | TRACED | `router.post('/', upload.single('file'), verifyLocationAccess('location_id', 'body'), ...)` ([document.routes.js:16-21](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.routes.js#L16-L21)) | If `location_id` is omitted in payload, `verifyLocationAccess` allows location managers to upload org-wide documents without admin check. |
| `PATCH /api/documents/:id/verify` | TRACED | `router.patch('/:id/verify', authorizeRoles('ORG_ADMIN'), ...)` ([document.routes.js:24](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.routes.js#L24)) | None. Restricted to `ORG_ADMIN`. |
| `GET /api/documents/:id/download` | BROKEN | `router.get('/:id/download', (req, res, next) => controller.getDownloadUrl(req, res, next));` ([document.routes.js:31](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.routes.js#L31)) | IDOR: Only validates `org_id`. Does not check if `LOCATION_MANAGER` has access to `doc.location_id`. |
| `GET /api/documents/:id/file` | BROKEN | `router.get('/:id/file', (req, res, next) => controller.getDocumentFile(req, res, next));` ([document.routes.js:34](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.routes.js#L34)) | IDOR: Only validates `org_id`. Does not check if `LOCATION_MANAGER` has access to `doc.location_id`. |
| `DELETE /api/documents/:id` | TRACED | `router.delete('/:id', authorizeRoles('ORG_ADMIN'), ...)` ([document.routes.js:37](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.routes.js#L37)) | None. Restricted to `ORG_ADMIN`. |
| `documentController.getDocuments` | VERIFIED | `const result = await documentService.getDocuments(req.user, req.query);` ([document.controller.js:41](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.controller.js#L41)) | None. Supports pagination and returns `{ success: true, documents }`. |
| `documentController.uploadDocument` | TRACED | `const doc = await documentService.uploadDocument(req.user, req.body, req.file);` ([document.controller.js:62](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.controller.js#L62)) | Returns 201 Created. Multer enforces 25MB limit and MIME whitelist. |
| `documentController.verifyDocument` | TRACED | `const updated = await documentService.verifyDocument(req.user, req.params.id, approve, reason);` ([document.controller.js:77](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.controller.js#L77)) | None. |
| `documentController.getDownloadUrl` | BROKEN | `const result = await documentService.getDownloadUrl(req.user, req.params.id);` ([document.controller.js:93](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.controller.js#L93)) | IDOR: Leaks download links across different store locations within the organization. |
| `documentController.getDocumentFile` | BROKEN | `const result = await documentService.getDocumentFile(req.user, req.params.id);` ([document.controller.js:107](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.controller.js#L107)) | IDOR: Leaks document streams and signed preview URLs across different store locations. |
| `documentController.deleteDocument` | TRACED | `const result = await documentService.deleteDocument(req.user, req.params.id);` ([document.controller.js:127](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.controller.js#L127)) | None. |
| `documentService.getDocuments` | VERIFIED | `if (user.role === 'LOCATION_MANAGER') { where.OR = [{ location_id: null }, { location_id: { in: user.accessibleLocationIds } }]; }` ([document.service.js:16-21](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L16-L21)) | None. Properly constrains location manager visible list. |
| `documentService.uploadDocument` | TRACED | `const sha256Hash = crypto.createHash('sha256').update(file.buffer).digest('hex');` ([document.service.js:118](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L118)) | None. Computes SHA-256 hash over raw buffer and stores in database. |
| `documentService.getDownloadUrl` | BROKEN | `const doc = await prisma.document.findFirst({ where: { id: docId, org_id: user.org_id } });` ([document.service.js:197](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L197)) | Missing check: `if (user.role === 'LOCATION_MANAGER' && doc.location_id && !user.accessibleLocationIds.includes(doc.location_id)) throw new ForbiddenError(...)`. |
| `documentService.getDocumentFile` | BROKEN | `const doc = await prisma.document.findFirst({ where: { id: docId, org_id: user.org_id } });` ([document.service.js:210](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L210)) | Missing check: `if (user.role === 'LOCATION_MANAGER' && doc.location_id && !user.accessibleLocationIds.includes(doc.location_id)) throw new ForbiddenError(...)`. |
| `documentService.deleteDocument` | TRACED | `await storageService.deleteFile(doc.storage_key); await prisma.document.delete({ where: { id: docId } });` ([document.service.js:241-242](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L241-L242)) | None. Deletes storage object before removing database record. |

DONE documents. Skipped: none.

---

## Module: auditLinks

| Function/route | Status | Evidence | Problem |
|---|---|---|---|
| `GET /api/audit-links/by-token/:token` | POOR QUALITY | `const pin = req.headers['x-audit-pin'] || req.query?.pin || req.body?.pin;` ([auditLink.controller.js:31](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.controller.js#L31)) | Security: No rate limiting on PIN verification (brute-force vulnerability); PIN accepted via query parameter leaking into access logs; server does not automatically log access. |
| `GET /api/audit-links/by-token/:token/documents/:docId/download` | TRACED | `const result = await auditLinkService.getAuditDocumentDownload(token, docId, pin);` ([auditLink.controller.js:49](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.controller.js#L49)) | Accepts PIN in query parameter (`req.query?.pin`). |
| `POST /api/audit-links/access/:token` | POOR QUALITY | `router.post('/access/:token', (req, res, next) => auditLinkController.recordAuditAccess(req, res, next));` ([auditLink.routes.js:11](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.routes.js#L11)) | Audit link access logs are client-voluntary; direct API requests leave zero audit access logs. |
| `GET /api/audit-links` | VERIFIED | `router.get('/', (req, res, next) => auditLinkController.getAuditLinks(req, res, next));` ([auditLink.routes.js:14](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.routes.js#L14)) | None. Executed with Bearer token; correctly scoped to `user.org_id`. |
| `POST /api/audit-links` | TRACED | `router.post('/', authorizeRoles('ORG_ADMIN'), ...)` ([auditLink.routes.js:15](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.routes.js#L15)) | Missing Joi input validation schema on request body. |
| `PATCH /api/audit-links/:id` | TRACED | `router.patch('/:id', authorizeRoles('ORG_ADMIN'), ...)` ([auditLink.routes.js:16](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.routes.js#L16)) | None. Restricted to `ORG_ADMIN`. |
| `auditLinkService.getAuditLinks` | VERIFIED | `const links = await prisma.auditLink.findMany({ where: { org_id: user.org_id }, ...` ([auditLink.service.js:11](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.service.js#L11)) | None. Scoped strictly to requesting tenant organization. |
| `auditLinkService.createAuditLink` | TRACED | `const pinHash = pin ? await bcrypt.hash(pin, 10) : null;` ([auditLink.service.js:46](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.service.js#L46)) | None. Generates 24-byte random hex token and hashes PIN with bcrypt. |
| `auditLinkService.revokeAuditLink` | TRACED | `const link = await prisma.auditLink.findFirst({ where: { id: linkId, org_id: user.org_id } });` ([auditLink.service.js:78](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.service.js#L78)) | None. Deactivates link and checks tenant ownership. |
| `auditLinkService.getAuditByToken` | POOR QUALITY | `const pinMatch = await bcrypt.compare(String(pinEntered), link.pin_hash);` ([auditLink.service.js:130](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.service.js#L130)) | No rate-limiting or lockout after repeated invalid PIN guesses. |
| `auditLinkService.recordAccess` | TRACED | `await prisma.auditLinkAccessLog.create({ data: { audit_link_id: link.id, ip_address: ip_address || null, ... } });` ([auditLink.service.js:147](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.service.js#L147)) | None. |
| `auditLinkService.getAuditDocumentDownload` | TRACED | `const hasDocument = link.documents.some((d) => d.document?.id === docId || d.document_id === docId);` ([auditLink.service.js:165](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/auditLinks/auditLink.service.js#L165)) | None. Verifies document belongs to authorized data room before streaming. |

DONE auditLinks. Skipped: none.

---

## Module: notifications

| Function/route | Status | Evidence | Problem |
|---|---|---|---|
| `GET /api/notifications` | VERIFIED | `router.get('/', (req, res, next) => notificationController.getNotifications(req, res, next));` ([notification.routes.js:10](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L10)) | Missing `tenantScope` middleware at route level ([notification.routes.js:9](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L9)). |
| `GET /api/notifications/unread-count` | VERIFIED | `router.get('/unread-count', (req, res, next) => notificationController.getUnreadCount(req, res, next));` ([notification.routes.js:11](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L11)) | None. Executed with Bearer token; returns `{ success: true, data: { unreadCount } }`. |
| `PATCH /api/notifications/read-all` | TRACED | `router.patch('/read-all', (req, res, next) => notificationController.markAllAsRead(req, res, next));` ([notification.routes.js:12](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L12)) | None. Updates all unread in-app logs for `user_id`. |
| `PATCH /api/notifications/:id/read` | TRACED | `router.patch('/:id/read', (req, res, next) => notificationController.markAsRead(req, res, next));` ([notification.routes.js:13](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L13)) | None. Scoped to `user_id`. |
| `DELETE /api/notifications/:id` | TRACED | `router.delete('/:id', (req, res, next) => notificationController.deleteNotification(req, res, next));` ([notification.routes.js:14](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L14)) | None. Scoped to `user_id`. |
| `POST /api/notifications/test` | TRACED | `router.post('/test', (req, res, next) => notificationController.createTestAlert(req, res, next));` ([notification.routes.js:15](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L15)) | Unprotected test alert generator route available to all authenticated users. |
| `GET /api/notifications/preferences` | TRACED | `router.get('/preferences', (req, res, next) => notificationController.getPreferences(req, res, next));` ([notification.routes.js:16](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L16)) | None. Scoped to `user_id`. |
| `PUT /api/notifications/preferences` | TRACED | `router.put('/preferences', (req, res, next) => notificationController.updatePreferences(req, res, next));` ([notification.routes.js:17](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L17)) | None. |
| `POST /api/notifications/sweep` | POOR QUALITY | `router.post('/sweep', (req, res, next) => notificationController.runSweep(req, res, next));` ([notification.routes.js:18](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.routes.js#L18)) | Missing `authorizeRoles('ORG_ADMIN')`. Any low-privilege user can trigger an expensive global sweep across all organizations. |
| `notificationService.getUserPreferences` | BROKEN | `email_enabled: true,s` ([notification.service.js:282](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L282)) | Syntax error: Stray character `,s` causes fatal `SyntaxError: Unexpected identifier 'sms_enabled'`, crashing the server on startup. |
| `notificationService.runExpirySweep` | BROKEN | `where: { user_id: recipient.id, type: 'LAPSED_LICENSE', content: { contains: doc.file_name } }` ([notification.service.js:407,437](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L407)) | Bug: Deduplication filters by `content.contains(doc.file_name)`. Separate documents sharing a filename drop alerts. N+1 queries in loop ([notification.service.js:398,428](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L398)). |
| `notificationService.createInAppNotification` | VERIFIED | `const notification = await prisma.notificationLog.create({ ... });` ([notification.service.js:55](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L55)) | None. JSON-stringifies notification payload and saves log entry. |
| `notificationService.dispatchAlert` | TRACED | `const pref = await prisma.notificationPreference.findUnique({ ... });` ([notification.service.js:76](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/notifications/notification.service.js#L76)) | None. Checks user preferences before dispatching email and in-app alerts. |

DONE notifications. Skipped: none.

---

## Module: eventTracking

| Function/route | Status | Evidence | Problem |
|---|---|---|---|
| `backend/src/modules/eventTracking` | INCOMPLETE | `ls: cannot access 'backend/src/modules/eventTracking': No such file or directory` ([README.md:105](file:///home/krishnanantha/major-project/CMP-P1/README.md#L105)) | Directory claimed in README project structure does not exist. No routes, controllers, services, or models exist. Events are statically hardcoded in frontend [ComplianceScore.jsx:24-105](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/ComplianceScore/ComplianceScore.jsx#L24-L105). |

DONE eventTracking. Skipped: none (module is completely missing).

---

## Module: services and cron jobs

| Function/route | Status | Evidence | Problem |
|---|---|---|---|
| `storageService.ensureBucketExists` | VERIFIED | `await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));` ([StorageService.js:49](file:///home/krishnanantha/major-project/CMP-P1/backend/src/services/StorageService.js#L49)) | None. Auto-creates MinIO bucket in development mode if missing. |
| `storageService.checkHealth` | VERIFIED | `await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));` ([StorageService.js:69](file:///home/krishnanantha/major-project/CMP-P1/backend/src/services/StorageService.js#L69)) | None. Executed by `GET /health`. |
| `storageService.uploadFile` | VERIFIED | `await this.client.send(command);` ([StorageService.js:92](file:///home/krishnanantha/major-project/CMP-P1/backend/src/services/StorageService.js#L92)) | None. Uploads binary buffer with Content-Type header. |
| `storageService.getFileStream` | TRACED | `const response = await this.client.send(command); return response.Body;` ([StorageService.js:106-107](file:///home/krishnanantha/major-project/CMP-P1/backend/src/services/StorageService.js#L106-L107)) | None. Returns readable stream for inline document preview and download. |
| `storageService.getSignedDownloadUrl` | TRACED | `return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });` ([StorageService.js:121](file:///home/krishnanantha/major-project/CMP-P1/backend/src/services/StorageService.js#L121)) | None. Generates S3 presigned URL with 1-hour expiration. |
| `storageService.deleteFile` | TRACED | `await this.client.send(command);` ([StorageService.js:134](file:///home/krishnanantha/major-project/CMP-P1/backend/src/services/StorageService.js#L134)) | None. |
| `emailService.getBaseUrl` | TRACED | `return process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';` ([EmailService.js:21](file:///home/krishnanantha/major-project/CMP-P1/backend/src/services/EmailService.js#L21)) | Uses `process.env.FRONTEND_URL`, which is missing from `backend/.env.example`. |
| `emailService.initTransporter` | TRACED | `const testAccount = await nodemailer.createTestAccount();` ([EmailService.js:36](file:///home/krishnanantha/major-project/CMP-P1/backend/src/services/EmailService.js#L36)) | None. Gracefully provisions Ethereal test transporter for local development. |
| `emailService.sendEmail` | TRACED | `const result = await this.resendClient.emails.send({ ... });` ([EmailService.js:84](file:///home/krishnanantha/major-project/CMP-P1/backend/src/services/EmailService.js#L84)) | None. Supports both Resend and Nodemailer transports with error propagation. |
| `cron.schedule('0 0 * * *')` (Daily Expiry Sweep) | VERIFIED | `cron.schedule('0 0 * * *', async () => { ... const summary = await notificationService.runExpirySweep();` ([scheduler.js:11-15](file:///home/krishnanantha/major-project/CMP-P1/backend/src/jobs/scheduler.js#L11-L15)) | None. Scheduled daily at midnight. |
| `setTimeout(3000)` (Startup Expiry Sweep) | VERIFIED | `setTimeout(async () => { ... const summary = await notificationService.runExpirySweep(); }, 3000);` ([scheduler.js:22-26](file:///home/krishnanantha/major-project/CMP-P1/backend/src/jobs/scheduler.js#L22-L26)) | None. Runs automated sweep 3 seconds after boot to populate in-app notifications. |

---

## Frontend

### Protected Routes Verification in `App.jsx`

- **Status:** VERIFIED
- **Route Guard Implementation:**
  ```javascript
  // frontend/src/App.jsx:19-27
  function ProtectedLayout() {
    const { user, loading } = useAuth();

    if (loading) {
      return <WorkspaceLoader message="Loading workspace..." />;
    }

    return user ? <Layout /> : <Navigate to="/login" replace />;
  }
  ```
- **Route Mounting Hierarchy:**
  ```javascript
  // frontend/src/App.jsx:36-54
  <Routes>
    {/* Public Auth / Login */}
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    {/* Public External Inspector Cloud Data Room */}
    <Route path="/audit/:token" element={<AuditView />} />

    {/* Authenticated Management Platform */}
    <Route path="/" element={<ProtectedLayout />}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="locations" element={<Locations />} />
      <Route path="documents" element={<Documents />} />
      <Route path="compliance" element={<ComplianceScore />} />
      <Route path="audit-links" element={<AuditLinks />} />
    </Route>
  </Routes>
  ```
- **Verification Result:**
  - When `user` is falsy (`null` / unauthenticated), `ProtectedLayout` immediately redirects the browser to `/login` via `<Navigate to="/login" replace />`.
  - While authentication status is resolving from local storage/API (`loading === true`), it renders `<WorkspaceLoader message="Loading workspace..." />` without leaking child protected pages.
  - Public routes (`/login`, `/register`, `/audit/:token`) remain accessible without credentials.

---

### File-by-File Audit: `frontend/src/pages`

#### 1. `frontend/src/pages/Auth/Login.jsx`

- **API Calls:**
  - `POST /api/auth/login` (via `useAuth().login` -> `auth.login` in [api.js:89-93](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L89-L93))
  - `GET /api/auth/me` (invoked post-login by `AuthContext.jsx:38` / `api.js:123-125`)
  - `GET /api/tenancy/users` (invoked if logging in as `ORG_ADMIN` by `AuthContext.jsx:22` / `api.js:168-171`)
- **Backend Route Existence:**
  - `POST /api/auth/login`:
    ```javascript
    // backend/src/modules/auth/auth.routes.js:12
    router.post('/login', authLimiter, validate(loginSchema), (req, res, next) => authController.login(req, res, next));
    ```
  - `GET /api/auth/me`:
    ```javascript
    // backend/src/modules/auth/auth.routes.js:20
    router.get('/me', authenticateJWT, tenantScope, (req, res, next) => authController.me(req, res, next));
    ```
  - `GET /api/tenancy/users`:
    ```javascript
    // backend/src/modules/tenancy/tenancy.routes.js:32
    router.get('/users', authorizeRoles('ORG_ADMIN'), (req, res, next) => tenancyController.getUsers(req, res, next));
    ```
- **Payload Shape:**
  - Client sends: `{ email, password }` ([api.js:92](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L92)).
  - Backend schema matches:
    ```javascript
    // backend/src/modules/auth/auth.schema.js:3-10
    const loginSchema = z.object({
      email: z.string({ error: 'Email and password are required.' }).min(1, 'Email and password are required.'),
      password: z.string({ error: 'Email and password are required.' }).min(1, 'Email and password are required.'),
    });
    ```
  - Status: VERIFIED.
- **Mock / Hardcoded Data:**
  - Hardcoded `DEMO_PERSONAS` array in [Login.jsx:6-28](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Auth/Login.jsx#L6-L28) with pre-filled emails (`admin@acmeretail.com`, `manager.blr@acmeretail.com`, `manager.bom@acmeretail.com`) and default password (`Password@123`).
- **Loading & Error States:**
  - Handled: `isSubmitting` spinner via `<Loader2 className="animate-spin" />` ([Login.jsx:153-157](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Auth/Login.jsx#L153-L157)).
  - Handled: Network disconnection alert (`WifiOff`) and API error banner (`AlertCircle`) ([Login.jsx:102-121](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Auth/Login.jsx#L102-L121)).
- **Broken Imports / Lint Issues:** None.

---

#### 2. `frontend/src/pages/Auth/Register.jsx`

- **API Calls:**
  - `POST /api/auth/register` (via `auth.register` in [api.js:104-120](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L104-L120))
- **Backend Route Existence:**
  ```javascript
  // backend/src/modules/auth/auth.routes.js:15
  router.post('/register', authLimiter, validate(registerSchema), (req, res, next) => authController.register(req, res, next));
  ```
- **Payload Shape:**
  - Client sends:
    ```javascript
    // frontend/src/pages/Auth/Register.jsx:61-72
    await auth.register({
      organizationName: org.name,
      taxId: org.taxId,
      adminName: admin.name,
      email: admin.email,
      password: admin.password,
      industry: org.industry,
      website: org.website,
      phone: org.phone,
      address: org.address,
      branches: branches.map(({ id, ...branch }) => branch),
    });
    ```
  - Backend schema matches:
    ```javascript
    // backend/src/modules/auth/auth.schema.js:22-33
    const registerSchema = z.object({
      organizationName: z.string().min(1, 'Organization name is required'),
      taxId: z.string().optional().nullable(),
      adminName: z.string().min(1, 'Admin name is required'),
      email: z.string().email('Valid admin email is required'),
      password: z.string().min(8, 'Admin password must be at least 8 characters long'),
      industry: z.string().optional().nullable(),
      website: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      branches: z.array(registerBranchSchema).optional(),
    });
    ```
  - Status: VERIFIED.
- **Mock / Hardcoded Data:**
  - `emptyBranch` default generator with `crypto.randomUUID()`.
- **Loading & Error States:**
  - Handled: `submitting` state on button; error message displayed in top red banner ([Register.jsx:146-150](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Auth/Register.jsx#L146-L150)).
- **Broken Imports / Lint Issues:** None.

---

#### 3. `frontend/src/pages/Dashboard/Dashboard.jsx`

- **API Calls:**
  - `GET /api/tenancy/locations` (via `api.getLocations()` -> [api.js:497-500](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L497-L500))
  - `GET /api/documents` (via `api.getDocuments()` -> [api.js:529-532](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L529-L532))
  - `GET /api/intelligence/license-types` (via `api.getLicenseTypes()` -> [api.js:513-516](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L513-L516))
  - `POST /api/compliance/locations/:id/recalculate` (via `api.calculateLocationScore(loc.id)` -> [api.js:548-551](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L548-L551))
  - `POST /api/documents` (via `api.uploadDocument(docData, file)` -> [api.js:534-537](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L534-L537))
- **Backend Route Existence:**
  - `GET /api/tenancy/locations`:
    ```javascript
    // backend/src/modules/tenancy/tenancy.routes.js:18
    router.get('/locations', (req, res, next) => tenancyController.getLocations(req, res, next));
    ```
  - `GET /api/documents`:
    ```javascript
    // backend/src/modules/documents/document.routes.js:13
    router.get('/', (req, res, next) => controller.getDocuments(req, res, next));
    ```
  - `GET /api/intelligence/license-types`:
    ```javascript
    // backend/src/modules/intelligence/intelligence.routes.js:14
    router.get('/license-types', (req, res, next) => intelligenceController.getLicenseTypes(req, res, next));
    ```
  - `POST /api/compliance/locations/:id/recalculate`:
    ```javascript
    // backend/src/modules/compliance/complianceScore.routes.js:23
    router.post('/locations/:id/recalculate', (req, res, next) => complianceScoreController.recalculateLocationScore(req, res, next));
    ```
  - `POST /api/documents`:
    ```javascript
    // backend/src/modules/documents/document.routes.js:16
    router.post('/', upload.single('file'), verifyLocationAccess('location_id', 'body'), (req, res, next) => controller.uploadDocument(req, res, next));
    ```
- **Payload Shape:**
  - `calculateLocationScore`: route param `:id` passes `loc.id`. Response `{ score, breakdown }` is consumed.
  - `uploadDocument`: FormData matches `upload.single('file')` and multer fields.
  - Status: VERIFIED.
- **Mock / Hardcoded Data:**
  - Client-side static presentation card under "Academic Architecture Highlights" ([Dashboard.jsx:295-308](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Dashboard/Dashboard.jsx#L295-L308)).
- **Loading & Error States:**
  - Loading: `<DashboardSkeleton />` rendered while `isLoading === true` ([Dashboard.jsx:79-81](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Dashboard/Dashboard.jsx#L79-L81)).
  - Missing user-facing error state: In `loadData()` catch block ([Dashboard.jsx:37-42](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Dashboard/Dashboard.jsx#L37-L42)), errors are only logged to `console.error`; no UI alert or retry banner is presented to the user.
- **Broken Imports / Lint Issues:** None.

---

#### 4. `frontend/src/pages/Locations/Locations.jsx`

- **API Calls:**
  - `GET /api/tenancy/locations` (via `api.getLocations()`)
  - `GET /api/documents` (via `api.getDocuments()`)
  - `POST /api/tenancy/locations` (via `api.addLocation(newLoc)` -> `tenancy.createLocation(loc)` in [api.js:502-505](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L502-L505))
  - `PATCH /api/tenancy/locations/:locationId` (via `api.updateLocation(profileLocation.id, details)` -> `tenancy.updateLocation` in [api.js:507-510](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L507-L510))
- **Backend Route Existence:**
  - `POST /api/tenancy/locations`:
    ```javascript
    // backend/src/modules/tenancy/tenancy.routes.js:23
    router.post('/locations', authorizeRoles('ORG_ADMIN'), (req, res, next) => tenancyController.createLocation(req, res, next));
    ```
  - `PATCH /api/tenancy/locations/:locationId`:
    ```javascript
    // backend/src/modules/tenancy/tenancy.routes.js:27
    router.patch('/locations/:locationId', (req, res, next) => tenancyController.updateLocation(req, res, next));
    ```
- **Payload Shape:**
  - `addLocation`: Sends `{ name, managerName, managerEmail, managerPassword }` ([RegisterLocationModal.jsx:17](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/components/Modals/RegisterLocationModal.jsx#L17)).
    Matches backend service expectations in `tenancy.service.js:89-138`.
  - `updateLocation`: Sends `{ code, type, state, address, city, pincode, phone, gstin, employee_count, operating_hours }` ([CompleteLocationModal.jsx:8-19](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/components/Modals/CompleteLocationModal.jsx#L8-L19)).
    Matches `allowedFields` in `tenancy.service.js:162`.
  - Status: VERIFIED.
- **Mock / Hardcoded Data:**
  - `FACILITY_TYPES` and `STATES` dropdown arrays hardcoded in [CompleteLocationModal.jsx:4-5](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/components/Modals/CompleteLocationModal.jsx#L4-L5).
- **Loading & Error States:**
  - Loading: `<LocationsSkeleton />` rendered when `isLoading === true` ([Locations.jsx:69-71](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Locations/Locations.jsx#L69-L71)).
  - Error: `alert(err.message)` on failure in `handleAddLocation` ([Locations.jsx:54](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Locations/Locations.jsx#L54)).
- **Broken Imports / Lint Issues:** None.

---

#### 5. `frontend/src/pages/Documents/Documents.jsx`

- **API Calls:**
  - `GET /api/documents` (via `api.getDocuments()`)
  - `GET /api/tenancy/locations` (via `api.getLocations()`)
  - `GET /api/intelligence/license-types` (via `api.getLicenseTypes()`)
  - `POST /api/documents` (via `api.uploadDocument(docData, file)`)
  - `PATCH /api/documents/:id/verify` (via `api.verifyDocument(docId, approve, reason)` -> [api.js:539-542](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L539-L542))
  - `DELETE /api/documents/:id` (via `api.deleteDocument(docId)` -> [api.js:544-546](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L544-L546))
- **Backend Route Existence:**
  - `PATCH /api/documents/:id/verify`:
    ```javascript
    // backend/src/modules/documents/document.routes.js:24
    router.patch('/:id/verify', authorizeRoles('ORG_ADMIN'), (req, res, next) => controller.verifyDocument(req, res, next));
    ```
  - `DELETE /api/documents/:id`:
    ```javascript
    // backend/src/modules/documents/document.routes.js:37
    router.delete('/:id', authorizeRoles('ORG_ADMIN'), (req, res, next) => controller.deleteDocument(req, res, next));
    ```
- **Payload Shape:**
  - `verifyDocument`: Client sends `{ approved: approve, reason }` ([api.js:220-224](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L220-L224)).
    Backend service consumes `approve` and `reason` in `document.service.js:156`.
  - Status: VERIFIED.
- **Mock / Hardcoded Data:**
  - Mock SHA-256 integrity check:
    ```javascript
    // frontend/src/pages/Documents/Documents.jsx:97-102
    const handleCheckIntegrity = (doc) => {
      // Simulate real-time cryptographic validation of SHA-256 fingerprint against the document payload
      setTimeout(() => {
        setVerifiedHashIds((prev) => [...prev, doc.id]);
      }, 200);
    };
    ```
    Status: POOR QUALITY / FAKE DATA. Does not calculate cryptographic hash client-side or verify the stream; unconditionally sets verified status after 200ms timer.
- **Loading & Error States:**
  - Loading: `<DocumentsSkeleton />` rendered when `isLoading === true` ([Documents.jsx:146-148](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Documents/Documents.jsx#L146-L148)).
  - Error: Browser `alert(error.message)` on deletion and verification failures ([Documents.jsx:93,123](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/Documents/Documents.jsx#L93)).
- **Broken Imports / Lint Issues:**
  - Unused icons imported in modal children: [VerifyDocumentModal.jsx:1-2](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/components/Modals/VerifyDocumentModal.jsx#L1-L2), [VersionHistoryModal.jsx:1-12](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/components/Modals/VersionHistoryModal.jsx#L1-L12).

---

#### 6. `frontend/src/pages/ComplianceScore/ComplianceScore.jsx`

- **API Calls:**
  - `GET /api/tenancy/locations` (via `api.getLocations()`)
  - `GET /api/intelligence/dependencies` (via `api.getDependencies()`)
  - `GET /api/intelligence/license-types` (via `api.getLicenseTypes()`)
  - `GET /api/documents` (via `api.getDocuments()`)
  - `POST /api/compliance/locations/:id/recalculate` (via `api.calculateLocationScore(id)`)
  - `GET /api/compliance/locations/:id/history` (via `api.getLocationHistory(id)` -> [api.js:553-556](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L553-L556))
  - `GET /api/compliance/organization/overview` (via `api.getOrganizationOverview()` -> [api.js:558-561](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L558-L561))
- **Backend Route Existence:**
  - `GET /api/intelligence/dependencies`:
    ```javascript
    // backend/src/modules/intelligence/intelligence.routes.js:16
    router.get('/dependencies', (req, res, next) => intelligenceController.getDependencies(req, res, next));
    ```
  - `GET /api/compliance/locations/:id/history`:
    ```javascript
    // backend/src/modules/compliance/complianceScore.routes.js:28
    router.get('/locations/:id/history', (req, res, next) => complianceScoreController.getLocationHistory(req, res, next));
    ```
  - `GET /api/compliance/organization/overview`:
    ```javascript
    // backend/src/modules/compliance/complianceScore.routes.js:13
    router.get('/organization/overview', (req, res, next) => complianceScoreController.getOrganizationOverview(req, res, next));
    ```
- **Payload Shape:**
  - `calculateLocationScore`: Returns `{ score, breakdown: { summary, deductions, suggestedActions } }`.
  - `getLocationHistory`: Returns `{ success: true, history: [...] }`.
  - `getOrganizationOverview`: Returns `{ success: true, averageScore, locationCount, breakdown }`.
  - Client handles fields correctly ([ComplianceScore.jsx:240-244](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/ComplianceScore/ComplianceScore.jsx#L240-L244)).
  - Status: TRACED.
- **Mock / Hardcoded Data:**
  - `STATUTORY_CALENDAR_EVENTS` ([ComplianceScore.jsx:24-105](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/ComplianceScore/ComplianceScore.jsx#L24-L105)): 8 statutory compliance calendar entries hardcoded with static due dates (EPF/ESI, GSTR-3B, Advance Tax Q3/Q4, CLRA, Trade License, PCB, FSSAI).
  - Status: INCOMPLETE. No backend API or database persistence exists; claimed backend `eventTracking` module does not exist.
- **Loading & Error States:**
  - Loading: `<ComplianceScoreSkeleton />` on initial mount; `<BufferingLoader />` when switching facilities ([ComplianceScore.jsx:22](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/ComplianceScore/ComplianceScore.jsx#L22)).
  - Errors logged to console; component sets fallback empty arrays.
- **Broken Imports / Lint Issues:**
  - `React` imported unnecessarily in React 18 / Vite JSX transform runtime.

---

#### 7. `frontend/src/pages/AuditLinks/AuditLinks.jsx`

- **API Calls:**
  - `GET /api/audit-links` (via `api.getAuditLinks()` -> [api.js:573-576](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L573-L576))
  - `GET /api/documents` (via `api.getDocuments()`)
  - `POST /api/audit-links` (via `api.createAuditLink(data)` -> [api.js:578-581](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L578-L581))
  - `PATCH /api/audit-links/:id` (via `api.revokeAuditLink(id)` -> [api.js:583-586](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L583-L586))
- **Backend Route Existence:**
  - `GET /api/audit-links`:
    ```javascript
    // backend/src/modules/auditLinks/auditLink.routes.js:14
    router.get('/', (req, res, next) => auditLinkController.getAuditLinks(req, res, next));
    ```
  - `POST /api/audit-links`:
    ```javascript
    // backend/src/modules/auditLinks/auditLink.routes.js:15
    router.post('/', authorizeRoles('ORG_ADMIN'), (req, res, next) => auditLinkController.createAuditLink(req, res, next));
    ```
  - `PATCH /api/audit-links/:id`:
    ```javascript
    // backend/src/modules/auditLinks/auditLink.routes.js:16
    router.patch('/:id', authorizeRoles('ORG_ADMIN'), (req, res, next) => auditLinkController.revokeAuditLink(req, res, next));
    ```
- **Payload Shape:**
  - **CRITICAL PAYLOAD MISMATCH:**
    - Client in `CreateAuditLinkModal.jsx:39-45` sends:
      ```javascript
      onCreate({
        title: title || "External Regulatory Audit Link",
        notes: notes || "Scoped inspector clearance package",
        pin_hash: hasPin && pin ? pin : null,
        expires_at: expiresAt,
        document_ids: selectedDocs
      });
      ```
    - But backend service in `auditLink.service.js:34` destructures:
      ```javascript
      async createAuditLink(user, { title, notes, expires_at, pin, document_ids }) {
        const token = crypto.randomBytes(24).toString('hex');
        const pinHash = pin ? await bcrypt.hash(pin, 10) : null;
      ```
    - Problem: Client sends `pin_hash`, but backend expects `pin`. As a result, `pin` is `undefined` on the backend, and `pinHash` resolves to `null`.
    - Status: BROKEN. Audit rooms configured with PIN protection are created with `pin_hash = null` and become publicly accessible without any PIN.
- **Mock / Hardcoded Data:** None.
- **Loading & Error States:**
  - Loading: `<AuditLinksSkeleton />` rendered when `isLoading === true` ([AuditLinks.jsx:63-65](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/AuditLinks/AuditLinks.jsx#L63-L65)).
  - Error: Logged to console in `loadData()`; empty list fallback.
- **Broken Imports / Lint Issues:** None.

---

#### 8. `frontend/src/pages/AuditView/AuditView.jsx`

- **API Calls:**
  - `GET /api/audit-links/by-token/:token` (via `api.getAuditByToken(token, pinCode)` -> [api.js:442-445](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L442-L445))
  - `POST /api/audit-links/access/:token` (via `api.recordAuditAccess(token, { success: true })` -> [api.js:447-452](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L447-L452))
  - `GET /api/audit-links/by-token/:token/documents/:docId/download` (via `api.getAuditDocumentDownloadUrl` -> [api.js:454-457](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/services/api.js#L454-L457))
- **Backend Route Existence:**
  - `GET /api/audit-links/by-token/:token`:
    ```javascript
    // backend/src/modules/auditLinks/auditLink.routes.js:9
    router.get('/by-token/:token', (req, res, next) => auditLinkController.getAuditByToken(req, res, next));
    ```
  - `GET /api/audit-links/by-token/:token/documents/:docId/download`:
    ```javascript
    // backend/src/modules/auditLinks/auditLink.routes.js:10
    router.get('/by-token/:token/documents/:docId/download', (req, res, next) => auditLinkController.downloadAuditDocument(req, res, next));
    ```
  - `POST /api/audit-links/access/:token`:
    ```javascript
    // backend/src/modules/auditLinks/auditLink.routes.js:11
    router.post('/access/:token', (req, res, next) => auditLinkController.recordAuditAccess(req, res, next));
    ```
- **Payload Shape:**
  - `getAuditByToken`: Passes PIN via `x-audit-pin` header: `{ 'x-audit-pin': pin }`. Backend checks `req.headers['x-audit-pin'] || req.query?.pin || req.body?.pin`. Matches.
  - `recordAuditAccess`: Passes `{ success: true }`. Matches backend `AuditLinkAccessLog` creation.
  - Status: VERIFIED.
- **Mock / Hardcoded Data:**
  - `handleDownloadManifest()` in [AuditView.jsx:90-111](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/AuditView/AuditView.jsx#L90-L111) creates a client-side JSON export of the displayed documents.
- **Loading & Error States:**
  - Loading: `<BufferingLoader title="Validating Secure Audit Token" />` rendered during token validation ([AuditView.jsx:124-134](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/AuditView/AuditView.jsx#L124-L134)).
  - PIN Prompt: Renders clean PIN challenge form when `requiresPin === true` ([AuditView.jsx:151-189](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/AuditView/AuditView.jsx#L151-L189)).
  - Access Denied: Renders dedicated denial banner when token is invalid or expired ([AuditView.jsx:137-148](file:///home/krishnanantha/major-project/CMP-P1/frontend/src/pages/AuditView/AuditView.jsx#L137-L148)).
- **Broken Imports / Lint Issues:**
  - **3 ESLint Errors:**
    ```text
    // frontend/src/pages/AuditView/AuditView.jsx:113, 114, 121
    113:22  error  'Blob' is not defined  no-undef
    114:17  error  'URL' is not defined   no-undef
    121:5   error  'URL' is not defined   no-undef
    ```
  - **1 Warning:**
    ```text
    12:3  warning  'CheckCircle2' is defined but never used  no-unused-vars
    ```
  - Status: POOR QUALITY / BROKEN LINT.

---

## Security

### 1. Is every Prisma query on tenant data filtered by organizationId? List any that are not.

- **Assessment:** **NO**. While primary CRUD endpoints in `tenancy`, `compliance`, and `documents` filter strictly by `org_id: user.org_id`, several queries on tenant data omit an `organizationId` filter:

1. **Unrestricted Multi-Tenant Expiry Sweep:**
   When triggered via the public route `POST /api/notifications/sweep` or by the midnight cron worker without an `orgId` parameter, documents and users across ALL tenant organizations are selected without an `org_id` filter:
   ```javascript
   // backend/src/modules/notifications/notification.service.js:368-369
   const docs = await prisma.document.findMany({
     where: docWhere,
   ```
   ```javascript
   // backend/src/modules/notifications/notification.service.js:378-379
   const orgAdmins = await prisma.user.findMany({
     where: orgId ? { org_id: orgId, role: 'ORG_ADMIN' } : { role: 'ORG_ADMIN' },
   ```
   Evidence: In `notification.service.js:362-366`, `if (orgId) docWhere.org_id = orgId;` leaves `docWhere.org_id` undefined when `orgId` is null, scanning documents across all tenants.

2. **In-App Notification Logs are Not Scoped by `org_id`:**
   Because the `NotificationLog` table has no `org_id` column in `prisma/schema.prisma:143-157`, notification queries filter solely by `user_id`:
   ```javascript
   // backend/src/modules/notifications/notification.service.js:165-171
   const where = { user_id: userId };
   ...
   const [notifications, total, unread] = await Promise.all([
     prisma.notificationLog.findMany({
       where,
   ```
   Evidence: In `notification.routes.js:9`, `tenantScope` middleware is omitted completely. Tenant isolation for alerts is indirect and hinges entirely on the integrity of the JWT `user_id`.

3. **Public Audit Link Token Lookups:**
   Public audit links are queried by token without tenant organization scoping:
   ```javascript
   // backend/src/modules/auditLinks/auditLink.service.js:85-86
   const link = await prisma.auditLink.findUnique({
     where: { token },
   ```
   Evidence: By design for unauthenticated inspector access; access control is mediated by token entropy (24 random bytes) and optional PIN.

---

### 2. Can a location manager reach another location's data?

- **Assessment:** **YES (VULNERABLE / BROKEN)**. A location manager can reach other locations' private documents and compliance evaluations due to missing location authorization checks:

1. **Document Streaming & Download Bypass (IDOR):**
   A location manager can download or stream any document belonging to any other store location within their organization:
   ```javascript
   // backend/src/modules/documents/document.service.js:196-198
   async getDownloadUrl(user, docId) {
     const doc = await prisma.document.findFirst({
       where: { id: docId, org_id: user.org_id },
     });
   ```
   ```javascript
   // backend/src/modules/documents/document.service.js:209-211
   async getDocumentFile(user, docId) {
     const doc = await prisma.document.findFirst({
       where: { id: docId, org_id: user.org_id },
     });
   ```
   Evidence: Unlike `getDocuments` ([document.service.js:16-21](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L16-L21)), `getDownloadUrl` and `getDocumentFile` check only `org_id: user.org_id` and omit checking `user.accessibleLocationIds.includes(doc.location_id)`.

2. **Compliance Scoring Privilege Escalation:**
   A location manager can inspect score breakdowns, penalty deductions, and historical timelines, and trigger score recalculations for any facility in the organization:
   ```javascript
   // backend/src/modules/compliance/complianceScore.routes.js:18-28
   router.get('/locations/:id', (req, res, next) => complianceScoreController.getLocationScore(req, res, next));
   router.post('/locations/:id/recalculate', (req, res, next) => complianceScoreController.recalculateLocationScore(req, res, next));
   router.get('/locations/:id/history', (req, res, next) => complianceScoreController.getLocationHistory(req, res, next));
   ```
   Evidence: These three routes lack the `verifyLocationAccess('id', 'params')` middleware. Controller [complianceScore.controller.js:10](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/compliance/complianceScore.controller.js#L10) only passes `req.user.org_id` to the service, never verifying whether the user is authorized for `req.params.id`.

3. **Facility Metadata Modification:**
   ```javascript
   // backend/src/modules/tenancy/tenancy.routes.js:27
   router.patch('/locations/:locationId', (req, res, next) => tenancyController.updateLocation(req, res, next));
   ```
   Evidence: Route lacks `authorizeRoles('ORG_ADMIN')`. A location manager can modify their assigned facility's legal code, GSTIN, type, and operating details.

---

### 3. Audit Links Security

- **Is the PIN hashed?**
  - **Server-side implementation:** **YES**. Server hashes the PIN using bcrypt:
    ```javascript
    // backend/src/modules/auditLinks/auditLink.service.js:40
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;
    ```
    And verifies via bcrypt compare:
    ```javascript
    // backend/src/modules/auditLinks/auditLink.service.js:116
    const pinMatch = await bcrypt.compare(String(pinEntered), link.pin_hash);
    ```
  - **CRITICAL CLIENT-SIDE BUG:** In `frontend/src/components/Modals/CreateAuditLinkModal.jsx:42`, the client submits `{ pin_hash: hasPin && pin ? pin : null }`. But `auditLink.service.js:34` destructures `{ pin }`. Because `pin` is undefined in the backend, `pinHash` resolves to `null`. Therefore, PIN-configured rooms are created with NO PIN protection on the database.

- **Is there rate limiting on PIN attempts?**
  - **Assessment:** **NO (VULNERABLE)**.
  - Evidence:
    ```javascript
    // backend/src/modules/auditLinks/auditLink.routes.js:9
    router.get('/by-token/:token', (req, res, next) => auditLinkController.getAuditByToken(req, res, next));
    ```
    No rate-limiting middleware (such as `express-rate-limit`) is applied to this public route. An attacker can repeatedly submit brute-force guesses against 4-digit or 6-digit PINs without account lockout or IP throttling.

- **Are expiry and revocation checked server-side?**
  - **Assessment:** **YES (VERIFIED)**.
  - Evidence:
    ```javascript
    // backend/src/modules/auditLinks/auditLink.service.js:110-111
    if (!link.is_active) throw new ForbiddenError('This audit link has been revoked.');
    if (new Date() > new Date(link.expires_at)) throw new ForbiddenError('This audit link has expired.');
    ```

- **What fields does the public view return?**
  - Evidence:
    ```javascript
    // backend/src/modules/auditLinks/auditLink.service.js:85-107
    const link = await prisma.auditLink.findUnique({
      where: { token },
      include: {
        organization: { select: { id: true, name: true } },
        created_by: { select: { id: true, name: true, email: true } },
        documents: {
          include: {
            document: {
              select: {
                id: true,
                file_name: true,
                status: true,
                expiry_date: true,
                issue_date: true,
                sha256_hash: true,
                license_type: { select: { id: true, name: true, code: true } },
                location: { select: { id: true, name: true, state: true } },
              },
            },
          },
        },
      },
    });
    ```
  - **Exposed Fields:** Returns the full `AuditLink` record plus nested relations:
    - Root fields: `id`, `org_id`, `created_by_id`, `token`, **`pin_hash`** (THE BCRYPT HASH OF THE PIN IS LEAKED IN THE JSON RESPONSE!), `title`, `notes`, `expires_at`, `is_active`, `created_at`, `updated_at`.
    - `organization`: `id`, `name`.
    - `created_by`: `id`, `name`, **`email`** (admin email is leaked to unauthenticated public visitors).
    - `documents`: array of items with `id`, `file_name`, `status`, `expiry_date`, `issue_date`, `sha256_hash`, `license_type` (`id`, `name`, `code`), and `location` (`id`, `name`, `state`).

---

### 4. File Upload Security

- **Size Limit:**
  - **Assessment:** **25 MB limit enforced via Multer memory storage**.
  - Evidence:
    ```javascript
    // backend/src/modules/documents/document.controller.js:21
    limits: { fileSize: 25 * 1024 * 1024 },
    ```

- **Type Check:**
  - **Assessment:** **MIME type whitelist enforced at controller middleware**.
  - Evidence:
    ```javascript
    // backend/src/modules/documents/document.controller.js:5-16, 22-29
    const ALLOWED_MIME_TYPES = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]);
    ...
    fileFilter: (req, file, cb) => {
      if (file && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(
          new BadRequestError(
            `File format '${file.mimetype}' is not supported. Allowed formats: PDF, PNG, JPG, WEBP, DOCX, DOC, XLSX, CSV, TXT.`
          )
        );
      }
      cb(null, true);
    },
    ```
  - Note: Relies on `file.mimetype` parsed by Multer from HTTP headers; does not perform magic number byte inspection.

- **Filename Sanitization:**
  - **Assessment:** **Sanitized via regex replacement and prefixed with UUID**.
  - Evidence:
    ```javascript
    // backend/src/modules/documents/document.service.js:121-122
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `documents/${user.org_id}/${crypto.randomUUID()}-${safeFileName}`;
    ```
  - Database persistence: `file.originalname` is retained for human display ([document.service.js:133](file:///home/krishnanantha/major-project/CMP-P1/backend/src/modules/documents/document.service.js#L133)), while the sanitized UUID path is used as `storage_key`.

---

### 5. JWT Authentication & Token Handling

- **Where is the secret read?**
  - **Assessment:** Read from `process.env.JWT_SECRET` in `backend/src/config/env.js` and validated at boot time.
  - Evidence:
    ```javascript
    // backend/src/config/env.js:15-20
    jwtSecret: (() => {
      if (!process.env.JWT_SECRET) {
        throw new Error('[FATAL] JWT_SECRET environment variable is required.');
      }
      return process.env.JWT_SECRET;
    })(),
    ```
    Consumed by `jwt.js`:
    ```javascript
    // backend/src/utils/jwt.js:10-11, 20
    function signToken(payload, expiresIn = config.jwtExpiresIn) {
      return jwt.sign(payload, config.jwtSecret, { expiresIn });
    }
    ...
    function verifyToken(token) {
      return jwt.verify(token, config.jwtSecret);
    }
    ```

- **What is the expiry?**
  - **Assessment:** Defaults to `7d` (7 days) or overridden by `process.env.JWT_EXPIRES_IN`.
  - Evidence:
    ```javascript
    // backend/src/config/env.js:21
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    ```

- **Where does the frontend store the token?**
  - **Assessment:** Stored in browser `localStorage` under the key `'sclip_auth_token'`.
  - Evidence:
    - Setting token on login:
      ```javascript
      // frontend/src/services/api.js:96
      localStorage.setItem('sclip_auth_token', data.data.token);
      ```
    - Attaching token to outbound requests:
      ```javascript
      // frontend/src/services/api.js:19-22
      const token = localStorage.getItem('sclip_auth_token');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      ```
    - Purging token on logout / 401 Unauthorized:
      ```javascript
      // frontend/src/services/api.js:50, 134
      localStorage.removeItem('sclip_auth_token');
      ```


