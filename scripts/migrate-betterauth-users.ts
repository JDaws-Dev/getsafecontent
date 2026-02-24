#!/usr/bin/env npx tsx
/**
 * Migration script: BetterAuth users → centralUsers
 *
 * This script reads BetterAuth user data from Convex exports and creates
 * centralUser entries for each unique user.
 *
 * BetterAuth password hashes are incompatible with Convex Auth (scrypt),
 * so users will be marked as NEEDS_PASSWORD_RESET and must use the
 * "Forgot Password" flow to set a new password.
 *
 * Usage:
 *   npx tsx scripts/migrate-betterauth-users.ts --dry-run
 *   npx tsx scripts/migrate-betterauth-users.ts --execute
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Configuration
const BACKUPS_DIR = process.env.HOME + '/Desktop/convex-backups';
const SAFETUNES_EXPORT = path.join(BACKUPS_DIR, 'safetunes-export');
const SAFETUBE_EXPORT = path.join(BACKUPS_DIR, 'safetube-export');
const SAFEREADS_EXPORT = path.join(BACKUPS_DIR, 'safereads-export');

// SafeReads Convex endpoint (hosts centralUsers)
const SAFEREADS_ENDPOINT = 'https://exuberant-puffin-838.convex.site';

// Test user patterns to skip
const TEST_PATTERNS = [
  /@artiosacademies\.com$/i,
  /@test\.com$/i,
  /^test/i,
  /^demo@/i,
  /^curltest/i,
  /^testsignup/i,
  /^sh-lab/i,
];

function isTestUser(email: string): boolean {
  return TEST_PATTERNS.some(pattern => pattern.test(email));
}

interface BetterAuthUser {
  _id: string;
  email: string;
  name?: string;
  createdAt?: number;
  _creationTime: number;
}

interface BetterAuthAccount {
  _id: string;
  userId: string;
  password?: string;
  providerId: string;
}

interface AggregatedUser {
  email: string;
  name: string | null;
  createdAt: number;
  entitledApps: string[];
  hasPasswordHash: boolean;
  betterAuthHash: string | null;
  sources: string[];
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  const results: T[] = [];

  if (!fs.existsSync(filePath)) {
    console.log(`  File not found: ${filePath}`);
    return results;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        results.push(JSON.parse(line));
      } catch (e) {
        console.error(`  Failed to parse line: ${line.substring(0, 50)}...`);
      }
    }
  }

  return results;
}

async function loadBetterAuthData(exportDir: string, appName: string): Promise<{
  users: BetterAuthUser[];
  accounts: Map<string, BetterAuthAccount>;
}> {
  const userFile = path.join(exportDir, '_components/betterAuth/user/documents.jsonl');
  const accountFile = path.join(exportDir, '_components/betterAuth/account/documents.jsonl');

  console.log(`\nLoading ${appName} BetterAuth data...`);

  const users = await readJsonl<BetterAuthUser>(userFile);
  const accountsList = await readJsonl<BetterAuthAccount>(accountFile);

  // Create map of userId -> account
  const accounts = new Map<string, BetterAuthAccount>();
  for (const account of accountsList) {
    if (account.providerId === 'credential' && account.password) {
      accounts.set(account.userId, account);
    }
  }

  console.log(`  Found ${users.length} users, ${accounts.size} with passwords`);

  return { users, accounts };
}

async function checkCentralUserExists(email: string, adminKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${SAFEREADS_ENDPOINT}/getCentralUser?email=${encodeURIComponent(email)}&key=${encodeURIComponent(adminKey)}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (response.ok) {
      const data = await response.json();
      return data.user !== null;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function createCentralUser(
  user: AggregatedUser,
  adminKey: string,
  dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
  if (dryRun) {
    return { success: true };
  }

  try {
    const params = new URLSearchParams({
      email: user.email,
      apps: user.entitledApps.join(','),
      status: 'active', // BetterAuth users are existing paying users
      key: adminKey,
    });

    // Only add name if it exists
    if (user.name) {
      params.set('name', user.name);
    }

    const response = await fetch(
      `${SAFEREADS_ENDPOINT}/migrateBetterAuthUser?${params.toString()}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const result = await response.json();
    return { success: result.success !== false };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  const includeTest = args.includes('--include-test');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     BetterAuth → centralUsers Migration Script              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : '🚀 EXECUTE (will create users)'}`);
  console.log(`Include test users: ${includeTest}`);

  // Get admin key
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    console.error('\n❌ Error: ADMIN_KEY environment variable not set');
    console.log('Run: export ADMIN_KEY="your-admin-key"');
    process.exit(1);
  }

  // Load BetterAuth data from all apps
  const safetunes = await loadBetterAuthData(SAFETUNES_EXPORT, 'SafeTunes');
  const safetube = await loadBetterAuthData(SAFETUBE_EXPORT, 'SafeTube');

  // Note: SafeReads doesn't use BetterAuth, skip it
  console.log('\nSafeReads uses different auth system, skipping BetterAuth load.');

  // Aggregate users by email
  const aggregatedUsers = new Map<string, AggregatedUser>();

  // Process SafeTunes users
  console.log('\nProcessing SafeTunes users...');
  for (const user of safetunes.users) {
    if (!user.email) continue;

    const emailLower = user.email.toLowerCase();
    const account = safetunes.accounts.get(user._id);

    const existing = aggregatedUsers.get(emailLower);
    if (existing) {
      if (!existing.entitledApps.includes('safetunes')) {
        existing.entitledApps.push('safetunes');
      }
      existing.sources.push('safetunes-betterauth');
      // Prefer earlier creation date
      if (user._creationTime < existing.createdAt) {
        existing.createdAt = user._creationTime;
      }
      // Keep password hash if we didn't have one
      if (!existing.hasPasswordHash && account?.password) {
        existing.hasPasswordHash = true;
        existing.betterAuthHash = account.password;
      }
    } else {
      aggregatedUsers.set(emailLower, {
        email: emailLower,
        name: user.name || null,
        createdAt: user._creationTime,
        entitledApps: ['safetunes'],
        hasPasswordHash: !!account?.password,
        betterAuthHash: account?.password || null,
        sources: ['safetunes-betterauth'],
      });
    }
  }

  // Process SafeTube users
  console.log('Processing SafeTube users...');
  for (const user of safetube.users) {
    if (!user.email) continue;

    const emailLower = user.email.toLowerCase();
    const account = safetube.accounts.get(user._id);

    const existing = aggregatedUsers.get(emailLower);
    if (existing) {
      if (!existing.entitledApps.includes('safetube')) {
        existing.entitledApps.push('safetube');
      }
      existing.sources.push('safetube-betterauth');
      // Prefer earlier creation date
      if (user._creationTime < existing.createdAt) {
        existing.createdAt = user._creationTime;
      }
      // Keep password hash if we didn't have one
      if (!existing.hasPasswordHash && account?.password) {
        existing.hasPasswordHash = true;
        existing.betterAuthHash = account.password;
      }
    } else {
      aggregatedUsers.set(emailLower, {
        email: emailLower,
        name: user.name || null,
        createdAt: user._creationTime,
        entitledApps: ['safetube'],
        hasPasswordHash: !!account?.password,
        betterAuthHash: account?.password || null,
        sources: ['safetube-betterauth'],
      });
    }
  }

  console.log(`\nAggregated ${aggregatedUsers.size} unique users`);

  // Filter out test users
  const realUsers: AggregatedUser[] = [];
  const testUsers: AggregatedUser[] = [];

  for (const user of aggregatedUsers.values()) {
    if (isTestUser(user.email)) {
      testUsers.push(user);
    } else {
      realUsers.push(user);
    }
  }

  console.log(`  Real users: ${realUsers.length}`);
  console.log(`  Test users: ${testUsers.length} (${includeTest ? 'will include' : 'skipping'})`);

  const usersToMigrate = includeTest ? [...realUsers, ...testUsers] : realUsers;

  // Print user summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('USERS TO MIGRATE:');
  console.log('═══════════════════════════════════════════════════════════');

  for (const user of usersToMigrate.sort((a, b) => a.email.localeCompare(b.email))) {
    const apps = user.entitledApps.join(', ');
    const hasPass = user.hasPasswordHash ? '🔑' : '❌';
    console.log(`  ${hasPass} ${user.email.padEnd(35)} → [${apps}]`);
  }

  console.log('');
  console.log(`🔑 = has BetterAuth password (will need reset)`);
  console.log(`❌ = no password (OAuth or incomplete signup)`);

  // Highlight paying customers
  const payingEmails = [
    'benpurves@hotmail.com',
    'mailings@pobox.com',
    'chadwatsn@gmail.com',
    'jolene_bryan@yahoo.com',
  ];

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('PAYING CUSTOMERS (priority):');
  console.log('═══════════════════════════════════════════════════════════');

  for (const email of payingEmails) {
    const user = aggregatedUsers.get(email.toLowerCase());
    if (user) {
      console.log(`  ✅ ${email} - Found in ${user.sources.join(', ')}`);
    } else {
      console.log(`  ❌ ${email} - NOT FOUND in BetterAuth exports`);
    }
  }

  // Check which users already exist in centralUsers
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('CHECKING EXISTING CENTRAL USERS...');
  console.log('═══════════════════════════════════════════════════════════');

  const existingUsers: string[] = [];
  const newUsers: AggregatedUser[] = [];

  for (const user of usersToMigrate) {
    const exists = await checkCentralUserExists(user.email, adminKey);
    if (exists) {
      existingUsers.push(user.email);
      console.log(`  ⏭️  ${user.email} - already exists, skipping`);
    } else {
      newUsers.push(user);
      console.log(`  🆕 ${user.email} - will create`);
    }
  }

  console.log(`\nSkipping ${existingUsers.length} existing users`);
  console.log(`Will create ${newUsers.length} new centralUsers`);

  if (newUsers.length === 0) {
    console.log('\n✅ No new users to migrate!');
    return;
  }

  // Migration
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(dryRun ? 'DRY RUN - Would create:' : 'CREATING CENTRAL USERS:');
  console.log('═══════════════════════════════════════════════════════════');

  let created = 0;
  let errors: string[] = [];

  for (const user of newUsers) {
    const result = await createCentralUser(user, adminKey, dryRun);

    if (result.success) {
      created++;
      console.log(`  ✅ ${user.email} → [${user.entitledApps.join(', ')}]`);
    } else {
      errors.push(`${user.email}: ${result.error}`);
      console.log(`  ❌ ${user.email} - ${result.error}`);
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('MIGRATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total BetterAuth users found: ${aggregatedUsers.size}`);
  console.log(`Test users skipped: ${testUsers.length}`);
  console.log(`Already in centralUsers: ${existingUsers.length}`);
  console.log(`${dryRun ? 'Would create' : 'Created'}: ${created}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const error of errors) {
      console.log(`  - ${error}`);
    }
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes made');
    console.log('Run with --execute to actually create users');
  } else {
    console.log('\n✅ Migration complete!');
    console.log('\n📧 IMPORTANT: Migrated users need to use "Forgot Password" to set a new password.');
    console.log('   Their BetterAuth passwords are incompatible with the new auth system.');
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
