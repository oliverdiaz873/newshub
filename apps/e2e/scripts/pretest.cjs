const { rmSync } = require('node:fs');
const { execSync } = require('node:child_process');
const { resolve } = require('node:path');

const PORTS = [3210, 3211, 3212];

/**
 * Pretest hygiene (local runs, runs before Playwright boots webServers):
 * 1. Clear Next.js derived output so no fetch/route cache leaks across DB
 *    reseeds (safe: purely derived output, gitignored).
 * 2. Free our e2e ports from orphaned dev trees. tsx watch parents survive
 *    listener kills and resurrect servers; a squatter would otherwise serve
 *    stale code/DB while Playwright's URL check passes. Unique 321x ports
 *    plus this cleanup make runs deterministic. No-op on fresh CI runners.
 */
for (const app of ['storefront', 'dashboard']) {
  rmSync(resolve(__dirname, '..', app, '.next'), { recursive: true, force: true });
}
console.log('cleared storefront/dashboard .next');

if (process.platform === 'win32') {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split('\n')) {
      for (const port of PORTS) {
        const m = line.match(new RegExp(`TCP\\s+\\S+:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`));
        if (m) pids.add(m[1]);
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`);
        console.log(`freed port listener PID ${pid}`);
      } catch {
        // Already gone; ignore.
      }
    }
  } catch (err) {
    console.warn('port cleanup skipped:', err instanceof Error ? err.message : err);
  }
}
