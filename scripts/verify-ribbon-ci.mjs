#!/usr/bin/env node
/** Run browser guards with an owned Vite process and synthetic reference host. */
import { basename } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
const baseUrl = "http://127.0.0.1:5174";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5174",
    "--strictPort",
  ],
  { stdio: "inherit" },
);
const run = (script) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      stdio: "inherit",
      env: {
        ...process.env,
        RIBBON_BASE_URL: baseUrl,
        RIBBON_BROWSER: "chromium",
        RIBBON_OUTPUT: `test-results/ribbon/${basename(script, ".mjs").replace("verify-ribbon-", "")}`,
      },
    });
    child.on("error", reject);
    child.on("exit", (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`${script} exited ${code ?? signal}`)),
    );
  });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null)
      throw new Error(`Reference server exited ${server.exitCode}`);
    try {
      ready = (await fetch(`${baseUrl}/tests/browser/ribbon/`)).ok;
    } catch {
      /* Server starting. */
    }
    if (ready) break;
    await delay(200);
  }
  if (!ready) throw new Error("Reference server startup timed out");
  await run("scripts/verify-ribbon-reference.mjs");
  await run("scripts/verify-ribbon-resize.mjs");
  await run("scripts/verify-ribbon-contexts.mjs");
  await run("scripts/verify-ribbon-icons.mjs");
  await run("scripts/verify-ribbon-editing.mjs");
  await run("scripts/verify-ribbon-clipboard.mjs");
  await run("scripts/verify-ribbon-painter.mjs");
  await run("scripts/verify-ribbon-inherited-formatting.mjs");
} finally {
  server.kill("SIGTERM");
}
