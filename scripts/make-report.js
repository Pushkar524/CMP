const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const RESULTS_DIR = path.join(ROOT_DIR, 'results');
const BACKEND_MODULES_DIR = path.join(ROOT_DIR, 'backend/src/modules');
const FRONTEND_API_FILE = path.join(ROOT_DIR, 'frontend/src/services/api.js');
const REPORT_FILE = path.join(ROOT_DIR, 'TEST_REPORT.md');

// Route prefixes mapped by route filename
const MODULE_PREFIXES = {
  'auth.routes.js': '/api/auth',
  'tenancy.routes.js': '/api/tenancy',
  'notification.routes.js': '/api/notifications',
  'complianceScore.routes.js': '/api/compliance',
  'intelligence.routes.js': '/api/intelligence',
  'document.routes.js': '/api/documents',
  'auditLink.routes.js': '/api/audit-links',
};

// 1. Read all JSON results
function loadResults() {
  const resultFiles = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'));
  const modules = [];

  for (const file of resultFiles) {
    const filePath = path.join(RESULTS_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const moduleName = path.basename(file, '.json');
      const tests = [];

      for (const suite of data.testResults || []) {
        for (const test of suite.assertionResults || []) {
          const status = test.status === 'passed' ? 'PASS' : 'FAIL';
          let failureSnippet = '-';
          if (status === 'FAIL' && test.failureMessages && test.failureMessages.length > 0) {
            const rawMsg = test.failureMessages[0]
              .replace(/\u001b\[\d+m/g, '') // Strip ANSI colors
              .trim();
            const lines = rawMsg.split('\n').filter((l) => l.trim().length > 0).slice(0, 3);
            failureSnippet = lines.join(' ').replace(/\|/g, '\\|');
          }

          tests.push({
            name: test.title || test.fullName,
            fullName: test.fullName,
            status,
            failureSnippet,
          });
        }
      }

      modules.push({
        moduleName,
        fileName: file,
        isBackend: moduleName !== 'frontend',
        tests,
        passed: tests.filter((t) => t.status === 'PASS').length,
        failed: tests.filter((t) => t.status === 'FAIL').length,
      });
    } catch (err) {
      console.error(`Error reading ${file}:`, err.message);
    }
  }

  // Sort modules: backend modules first in alphabetical order, then frontend
  modules.sort((a, b) => {
    if (a.isBackend && !b.isBackend) return -1;
    if (!a.isBackend && b.isBackend) return 1;
    return a.moduleName.localeCompare(b.moduleName);
  });

  return modules;
}

// 2. Grep router.(get|post|put|patch|delete) in backend/src/modules
function getBackendRoutes() {
  const routes = [];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.routes.js')) {
        const prefix = MODULE_PREFIXES[entry.name] || '';
        const content = fs.readFileSync(fullPath, 'utf8');
        const regex = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const method = match[1].toUpperCase();
          const routePath = match[2];
          const fullRoute = routePath === '/' ? prefix : `${prefix}${routePath.startsWith('/') ? '' : '/'}${routePath}`;
          routes.push({
            method,
            path: fullRoute,
            file: path.relative(ROOT_DIR, fullPath),
            signature: `${method} ${fullRoute}`,
          });
        }
      }
    }
  }

  if (fs.existsSync(BACKEND_MODULES_DIR)) {
    scanDir(BACKEND_MODULES_DIR);
  }
  return routes;
}

// 3. Extract exported functions in frontend/src/services/api.js
function getFrontendFunctions() {
  const functions = [];
  if (!fs.existsSync(FRONTEND_API_FILE)) return functions;

  const content = fs.readFileSync(FRONTEND_API_FILE, 'utf8');

  // Match objects like `export const auth = { ... }`
  const objectRegex = /export\s+const\s+(\w+)\s*=\s*\{([\s\S]*?)\n\};/g;
  let objMatch;
  while ((objMatch = objectRegex.exec(content)) !== null) {
    const objName = objMatch[1];
    const body = objMatch[2];
    const fnRegex = /^\s{2,4}([a-zA-Z0-9_]+)\s*:\s*(async\s*)?(\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/gm;
    let fnMatch;
    while ((fnMatch = fnRegex.exec(body)) !== null) {
      functions.push(`${objName}.${fnMatch[1]}`);
    }
    const refRegex = /^\s{2,4}([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_.]+)\s*,/gm;
    let refMatch;
    while ((refMatch = refRegex.exec(body)) !== null) {
      if (!functions.includes(`${objName}.${refMatch[1]}`)) {
        functions.push(`${objName}.${refMatch[1]}`);
      }
    }
  }

  // Standalone exports
  const standaloneRegex = /^export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*(async\s*)?(\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/gm;
  let saMatch;
  while ((saMatch = standaloneRegex.exec(content)) !== null) {
    if (!['auth', 'tenancy', 'compliance', 'intelligence', 'documents', 'notifications', 'auditLinks', 'api'].includes(saMatch[1])) {
      functions.push(saMatch[1]);
    }
  }

  return [...new Set(functions)];
}

// 4. Generate Report
function generateReport() {
  const modules = loadResults();
  const backendRoutes = getBackendRoutes();
  const frontendFunctions = getFrontendFunctions();

  // Split modules into backend and frontend
  const backendModules = modules.filter((m) => m.isBackend);
  const frontendModules = modules.filter((m) => !m.isBackend);

  // Backend totals
  const backendTotal = backendModules.reduce((acc, m) => acc + m.tests.length, 0);
  const backendPassed = backendModules.reduce((acc, m) => acc + m.passed, 0);
  const backendFailed = backendModules.reduce((acc, m) => acc + m.failed, 0);
  const backendPassRate = backendTotal > 0 ? ((backendPassed / backendTotal) * 100).toFixed(1) : '0.0';

  // Frontend totals
  const frontendTotal = frontendModules.reduce((acc, m) => acc + m.tests.length, 0);
  const frontendPassed = frontendModules.reduce((acc, m) => acc + m.passed, 0);
  const frontendFailed = frontendModules.reduce((acc, m) => acc + m.failed, 0);
  const frontendPassRate = frontendTotal > 0 ? ((frontendPassed / frontendTotal) * 100).toFixed(1) : '0.0';

  // Overall totals
  const totalTests = backendTotal + frontendTotal;
  const totalPassed = backendPassed + frontendPassed;
  const totalFailed = backendFailed + frontendFailed;
  const totalPassRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';

  // Collect test names STRICTLY by layer
  const backendTestNames = [];
  for (const mod of backendModules) {
    for (const t of mod.tests) {
      backendTestNames.push(t.name);
      backendTestNames.push(t.fullName);
    }
  }

  const frontendTestNames = [];
  for (const mod of frontendModules) {
    for (const t of mod.tests) {
      frontendTestNames.push(t.name);
      frontendTestNames.push(t.fullName);
    }
  }

  // Determine untested backend routes against BACKEND test suites ONLY
  const untestedRoutes = [];
  for (const r of backendRoutes) {
    const isTested = backendTestNames.some((tName) => {
      const pathSegment = r.path.split(':')[0];
      return tName.includes(r.signature) || (tName.includes(r.method) && tName.includes(pathSegment));
    });
    if (!isTested) {
      untestedRoutes.push(`${r.signature} (${r.file})`);
    }
  }

  // Determine untested frontend functions against FRONTEND tests ONLY
  const untestedFunctions = [];
  for (const fn of frontendFunctions) {
    const isTested = frontendTestNames.some((tName) => tName.includes(fn) || tName.includes(fn.split('.')[1] || fn));
    if (!isTested) {
      untestedFunctions.push(fn);
    }
  }

  let report = `# Test Execution and Contract Verification Report\n\n`;
  report += `## Summary Totals\n\n`;
  report += `### Overall Platform\n`;
  report += `- **Total Tests Run**: ${totalTests}\n`;
  report += `- **Passed**: ${totalPassed}\n`;
  report += `- **Failed**: ${totalFailed}\n`;
  report += `- **Pass Rate**: ${totalPassRate}%\n\n`;

  report += `### Backend Layer (Isolated Postgres Test DB)\n`;
  report += `- **Backend Tests Run**: ${backendTotal}\n`;
  report += `- **Passed**: ${backendPassed}\n`;
  report += `- **Failed**: ${backendFailed}\n`;
  report += `- **Pass Rate**: ${backendPassRate}%\n\n`;

  report += `### Frontend Layer (Contract, Mock & Component Tests)\n`;
  report += `- **Frontend Tests Run**: ${frontendTotal}\n`;
  report += `- **Passed**: ${frontendPassed}\n`;
  report += `- **Failed**: ${frontendFailed}\n`;
  report += `- **Pass Rate**: ${frontendPassRate}%\n\n`;

  // Section 1: Backend Modules
  report += `## Backend Test Results by Module\n\n`;
  for (const mod of backendModules) {
    report += `### Module: ${mod.moduleName} (${mod.passed} passed, ${mod.failed} failed, ${mod.tests.length} total)\n\n`;
    report += `| Test | Status | Failure Message (First 3 Lines) |\n`;
    report += `| :--- | :---: | :--- |\n`;
    for (const t of mod.tests) {
      report += `| ${t.name.replace(/\|/g, '\\|')} | ${t.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${t.failureSnippet} |\n`;
    }
    report += `\n`;
  }

  // Section 2: Frontend Modules
  report += `## Frontend Test Results\n\n`;
  for (const mod of frontendModules) {
    report += `### Module: ${mod.moduleName} (${mod.passed} passed, ${mod.failed} failed, ${mod.tests.length} total)\n\n`;
    report += `| Test | Status | Failure Message (First 3 Lines) |\n`;
    report += `| :--- | :---: | :--- |\n`;
    for (const t of mod.tests) {
      report += `| ${t.name.replace(/\|/g, '\\|')} | ${t.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${t.failureSnippet} |\n`;
    }
    report += `\n`;
  }

  // Section 3: Untested Surfaces
  report += `## UNTESTED: routes/functions with no matching test name\n\n`;
  report += `### Backend Routes Without Dedicated Backend Test Coverage (${untestedRoutes.length} of ${backendRoutes.length} routes)\n\n`;
  if (untestedRoutes.length === 0) {
    report += `All ${backendRoutes.length} backend routes are covered by backend test suites.\n\n`;
  } else {
    for (const r of untestedRoutes) {
      report += `- \`${r}\`\n`;
    }
    report += `\n`;
  }

  report += `### Frontend Functions Without Direct Frontend Test Coverage (${untestedFunctions.length} of ${frontendFunctions.length} functions)\n\n`;
  if (untestedFunctions.length === 0) {
    report += `All ${frontendFunctions.length} exported frontend API functions are covered by frontend test suites.\n\n`;
  } else {
    for (const f of untestedFunctions) {
      report += `- \`${f}\`\n`;
    }
    report += `\n`;
  }

  // Notes Section (5 lines max)
  report += `## Notes\n\n`;
  report += `1. Docker is unavailable on host; storage operations requiring MinIO network streaming are unmocked.\n`;
  report += `2. Backend tests confirmed critical horizontal privilege escalation across facilities in compliance scoring.\n`;
  report += `3. Intra-tenant IDOR confirmed in document download URL generation allowing cross-store document access.\n`;
  report += `4. Frontend contracts caught CreateAuditLinkModal dropping PINs via pin_hash key and api.getUsers returning [].\n`;
  report += `5. Frontend pages swallow API failures via catch-console-only, showing blank states instead of error messages.\n`;

  fs.writeFileSync(REPORT_FILE, report, 'utf8');
  console.log(`Successfully generated ${REPORT_FILE}`);
}

generateReport();
