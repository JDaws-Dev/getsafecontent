import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// App endpoints for fetching user data
const APP_ENDPOINTS = {
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
} as const;

type AppName = keyof typeof APP_ENDPOINTS;

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
 * GET /migrateToCentralUsers
 *
 * Migrates existing users from all apps to the centralUsers table.
 *
 * Query params:
 * - key: Admin API key (required)
 * - dryRun: If "true", don't actually create users (default: true)
 *
 * This endpoint:
 * 1. Fetches user data from SafeTunes, SafeTube, and SafeReads
 * 2. Aggregates users by email (handling duplicates)
 * 3. Creates centralUsers entries with proper entitlements
 * 4. Preserves highest subscription status (lifetime > active > trial)
 */
export default httpAction(async (ctx, request): Promise<Response> => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const dryRun = url.searchParams.get("dryRun") !== "false"; // Default to dry run
  const ADMIN_KEY = process.env.ADMIN_KEY!;

  // Validate admin key
  if (!key || key !== ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[migrateToCentralUsers] Starting migration (dryRun: ${dryRun})`);

  const results: {
    dryRun: boolean;
    appsScanned: string[];
    usersFound: Record<string, number>;
    aggregatedUsers: number;
    created: number;
    skippedExisting: number;
    skippedNoPassword: number;
    errors: string[];
    users: AggregatedUser[];
  } = {
    dryRun,
    appsScanned: [],
    usersFound: {},
    aggregatedUsers: 0,
    created: 0,
    skippedExisting: 0,
    skippedNoPassword: 0,
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

          // Keep password hash if we don't have one
          if (!existing.passwordHash && user.passwordHash) {
            existing.passwordHash = user.passwordHash;
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

  // Create centralUsers entries
  for (const user of allUsersByEmail.values()) {
    results.users.push(user);

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

    // Skip users without password hash (OAuth users - they're handled differently)
    if (!user.passwordHash) {
      results.skippedNoPassword++;
      console.log(`[migrateToCentralUsers] Skipped ${user.email}: no password hash (authProvider: ${user.authProvider})`);
      continue;
    }

    // Validate subscription status
    const validStatuses = ["trial", "active", "lifetime", "cancelled", "expired"];
    const status = validStatuses.includes(user.subscriptionStatus)
      ? user.subscriptionStatus as "trial" | "active" | "lifetime" | "cancelled" | "expired"
      : "trial";

    if (!dryRun) {
      try {
        await ctx.runMutation(internal.centralUsers.createCentralUser, {
          email: user.email,
          passwordHash: user.passwordHash,
          name: user.name || undefined,
          entitledApps: user.entitledApps,
          stripeCustomerId: user.stripeCustomerId || undefined,
          subscriptionId: user.subscriptionId || undefined,
          subscriptionStatus: status,
        });
        results.created++;
        console.log(`[migrateToCentralUsers] Created centralUser: ${user.email} (apps: ${user.entitledApps.join(", ")}, status: ${status})`);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        results.errors.push(`Error creating ${user.email}: ${errMsg}`);
        console.error(`[migrateToCentralUsers] Error creating ${user.email}:`, error);
      }
    } else {
      results.created++; // Count what would be created
      console.log(`[migrateToCentralUsers] WOULD CREATE centralUser: ${user.email} (apps: ${user.entitledApps.join(", ")}, status: ${status})`);
    }
  }

  console.log(`[migrateToCentralUsers] Migration complete:`, {
    dryRun,
    aggregatedUsers: results.aggregatedUsers,
    created: results.created,
    skippedExisting: results.skippedExisting,
    skippedNoPassword: results.skippedNoPassword,
    errors: results.errors.length,
  });

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
