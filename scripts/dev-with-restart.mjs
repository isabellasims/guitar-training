#!/usr/bin/env node
/**
 * Dev-server wrapper with an in-terminal restart command.
 *
 * Why: Next.js HMR doesn't recover from every kind of edit — sometimes
 * a stale chunk error leaves the page broken, and the only fix is a
 * full server restart. Manually killing + relaunching loses your
 * scroll position in the terminal and breaks pipelining of output.
 * This wrapper keeps everything in one terminal.
 *
 * Controls:
 *   r + Enter      → restart `next dev` (kills + relaunches in-place)
 *   rs + Enter     → same (nodemon-style alias)
 *   R + Enter      → hard restart: wipes .next/ then restarts
 *                    (use when you see "Cannot resolve './vendor-chunks/…'"
 *                     or other webpack cache corruption)
 *   q + Enter      → quit cleanly
 *   Ctrl+C         → quit cleanly
 *
 * The wrapper runs `free-port` before each (re)start so the dev server
 * always lands on the same origin — keeping IndexedDB stable across
 * restarts.
 */

import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const PORT = process.env.PORT || "3000";
const FREE_PORT_SCRIPT = path.join(__dirname, "free-port.mjs");

let child = null;
let stopping = false;
let restarting = false;

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const log = (s) => console.log(dim(`[dev] ${s}`));

function freePort() {
  return new Promise((resolve) => {
    const proc = spawn("node", [FREE_PORT_SCRIPT, PORT], {
      stdio: "inherit",
      cwd: ROOT,
    });
    proc.on("exit", () => resolve());
  });
}

function start() {
  child = spawn("next", ["dev", "-p", PORT], {
    stdio: "inherit",
    cwd: ROOT,
    // npm run already adds node_modules/.bin to PATH for us; no shell needed.
    env: process.env,
  });
  child.on("exit", (code, signal) => {
    const wasIntentional = stopping || restarting;
    child = null;
    if (wasIntentional) return;
    if (code !== null && code !== 0) {
      log(`next exited with code ${code}; bye`);
      process.exit(code);
    }
    if (signal) {
      log(`next exited (${signal}); bye`);
      process.exit(0);
    }
  });
}

async function restart({ hard = false } = {}) {
  if (restarting) return;
  restarting = true;
  log(hard ? "hard restart (wiping .next/)…" : "restarting…");
  if (child) {
    const old = child;
    child = null;
    await new Promise((resolve) => {
      old.once("exit", resolve);
      old.kill("SIGTERM");
      // Hard-kill if it doesn't exit promptly.
      setTimeout(() => {
        try {
          old.kill("SIGKILL");
        } catch {
          // ignore — already dead
        }
      }, 1500);
    });
  }
  if (hard) {
    try {
      await rm(path.join(ROOT, ".next"), { recursive: true, force: true });
      log(".next/ wiped");
    } catch (e) {
      log(`failed to wipe .next/: ${e?.message ?? e}`);
    }
  }
  await freePort();
  start();
  restarting = false;
}

function shutdown() {
  if (stopping) return;
  stopping = true;
  log("shutting down…");
  if (child) child.kill("SIGTERM");
  setTimeout(() => process.exit(0), 300);
}

(async () => {
  await freePort();
  start();
  log("press r + Enter to restart · R + Enter for hard restart (wipe .next/) · q or Ctrl+C to quit");

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });
  rl.on("line", (line) => {
    const raw = line.trim();
    const cmd = raw.toLowerCase();
    // Capital R (or "rh") = hard restart: wipe .next/ before relaunching.
    if (raw === "R" || cmd === "rh") void restart({ hard: true });
    else if (cmd === "r" || cmd === "rs") void restart();
    else if (cmd === "q" || cmd === "quit" || cmd === "exit") shutdown();
  });
})();

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
