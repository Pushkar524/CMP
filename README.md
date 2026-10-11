# Compliance Management Platform

This is a multi-tenant compliance management application for organizations that
need to manage regulatory documents across multiple locations. The current
implementation includes a React frontend, an Express API, PostgreSQL persistence
through Prisma, document storage through an S3-compatible service, and a
rule-based compliance score engine.

**Academic Project (Phase 2)** — CSE Department, PES Institute of Technology &
Management, Shivamogga (VTU, Belagavi)

**Team:** Pushkar Raj Purohit · Pavan Kumar · Suhas Patel N · T A Anantha Krishna

**Guide:** Ms. Suchitra H L, Assistant Professor, CSE Department

## Implemented Features

### Organization and access management

- Organization registration with administrator account creation.
- Organization, location, and user management.
- Organization-admin and location-manager roles.
- Location-scoped access checks for location managers.
- JWT-based authentication and password hashing with bcryptjs.

### Compliance and intelligence

- License types, state rules, required-license mappings, and license
  dependencies.
- Location compliance scores from 0 to 100.
- Score breakdowns, suggested actions, historical score snapshots, and trend
  visualization.
- Cascading dependency risk detection when a prerequisite license expires.
- Scheduled expiry and compliance-score jobs.

### Documents

- Organization-wide and location-specific document records.
- Document uploads to the configured S3-compatible storage provider.
- SHA-256 hashing at upload time.
- Pending, verified, rejected, and expired document states.
- Document verification and rejection reasons.
- Renewal version history through parent-document relationships.

### Audit data rooms

- Time-bound audit links for selected documents.
- Optional PIN protection.
- Link revocation and expiry handling.
- Public token-based audit view for external inspectors.
- Audit-link access logging.

### Notifications

- In-app notifications and unread counts.
- Notification preferences.
- Email notification support through the configured email provider.

### Frontend

- Routes for login, registration, dashboard, locations, documents, compliance,
  audit links, and the public audit view.
- Shared responsive application layout with tenant and persona switching.
- Reusable forms, modals, score gauges, dependency graphs, trend charts, and
  notification controls.
- Updated visual design across the frontend with:
  - DM Sans used consistently for headings, body text, and controls.
  - Neutral surfaces with navy, blue, and teal accents.
  - Consistent cards, controls, borders, shadows, and focus states.
  - Responsive desktop, tablet, and mobile layout behavior.

## Tech Stack

| Area | Technology |
|---|---|
| Backend | Node.js, Express |
| Frontend | React, React Router, Vite |
| Database | PostgreSQL |
| ORM | Prisma |
| Object storage | S3-compatible storage, configured for MinIO or S3 |
| Authentication | JWT and custom role/access middleware |
| Password hashing | bcryptjs |
| File uploads | Multer |
| Scheduling | node-cron |
| Email | Nodemailer or Resend |
| UI icons | lucide-react |

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
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20.19 or newer.
- npm.
- PostgreSQL, either locally or through a PostgreSQL-compatible hosted
  instance.
- An S3-compatible storage service. The included Docker Compose configuration
  provides MinIO for local development.

### Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### Start local storage

The repository includes PostgreSQL and MinIO services:

```bash
docker compose up -d
```

### Configure the backend

Create `backend/.env` from `backend/.env.example` and set the required
database, JWT, storage, and email values. The backend exits during startup if
`DATABASE_URL` or `JWT_SECRET` is missing.

### Prepare the database

```bash
cd backend
npm run migrate
npm run generate
npm run seed
```

### Run the application

Start the backend:

```bash
cd backend
npm run dev
```

In a second terminal, start the frontend:

```bash
cd frontend
npm run dev
```

The frontend runs on Vite's default development port, and the backend defaults
to port `5000`.

## Backend API Modules

The Express application currently mounts these API groups:

- `/api/auth`
- `/api/tenancy`
- `/api/notifications`
- `/api/compliance`
- `/api/intelligence`
- `/api/documents`
- `/api/audit-links`

It also exposes `GET /health`.

## Frontend Routes

| Route | Purpose |
|---|---|
| `/login` | Sign in |
| `/register` | Register an organization |
| `/dashboard` | Organization compliance overview |
| `/locations` | Manage and inspect locations |
| `/documents` | Upload, verify, filter, and review documents |
| `/compliance` | Review scores, suggestions, dependencies, and trends |
| `/audit-links` | Create and manage audit data rooms |
| `/audit/:token` | Public token-based audit view |

Authenticated management routes are protected by the frontend auth context.

## Available Scripts

### Backend

| Command | Purpose |
|---|---|
| `npm run dev` | Start the API with Node's watch mode |
| `npm start` | Start the API normally |
| `npm run migrate` | Run Prisma development migrations |
| `npm run generate` | Generate the Prisma client |
| `npm run seed` | Seed the database |

### Frontend

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production frontend build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

## Validation

The current frontend visual redesign has been validated with:

- `npm run build` — passes.
- `npm run lint` — completes without lint errors; existing unused-import
  warnings remain.
- Vite preview smoke test — passes.

## Academic Information

This project is submitted in partial fulfilment of the requirements for the
degree of Bachelor of Engineering in Computer Science & Engineering,
Visvesvaraya Technological University (VTU), Belagavi.
