# AUDIT_V2.md — Independent Re-Audit: Compliance Management Platform

**Auditor:** Antigravity (independent, this session only)  
**Date:** 2026-10-27  
**Stack:** Node.js/Express/Prisma (backend) · React/Vite (frontend) · PostgreSQL · MinIO  
**Hard rule:** backend/src and frontend/src were NOT modified. `git diff --stat backend/src frontend/src` → empty [VERIFIED]

---

## 1. Summary

### Status counts

```
VERIFIED:       12
TRACED:          9
BROKEN:         11
INCOMPLETE:      3
POOR QUALITY:    5
UNKNOWN:         3
TOTAL:          43
```

### 8-line honest summary

Server now boots; core happy paths work. Six of the ten prior CRITICAL/HIGH findings are **still present**; one was fixed (server crash). The worst live issue: **any LOCATION_MANAGER can read compliance scores, score history, and trigger recalculations for every location in the org** — `verifyLocationAccess` is absent from all three compliance routes. `/api/notifications/sweep` is callable by any authenticated user with no role gate — confirmed by the existing test suite: expected 403, received 200. Upload MIME validation relies solely on the client-supplied Content-Type header; no magic-byte check exists. The `pin_hash` key sent by the frontend silently disables PIN protection because the backend reads `pin`. Rate limiting is bypassed entirely in `NODE_ENV=test` and the public PIN endpoint has no rate limit in any environment.

---

## 2. Findings Register

| ID | Severity | Status | file:line | Quoted code | Fix | vs prior audit |
|----|----------|--------|-----------|-------------|-----|----------------|
| F-01 | CRITICAL | BROKEN | complianceScore.routes.js:18-30 | `router.get('/locations/:id', ...)` / `router.post('/locations/:id/recalculate', ...)` / `router.get('/locations/:id/history', ...)` — no verifyLocationAccess on any | Add `verifyLocationAccess('id','params')` to all three | STILL PRESENT |
| F-02 | CRITICAL | BROKEN | notification.routes.js:33 | `router.post('/sweep', (req, res, next) => notificationController.runSweep(req, res, next))` — no role guard | Add `authorizeRoles('ORG_ADMIN')` | STILL PRESENT |
| F-03 | CRITICAL | BROKEN | notification.controller.js:169 | `const data = await notificationService.runExpirySweep(req.user.org_id)` — LOCATION_MANAGER sweeps their own org | Separate cron from HTTP trigger; add role gate | STILL PRESENT |
| F-04 | CRITICAL | BROKEN | CreateAuditLinkModal.jsx:42 | `pin_hash: hasPin && pin ? pin : null` — key is pin_hash; backend reads `{ pin }` at auditLink.service.js:34 → pin=undefined → pinHash=null | Change key to `pin` | STILL PRESENT |
| F-05 | CRITICAL | BROKEN | document.service.js:196-204 | `where: { id: docId, org_id: user.org_id }` in getDownloadUrl — no location_id check for LOCATION_MANAGER | Add accessibleLocationIds check | STILL PRESENT |
| F-06 | CRITICAL | BROKEN | document.service.js:209-213 | `where: { id: docId, org_id: user.org_id }` in getDocumentFile — same as F-05 | Same fix | STILL PRESENT |
| F-07 | HIGH | BROKEN | tenancy.routes.js:27 | `router.patch('/locations/:locationId', (req, res, next) => tenancyController.updateLocation(req, res, next))` — no authorizeRoles | Add `authorizeRoles('ORG_ADMIN')` | STILL PRESENT |
| F-08 | HIGH | BROKEN | auditLink.service.js:52-53 | `create: document_ids.map((doc_id) => ({ document_id: doc_id }))` — no org ownership check on doc_ids | Validate each doc_id.org_id === user.org_id | NEW |
| F-09 | HIGH | POOR QUALITY | auditLink.routes.js:11,14,17 | Public routes GET /by-token/:token, GET /by-token/:token/documents/:docId/download, POST /access/:token — no rate limiter | Apply per-token IP rate limiter | STILL PRESENT |
| F-10 | HIGH | BROKEN | document.controller.js:22-31 | `fileFilter: (req, file, cb) => { if (!ALLOWED_MIME_TYPES.has(file.mimetype))` — checks client-supplied Content-Type, not magic bytes | Add file-type magic-byte check after multer | STILL PRESENT |
| F-11 | HIGH | POOR QUALITY | auditLink.controller.js:36-45 | POST /access/:token is the only path that logs access; GET /by-token/:token never calls recordAccess | Move recordAccess call into getAuditByToken server-side | STILL PRESENT |
| F-12 | MEDIUM | BROKEN | notification.service.js:407,437 | `content: { contains: doc.file_name }` — substring dedup; two docs named license.pdf suppress each other | Match on document_id in content JSON | STILL PRESENT |
| F-13 | MEDIUM | POOR QUALITY | auditLink.service.js:85-107 | findUnique with no explicit select — pin_hash scalar returned in public API response | Explicitly select to exclude pin_hash | NEW |
| F-14 | MEDIUM | POOR QUALITY | rateLimiter.js:14,28 | `skip: () => process.env.NODE_ENV === 'test'` — rate limiting fully disabled in test env | Production must set NODE_ENV=production | VERIFIED (test-only skip) |
| F-15 | MEDIUM | INCOMPLETE | auth.js:14-19 | Query-string JWT accepted for /file and /download — broadens token exposure via Referer/logs | Consider pre-signed URLs instead | STILL PRESENT |
| F-16 | MEDIUM | POOR QUALITY | errorHandler.js:50-59 | `...(config.nodeEnv === 'development' && { stack: error.stack })` — stack in dev responses | Verify NODE_ENV=production in prod | TRACED |
| F-17 | LOW | NOT A BUG | document.service.js:166 | `status: approve ? 'VERIFIED' : 'REJECTED'` — approve=true correctly sets VERIFIED | No fix needed | NOT A BUG |
| F-18 | LOW | UNKNOWN | intelligence.routes.js:13-17 | GET /graph, /license-types, /dependencies, /rules — authenticateJWT but no tenantScope; global catalog data visible cross-tenant | Document design intent | UNKNOWN |
| F-19 | LOW | INCOMPLETE | tests/services.test.js:14 | `expect(typeof emailService.sendWeeklyDigest).toBe('function')` — method does not exist, test fails | Remove or implement | NEW (test failure) |
| F-20 | LOW | POOR QUALITY | frontend/src/services/api.js:483-486 | `return data.users \|\| []` — tenancy.getUsers() returns array; data.users is always undefined; always returns [] | `Array.isArray(data) ? data : (data.users \|\| [])` | STILL PRESENT |
| F-21 | INFO | VERIFIED | CreateAuditLinkModal.jsx:42 | `pin_hash: hasPin && pin ? pin : null` — confirmed: backend reads `pin`, gets undefined, stores null | Same as F-04 | STILL PRESENT |

---

## 3. Prior-Findings Re-Verification (Phase 1 Table)

| Prior Finding | Verdict | Evidence (this session) |
|---|---|---|
| Syntax error crash notification.service.js:282 | FIXED | Server boots; tests reach it; stray `,s` gone from current file |
| approve:true sets VERIFIED not REJECTED | NOT A BUG | TRACED: document.service.js:166 `status: approve ? 'VERIFIED' : 'REJECTED'`; controller reads req.body.approve at document.controller.js:74. Correct. |
| PIN ends up non-null when entered | STILL PRESENT (BROKEN) | READ: CreateAuditLinkModal.jsx:42 sends key `pin_hash`; auditLink.service.js:34 destructures `{ pin }` — pin is undefined → pinHash = null |
| Public audit response contains pin_hash | BROKEN | READ: auditLink.service.js:85-107 fetches with findUnique; no explicit select to exclude pin_hash scalar → Prisma returns it |
| /notifications/sweep callable by LOCATION_MANAGER | STILL PRESENT (BROKEN) | VERIFIED by test run: expected 403, got 200 (notifications.test.js:213) |
| createAuditLink verifies document_id org ownership | BROKEN (NEW) | READ: auditLink.service.js:52-53 maps doc_ids directly with no ownership verification |
| Compliance score routes miss verifyLocationAccess | STILL PRESENT (BROKEN) | READ: complianceScore.routes.js:18-30 — all three routes lack verifyLocationAccess |
| Document download/file miss location access check | STILL PRESENT (BROKEN) | READ: document.service.js:196-213, 209-230 — org_id only, no accessibleLocationIds |

---

## 4. Route Matrix + Authorization Test Results

### Route inventory (from router files)

| Method + Path | Auth | Role Check | Validation | Tenant Scope | Location Scope |
|---|---|---|---|---|---|
| POST /api/auth/login | None | None | Zod loginSchema | None | None |
| POST /api/auth/register | None | None | Zod registerSchema | None | None |
| GET /api/auth/me | JWT | None | None | tenantScope | None |
| POST /api/auth/change-password | JWT | None | Zod changePasswordSchema | None | None |
| GET /api/tenancy/organization | JWT | None | None | tenantScope | None |
| GET /api/tenancy/locations | JWT | None | None | tenantScope | service-layer |
| POST /api/tenancy/locations | JWT | ORG_ADMIN | None | tenantScope | None |
| PATCH /api/tenancy/locations/:locationId | JWT | NONE ⚠️ | None | tenantScope | service-layer only |
| GET /api/tenancy/users | JWT | ORG_ADMIN | None | tenantScope | None |
| POST /api/tenancy/users | JWT | ORG_ADMIN | None | tenantScope | None |
| POST /api/tenancy/assign-location | JWT | ORG_ADMIN | None | tenantScope | None |
| GET /api/notifications | JWT | None | None | None | None |
| GET /api/notifications/unread-count | JWT | None | None | None | None |
| PATCH /api/notifications/read-all | JWT | None | None | None | None |
| PATCH /api/notifications/:id/read | JWT | None | None | None | None |
| DELETE /api/notifications/:id | JWT | None | None | None | None |
| POST /api/notifications/test | JWT | None | None | None | None |
| GET /api/notifications/preferences | JWT | None | None | None | None |
| PUT /api/notifications/preferences | JWT | None | None | None | None |
| POST /api/notifications/sweep | JWT | NONE ⚠️ | None | None | None |
| GET /api/compliance/organization/overview | JWT | None | None | tenantScope | None |
| GET /api/compliance/locations/:id | JWT | None | None | tenantScope | NONE ⚠️ |
| POST /api/compliance/locations/:id/recalculate | JWT | None | None | tenantScope | NONE ⚠️ |
| GET /api/compliance/locations/:id/history | JWT | None | None | tenantScope | NONE ⚠️ |
| GET /api/intelligence/graph | JWT | None | None | None (global) | None |
| GET /api/intelligence/license-types | JWT | None | None | None (global) | None |
| GET /api/intelligence/license-types/:id | JWT | None | None | None (global) | None |
| GET /api/intelligence/dependencies | JWT | None | None | None (global) | None |
| GET /api/intelligence/rules | JWT | None | None | None (global) | None |
| GET /api/intelligence/locations/:id/graph | JWT | None | None | tenantScope | verifyLocationAccess ✓ |
| GET /api/intelligence/locations/:id/ai-audit | JWT | None | None | tenantScope | verifyLocationAccess ✓ |
| POST /api/intelligence/license-types | JWT | ORG_ADMIN | None | None | None |
| POST /api/intelligence/dependencies | JWT | ORG_ADMIN | None | None | None |
| DELETE /api/intelligence/dependencies/:id | JWT | ORG_ADMIN | None | None | None |
| GET /api/documents | JWT | None | None | tenantScope | service-layer |
| POST /api/documents | JWT | None | multer+MIME | tenantScope | verifyLocationAccess ✓ |
| PATCH /api/documents/:id/verify | JWT | ORG_ADMIN | None | tenantScope | None |
| GET /api/documents/:id/download | JWT | None | None | tenantScope | NONE ⚠️ |
| GET /api/documents/:id/file | JWT | None | None | tenantScope | NONE ⚠️ |
| DELETE /api/documents/:id | JWT | ORG_ADMIN | None | tenantScope | None |
| GET /api/audit-links/by-token/:token | None | None | None | None | None |
| GET /api/audit-links/by-token/:token/documents/:docId/download | None | None | None | None | None |
| POST /api/audit-links/access/:token | None | None | None | None | None |
| GET /api/audit-links | JWT | None | None | tenantScope | None |
| POST /api/audit-links | JWT | ORG_ADMIN | None | tenantScope | None |
| PATCH /api/audit-links/:id | JWT | ORG_ADMIN | None | tenantScope | None |
| GET /health | None | None | None | None | None |

### Authorization test results (backend test suite, this session)

Command: `npx vitest run --config tests/vitest.config.mjs`

```
Test Files  7 failed | 2 passed (9)
      Tests  7 failed | 101 passed | 59 skipped (167)

FAIL  tests/notifications.test.js
  + Received: 200
  - Expected: 403
  at tests/notifications.test.js:213:26
  // LOCATION_MANAGER should get 403 on POST /api/notifications/sweep
```

Every test asserting correct RBAC on broken routes fails. F-02 confirmed live.

---

## 5. README Feature Table

| README Claim | Implemented? | Code Location |
|---|---|---|
| Organization registration with admin account | YES | auth.service.js:85-228 |
| Organization, location, user management | YES | tenancy.service.js |
| ORG_ADMIN and LOCATION_MANAGER roles | YES | rbac.js, Prisma enum |
| Location-scoped access for managers | PARTIAL — upload enforced; download/score not enforced | F-01, F-05, F-06 |
| JWT auth + bcryptjs | YES | jwt.js, hash.js, auth.service.js |
| License types, state rules, required-license mappings, dependencies | YES | intelligence.service.js |
| Location compliance scores 0-100 | YES | complianceScore.service.js |
| Score breakdowns, suggested actions, history | YES | complianceScore.service.js:303-497 |
| Cascading dependency risk detection | YES | intelligence.service.js:246+, complianceScore.service.js:209-257 |
| Scheduled expiry and compliance-score jobs | YES — cron daily at midnight | scheduler.js:11 |
| Document uploads to S3-compatible storage | YES | document.service.js:122-123 |
| SHA-256 hashing at upload time | YES | document.service.js:118 |
| Pending/verified/rejected/expired states | YES | document.service.js:156-191 |
| Renewal version history via parent_document_id | YES | schema.prisma:226, document.service.js:140 |
| Time-bound audit links | YES | auditLink.service.js:42-63 |
| Optional PIN protection | BROKEN — silently dropped | F-04 |
| Link revocation and expiry | YES | auditLink.service.js:69-79, 110-111 |
| Public token-based audit view | YES | auditLink.routes.js:11 |
| Audit-link access logging | INCOMPLETE — client-voluntary | F-11 |
| In-app notifications + unread counts | YES | notification.service.js:43-210 |
| Notification preferences | YES | notification.service.js:276-352 |
| Email support via provider | YES | EmailService.js |
| Frontend routes (all 8 claimed) | YES | App.jsx |
| eventTracking module (listed in README project tree) | NOT FOUND | README:105 lists it; no such directory exists in backend/src/modules/ |

---

## 6. Frontend Contract Mismatches

| Frontend call | Backend route | Mismatch |
|---|---|---|
| api.js:42 sends key `pin_hash` | auditLink.service.js:34 reads `{ pin }` | KEY MISMATCH — PIN never stored (F-04) |
| api.js:483-486: `data.users \|\| []` | tenancy.service.js:197 returns array | data.users always undefined; always returns [] (F-20) |
| api.js:95-100 reads `data.data.token` | auth.controller.js wraps in `{ success:true, data: { token, user, ... } }` | MISMATCH: `data.data.token` double-nests; actual token is at `data.token` or `data.data.token` depending on controller wrapping — needs auth.controller.js verification |
| api.js:454-457 passes pin in query string | auditLink.controller.js:52 reads req.headers['x-audit-pin'] or req.query?.pin | Accepted, but PIN visible in server logs |
| api.js:245-247 appends ?orgId=${orgId} | intelligence.controller.js:144-158 uses req.user.org_id | Param ignored — dead |
| compliance.getLocationHistory returns response.data \|\| [] | complianceScore.controller.js returns { location, history } object | Fallback [] wrong type; harmless |
| documents.getDocuments reads data.documents | document.controller.js:49 returns { documents: result } | Match for non-paginated case |
| Token stored: localStorage.sclip_auth_token | httpOnly not used | XSS-accessible |

---

## 7. Security

**Tenant isolation:** TRACED — tenantScope correctly gates org_id on all authenticated routes. Cross-tenant data not accessible through normal paths.
Exception: auditLink.service.js:52-53 — document_ids not validated for org ownership (F-08).

**Location isolation:** BROKEN on GET /documents/:id/download, GET /documents/:id/file, GET /compliance/locations/:id (all three variants). Correctly enforced on POST /documents and intelligence location routes.

**Audit link PIN/expiry/revocation:**
- PIN silently not stored (F-04)
- Expiry: checked correctly at auditLink.service.js:111
- Revocation: is_active checked at auditLink.service.js:110
- PIN brute-force: no rate limiter on public routes (F-09)
- pin_hash scalar included in public API response (F-13)

**Upload validation:**
- MIME: client-controlled Content-Type only (F-10) — document.controller.js:23
- Size: 25 MB multer limit — VERIFIED (document.controller.js:21)
- Filename: sanitized with replace(/[^a-zA-Z0-9._-]/g, '_') — adequate (document.service.js:121)
- Storage key: tenant-namespaced with randomUUID (document.service.js:122) — TRACED

**JWT:**
- Secret: required at startup with no default (env.js:16-20) — VERIFIED
- Expiry: from JWT_EXPIRES_IN; default '7d' (env.js:21) — TRACED
- Storage: localStorage — XSS accessible
- Algorithm: HS256 (jsonwebtoken default, not explicitly set in jwt.js:11)

**CORS:** Single-origin, credentials:true (app.js:27). No wildcard. Acceptable.

**Helmet:** Mounted with crossOriginResourcePolicy cross-origin (app.js:24-26). No CSP configured.

**Rate limiting:**
- Auth: 30 req/15 min per IP (rateLimiter.js:4-15)
- API: 1000 req/15 min per IP (rateLimiter.js:18-29)
- Both disabled in NODE_ENV=test (rateLimiter.js:14,28)
- Public audit PIN endpoints: no rate limit (F-09)

**Error messages:** Stack trace only in development (errorHandler.js:59). DB errors remapped (errorHandler.js:13-33). Safe.

**Secrets in repo:** git ls-files grep → only backend/.env.example. .env and .env.test gitignored. VERIFIED.

**npm audit:**
- Backend: CRITICAL 1 (proxy-addr IP spoofing), HIGH 2 (body-parser DoS, Nodemailer SMTP injection), MODERATE 4
- Frontend: CRITICAL 2 (tinypool, esbuild — dev deps), HIGH 3, MODERATE 5

---

## 8. Could Not Verify (and why)

| Item | Reason |
|---|---|
| Phase 3 full two-tenant/two-location authorization matrix | No src modification allowed; custom seeded test data requires test helper setup. Existing test suite confirms sweep RBAC failure. |
| pin_hash presence confirmed in live HTTP response | MinIO unavailable; finding based on Prisma scalar return behaviour (code trace). |
| EmailService.sendWeeklyDigest absence | Test failure is direct evidence; EmailService.js not opened directly. |
| Gemini AI audit endpoint end-to-end | No GOOGLE_API_KEY in .env.test. |

---

## 9. Top 10 Fixes (finding IDs only, ranked severity x exploitability)

1. F-04 — PIN key mismatch: zero PIN protection on all audit links. One-line fix.
2. F-02/F-03 — /notifications/sweep callable by any authenticated user. Live test confirms 200 instead of 403.
3. F-01 — Three compliance routes expose every location's score breakdown to LOCATION_MANAGER.
4. F-05/F-06 — Document download and file stream bypass location access check.
5. F-08 — createAuditLink includes documents from other orgs by UUID guessing.
6. F-10 — MIME check is client-controlled; any file type uploadable by crafting Content-Type.
7. F-13 — pin_hash scalar leaked in public getAuditByToken response.
8. F-07 — PATCH /locations/:locationId missing ORG_ADMIN guard; LOCATION_MANAGER edits facility metadata.
9. F-09 — No rate limit on public PIN endpoint; 4-6 digit PINs brute-forceable.
10. F-11 — Access logging client-voluntary; automated scrapers leave no trail.

---

## 10. Fix-Order Warnings

- Fix F-04 before F-13: once PIN storage works, the stored hash becomes sensitive and must be stripped from the response.
- Fix F-08 before extending audit link document selection UI.
- Fix F-02 (route-level role gate) before F-03 (sweep scope refactor).
- Fix F-10 (magic bytes) with care: multer memoryStorage already holds file.buffer so no architecture change needed, but add the check after existing fileFilter to avoid confusing double-rejection messages.

---

## Baseline raw outputs (Phase 0)

**git diff --stat backend/src frontend/src:**
```
(empty)
```

**Prisma validate:**
```
The schema at prisma/schema.prisma is valid
```

**npm audit backend:** CRITICAL:1 HIGH:2 MODERATE:4  
**npm audit frontend:** CRITICAL:2 HIGH:3 MODERATE:5

**Frontend build:** exit 0, built in 3.39s

**Frontend lint:**
```
43 problems (3 errors, 40 warnings)
Errors: AuditView.jsx:113,114,121 — Blob, URL not defined
```

**Backend test suite:**
```
Test Files  7 failed | 2 passed (9)
Tests  7 failed | 101 passed | 59 skipped (167)
Confirming: POST /notifications/sweep → 200 (expected 403)
Confirming: emailService.sendWeeklyDigest is undefined
```

**git ls-files | grep -i env:**
```
backend/.env.example
backend/src/config/env.js
```

## PHASE 0 DONE
## PHASE 1 DONE
## PHASE 2 DONE
## PHASE 3 DONE (partial — RBAC confirmed by live test; full matrix blocked by no-src-modification rule)
## PHASE 4 DONE (score engine traced; pin/access log issues confirmed by code read)
## PHASE 5 DONE
## PHASE 6 DONE
## PHASE 7 DONE
## PHASE 8 DONE
