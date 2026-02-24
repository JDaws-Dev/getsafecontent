import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// App endpoints for fetching user data
const APP_ENDPOINTS = {
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
} as const;

// User data from each app
interface AppUserData {
  email: string;
  passwordHash?: string | null;
  name?: string | null;
  subscriptionStatus?: string;
  createdAt?: number;
  stripeCustomerId?: string | null;
  subscriptionId?: string | null;
  authProvider?: string;
}

// Aggregated user data across all apps
interface AggregatedUser {
  email: string;
  passwordHash?: string | null;
  name?: string | null;
  subscriptionStatus: string;
  createdAt: number;
  entitledApps: string[];
  stripeCustomerId?: string | null;
  subscriptionId?: string | null;
  sources: string[];
  authProvider: string;
  hashType: "scrypt" | "bcrypt" | "none" | "unknown";
}

// Priority order for subscription status (higher = better)
const STATUS_PRIORITY: Record<string, number> = {
  lifetime: 4,
  active: 3,
  trial: 2,
  cancelled: 1,
  expired: 0,
};

/**
 * Detect the type of password hash
 * - bcrypt: $2a$, $2b$, or $2y$ prefix
 * - scrypt: colon-separated format (salt:hash) or $s2$ prefix
 * - none: null/undefined/empty
 */
function detectHashType(hash: string | null | undefined): "scrypt" | "bcrypt" | "none" | "unknown" {
  if (!hash) return "none";

  // bcrypt hashes start with $2a$, $2b$, or $2y$
  if (/^\$2[aby]\$\d{2}\$/.test(hash)) {
    return "bcrypt";
  }

  // Scrypt from lucia uses colon format (salt:hash) or $s2$ prefix
  if (hash.includes(":") && hash.length > 50) {
    return "scrypt";
  }
  if (hash.startsWith("$s2$")) {
    return "scrypt";
  }

  // Placeholder hashes from test/migration
  if (hash.startsWith("NEEDS_PASSWORD_RESET") || hash.startsWith("fakehash") || hash.startsWith("test")) {
    return "unknown";
  }

  return "unknown";
}

/**
 * GET /migrateToCentralUsers
 *
 * Migrates existing users from all apps to the centralUsers table.
 *
 * Query params:
 * - key: Admin API key (required)
 * - dryRun: If "true", don't actually create users (default: true)
 * - includeTestUsers: If "true", include test users (default: false)
 *
 * This endpoint:
 * 1. Fetches user data from SafeTunes, SafeTube, and SafeReads
 * 2. Aggregates users by email (handling duplicates)
 * 3. Creates centralUsers entries with proper entitlements
 * 4. Preserves highest subscription status (lifetime > active > trial)
 * 5. Marks users with bcrypt hashes as needing password reset
 */
export default httpAction(async (ctx, request): Promise<Response> => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const dryRun = url.searchParams.get("dryRun") !== "false"; // Default to dry run
  const includeTestUsers = url.searchParams.get("includeTestUsers") === "true";
  const ADMIN_KEY = process.env.ADMIN_KEY!;

  // Validate admin key
  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[migrateToCentralUsers] Starting migration (dryRun: ${dryRun}, includeTestUsers: ${includeTestUsers})`);

  const results: {
    dryRun: boolean;
    includeTestUsers: boolean;
    appsScanned: string[];
    usersFound: Record<string, number>;
    aggregatedUsers: number;
    created: number;
    updated: number;
    skippedExisting: number;
    skippedTestUsers: number;
    bcryptUsers: number;
    scryptUsers: number;
    noHashUsers: number;
    errors: string[];
    users: AggregatedUser[];
  } = {
    dryRun,
    includeTestUsers,
    appsScanned: [],
    usersFound: {},
    aggregatedUsers: 0,
    created: 0,
    updated: 0,
    skippedExisting: 0,
    skippedTestUsers: 0,
    bcryptUsers: 0,
    scryptUsers: 0,
    noHashUsers: 0,
    errors: [],
    users: [],
  };

  // Collect users from all apps
  const allUsersByEmail = new Map<string, AggregatedUser>();

  for (const [app, endpoint] of Object.entries(APP_ENDPOINTS)) {
    try {
      console.log(`[migrateToCentralUsers] Fetching users from ${app}...`);
      results.appsScanned.push(app);

      const encodedKey = encodeURIComponent(ADMIN_KEY);
      const response = await fetch(
        `${endpoint}/exportUsersForMigration?key=${encodedKey}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        results.errors.push(`Failed to fetch from ${app}: HTTP ${response.status} - ${errorText}`);
        continue;
      }

      const data = await response.json();
      const users: AppUserData[] = data.users || [];
      results.usersFound[app] = users.length;

      console.log(`[migrateToCentralUsers] Found ${users.length} users in ${app}`);

      for (const user of users) {
        if (!user.email) continue;

        const emailLower = user.email.toLowerCase();
        const existing = allUsersByEmail.get(emailLower);
        const hashType = detectHashType(user.passwordHash);

        if (existing) {
          // Merge: add this app to entitlements
          if (!existing.entitledApps.includes(app)) {
            existing.entitledApps.push(app);
          }
          existing.sources.push(app);

          // Keep the best subscription status
          const existingPriority = STATUS_PRIORITY[existing.subscriptionStatus] || 0;
          const newPriority = STATUS_PRIORITY[user.subscriptionStatus || "trial"] || 0;
          if (newPriority > existingPriority) {
            existing.subscriptionStatus = user.subscriptionStatus || "trial";
          }

          // Keep earliest created date
          if (user.createdAt && user.createdAt < existing.createdAt) {
            existing.createdAt = user.createdAt;
          }

          // Prefer Scrypt hash over bcrypt over none
          if (hashType === "scrypt" && existing.hashType !== "scrypt") {
            existing.passwordHash = user.passwordHash;
            existing.hashType = "scrypt";
            existing.authProvider = "password";
          } else if (hashType === "bcrypt" && existing.hashType === "none") {
            existing.passwordHash = user.passwordHash;
            existing.hashType = "bcrypt";
            existing.authProvider = "password";
          }

          // Keep Stripe IDs if we don't have them
          if (!existing.stripeCustomerId && user.stripeCustomerId) {
            existing.stripeCustomerId = user.stripeCustomerId;
          }
          if (!existing.subscriptionId && user.subscriptionId) {
            existing.subscriptionId = user.subscriptionId;
          }

          // Keep name if we don't have one
          if (!existing.name && user.name) {
            existing.name = user.name;
          }
        } else {
          // New user
          allUsersByEmail.set(emailLower, {
            email: emailLower,
            passwordHash: user.passwordHash || null,
            name: user.name || null,
            subscriptionStatus: user.subscriptionStatus || "trial",
            createdAt: user.createdAt || Date.now(),
            entitledApps: [app],
            stripeCustomerId: user.stripeCustomerId || null,
            subscriptionId: user.subscriptionId || null,
            sources: [app],
            authProvider: user.authProvider || (user.passwordHash ? "password" : "unknown"),
            hashType,
          });
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      results.errors.push(`Error fetching from ${app}: ${errMsg}`);
      console.error(`[migrateToCentralUsers] Error fetching from ${app}:`, error);
    }
  }

  results.aggregatedUsers = allUsersByEmail.size;
  console.log(`[migrateToCentralUsers] Aggregated ${results.aggregatedUsers} unique users`);

  // Process users
  for (const user of allUsersByEmail.values()) {
    // Skip test users unless explicitly included
    const isTestUser =
      user.email.includes("@test.") ||
      user.email.includes("test@") ||
      user.email.endsWith("@test.com") ||
      user.email.includes("@test.getsafefamily.com");

    if (isTestUser && !includeTestUsers) {
      results.skippedTestUsers++;
      continue;
    }

    results.users.push(user);

    // Count hash types
    if (user.hashType === "bcrypt") results.bcryptUsers++;
    else if (user.hashType === "scrypt") results.scryptUsers++;
    else if (user.hashType === "none") results.noHashUsers++;

    // Check if centralUser already exists
    const existingCentralUser = await ctx.runQuery(
      internal.centralUsers.getCentralUserByEmail,
      { email: user.email }
    );

    if (existingCentralUser) {
      results.skippedExisting++;
      console.log(`[migrateToCentralUsers] Skipped ${user.email}: already exists in centralUsers`);
      continue;
    }

    // Validate subscription status
    const validStatuses = ["trial", "active", "lifetime", "cancelled", "expired"];
    const status = validStatuses.includes(user.subscriptionStatus)
      ? (user.subscriptionStatus as "trial" | "active" | "lifetime" | "cancelled" | "expired")
      : "trial";

    // Determine password hash to use
    // - Scrypt hashes can be used directly
    // - Bcrypt hashes need to be marked for reset
    // - No hash means OAuth or needs reset
    const needsPasswordReset = user.hashType !== "scrypt";
    const passwordHashToStore = user.hashType === "scrypt"
      ? user.passwordHash!
      : `NEEDS_PASSWORD_RESET:${user.hashType}`;

    if (!dryRun) {
      try {
        await ctx.runMutation(internal.migrateCentralUser.createMigrationUser, {
          email: user.email,
          name: user.name || undefined,
          entitledApps: user.entitledApps,
          stripeCustomerId: user.stripeCustomerId || undefined,
          subscriptionId: user.subscriptionId || undefined,
          subscriptionStatus: status,
          originalPasswordHash: user.passwordHash || undefined,
          needsPasswordReset,
        });
        results.created++;
        console.log(
          `[migrateToCentralUsers] Created centralUser: ${user.email} (apps: ${user.entitledApps.join(", ")}, status: ${status}, hashType: ${user.hashType}, needsReset: ${needsPasswordReset})`
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        results.errors.push(`Error creating ${user.email}: ${errMsg}`);
        console.error(`[migrateToCentralUsers] Error creating ${user.email}:`, error);
      }
    } else {
      results.created++; // Count what would be created
      console.log(
        `[migrateToCentralUsers] WOULD CREATE centralUser: ${user.email} (apps: ${user.entitledApps.join(", ")}, status: ${status}, hashType: ${user.hashType}, needsReset: ${needsPasswordReset})`
      );
    }
  }

  console.log(`[migrateToCentralUsers] Migration complete:`, {
    dryRun,
    aggregatedUsers: results.aggregatedUsers,
    created: results.created,
    skippedExisting: results.skippedExisting,
    skippedTestUsers: results.skippedTestUsers,
    bcryptUsers: results.bcryptUsers,
    scryptUsers: results.scryptUsers,
    noHashUsers: results.noHashUsers,
    errors: results.errors.length,
  });

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
