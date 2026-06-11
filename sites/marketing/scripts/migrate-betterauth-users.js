#!/usr/bin/env node
/**
 * Migration script to migrate BetterAuth users to Marketing central users.
 *
 * This script:
 * 1. Reads BetterAuth user and account exports from backup directories
 * 2. Merges users from SafeTunes and SafeTube
 * 3. Creates central users with password hashes preserved
 * 4. Sets entitlements based on which app(s) the user was found in
 *
 * Usage:
 *   node scripts/migrate-betterauth-users.js [--dry-run]
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

// Emails to skip (test users, already in system)
const SKIP_EMAILS = [
  'jedaws@gmail.com',          // Owner
  'metrotter@gmail.com',        // Michelle (already has lifetime)
  'jennydaws@gmail.com',        // Jenny (already has lifetime)
];

// Test email patterns to skip
const SKIP_PATTERNS = [
  /@artiosacademies\.com$/,
  /@test\.com$/,
  /^test.*@/,
  /^demo@getsafe/,
  /^curltest/,
];

function shouldSkipEmail(email) {
  if (SKIP_EMAILS.includes(email.toLowerCase())) return true;
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(email.toLowerCase())) return true;
  }
  return false;
}

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
      console.error(`Failed to parse line: ${line}`);
      return null;
    }
  }).filter(Boolean);
}

async function checkUserExists(email) {
  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const url = `${MARKETING_URL}/checkUserExists?email=${encodeURIComponent(email)}&key=${encodedKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error(`Error checking if user exists: ${email}`, error);
    return false;
  }
}

async function createCentralUser(userData) {
  const url = `${MARKETING_URL}/createUserWithPassword`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        email: userData.email,
        passwordHash: userData.passwordHash,
        name: userData.name,
        selectedApps: userData.entitledApps,
      }),
    });

    const data = await response.json();
    return { success: data.success, data, status: response.status };
  } catch (error) {
    console.error(`Error creating user: ${userData.email}`, error);
    return { success: false, error: error.message };
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Migration mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  // Read SafeTunes BetterAuth data
  const safetunesUserPath = path.join(BACKUP_BASE, 'safetunes-export/_components/betterAuth/user/documents.jsonl');
  const safetunesAccountPath = path.join(BACKUP_BASE, 'safetunes-export/_components/betterAuth/account/documents.jsonl');

  const safetunesUsers = readJsonl(safetunesUserPath);
  const safetunesAccounts = readJsonl(safetunesAccountPath);

  console.log(`SafeTunes: ${safetunesUsers.length} users, ${safetunesAccounts.length} accounts`);

  // Read SafeTube BetterAuth data
  const safetubeUserPath = path.join(BACKUP_BASE, 'safetube-export/_components/betterAuth/user/documents.jsonl');
  const safetubeAccountPath = path.join(BACKUP_BASE, 'safetube-export/_components/betterAuth/account/documents.jsonl');

  const safetubeUsers = readJsonl(safetubeUserPath);
  const safetubeAccounts = readJsonl(safetubeAccountPath);

  console.log(`SafeTube: ${safetubeUsers.length} users, ${safetubeAccounts.length} accounts`);
  console.log('');

  // Build account map (userId -> passwordHash)
  const safetunesAccountMap = new Map();
  for (const account of safetunesAccounts) {
    if (account.providerId === 'credential' && account.password) {
      safetunesAccountMap.set(account.userId, account.password);
    }
  }

  const safetubeAccountMap = new Map();
  for (const account of safetubeAccounts) {
    if (account.providerId === 'credential' && account.password) {
      safetubeAccountMap.set(account.userId, account.password);
    }
  }

  // Merge users by email
  const mergedUsers = new Map();

  for (const user of safetunesUsers) {
    const email = user.email.toLowerCase();
    if (!mergedUsers.has(email)) {
      mergedUsers.set(email, {
        email: user.email,
        name: user.name,
        passwordHash: safetunesAccountMap.get(user._id) || null,
        entitledApps: ['safetunes'],
        sources: ['safetunes'],
      });
    }
  }

  for (const user of safetubeUsers) {
    const email = user.email.toLowerCase();
    if (mergedUsers.has(email)) {
      // User exists in both apps
      const existing = mergedUsers.get(email);
      existing.entitledApps.push('safetube');
      existing.sources.push('safetube');
      // If we didn't have a password hash, try SafeTube's
      if (!existing.passwordHash) {
        existing.passwordHash = safetubeAccountMap.get(user._id);
      }
    } else {
      mergedUsers.set(email, {
        email: user.email,
        name: user.name,
        passwordHash: safetubeAccountMap.get(user._id) || null,
        entitledApps: ['safetube'],
        sources: ['safetube'],
      });
    }
  }

  console.log(`Total merged users: ${mergedUsers.size}`);
  console.log('');

  // Filter and migrate
  let migrated = 0;
  let skipped = 0;
  let existing = 0;
  let failed = 0;
  let noPassword = 0;

  for (const [email, userData] of mergedUsers) {
    // Skip test users and known users
    if (shouldSkipEmail(email)) {
      console.log(`SKIP (pattern): ${email}`);
      skipped++;
      continue;
    }

    // Skip users without password hash (bcrypt users need password reset)
    if (!userData.passwordHash) {
      console.log(`SKIP (no password): ${email}`);
      noPassword++;
      continue;
    }

    // Check if password is bcrypt (starts with $2)
    if (userData.passwordHash.startsWith('$2')) {
      console.log(`SKIP (bcrypt): ${email} - needs password reset`);
      noPassword++;
      continue;
    }

    // Check if user already exists in central
    const exists = await checkUserExists(email);
    if (exists) {
      console.log(`EXISTS: ${email}`);
      existing++;
      continue;
    }

    console.log(`MIGRATE: ${email} (apps: ${userData.entitledApps.join(', ')})`);

    if (!isDryRun) {
      const result = await createCentralUser(userData);
      if (result.success) {
        console.log(`  -> SUCCESS: ${email}`);
        migrated++;
      } else {
        console.log(`  -> FAILED: ${email} - ${result.data?.error || result.error}`);
        failed++;
      }

      // Rate limiting - 100ms delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      migrated++;
    }
  }

  console.log('');
  console.log('=== Migration Summary ===');
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (pattern): ${skipped}`);
  console.log(`Already exists: ${existing}`);
  console.log(`No password/bcrypt: ${noPassword}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total processed: ${mergedUsers.size}`);

  if (isDryRun) {
    console.log('');
    console.log('This was a DRY RUN. No users were actually created.');
    console.log('Run without --dry-run to perform the actual migration.');
  }
}

main().catch(console.error);
