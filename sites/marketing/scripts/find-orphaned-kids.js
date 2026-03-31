#!/usr/bin/env node
/**
 * Find orphaned kid profiles where the parent userId no longer exists.
 *
 * Usage:
 *   node scripts/find-orphaned-kids.js
 */

const fs = require('fs');
const path = require('path');

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

async function main() {
  // Read SafeTunes data
  const safetunesKids = readJsonl(path.join(BACKUP_BASE, 'safetunes-export/kidProfiles/documents.jsonl'));
  const safetunesUsers = readJsonl(path.join(BACKUP_BASE, 'safetunes-export/users/documents.jsonl'));

  console.log(`SafeTunes: ${safetunesKids.length} kid profiles, ${safetunesUsers.length} users`);

  // Build set of valid user IDs
  const validUserIds = new Set(safetunesUsers.map(u => u._id));

  // Find orphaned kids
  const orphanedKids = safetunesKids.filter(kid => !validUserIds.has(kid.userId));

  console.log(`\nOrphaned kid profiles: ${orphanedKids.length}`);
  console.log('');

  if (orphanedKids.length === 0) {
    console.log('No orphaned kid profiles found!');
    return;
  }

  // Group by userId for analysis
  const byUserId = new Map();
  for (const kid of orphanedKids) {
    if (!byUserId.has(kid.userId)) {
      byUserId.set(kid.userId, []);
    }
    byUserId.get(kid.userId).push(kid);
  }

  console.log(`Unique missing parent userIds: ${byUserId.size}`);
  console.log('');

  for (const [userId, kids] of byUserId) {
    console.log(`Parent userId: ${userId}`);
    for (const kid of kids) {
      console.log(`  - ${kid.name} (${kid.color}, created: ${new Date(kid.createdAt).toISOString().split('T')[0]})`);
    }
    console.log('');
  }

  // Check if any of these orphaned userIds exist in BetterAuth users
  const betterAuthUsers = readJsonl(path.join(BACKUP_BASE, 'safetunes-export/_components/betterAuth/user/documents.jsonl'));
  console.log(`\nChecking against BetterAuth users (${betterAuthUsers.length} users)...`);

  const betterAuthIds = new Set(betterAuthUsers.map(u => u._id));
  const matchedInBetterAuth = [];

  for (const userId of byUserId.keys()) {
    // The userId might be in BetterAuth - but BetterAuth uses different ID format
    // Let's check if we can match by timing
    for (const ba of betterAuthUsers) {
      // BetterAuth IDs are like k97xxx, while users table IDs are like k17xxx
      // Let's look for pattern matches or time correlations
    }
  }

  // Alternative: Check the authAccounts table to see if there's a mapping
  const authAccounts = readJsonl(path.join(BACKUP_BASE, 'safetunes-export/authAccounts/documents.jsonl'));
  console.log(`\nChecking authAccounts table (${authAccounts.length} entries)...`);

  // authAccounts links userId (users table) to BetterAuth
  const authAccountsByUserId = new Map();
  for (const acc of authAccounts) {
    authAccountsByUserId.set(acc.userId, acc);
  }

  console.log('\nOrphaned parent userIds with auth account lookup:');
  for (const [userId, kids] of byUserId) {
    const authAcc = authAccountsByUserId.get(userId);
    if (authAcc) {
      console.log(`${userId}: Found auth account - providerAccountId: ${authAcc.providerAccountId}`);
    } else {
      console.log(`${userId}: No auth account found`);
    }
  }
}

main().catch(console.error);
