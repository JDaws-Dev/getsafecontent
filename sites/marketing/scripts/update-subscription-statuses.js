#!/usr/bin/env node
/**
 * Update subscription statuses for migrated users based on their original app status.
 *
 * This script reads the original SafeTunes/SafeTube users tables and updates
 * the central user subscription status accordingly.
 *
 * Usage:
 *   node scripts/update-subscription-statuses.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ADMIN_KEY = process.env.ADMIN_API_KEY;
if (!ADMIN_KEY) {
  console.error('Set ADMIN_API_KEY in the environment before running this script.');
  process.exit(1);
}
const MARKETING_URL = 'https://adamant-crow-705.convex.site';
const BACKUP_BASE = path.join(process.env.HOME, 'Desktop/convex-backups');

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

async function updateSubscription(email, status, entitledApps) {
  const url = `${MARKETING_URL}/updateSubscription`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        email,
        subscriptionStatus: status,
        entitledApps,
      }),
    });

    const data = await response.json();
    return { success: !data.error, data, status: response.status };
  } catch (error) {
    console.error(`Error updating ${email}:`, error);
    return { success: false, error: error.message };
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  // Read SafeTunes users table (has subscription status info)
  const safetunesUsersPath = path.join(BACKUP_BASE, 'safetunes-export/users/documents.jsonl');
  const safetunesUsers = readJsonl(safetunesUsersPath);
  console.log(`SafeTunes users table: ${safetunesUsers.length} users`);

  // Read SafeTube users table
  const safetubeUsersPath = path.join(BACKUP_BASE, 'safetube-export/users/documents.jsonl');
  const safetubeUsers = readJsonl(safetubeUsersPath);
  console.log(`SafeTube users table: ${safetubeUsers.length} users`);
  console.log('');

  // Build email -> status map
  const statusMap = new Map();

  for (const user of safetunesUsers) {
    if (!user.email) continue;
    const email = user.email.toLowerCase();
    const status = user.subscriptionStatus;

    // Only care about non-trial statuses
    if (status && status !== 'trial') {
      const existing = statusMap.get(email) || { apps: [], status: null };
      existing.apps.push('safetunes');

      // Priority: lifetime > active > cancelled > expired
      if (status === 'lifetime') {
        existing.status = 'lifetime';
      } else if (status === 'active' && existing.status !== 'lifetime') {
        existing.status = 'active';
      } else if (status === 'cancelled' && !['lifetime', 'active'].includes(existing.status)) {
        existing.status = 'canceled'; // Note: Marketing uses 'canceled' not 'cancelled'
      }

      statusMap.set(email, existing);
    }
  }

  for (const user of safetubeUsers) {
    if (!user.email) continue;
    const email = user.email.toLowerCase();
    const status = user.subscriptionStatus;

    if (status && status !== 'trial') {
      const existing = statusMap.get(email) || { apps: [], status: null };
      if (!existing.apps.includes('safetube')) {
        existing.apps.push('safetube');
      }

      // Priority: lifetime > active > cancelled
      if (status === 'lifetime') {
        existing.status = 'lifetime';
      } else if (status === 'active' && existing.status !== 'lifetime') {
        existing.status = 'active';
      } else if (status === 'cancelled' && !['lifetime', 'active'].includes(existing.status)) {
        existing.status = 'canceled';
      }

      statusMap.set(email, existing);
    }
  }

  console.log(`Users with non-trial status: ${statusMap.size}`);
  console.log('');

  // Filter to only migrated users (exclude test patterns)
  const skipPatterns = [
    /@artiosacademies\.com$/,
    /@test\.com$/,
    /^test.*@/,
    /^demo@/,
    /@test\.getsafefamily\.com$/,
    /provision/i,
    /^curl/,
  ];

  let updated = 0;
  let skipped = 0;

  for (const [email, info] of statusMap) {
    // Skip test users
    let shouldSkip = false;
    for (const pattern of skipPatterns) {
      if (pattern.test(email)) {
        shouldSkip = true;
        break;
      }
    }

    if (shouldSkip) {
      console.log(`SKIP (pattern): ${email}`);
      skipped++;
      continue;
    }

    console.log(`UPDATE: ${email} -> ${info.status} (apps: ${info.apps.join(', ')})`);

    if (!isDryRun) {
      const result = await updateSubscription(email, info.status, info.apps);
      if (result.success) {
        console.log(`  -> SUCCESS`);
        updated++;
      } else {
        console.log(`  -> FAILED: ${JSON.stringify(result.data)}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      updated++;
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);

  if (isDryRun) {
    console.log('');
    console.log('This was a DRY RUN. Run without --dry-run to actually update.');
  }
}

main().catch(console.error);
