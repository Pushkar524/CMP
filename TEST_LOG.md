# Test Execution Log

COULD NOT RUN: Docker is not installed on the host system and no local PostgreSQL database server is running at localhost:5432 to host cmp_test.

---

## 1. Safety Guard Verification

Safety requirement: The test setup must THROW if `DATABASE_URL` contains "supabase" or any non-localhost host. Tests must NEVER run against the hosted Supabase database.

### Command
```bash
node scripts/verify_safety_guard.js
```

### Raw Output
```text
All safety guard assertions passed successfully!
```

---

## 2. Smoke Test Execution (`GET /health`)

### Command
```bash
npx vitest run --config tests/vitest.config.js
```

### Raw Terminal Output
```text
 RUN  v5.0.5 /home/krishnanantha/major-project/CMP-P1/backend

Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "cmp_test", schema "public" at "localhost:5432"

Error: P1001: Can't reach database server at `localhost:5432`

Please make sure your database server is running at `localhost:5432`.

============================================================
[Test Setup] Running Pre-Flight Safety Verification...
============================================================
[Test Setup] Safety check passed: Verified local test database (postgresql://postgres:postgres@localhost:5432/cmp_test)
[Test Setup] Running prisma migrate deploy on cmp_test...
[Test Setup] prisma migrate deploy failed: Command failed: npx prisma migrate deploy
No test files found, exiting with code 1

include: tests/**/*.test.js
exclude:  **/node_modules/**, **/.git/**


⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Startup Error ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
TypeError: code.charCodeAt is not a function
    at extractInlineSourceMap (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vite/dist/node/module-runner.js:366:57)
    at EvaluatedModules.getModuleSourceMapById (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vite/dist/node/module-runner.js:355:19)
    at getRunnerSourceMap (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vite/dist/node/module-runner.js:952:31)
    at mapSourcePosition (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vite/dist/node/module-runner.js:991:18)
    at wrapCallSite (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vite/dist/node/module-runner.js:1075:17)
    at Function.prepareStackTrace (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vite/dist/node/module-runner.js:1102:78)
    at prepareStackTraceCallback (node:internal/errors:144:29)
    at parseErrorStacktrace (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vitest/dist/chunks/source-map.DdKI5IHB.js:1736:21)
    at Object.parseErrorStacktrace (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vitest/dist/chunks/index.1TqnEahn.js:3285:11)
    at printErrorInner (file:///home/krishnanantha/major-project/CMP-P1/backend/node_modules/vitest/dist/chunks/index.1TqnEahn.js:3312:25)
```

---

## 3. Discovered Test Harness & Files Created

1. **`backend/.env.test`**:
   - `PORT=5055`
   - `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cmp_test"`
   - `JWT_SECRET="test-jwt-secret-key-32-chars-minimum-for-security"`
   - Local MinIO S3 endpoint (`http://localhost:9000`)
2. **`backend/tests/helpers.js`**:
   - `verifySafeDatabaseUrl()`: Throws if `DATABASE_URL` contains `supabase` or non-localhost hostname.
   - `login(email, pw)`: Authenticates via `POST /api/auth/login` and extracts token.
   - `api(method, path, token, body)`: Universal HTTP client targeting `PORT=5055`.
   - `createSecondTenant()`: Registers a distinct organization with fresh admin & branch credentials.
3. **`backend/tests/globalSetup.mjs` / `globalSetup.js`**:
   - Pre-flight safety check against `DATABASE_URL`.
   - Runs `prisma migrate deploy` on local database.
   - Seeds database with test data.
   - Spawns `node src/server.js` with `.env.test` on `PORT=5055`.
   - Polls `http://localhost:5055/health` until 200 OK.
   - Graceful teardown hook to kill test server after completion.
4. **`backend/tests/smoke.test.js`**:
   - Test suite verifying `GET /health` returns 200 OK with `status: "UP"` and database/storage checks.
5. **`backend/tests/vitest.config.js` / `vitest.config.mjs`**:
   - Configures Vitest with root, global setup, and test runner options.
