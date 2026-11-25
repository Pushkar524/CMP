# Compliance Management Platform

A multi-tenant compliance management platform for organizations managing regulatory licenses, permits, and audit readiness across multiple physical locations. It combines a React + Vite + Tailwind CSS v4 frontend, an Express REST API, PostgreSQL persistence via Prisma ORM, S3-compatible document storage, and a rule-based compliance scoring engine.

**Academic Project (Phase 2)** — CSE Department, PES Institute of Technology & Management, Shivamogga (VTU, Belagavi)

**Team:** Pushkar Raj Purohit · Pavan Kumar · Suhas Patel N · T A Anantha Krishna

**Guide:** Ms. Suchitra H L, Assistant Professor, CSE Department

---

## Implemented Features

### Organization, Tenancy & Access Control
- Organization registration with initial `ORG_ADMIN` account creation.
- Multi-tenant data isolation scoped by `org_id`.
- Role-Based Access Control (RBAC) supporting `ORG_ADMIN`, `LOCATION_MANAGER`, and `EXTERNAL_INSPECTOR`.
- Location-scoped access control (`UserLocationAccess`) so location managers can view, update/complete store profiles, and manage documents only for their assigned locations.
- JWT-based authentication (`jsonwebtoken`) and password hashing (`bcryptjs`).

### Compliance & Intelligence Engine
- License types, state-specific rules (`LicenseTypeStateRule`), facility-type requirements (`RequiredLicenseType`), and prerequisite license dependencies (`Dependency`).
- Automated location compliance scoring (0–100) with detailed score breakdowns, suggested actions, historical score snapshots (`ComplianceScore`), and trend visualization.
- Cascading dependency risk detection when a prerequisite license expires or is missing.
- Scheduled expiry sweeps and compliance-score recalculation jobs via `node-cron`.

### Document Vault & Version History
- Organization-wide and location-specific compliance document records.
- S3-compatible file uploads (`@aws-sdk/client-s3` + `multer`) with presigned URL support.
- SHA-256 file integrity hashing at upload time.
- Document lifecycle states: `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`, and `EXPIRED`, with verification timestamps and rejection reasons.
- Renewal version history linked through `parent_document_id`.

### Cloud Audit Data Rooms
- Time-bound, token-based external audit links (`AuditLink`) for selected documents.
- Optional PIN protection (`pin_hash`), link revocation (`is_active`), and expiry enforcement.
- Public read-only audit view (`/audit/:token`) for external inspectors.
- Detailed access logging (`AuditLinkAccessLog`) recording timestamp, IP address, user agent, and status.

### Notifications & Alerts
- In-app notifications, unread counters, and per-user notification preferences (`EXPIRY_WARNING`, `LAPSED_LICENSE`, `CASCADING_RISK`).
- Email alert delivery via Resend or Nodemailer (SMTP).

### Frontend
- Code-split React 18 SPA with routes for login, registration, dashboard, locations, documents, compliance score, audit links, and the public audit view.
- Responsive layout with `DM Sans` typography, Tailwind CSS v4 styling, interactive modals, score gauges, dependency graphs, and trend charts.

---

## Tech Stack

| Area | Technology |
|---|---|
| Backend Runtime & Framework | Node.js, Express 4 |
| Backend Security & Validation | Helmet, CORS, `express-rate-limit`, Zod |
| Frontend Framework & Routing | React 18, React Router DOM 6 |
| Frontend Build & Styling | Vite 5, Tailwind CSS v4 (`@tailwindcss/postcss`), PostCSS, Autoprefixer |
| Frontend HTTP & Icons | Axios, `lucide-react` |
| Database & ORM | PostgreSQL (local or hosted, e.g., Supabase), Prisma ORM 5 |
| Object Storage | S3-compatible storage via AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) — supports Supabase Storage S3, AWS S3, or MinIO |
| Authentication & Hashing | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` |
| File Uploads | Multer |
| Background Scheduling | `node-cron` |
| Email Delivery | Resend (`resend`), Nodemailer (`nodemailer`) |
| Testing | Vitest, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `node --test`, `embedded-postgres` |

---

## Project Structure

```text
.
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auditLinks/
│   │   │   ├── auth/
│   │   │   ├── compliance/
│   │   │   ├── documents/
│   │   │   ├── eventTracking/
│   │   │   ├── intelligence/
│   │   │   ├── notifications/
│   │   │   └── tenancy/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── test/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Modals/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── tests/
│   └── package.json
├── docker-compose.yml
├── Detailed.txt
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 20.19 or newer and npm.
- PostgreSQL (either a hosted PostgreSQL database such as Supabase, or a local PostgreSQL instance).
- An S3-compatible object storage service (Supabase Storage S3, AWS S3, or MinIO).

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Start local infrastructure (optional)
If you are using local Docker containers instead of a hosted PostgreSQL/S3 service:

```bash
docker compose up -d
```

### 3. Configure environment variables
Create `backend/.env` from `backend/.env.example` and configure `DATABASE_URL`, `JWT_SECRET`, storage settings (`STORAGE_PROVIDER` as `s3` or `minio`), and email settings (`EMAIL_PROVIDER` as `resend` or `nodemailer`). Note that any special characters in `DATABASE_URL` passwords (such as `?`) must be URL-encoded (e.g., `%3F`).

### 4. Prepare the database

```bash
cd backend
npm run migrate
npm run generate
npm run seed
```

### 5. Run the application

Start the backend API server (defaults to port `5000`):

```bash
cd backend
npm run dev
```

In a second terminal, start the frontend Vite dev server (defaults to port `5173`):

```bash
cd frontend
npm run dev
```

---

## Backend API Modules

The Express application mounts the following route groups in `backend/src/app.js`:

- `/api/auth` — Registration, login, and session verification
- `/api/tenancy` — Organization profile, locations, users, and location assignments
- `/api/documents` — Upload, download/presigned URLs, verification, rejection, and renewal version history
- `/api/compliance` — Compliance score calculation and historical snapshots
- `/api/intelligence` — License types, state rules, required licenses, and dependency mappings
- `/api/audit-links` — Audit data room creation, revocation, listing, and public token verification
- `/api/notifications` — Notification feed, unread counts, and alert preferences

Health endpoints: `GET /health` and `GET /api/health`.

---

## Frontend Routes

| Route | Purpose |
|---|---|
| `/login` | Sign in and quick demo persona switcher |
| `/register` | Register a new organization and admin account |
| `/dashboard` | Organization compliance overview |
| `/locations` | Manage, complete, and inspect locations |
| `/documents` | Upload, verify, filter, and review documents & version history |
| `/compliance` | Review scores, suggestions, dependencies, and trends |
| `/audit-links` | Create and manage external audit data rooms |
| `/audit/:token` | Public token-based audit view |

---

## Available Scripts

### Backend (`backend/package.json`)
| Command | Purpose |
|---|---|
| `npm run dev` | Start the API with `node --watch src/server.js` |
| `npm start` | Start the API normally |
| `npm test` | Run backend tests (`node -r dotenv/config --test test/*.test.js`) |
| `npm run migrate` | Run Prisma development migrations |
| `npm run generate` | Generate the Prisma client |
| `npm run seed` | Seed the database |

### Frontend (`frontend/package.json`)
| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production frontend build |
| `npm run lint` | Run ESLint |
| `npm test` | Run frontend tests with Vitest |
| `npm run preview` | Preview the production build |

---

## Academic Information

This project is submitted in partial fulfilment of the requirements for the degree of Bachelor of Engineering in Computer Science & Engineering, Visvesvaraya Technological University (VTU), Belagavi.
