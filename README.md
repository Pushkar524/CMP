# SCLIP — Secure Compliance & License Intelligence Platform

A cloud-based, multi-tenant license and compliance management system that helps Indian businesses track regulatory licenses across multiple locations, detect cascading compliance risk, and stay ahead of renewal deadlines through automated monitoring and alerts.

**Academic Project (Phase 2)** — CSE Department, PES Institute of Technology & Management, Shivamogga (VTU, Belagavi)
**Team:** Pushkar Raj Purohit · Pavan Kumar · Suhas Patel N · T A Anantha Krishna
**Guide:** Ms. Suchitra H L, Assistant Professor, CSE Department

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [System Architecture](#system-architecture)
5. [Database Schema](#database-schema)
6. [Project Structure](#project-structure)
7. [Getting Started](#getting-started)
8. [Environment Variables](#environment-variables)
9. [Available Scripts](#available-scripts)
10. [API Overview](#api-overview)
11. [Compliance Score Engine](#compliance-score-engine)
12. [Security](#security)
13. [Free-Tier Deployment Notes](#free-tier-deployment-notes)
14. [Out of Scope](#out-of-scope)
15. [Roadmap](#roadmap)
16. [License](#license)

---

## Problem Statement

Businesses operating across multiple locations in India — retail chains, export shippers, multi-branch offices — have to track dozens of licenses (Trade License, Fire NOC, GST registration, DGFT IEC, and more), each with its own issuing authority, validity period, and renewal cadence. Today this is usually managed through spreadsheets and manual follow-ups, which means:

- No visibility into which locations are actually compliant *right now*
- No way to detect that renewing License A is pointless if prerequisite License B has already lapsed
- No structured audit trail proving a document hasn't been tampered with
- No easy, secure way to share specific documents with an external inspector without exposing everything else

SCLIP solves this with a single multi-tenant platform that stores, verifies, scores, and monitors compliance documents across an organization's entire footprint.

---

## Key Features

### 🏢 Multi-Tenant Architecture
Every organization's data is logically isolated by `org_id` at the database level. A single deployment serves many client companies without any cross-tenant data leakage, and every location, user, and document ultimately traces back to one owning organization.

### 🔐 Dynamic Role-Based Access Control (RBAC)
Three roles, enforced at the middleware layer rather than hardcoded per-feature:
- **Org Admin** — full visibility across every location in the org, bypasses location-level access checks entirely
- **Regional/Location Manager** — scoped access via a `User_Location_Access` mapping table; a manager overseeing 3 stores only sees those 3
- **External Inspector** — no login at all; access is granted through time-bound, revocable Audit Links (see below)

### 📄 License & Document Storage with Integrity Verification
Every uploaded certificate is hashed with **SHA-256** at upload time, giving a tamper-evident fingerprint that proves a document hasn't been altered after the fact. Files themselves live in encrypted object storage (MinIO locally, AWS S3 in production), never in the database — only the storage key and hash are stored relationally.

### 🧠 Rule-Based Dynamic Compliance Score Engine (Compliance Suggestions)
Rather than a static checklist, SCLIP computes a live 0–100 compliance score per location (and rolled up per organization) by combining:
- **Status & proximity to expiry** of every uploaded document (a license expiring in 10 days scores worse than one expiring in 200)
- **Lifetime-valid exemptions** — licenses that never expire (e.g. PAN) are never penalized for lacking an expiry date
- **Cascading dependency risk** — if a blocking prerequisite license has lapsed, the license that depends on it is penalized too, not just the prerequisite itself
- **Gap detection** — a reference table of which license types are mandatory per location type/state means the engine can flag licenses that are *missing entirely*, not just ones that are expiring — this is what actually makes the engine "suggest" what a location still needs to become compliant

Every score calculation is logged historically, so a location's compliance trend can be charted over time, not just viewed as a single current number.

### 🔗 Cascading Risk Mapping
A dedicated dependency graph between license types (e.g., a Fire NOC requiring a Lift Clearance first) lets the system flag downstream risk automatically the moment an upstream prerequisite lapses, instead of relying on someone to notice the connection manually.

### ⏰ Automated Expiry Scheduler & Active Monitoring
A scheduled background job (node-cron) sweeps all active documents daily, flags anything approaching expiry (30-day warning), anything that has just lapsed, and anything caught in a cascading-risk chain — then fans alerts out across **email, SMS, and in-app** channels, respecting each user's own notification preferences per alert type.

### 🗂️ Secure Cloud Data Rooms for External Audits
Instead of emailing documents to an inspector, a manager generates a time-bound, optionally PIN-protected shareable link exposing *only* the specific documents chosen for that audit. Every visit to the link is logged (timestamp + IP), giving a full access trail.

### 🔁 Document Renewal & Version History
When a license is renewed, the new upload links back to the version it replaced via a self-referencing chain, so the platform can reconstruct a location's full renewal history rather than just showing the current document in isolation.

### 🌍 Org-Wide vs. Location-Specific Documents
Some licenses (like a company-level DGFT IEC) apply to the whole organization; others (like a store's Trade License) are tied to one physical location. The schema natively supports both without duplicating data across locations.

### ✅ Document Verification Workflow
Uploaded documents sit in a pending state until a manager verifies them — with the ability to reject with a stated reason — so "uploaded" and "confirmed valid" are never conflated.

### 🔔 Per-User Notification Preferences
Users can opt in/out of specific channels per alert type (e.g., keep email for cascading-risk alerts, disable SMS for routine 30-day warnings) instead of being forced to receive everything.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend Runtime | Node.js + Express | REST API |
| Frontend | React | SPA consuming the REST API |
| ORM | Prisma ORM v7 | Runs a TypeScript-native query engine internally, but the app code that uses it is plain JavaScript |
| Database | PostgreSQL | Supabase or Neon free tier for development |
| File Storage | MinIO (dev) → AWS S3 (prod) | Wrapped in a `StorageService` abstraction for a one-file provider swap |
| Scheduler | node-cron | Drives the expiry sweep and compliance score recalculation jobs |
| Email | Nodemailer (SMTP) or Resend | Wrapped in an `EmailService` abstraction |
| SMS | Twilio (free trial credits) | Wrapped in an `SmsService` abstraction |
| Auth | JWT + custom RBAC middleware | No third-party auth provider dependency |
| Password Hashing | bcrypt | |
| File Uploads | Multer | Streams uploads to `StorageService` |
| Containerization | Docker Compose | Local Postgres + MinIO for development |
| Hosting | Render or Railway (free tier) | |
| Version Control | Git + GitHub | |

---

## System Architecture

```
┌─────────────┐      REST/JSON      ┌──────────────────┐      Prisma       ┌──────────────┐
│   React     │ ◄─────────────────► │  Express API      │ ◄───────────────► │  PostgreSQL   │
│   Frontend  │                     │  (Node.js/TS)     │                   │  (Supabase/   │
└─────────────┘                     │                    │                   │   Neon)       │
                                     │  ┌──────────────┐  │                   └──────────────┘
                                     │  │ node-cron     │  │
                                     │  │ scheduler     │  │
                                     │  └──────┬───────┘  │
                                     │         │          │
                          ┌──────────┴───┐  ┌──┴───────┐  │
                          │ StorageService│  │EmailService│ │
                          │ (MinIO / S3)  │  │SmsService  │ │
                          └───────────────┘  └────────────┘ │
                                     └──────────────────────┘
```

Every external dependency (storage provider, email provider, SMS provider) sits behind its own service abstraction, so swapping MinIO for S3 or Nodemailer for Resend is a one-file change rather than a scattered refactor — important given the project deliberately starts on free-tier infrastructure with a clean path to production services.

---

## Database Schema

15 entities across five modules:

| Module | Entities |
|---|---|
| **Tenancy & Access Control** | Organizations, Locations, Users, User_Location_Access |
| **Intelligence Engine** | License_Types, Dependencies, License_Type_State_Rules, Required_License_Types, Compliance_Scores |
| **Document Core** | Documents |
| **Cloud Data Rooms** | Audit_Links, Audit_Link_Documents, Audit_Link_Access_Logs |
| **Event Tracking** | Notification_Logs, Notification_Preferences |

Full DDL, ER diagram source, and the Prisma schema are maintained under `docs/schema/` and `prisma/schema.prisma` respectively (see [Project Structure](#project-structure)).

---

## Project Structure


sclip/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # Full Prisma data model (15 models)
│   │   ├── migrations/                # Auto-generated migration history
│   │   └── seed.js                    # Seed script (license types, demo org, etc.)
│   ├── prisma.config.js               # Prisma v7 CLI config (DB URL, migration paths)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js                 # Environment variable loader
│   │   │   └── db.js                  # Prisma Client instance (driver adapter setup)
│   │   ├── modules/
│   │   │   ├── auth/                  # Login, JWT issuing, RBAC middleware
│   │   │   ├── tenancy/               # Organizations, Locations, Users, access mapping
│   │   │   ├── intelligence/          # License types, dependencies, state rules,
│   │   │   │                          #   required-license mapping, compliance score engine
│   │   │   ├── documents/             # Upload, SHA-256 hashing, verification workflow
│   │   │   ├── dataRooms/             # Audit link generation, access logging
│   │   │   └── eventTracking/         # Notification logs, preferences, scheduler jobs
│   │   │       └── jobs/
│   │   │           ├── expiryScheduler.job.js
│   │   │           └── complianceScore.job.js
│   │   ├── services/                  # Provider-agnostic abstractions
│   │   │   ├── StorageService.js      # MinIO / S3 behind one interface
│   │   │   ├── EmailService.js        # Nodemailer / Resend behind one interface
│   │   │   └── SmsService.js          # Twilio behind one interface
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   ├── tenantScope.js         # Enforces org_id isolation on every query
│   │   │   └── rbac.js
│   │   ├── utils/
│   │   │   └── hash.js                # SHA-256 document hashing helper
│   │   ├── app.js                     # Express app assembly
│   │   └── server.js                  # Entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/                # Shared UI components
│   │   ├── pages/
│   │   │   ├── Dashboard/             # Compliance score overview, at-a-glance risk
│   │   │   ├── Locations/
│   │   │   ├── Documents/             # Upload, verify, renewal history views
│   │   │   ├── ComplianceScore/       # Score breakdown & trend charts
│   │   │   ├── AuditLinks/            # Generate & manage inspector share links
│   │   │   └── Auth/
│   │   ├── services/                  # API client (axios/fetch wrappers)
│   │   ├── hooks/
│   │   ├── context/                   # Auth context, active-tenant context
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml                 # Local Postgres + MinIO for development
├── .gitignore
└── README.md


---

## Getting Started

### Prerequisites
- Node.js ≥ 20.19 (22.x recommended)
- Docker (for local Postgres + MinIO) — or a free Supabase/Neon Postgres instance
- npm

### 1. Clone and install

```bash
git clone <repo-url> sclip
cd sclip/backend
npm install

cd ../frontend
npm install
```

### 2. Start local infrastructure (optional if using Supabase/Neon)

```bash
docker compose up -d   # spins up Postgres + MinIO locally
```

### 3. Configure environment variables

```bash
cd backend
cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET, storage + email + SMS credentials
```

### 4. Run migrations and generate the Prisma Client

```bash
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

### 5. Start the backend and frontend

```bash
# from /backend
npm run dev

# from /frontend, in a separate terminal
npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Supabase/Neon/local Docker) |
| `JWT_SECRET` | Signing secret for auth tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `STORAGE_PROVIDER` | `minio` or `s3` — read by `StorageService` |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` | Local storage config |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `AWS_S3_BUCKET` | Production storage config |
| `EMAIL_PROVIDER` | `nodemailer` or `resend` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Used when `EMAIL_PROVIDER=nodemailer` |
| `RESEND_API_KEY` | Used when `EMAIL_PROVIDER=resend` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | SMS alerts |
| `PORT` | Backend server port |

---

## Available Scripts

| Command | Runs |
|---|---|
| `npm run dev` | Starts the Express server with Node's `--watch` flag for auto-restart on file changes |
| `npm start` | Runs the server directly with `node src/server.js` |
| `npm run migrate` | `prisma migrate dev` — applies schema changes |
| `npm run generate` | `prisma generate` — regenerates the Prisma Client (not automatic in Prisma v7) |
| `npm run seed` | `prisma db seed` — seeds license types & demo data (not automatic in Prisma v7) |

---

## API Overview

High-level route groups (full route list lives in each module's `*.routes.js`):

- `POST /auth/login`, `POST /auth/refresh`
- `GET/POST /organizations`, `/locations`, `/users`
- `GET/POST /license-types`, `/dependencies`, `/license-type-state-rules`, `/required-license-types`
- `POST /documents/upload`, `PATCH /documents/:id/verify`, `GET /documents/:id/history`
- `GET /compliance-score/location/:id`, `GET /compliance-score/organization/:id`, `GET /compliance-score/:id/history`
- `POST /audit-links`, `GET /audit/:token` (public, token-authenticated)
- `GET/PATCH /notification-preferences`

All authenticated routes run through the `tenantScope` middleware first, which injects and enforces `org_id` scoping before the `rbac` middleware checks role-level permissions.

---

## Compliance Score Engine

The scheduler recalculates scores on a fixed cadence (and on-demand when a document's status changes). For each location:

1. Pull the required license set from `Required_License_Types` for that location's `type` (+ state override if one exists)
2. Left-join against `Documents` to find gaps (required types with no matching uploaded document)
3. For each existing document, score it based on `status` and proximity to `expiry_date`, treating `is_lifetime_valid` types as always fully compliant
4. Walk `Dependencies` for each document — if a blocking prerequisite is lapsed, apply a penalty to the dependent license's contribution
5. Aggregate into a single 0–100 score, write a snapshot row to `Compliance_Scores`, and update the cached `current_compliance_score` on `Locations`

---

## Security

- **Document integrity:** SHA-256 hash generated at upload time, stored alongside the file reference — any mismatch on re-verification indicates tampering
- **Tenant isolation:** every query is scoped by `org_id` at the middleware layer, not left to individual controller logic
- **Encrypted storage:** files are encrypted at rest in both MinIO and S3
- **Password security:** bcrypt hashing, never plaintext
- **Time-bound external access:** Audit Links expire automatically and can be additionally PIN-protected, with every access logged

---

## Free-Tier Deployment Notes

| Need | Free Option |
|---|---|
| Postgres hosting | Supabase or Neon |
| Object storage (dev) | MinIO via Docker, self-hosted |
| Object storage (prod-ready) | AWS S3 free tier |
| Email delivery | Resend free tier, or Nodemailer + Mailtrap for dev testing |
| SMS delivery | Twilio free trial credits |
| App hosting | Render or Railway free tier |

Every one of these swaps to its paid/production equivalent through the `StorageService`/`EmailService`/`SmsService` abstractions without touching business logic.

---

## Out of Scope

The following were considered during early exploration and deliberately dropped from the final academic submission:

- OCR-based document intake
- Eligibility questionnaire / rule engine for auto-suggesting which licenses a business needs (superseded by the lighter-weight `Required_License_Types` reference table)
- Multilingual voice/chat interface

---

## Roadmap

- [ ] Compliance score breakdown UI with trend charts
- [ ] Bulk document upload
- [ ] Configurable per-org alert thresholds (e.g., 30/15/7-day warnings)
- [ ] Export compliance reports as PDF
- [ ] Webhook support for third-party integrations

---

## License

Academic project — submitted in partial fulfilment of the requirements for the degree of Bachelor of Engineering in Computer Science & Engineering, Visvesvaraya Technological University (VTU), Belagavi.