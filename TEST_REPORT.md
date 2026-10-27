# Test Execution and Contract Verification Report

## Summary Totals

### Overall Platform
- **Total Tests Run**: 232
- **Passed**: 203
- **Failed**: 29
- **Pass Rate**: 87.5%

### Backend Layer (Isolated Postgres Test DB)
- **Backend Tests Run**: 166
- **Passed**: 150
- **Failed**: 16
- **Pass Rate**: 90.4%

### Frontend Layer (Contract, Mock & Component Tests)
- **Frontend Tests Run**: 66
- **Passed**: 53
- **Failed**: 13
- **Pass Rate**: 80.3%

## Backend Test Results by Module

### Module: auditLinks (13 passed, 3 failed, 16 total)

| Test | Status | Failure Message (First 3 Lines) |
| :--- | :---: | :--- |
| GET /api/audit-links/by-token/:token :: happy path (correct PIN supplied) | ❌ FAIL | AssertionError: expected [ 200, 401 ] to include 403     at Proxy.<anonymous> (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vitest/dist/chunks/index.aTZaPVhf.js:2093:15)     at Proxy.<anonymous> (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vitest/dist/chunks/index.aTZaPVhf.js:1958:14) |
| GET /api/audit-links/by-token/:token :: invalid PIN -> 401 | ❌ FAIL | AssertionError: expected 403 to be 401 // Object.is equality     at /home/krishnanantha/major-project/CMP-P1/backend/tests/auditLinks.test.js:49:29     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |
| GET /api/audit-links/by-token/:token :: nonexistent id -> 404 | ✅ PASS | - |
| POST /api/audit-links/access/:token :: happy path (records access log) | ✅ PASS | - |
| POST /api/audit-links/access/:token :: nonexistent id -> 404 | ❌ FAIL | AssertionError: expected 200 to be 404 // Object.is equality     at /home/krishnanantha/major-project/CMP-P1/backend/tests/auditLinks.test.js:74:26     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |
| GET /api/audit-links :: happy path (correct role, own tenant - ORG_ADMIN) | ✅ PASS | - |
| GET /api/audit-links :: no token -> 401 | ✅ PASS | - |
| GET /api/audit-links :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ✅ PASS | - |
| POST /api/audit-links :: happy path (correct role, own tenant - ORG_ADMIN) | ✅ PASS | - |
| POST /api/audit-links :: no token -> 401 | ✅ PASS | - |
| POST /api/audit-links :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ✅ PASS | - |
| POST /api/audit-links :: invalid or missing body fields -> 400 | ✅ PASS | - |
| PATCH /api/audit-links/:id :: no token -> 401 | ✅ PASS | - |
| PATCH /api/audit-links/:id :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ✅ PASS | - |
| PATCH /api/audit-links/:id :: another tenant's resource id (use createSecondTenant) -> 403/404, never 200 | ✅ PASS | - |
| PATCH /api/audit-links/:id :: nonexistent id -> 404 | ✅ PASS | - |

### Module: auth (17 passed, 3 failed, 20 total)

| Test | Status | Failure Message (First 3 Lines) |
| :--- | :---: | :--- |
| POST /api/auth/register :: happy path (registers new organization and admin) | ❌ FAIL | AssertionError: expected { …(4) } to have property "admin"     at /home/krishnanantha/major-project/CMP-P1/backend/tests/auth.test.js:44:30     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |
| POST /api/auth/register :: invalid or missing body fields (missing email and password) | ✅ PASS | - |
| POST /api/auth/register :: invalid or missing body fields (malformed email) | ✅ PASS | - |
| POST /api/auth/register :: invalid or missing body fields (password less than 8 chars) | ✅ PASS | - |
| POST /api/auth/register :: duplicate create (email already exists) | ✅ PASS | - |
| POST /api/auth/login :: happy path (ORG_ADMIN login) | ✅ PASS | - |
| POST /api/auth/login :: happy path (LOCATION_MANAGER login) | ✅ PASS | - |
| POST /api/auth/login :: invalid or missing body fields (missing email) | ✅ PASS | - |
| POST /api/auth/login :: invalid or missing body fields (missing password) | ✅ PASS | - |
| POST /api/auth/login :: nonexistent id (nonexistent user email) | ✅ PASS | - |
| POST /api/auth/login :: invalid credentials (incorrect password) | ✅ PASS | - |
| GET /api/auth/me :: happy path (ORG_ADMIN token) | ❌ FAIL | AssertionError: expected undefined to be 'admin@acmeretail.com' // Object.is equality     at /home/krishnanantha/major-project/CMP-P1/backend/tests/auth.test.js:171:37     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |
| GET /api/auth/me :: happy path (LOCATION_MANAGER token) | ❌ FAIL | AssertionError: expected undefined to be 'manager.blr@acmeretail.com' // Object.is equality     at /home/krishnanantha/major-project/CMP-P1/backend/tests/auth.test.js:181:37     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |
| GET /api/auth/me :: no token | ✅ PASS | - |
| GET /api/auth/me :: invalid or malformed token | ✅ PASS | - |
| POST /api/auth/change-password :: no token | ✅ PASS | - |
| POST /api/auth/change-password :: invalid or missing body fields (missing oldPassword) | ✅ PASS | - |
| POST /api/auth/change-password :: invalid or missing body fields (newPassword shorter than 8 chars) | ✅ PASS | - |
| POST /api/auth/change-password :: incorrect current password | ✅ PASS | - |
| POST /api/auth/change-password :: happy path (valid old and new password) | ✅ PASS | - |

### Module: compliance (15 passed, 4 failed, 19 total)

| Test | Status | Failure Message (First 3 Lines) |
| :--- | :---: | :--- |
| GET /api/compliance/organization/overview :: happy path (correct role, own tenant - ORG_ADMIN) | ✅ PASS | - |
| GET /api/compliance/organization/overview :: happy path (correct role, own tenant - LOCATION_MANAGER) | ✅ PASS | - |
| GET /api/compliance/organization/overview :: no token -> 401 | ✅ PASS | - |
| GET /api/compliance/locations/:id :: happy path (correct role, own tenant) | ✅ PASS | - |
| GET /api/compliance/locations/:id :: no token -> 401 | ✅ PASS | - |
| GET /api/compliance/locations/:id :: another tenant's resource id (use createSecondTenant) -> 403/404, never 200 | ✅ PASS | - |
| GET /api/compliance/locations/:id :: another location in the same org, as LOCATION_MANAGER -> 403 | ❌ FAIL | AssertionError: expected 200 to be 403 // Object.is equality     at /home/krishnanantha/major-project/CMP-P1/backend/tests/compliance.test.js:82:26     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |
| GET /api/compliance/locations/:id :: nonexistent id -> 404 | ✅ PASS | - |
| POST /api/compliance/locations/:id/recalculate :: happy path (correct role, own tenant) | ✅ PASS | - |
| POST /api/compliance/locations/:id/recalculate :: no token -> 401 | ✅ PASS | - |
| POST /api/compliance/locations/:id/recalculate :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ❌ FAIL | AssertionError: expected 200 to be 403 // Object.is equality     at /home/krishnanantha/major-project/CMP-P1/backend/tests/compliance.test.js:113:26     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |
| POST /api/compliance/locations/:id/recalculate :: another tenant's resource id (use createSecondTenant) -> 403/404, never 200 | ✅ PASS | - |
| POST /api/compliance/locations/:id/recalculate :: another location in the same org, as LOCATION_MANAGER -> 403 | ❌ FAIL | AssertionError: expected 200 to be 403 // Object.is equality     at /home/krishnanantha/major-project/CMP-P1/backend/tests/compliance.test.js:125:26     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |
| POST /api/compliance/locations/:id/recalculate :: nonexistent id -> 404 | ✅ PASS | - |
| GET /api/compliance/locations/:id/history :: happy path (correct role, own tenant) | ✅ PASS | - |
| GET /api/compliance/locations/:id/history :: no token -> 401 | ✅ PASS | - |
| GET /api/compliance/locations/:id/history :: another tenant's resource id (use createSecondTenant) -> 403/404, never 200 | ✅ PASS | - |
| GET /api/compliance/locations/:id/history :: another location in the same org, as LOCATION_MANAGER -> 403 | ❌ FAIL | AssertionError: expected 200 to be 403 // Object.is equality     at /home/krishnanantha/major-project/CMP-P1/backend/tests/compliance.test.js:162:26     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |
| GET /api/compliance/locations/:id/history :: nonexistent id -> 404 | ✅ PASS | - |

### Module: documents (22 passed, 2 failed, 24 total)

| Test | Status | Failure Message (First 3 Lines) |
| :--- | :---: | :--- |
| GET /api/documents :: happy path (correct role, own tenant - ORG_ADMIN) | ✅ PASS | - |
| GET /api/documents :: happy path (correct role, own tenant - LOCATION_MANAGER) | ✅ PASS | - |
| GET /api/documents :: no token -> 401 | ✅ PASS | - |
| POST /api/documents :: no token -> 401 | ✅ PASS | - |
| POST /api/documents :: another location in the same org, as LOCATION_MANAGER -> 403 | ✅ PASS | - |
| POST /api/documents :: invalid or missing body fields -> 400 | ✅ PASS | - |
| PATCH /api/documents/:id/verify :: happy path (correct role, own tenant) | ✅ PASS | - |
| PATCH /api/documents/:id/verify :: no token -> 401 | ✅ PASS | - |
| PATCH /api/documents/:id/verify :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ✅ PASS | - |
| PATCH /api/documents/:id/verify :: another tenant's resource id (use createSecondTenant) -> 403/404, never 200 | ✅ PASS | - |
| PATCH /api/documents/:id/verify :: nonexistent id -> 404 | ✅ PASS | - |
| GET /api/documents/:id/download :: happy path (correct role, own tenant) | ✅ PASS | - |
| GET /api/documents/:id/download :: no token -> 401 | ✅ PASS | - |
| GET /api/documents/:id/download :: another tenant's resource id (use createSecondTenant) -> 403/404, never 200 | ✅ PASS | - |
| GET /api/documents/:id/download :: another location in the same org, as LOCATION_MANAGER -> 403 | ❌ FAIL | AssertionError: expected 200 to be 403 // Object.is equality     at /home/krishnanantha/major-project/CMP-P1/backend/tests/documents.test.js:158:26     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |
| GET /api/documents/:id/download :: nonexistent id -> 404 | ✅ PASS | - |
| GET /api/documents/:id/file :: no token -> 401 | ✅ PASS | - |
| GET /api/documents/:id/file :: another tenant's resource id (use createSecondTenant) -> 403/404, never 200 | ✅ PASS | - |
| GET /api/documents/:id/file :: another location in the same org, as LOCATION_MANAGER -> 403 | ❌ FAIL | TypeError: fetch failed     at node:internal/deps/undici/undici:16381:13     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |
| GET /api/documents/:id/file :: nonexistent id -> 404 | ✅ PASS | - |
| DELETE /api/documents/:id :: no token -> 401 | ✅ PASS | - |
| DELETE /api/documents/:id :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ✅ PASS | - |
| DELETE /api/documents/:id :: another tenant's resource id (use createSecondTenant) -> 403/404, never 200 | ✅ PASS | - |
| DELETE /api/documents/:id :: nonexistent id -> 404 | ✅ PASS | - |

### Module: intelligence (27 passed, 1 failed, 28 total)

| Test | Status | Failure Message (First 3 Lines) |
| :--- | :---: | :--- |
| GET /api/intelligence/graph :: happy path (correct role, own tenant) | ✅ PASS | - |
| GET /api/intelligence/graph :: no token -> 401 | ✅ PASS | - |
| GET /api/intelligence/license-types :: happy path (correct role, own tenant) | ✅ PASS | - |
| GET /api/intelligence/license-types :: no token -> 401 | ✅ PASS | - |
| GET /api/intelligence/license-types/:id :: happy path (correct role, own tenant) | ✅ PASS | - |
| GET /api/intelligence/license-types/:id :: no token -> 401 | ✅ PASS | - |
| GET /api/intelligence/license-types/:id :: nonexistent id -> 404 | ✅ PASS | - |
| GET /api/intelligence/dependencies :: happy path (correct role, own tenant) | ✅ PASS | - |
| GET /api/intelligence/dependencies :: no token -> 401 | ✅ PASS | - |
| GET /api/intelligence/rules :: happy path (correct role, own tenant) | ✅ PASS | - |
| GET /api/intelligence/rules :: no token -> 401 | ✅ PASS | - |
| GET /api/intelligence/locations/:id/graph :: happy path (correct role, own tenant) | ✅ PASS | - |
| GET /api/intelligence/locations/:id/graph :: no token -> 401 | ✅ PASS | - |
| GET /api/intelligence/locations/:id/graph :: another location in the same org, as LOCATION_MANAGER -> 403 | ✅ PASS | - |
| GET /api/intelligence/locations/:id/graph :: another tenant's resource id (use createSecondTenant) -> 403/404, never 200 | ✅ PASS | - |
| GET /api/intelligence/locations/:id/ai-audit :: no token -> 401 | ✅ PASS | - |
| GET /api/intelligence/locations/:id/ai-audit :: another location in the same org, as LOCATION_MANAGER -> 403 | ✅ PASS | - |
| GET /api/intelligence/locations/:id/ai-audit :: another tenant's resource id (use createSecondTenant) -> 403/404, never 200 | ✅ PASS | - |
| POST /api/intelligence/license-types :: happy path (correct role, own tenant - ORG_ADMIN) | ✅ PASS | - |
| POST /api/intelligence/license-types :: no token -> 401 | ✅ PASS | - |
| POST /api/intelligence/license-types :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ✅ PASS | - |
| POST /api/intelligence/license-types :: invalid or missing body fields -> 400 | ❌ FAIL | AssertionError: expected [ 400, 422 ] to include 500     at Proxy.<anonymous> (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vitest/dist/chunks/index.aTZaPVhf.js:2093:15)     at Proxy.<anonymous> (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vitest/dist/chunks/index.aTZaPVhf.js:1958:14) |
| POST /api/intelligence/dependencies :: no token -> 401 | ✅ PASS | - |
| POST /api/intelligence/dependencies :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ✅ PASS | - |
| POST /api/intelligence/dependencies :: invalid or missing body fields -> 400 | ✅ PASS | - |
| DELETE /api/intelligence/dependencies/:id :: no token -> 401 | ✅ PASS | - |
| DELETE /api/intelligence/dependencies/:id :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ✅ PASS | - |
| DELETE /api/intelligence/dependencies/:id :: nonexistent id -> 404 | ✅ PASS | - |

### Module: notifications (20 passed, 2 failed, 22 total)

| Test | Status | Failure Message (First 3 Lines) |
| :--- | :---: | :--- |
| GET /api/notifications :: happy path (correct role, own tenant - ORG_ADMIN) | ✅ PASS | - |
| GET /api/notifications :: happy path (correct role, own tenant - LOCATION_MANAGER) | ✅ PASS | - |
| GET /api/notifications :: no token -> 401 | ✅ PASS | - |
| GET /api/notifications/unread-count :: happy path (correct role, own tenant) | ✅ PASS | - |
| GET /api/notifications/unread-count :: no token -> 401 | ✅ PASS | - |
| PATCH /api/notifications/read-all :: happy path (correct role, own tenant) | ✅ PASS | - |
| PATCH /api/notifications/read-all :: no token -> 401 | ✅ PASS | - |
| PATCH /api/notifications/:id/read :: no token -> 401 | ✅ PASS | - |
| PATCH /api/notifications/:id/read :: another tenant's resource id (use createSecondTenant) -> 403/404, never 200 | ✅ PASS | - |
| PATCH /api/notifications/:id/read :: nonexistent id -> 404 | ✅ PASS | - |
| DELETE /api/notifications/:id :: no token -> 401 | ✅ PASS | - |
| DELETE /api/notifications/:id :: another tenant's resource id (use createSecondTenant) -> 403/404, never 200 | ✅ PASS | - |
| DELETE /api/notifications/:id :: nonexistent id -> 404 | ✅ PASS | - |
| POST /api/notifications/test :: happy path (correct role, own tenant) | ❌ FAIL | AssertionError: expected 201 to be 200 // Object.is equality     at /home/krishnanantha/major-project/CMP-P1/backend/tests/notifications.test.js:139:26     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |
| POST /api/notifications/test :: no token -> 401 | ✅ PASS | - |
| GET /api/notifications/preferences :: happy path (correct role, own tenant) | ✅ PASS | - |
| GET /api/notifications/preferences :: no token -> 401 | ✅ PASS | - |
| PUT /api/notifications/preferences :: happy path (correct role, own tenant) | ✅ PASS | - |
| PUT /api/notifications/preferences :: no token -> 401 | ✅ PASS | - |
| POST /api/notifications/sweep :: happy path (correct role, own tenant - ORG_ADMIN) | ✅ PASS | - |
| POST /api/notifications/sweep :: no token -> 401 | ✅ PASS | - |
| POST /api/notifications/sweep :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ❌ FAIL | AssertionError: expected 200 to be 403 // Object.is equality     at /home/krishnanantha/major-project/CMP-P1/backend/tests/notifications.test.js:213:26     at process.processTicksAndRejections (node:internal/process/task_queues:103:5) |

### Module: services (6 passed, 1 failed, 7 total)

| Test | Status | Failure Message (First 3 Lines) |
| :--- | :---: | :--- |
| EmailService :: exposes essential notification and alert methods | ❌ FAIL | AssertionError: expected 'undefined' to be 'function' // Object.is equality     at /home/krishnanantha/major-project/CMP-P1/backend/tests/services.test.js:14:52     at file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vitest/dist/chunks/run.BPv-BBRv.js:1632:35 |
| EmailService :: getBaseUrl returns valid frontend application URL | ✅ PASS | - |
| StorageService :: exposes file upload and presigning capabilities | ✅ PASS | - |
| StorageService :: generates valid signed download URL structure | ✅ PASS | - |
| initScheduler :: initializes scheduled cron tasks without throwing | ✅ PASS | - |
| runExpirySweep :: evaluates compliance documents and dispatches alerts | ✅ PASS | - |
| runExpirySweep :: deduplication across different locations or license types | ✅ PASS | - |

### Module: tenancy (30 passed, 0 failed, 30 total)

| Test | Status | Failure Message (First 3 Lines) |
| :--- | :---: | :--- |
| GET /api/tenancy/organization :: happy path (ORG_ADMIN own tenant) | ✅ PASS | - |
| GET /api/tenancy/organization :: happy path (LOCATION_MANAGER own tenant) | ✅ PASS | - |
| GET /api/tenancy/organization :: no token -> 401 | ✅ PASS | - |
| GET /api/tenancy/locations :: happy path (ORG_ADMIN sees all org locations) | ✅ PASS | - |
| GET /api/tenancy/locations :: happy path (LOCATION_MANAGER sees assigned locations) | ✅ PASS | - |
| GET /api/tenancy/locations :: no token -> 401 | ✅ PASS | - |
| POST /api/tenancy/locations :: happy path (correct role, own tenant) | ✅ PASS | - |
| POST /api/tenancy/locations :: no token -> 401 | ✅ PASS | - |
| POST /api/tenancy/locations :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ✅ PASS | - |
| POST /api/tenancy/locations :: invalid or missing body fields -> 400 | ✅ PASS | - |
| POST /api/tenancy/locations :: duplicate create -> 409 | ✅ PASS | - |
| PATCH /api/tenancy/locations/:locationId :: happy path (correct role, own tenant) | ✅ PASS | - |
| PATCH /api/tenancy/locations/:locationId :: happy path (LOCATION_MANAGER on assigned location) | ✅ PASS | - |
| PATCH /api/tenancy/locations/:locationId :: no token -> 401 | ✅ PASS | - |
| PATCH /api/tenancy/locations/:locationId :: another tenant's resource id -> 403/404, never 200 | ✅ PASS | - |
| PATCH /api/tenancy/locations/:locationId :: another location in the same org, as LOCATION_MANAGER -> 403 | ✅ PASS | - |
| PATCH /api/tenancy/locations/:locationId :: nonexistent id -> 404 | ✅ PASS | - |
| GET /api/tenancy/users :: happy path (correct role, own tenant) | ✅ PASS | - |
| GET /api/tenancy/users :: no token -> 401 | ✅ PASS | - |
| GET /api/tenancy/users :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ✅ PASS | - |
| POST /api/tenancy/users :: happy path (correct role, own tenant) | ✅ PASS | - |
| POST /api/tenancy/users :: no token -> 401 | ✅ PASS | - |
| POST /api/tenancy/users :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ✅ PASS | - |
| POST /api/tenancy/users :: invalid or missing body fields -> 400 | ✅ PASS | - |
| POST /api/tenancy/users :: duplicate create -> 409 | ✅ PASS | - |
| POST /api/tenancy/assign-location :: happy path (correct role, own tenant) | ✅ PASS | - |
| POST /api/tenancy/assign-location :: no token -> 401 | ✅ PASS | - |
| POST /api/tenancy/assign-location :: LOCATION_MANAGER on an ORG_ADMIN route -> 403 | ✅ PASS | - |
| POST /api/tenancy/assign-location :: another tenant's resource id -> 403/404, never 200 | ✅ PASS | - |
| POST /api/tenancy/assign-location :: nonexistent id -> 404 | ✅ PASS | - |

## Frontend Test Results

### Module: frontend (53 passed, 13 failed, 66 total)

| Test | Status | Failure Message (First 3 Lines) |
| :--- | :---: | :--- |
| auth.login :: asserts POST /api/auth/login with credentials | ✅ PASS | - |
| auth.register :: asserts POST /api/auth/register with payload | ✅ PASS | - |
| auth.getCurrentUser :: asserts GET /api/auth/me with Bearer token | ✅ PASS | - |
| auth.logout :: clears localStorage credentials | ✅ PASS | - |
| tenancy.getLocations :: asserts GET /api/tenancy/locations | ✅ PASS | - |
| tenancy.getOrganization :: asserts GET /api/tenancy/organization | ✅ PASS | - |
| tenancy.createLocation :: asserts POST /api/tenancy/locations with body | ✅ PASS | - |
| tenancy.updateLocation :: asserts PATCH /api/tenancy/locations/:id with body | ✅ PASS | - |
| tenancy.getUsers :: asserts GET /api/tenancy/users | ✅ PASS | - |
| tenancy.createUser :: asserts POST /api/tenancy/users with body | ✅ PASS | - |
| tenancy.assignLocationAccess :: asserts POST /api/tenancy/assign-location with body | ✅ PASS | - |
| compliance.calculateLocationScore :: asserts GET /api/compliance/locations/:id | ✅ PASS | - |
| compliance.recalculateLocationScore :: asserts POST /api/compliance/locations/:id/recalculate | ✅ PASS | - |
| compliance.getLocationHistory :: asserts GET /api/compliance/locations/:id/history | ✅ PASS | - |
| compliance.getOrganizationOverview :: asserts GET /api/compliance/organization/overview | ✅ PASS | - |
| intelligence.getLicenseTypes :: asserts GET /api/intelligence/license-types | ✅ PASS | - |
| intelligence.getDependencies :: asserts GET /api/intelligence/dependencies | ✅ PASS | - |
| intelligence.getRequiredRules :: asserts GET /api/intelligence/rules with query params | ✅ PASS | - |
| intelligence.getGlobalGraph :: asserts GET /api/intelligence/graph | ✅ PASS | - |
| intelligence.getLocationAiAudit :: asserts GET /api/intelligence/locations/:id/ai-audit | ✅ PASS | - |
| documents.getDocuments :: asserts GET /api/documents | ✅ PASS | - |
| documents.verifyDocument :: asserts PATCH /api/documents/:id/verify with approve and reason | ✅ PASS | - |
| documents.deleteDocument :: asserts DELETE /api/documents/:id | ✅ PASS | - |
| documents.getDocumentDownloadUrl :: asserts GET /api/documents/:id/download | ✅ PASS | - |
| notifications.getNotifications :: asserts GET /api/notifications with pagination | ✅ PASS | - |
| notifications.getUnreadCount :: asserts GET /api/notifications/unread-count | ✅ PASS | - |
| notifications.markAsRead :: asserts PATCH /api/notifications/:id/read | ✅ PASS | - |
| notifications.markAllAsRead :: asserts PATCH /api/notifications/read-all | ✅ PASS | - |
| notifications.deleteNotification :: asserts DELETE /api/notifications/:id | ✅ PASS | - |
| notifications.getPreferences :: asserts GET /api/notifications/preferences | ✅ PASS | - |
| notifications.updatePreferences :: asserts PUT /api/notifications/preferences with body | ✅ PASS | - |
| notifications.runSweep :: asserts POST /api/notifications/sweep | ✅ PASS | - |
| auditLinks.getAuditLinks :: asserts GET /api/audit-links | ✅ PASS | - |
| auditLinks.createAuditLink :: asserts POST /api/audit-links with payload | ✅ PASS | - |
| auditLinks.revokeAuditLink :: asserts PATCH /api/audit-links/:id with { is_active: false } | ✅ PASS | - |
| auditLinks.getAuditByToken :: asserts GET /api/audit-links/by-token/:token with x-audit-pin header | ✅ PASS | - |
| auditLinks.recordAuditAccess :: asserts POST /api/audit-links/access/:token | ✅ PASS | - |
| api.getUsers :: returns array of users from backend { success: true, data: [...] } | ❌ FAIL | AssertionError: expected [] to have a length of 2 but got +0     at Proxy.<anonymous> (file:///home/krishnanantha/major-project/CMP-P1/frontend/node_modules/@vitest/expect/dist/index.js:1339:22)     at Proxy.<anonymous> (file:///home/krishnanantha/major-project/CMP-P1/frontend/node_modules/@vitest/expect/dist/index.js:972:17) |
| api.getDocuments :: returns array of documents from backend { success: true, documents: [...] } | ✅ PASS | - |
| api.getAuditLinks :: returns array of audit links from backend { success: true, audit_links: [...] } | ✅ PASS | - |
| api.getNotifications :: returns array of notifications from backend { success: true, data: { notifications: [...] } } | ✅ PASS | - |
| asserts submit payload includes title, notes, expires_at, document_ids, and pin | ❌ FAIL | AssertionError: expected { …(5) } to have property "pin" with value '482910'     at /home/krishnanantha/major-project/CMP-P1/frontend/tests/components.test.jsx:94:23     at file:///home/krishnanantha/major-project/CMP-P1/frontend/node_modules/@vitest/runner/dist/index.js:146:14 |
| asserts approval payload passes (document.id, true) | ✅ PASS | - |
| asserts rejection payload passes (document.id, false, reason) | ✅ PASS | - |
| redirects to /login when user is logged out (no auth token) | ✅ PASS | - |
| renders protected layout when authenticated user exists | ✅ PASS | - |
| handles successful login and populates user state | ✅ PASS | - |
| clears credentials and resets user state on logout | ✅ PASS | - |
| renders loading state while data is being fetched | ✅ PASS | - |
| renders empty state when no locations or documents exist | ❌ FAIL | Error: Unable to find an element with the text: /0 Locations/i. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible. Ignored nodes: comments, script, style <body> |
| renders visible error state when API call fails | ❌ FAIL | Error: expect(received).toBeInTheDocument() received value must be an HTMLElement or an SVGElement. Ignored nodes: comments, script, style |
| renders loading state while fetching locations | ✅ PASS | - |
| renders empty state when no locations exist | ❌ FAIL | Error: Unable to find an element with the text: /No locations found/i. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible. Ignored nodes: comments, script, style <body> |
| renders visible error message when API call fails | ❌ FAIL | Error: expect(received).toBeInTheDocument() received value must be an HTMLElement or an SVGElement. Ignored nodes: comments, script, style |
| renders loading state while fetching documents | ✅ PASS | - |
| renders empty state when no documents exist | ❌ FAIL | Error: Unable to find an element with the text: /No compliance documents found/i. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible. Ignored nodes: comments, script, style <body> |
| renders visible error message when API call fails | ❌ FAIL | Error: expect(received).toBeInTheDocument() received value must be an HTMLElement or an SVGElement. Ignored nodes: comments, script, style |
| renders loading state while calculating scores | ❌ FAIL | TestingLibraryElementError: Unable to find an element with the text: /Evaluating Regulatory Compliance Engine/i. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible. Ignored nodes: comments, script, style <body> |
| renders empty state when organization has no locations | ❌ FAIL | Error: Unable to find an element with the text: /No operational locations registered/i. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible. Ignored nodes: comments, script, style <body> |
| renders visible error message when compliance score calculation API fails | ❌ FAIL | Error: expect(received).toBeInTheDocument() received value must be an HTMLElement or an SVGElement. Ignored nodes: comments, script, style |
| renders loading skeleton while loading audit data rooms | ✅ PASS | - |
| renders empty state when no audit data rooms exist | ❌ FAIL | Error: Unable to find an element with the text: /No active audit links generated/i. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible. Ignored nodes: comments, script, style <body> |
| renders visible error message when audit links API fails | ❌ FAIL | Error: expect(received).toBeInTheDocument() received value must be an HTMLElement or an SVGElement. Ignored nodes: comments, script, style |
| renders loading state when validating audit token | ✅ PASS | - |
| renders Access Denied error message when token is invalid or revoked | ✅ PASS | - |
| renders empty state when audit room contains no documents | ✅ PASS | - |

## UNTESTED: routes/functions with no matching test name

### Backend Routes Without Dedicated Backend Test Coverage (0 of 46 routes)

All 46 backend routes are covered by backend test suites.

### Frontend Functions Without Direct Frontend Test Coverage (18 of 81 functions)

- `auth.setCurrentUser`
- `intelligence.getLocationGraph`
- `documents.uploadDocument`
- `documents.renewDocument`
- `documents.getDocumentFileUrl`
- `notifications.createTestAlert`
- `auditLinks.getAuditDocumentDownloadUrl`
- `api.getOrganizations`
- `api.addLocation`
- `api.uploadDocument`
- `api.renewDocument`
- `api.markNotificationRead`
- `api.savePreferences`
- `api.setCurrentUser`
- `api.getDocumentFileUrl`
- `api.getAuditDocumentDownloadUrl`
- `api.createTestAlert`
- `computeSHA256`

## Notes

1. Docker is unavailable on host; storage operations requiring MinIO network streaming are unmocked.
2. Backend tests confirmed critical horizontal privilege escalation across facilities in compliance scoring.
3. Intra-tenant IDOR confirmed in document download URL generation allowing cross-store document access.
4. Frontend contracts caught CreateAuditLinkModal dropping PINs via pin_hash key and api.getUsers returning [].
5. Frontend pages swallow API failures via catch-console-only, showing blank states instead of error messages.
