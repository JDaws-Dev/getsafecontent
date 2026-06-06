#!/usr/bin/env node
// Vendors the canonical Safe Family auth toolkit into every app's convex/ dir.
// The repo isn't an npm workspace, so instead of a shared dependency we keep
// ONE source of truth (packages/safe-auth/src/index.ts) and stamp byte-identical
// copies into each app as convex/safeAuth.ts. Run after editing the source:
//   node scripts/sync-safe-auth.mjs
// Run with --check in CI to fail if any vendored copy has drifted.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "packages/safe-auth/src/index.ts");
const APPS = ["safereads", "safetunes", "safetube", "safeseek", "safespark"];
const HEADER = `// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth: packages/safe-auth/src/index.ts
// Regenerate: node scripts/sync-safe-auth.mjs
// Vendored per-app (repo is not an npm workspace) so the security-critical
// auth logic stays byte-identical across all Safe Family apps.

`;

const expected = HEADER + readFileSync(SRC, "utf8");
const check = process.argv.includes("--check");
let drift = 0;

for (const app of APPS) {
  const dest = join(root, "apps", app, "convex", "safeAuth.ts");
  if (check) {
    let current = "";
    try { current = readFileSync(dest, "utf8"); } catch { /* missing */ }
    if (current !== expected) { console.error(`DRIFT: apps/${app}/convex/safeAuth.ts`); drift++; }
  } else {
    writeFileSync(dest, expected);
    console.log(`synced -> apps/${app}/convex/safeAuth.ts`);
  }
}

if (check && drift) { console.error(`\n${drift} vendored copy/copies out of sync. Run: node scripts/sync-safe-auth.mjs`); process.exit(1); }
if (check) console.log("all vendored safeAuth.ts copies in sync ✓");
