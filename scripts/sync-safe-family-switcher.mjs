#!/usr/bin/env node
// Vendors the canonical Safe Family cross-app switcher into every app.
// Same pattern as sync-safe-auth: one source of truth in packages/ui,
// byte-identical copies in each app so the switcher stays consistent.
//
//   node scripts/sync-safe-family-switcher.mjs
//
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'packages/ui/SafeFamilySwitcher.jsx');

// Each app's vendored copy lives at the same relative path.
const TARGETS = [
  'apps/safetunes/src/components/SafeFamilySwitcher.jsx',
  'apps/safetube/src/components/SafeFamilySwitcher.jsx',
  'apps/safeseek/src/components/SafeFamilySwitcher.jsx',
  'apps/safereads/src/components/SafeFamilySwitcher.jsx',
  'apps/safespark/src/components/SafeFamilySwitcher.jsx',
];

const banner =
  '// AUTO-SYNCED from packages/ui/SafeFamilySwitcher.jsx — do not edit here.\n' +
  '// Run: node scripts/sync-safe-family-switcher.mjs\n\n';
const source = readFileSync(SRC, 'utf8');

for (const t of TARGETS) {
  writeFileSync(join(root, t), banner + source);
  console.log('synced →', t);
}
console.log(`\n${TARGETS.length} copies written from packages/ui/SafeFamilySwitcher.jsx`);
