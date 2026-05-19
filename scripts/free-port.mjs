#!/usr/bin/env node
/**
 * Kill any process listening on the given port (default 3000) so that
 * `next dev` always lands on the same origin. Critical for IndexedDB:
 * the browser partitions storage per origin (scheme + host + port), so
 * if we drift from 3000 → 3001 → 3002 across dev restarts, every
 * port has its own empty IndexedDB and progress data appears "wiped".
 *
 * Usage:  node scripts/free-port.mjs            # frees 3000
 *         node scripts/free-port.mjs 4000       # frees 4000
 *
 * Cross-platform: tries `lsof` (macOS/Linux) first, then falls back to
 * `netstat` (Windows). No-op when nothing is listening.
 */

import { execSync } from "node:child_process";

const port = Number(process.argv[2] ?? 3000);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`free-port: invalid port "${process.argv[2]}"`);
  process.exit(1);
}

function tryUnix() {
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!out) return null;
    return out.split(/\s+/).filter(Boolean);
  } catch {
    return null;
  }
}

function tryWindows() {
  try {
    const out = execSync(`netstat -ano -p TCP | findstr :${port}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/\s+LISTENING\s+(\d+)\s*$/);
      if (m) pids.add(m[1]);
    }
    return pids.size > 0 ? [...pids] : null;
  } catch {
    return null;
  }
}

const pids = tryUnix() ?? tryWindows();

if (!pids || pids.length === 0) {
  console.log(`free-port: port ${port} is already free.`);
  process.exit(0);
}

for (const pid of pids) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    }
    console.log(`free-port: killed pid ${pid} (was holding port ${port}).`);
  } catch (e) {
    console.warn(`free-port: failed to kill pid ${pid}: ${e?.message ?? e}`);
  }
}
