import { v } from "convex/values";
import { mutation, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Migration Script: Grandfather Existing Users
 *
 * This migration handles existing users from individual apps (SafeTunes, SafeTube, SafeReads)
 * and creates unified central accounts with the GRANDFATHER CLAUSE:
 *
 * - Paying users ($4.99/mo on any single app): Keep rate, get ALL 3 apps, grandfathered=true
 * - Lifetime users: Lifetime access to ALL 3 apps
 * - Trial users: Trial on all 3 apps, keep earliest expiration date
 *
 * IMPORTANT: This migration does NOT touch Stripe subscriptions. Users keep their current billing.
 */

// Types for user data from individual apps
interface AppUser {
  email: string;
  name?: string;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionEndsAt?: number;
  trialExpiresAt?: number;
  trialEndsAt?: number; // SafeTube uses different field name
  couponCode?: string;
  redeemedCoupon?: string; // SafeReads uses different field name
  createdAt?: number;
}

type AppType = "safetunes" | "safetube" | "safereads";
type SubscriptionStatus = "trial" | "active" | "lifetime" | "canceled" | "past_due" | "incomplete" | "expired";

// App pricing - individual apps were $4.99/mo
const INDIVIDUAL_APP_RATE = 4.99;
const ALL_APPS: AppType[] = ["safetunes", "safetube", "safereads"];

/**
 * Helper to determine the "best" subscription status when merging multiple accounts
 * Priority: lifetime > active > trial > canceled > expired
 */
function getBestStatus(statuses: (string | undefined)[]): SubscriptionStatus {
  const validStatuses = statuses.filter((s): s is string => !!s);

  if (validStatuses.includes("lifetime")) return "lifetime";
  if (validStatuses.includes("active")) return "active";
  if (validStatuses.includes("trial")) return "trial";
  if (validStatuses.includes("canceled") || validStatuses.includes("cancelled")) return "canceled";
  if (validStatuses.includes("past_due")) return "past_due";
  if (validStatuses.includes("expired")) return "expired";

  // Default to trial if no valid status
  return "trial";
}

/**
 * Helper to get the earliest trial expiration date
 */
function getEarliestTrialExpiry(users: AppUser[]): number | undefined {
  const expiryDates = users
    .map((u) => u.trialExpiresAt ?? u.trialEndsAt)
    .filter((d): d is number => d !== undefined && d > 0);

  if (expiryDates.length === 0) return undefined;
  return Math.min(...expiryDates);
}

/**
 * Helper to get the latest subscription end date (for active subscribers)
 */
function getLatestSubscriptionEnd(users: AppUser[]): number | undefined {
  const endDates = users
    .map((u) => u.subscriptionEndsAt)
    .filter((d): d is number => d !== undefined && d > 0);

  if (endDates.length === 0) return undefined;
  return Math.max(...endDates);
}

/**
 * Migrate a single user from app data to central accounts
 *
 * This internal mutation is called by the migration action for each user.
 */
export const migrateUser = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    subscriptionStatus: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("lifetime"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("incomplete"),
      v.literal("expired")
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionEndsAt: v.optional(v.number()),
    trialExpiresAt: v.optional(v.number()),
    couponCode: v.optional(v.string()),
    grandfathered: v.boolean(),
    grandfatheredRate: v.optional(v.number()),
    grandfatheredFrom: v.optional(
      v.union(
        v.literal("safetunes"),
        v.literal("safetube"),
        v.literal("safereads")
      )
    ),
    sourceApps: v.array(
      v.union(
        v.literal("safetunes"),
        v.literal("safetube"),
        v.literal("safereads")
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already exists in central accounts
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Update existing user with grandfathered info if not already set
      const updates: Record<string, unknown> = {};

      // Only set grandfathered fields if not already set
      if (args.grandfathered && !existingUser.grandfathered) {
        updates.grandfathered = true;
        if (args.grandfatheredRate) updates.grandfatheredRate = args.grandfatheredRate;
        if (args.grandfatheredFrom) updates.grandfatheredFrom = args.grandfatheredFrom;
        updates.migratedAt = now;
      }

      // Always ensure all apps are entitled for grandfathered users
      if (args.grandfathered || existingUser.grandfathered) {
        updates.entitledApps = ALL_APPS;
      }

      // Update subscription status if the new one is "better"
      const currentStatus = existingUser.subscriptionStatus ?? "expired";
      const newStatus = args.subscriptionStatus;
      const statusPriority: Record<string, number> = {
        lifetime: 5,
        active: 4,
        trial: 3,
        past_due: 2,
        canceled: 1,
        incomplete: 0,
        expired: -1,
      };

      if ((statusPriority[newStatus] ?? 0) > (statusPriority[currentStatus] ?? 0)) {
        updates.subscriptionStatus = newStatus;
      }

      // Update name if not set
      if (args.name && !existingUser.name) {
        updates.name = args.name;
      }

      // Update Stripe IDs if not set
      if (args.stripeCustomerId && !existingUser.stripeCustomerId) {
        updates.stripeCustomerId = args.stripeCustomerId;
      }
      if (args.stripeSubscriptionId && !existingUser.stripeSubscriptionId) {
        updates.stripeSubscriptionId = args.stripeSubscriptionId;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existingUser._id, updates);
      }

      // Log the migration event
      await ctx.db.insert("subscriptionEvents", {
        userId: existingUser._id,
        email: args.email,
        eventType: "user.migrated",
        eventData: JSON.stringify({
          type: "grandfather_migration",
          sourceApps: args.sourceApps,
          grandfathered: args.grandfathered,
          grandfatheredRate: args.grandfatheredRate,
          grandfatheredFrom: args.grandfatheredFrom,
          existingUserUpdated: true,
          updates,
        }),
        subscriptionStatus: args.subscriptionStatus,
        timestamp: now,
      });

      return {
        success: true,
        userId: existingUser._id,
        action: "updated",
        updates,
      };
    }

    // Create new user with migration data
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      subscriptionStatus: args.subscriptionStatus,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionEndsAt: args.subscriptionEndsAt,
      trialExpiresAt: args.trialExpiresAt,
      entitledApps: ALL_APPS, // All grandfathered users get all apps
      couponCode: args.couponCode,
      createdAt: now,
      grandfathered: args.grandfathered || undefined,
      grandfatheredRate: args.grandfatheredRate,
      grandfatheredFrom: args.grandfatheredFrom,
      migratedAt: now,
      onboardingCompleted: {
        safetunes: args.sourceApps.includes("safetunes"),
        safetube: args.sourceApps.includes("safetube"),
        safereads: args.sourceApps.includes("safereads"),
      },
    });

    // Log the migration event
    await ctx.db.insert("subscriptionEvents", {
      userId,
      email: args.email,
      eventType: "user.migrated",
      eventData: JSON.stringify({
        type: "grandfather_migration",
        sourceApps: args.sourceApps,
        grandfathered: args.grandfathered,
        grandfatheredRate: args.grandfatheredRate,
        grandfatheredFrom: args.grandfatheredFrom,
        newUserCreated: true,
      }),
      subscriptionStatus: args.subscriptionStatus,
      timestamp: now,
    });

    return {
      success: true,
      userId,
      action: "created",
    };
  },
});

/**
 * Action to run the full migration
 *
 * This action fetches users from all 3 app deployments via their admin API endpoints,
 * groups them by email, and creates/updates central accounts.
 *
 * Call this via the Convex dashboard or CLI:
 * npx convex run migrations:runMigration
 */
export const runMigration = action({
  args: {
    adminKey: v.string(), // Admin key for authentication
    dryRun: v.optional(v.boolean()), // If true, don't actually create users
  },
  handler: async (ctx, args) => {
    const { adminKey, dryRun = false } = args;

    // Verify admin key matches expected value
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || adminKey !== expectedKey) {
      throw new Error("Unauthorized: Invalid admin key");
    }

    // App endpoints configuration
    const appEndpoints: Record<AppType, string> = {
      safetunes: "https://formal-chihuahua-623.convex.site/adminDashboard",
      safetube: "https://rightful-rabbit-333.convex.site/adminDashboard",
      safereads: "https://exuberant-puffin-838.convex.site/adminDashboard",
    };

    // Fetch users from all 3 apps
    const allAppUsers: Record<AppType, AppUser[]> = {
      safetunes: [],
      safetube: [],
      safereads: [],
    };

    const fetchErrors: string[] = [];

    for (const [app, endpoint] of Object.entries(appEndpoints) as [AppType, string][]) {
      try {
        const url = `${endpoint}?key=${encodeURIComponent(adminKey)}&format=json`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const users = await response.json();
        allAppUsers[app] = users;
        console.log(`Fetched ${users.length} users from ${app}`);
      } catch (error) {
        const errorMsg = `Failed to fetch users from ${app}: ${error instanceof Error ? error.message : String(error)}`;
        fetchErrors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Group users by email across all apps
    const usersByEmail = new Map<string, { user: AppUser; app: AppType }[]>();

    for (const [app, users] of Object.entries(allAppUsers) as [AppType, AppUser[]][]) {
      for (const user of users) {
        if (!user.email) continue;

        const email = user.email.toLowerCase().trim();
        if (!usersByEmail.has(email)) {
          usersByEmail.set(email, []);
        }
        usersByEmail.get(email)!.push({ user, app });
      }
    }

    console.log(`Found ${usersByEmail.size} unique users across all apps`);

    // Process each unique user
    const results = {
      total: usersByEmail.size,
      migrated: 0,
      skipped: 0,
      errors: [] as string[],
      grandfatheredActive: 0,
      grandfatheredLifetime: 0,
      trialUsers: 0,
    };

    for (const [email, appEntries] of usersByEmail) {
      try {
        const users = appEntries.map((e) => e.user);
        const sourceApps = appEntries.map((e) => e.app);

        // Determine the best subscription status across all apps
        const statuses = users.map((u) => u.subscriptionStatus);
        const bestStatus = getBestStatus(statuses);

        // Find the first paying user to get their Stripe info
        const payingUser = users.find(
          (u) => u.subscriptionStatus === "active" || u.subscriptionStatus === "lifetime"
        );
        const firstUser = users[0];

        // Determine grandfathered status
        const isPaying = bestStatus === "active";
        const isLifetime = bestStatus === "lifetime";
        const isTrial = bestStatus === "trial";

        // Get name (prefer first non-empty)
        const name = users.find((u) => u.name)?.name;

        // Get coupon code (prefer first non-empty)
        const couponCode = users.find((u) => u.couponCode || u.redeemedCoupon)?.couponCode ||
          users.find((u) => u.redeemedCoupon)?.redeemedCoupon;

        // Determine which app they originally subscribed to (for grandfatheredFrom)
        let grandfatheredFrom: AppType | undefined;
        if (isPaying && payingUser) {
          // Find which app the paying subscription came from
          const payingEntry = appEntries.find(
            (e) => e.user.subscriptionStatus === "active" && e.user.stripeSubscriptionId
          );
          if (payingEntry) {
            grandfatheredFrom = payingEntry.app;
          }
        }

        // Build migration args
        const migrationArgs = {
          email,
          name,
          subscriptionStatus: bestStatus,
          stripeCustomerId: payingUser?.stripeCustomerId ?? firstUser.stripeCustomerId,
          stripeSubscriptionId: payingUser?.stripeSubscriptionId ?? firstUser.stripeSubscriptionId,
          subscriptionEndsAt: getLatestSubscriptionEnd(users),
          trialExpiresAt: isTrial ? getEarliestTrialExpiry(users) : undefined,
          couponCode,
          grandfathered: isPaying, // Only actively paying users get grandfathered flag
          grandfatheredRate: isPaying ? INDIVIDUAL_APP_RATE : undefined,
          grandfatheredFrom,
          sourceApps: sourceApps as AppType[],
        };

        if (dryRun) {
          console.log(`[DRY RUN] Would migrate: ${email}`, migrationArgs);
          results.migrated++;
        } else {
          // Run the migration mutation
          await ctx.runMutation(internal.migrations.migrateUser, migrationArgs);
          results.migrated++;
        }

        // Track stats
        if (isPaying) results.grandfatheredActive++;
        if (isLifetime) results.grandfatheredLifetime++;
        if (isTrial) results.trialUsers++;
      } catch (error) {
        const errorMsg = `Failed to migrate ${email}: ${error instanceof Error ? error.message : String(error)}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return {
      success: true,
      dryRun,
      fetchErrors,
      results,
      summary: {
        totalUniqueUsers: usersByEmail.size,
        migrated: results.migrated,
        grandfatheredPaying: results.grandfatheredActive,
        lifetimeUsers: results.grandfatheredLifetime,
        trialUsers: results.trialUsers,
        errors: results.errors.length,
      },
    };
  },
});

/**
 * Manual migration for a single user by email
 *
 * Use this for testing or to migrate individual users.
 */
export const migrateUserByEmail = mutation({
  args: {
    adminKey: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    subscriptionStatus: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("lifetime"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("incomplete"),
      v.literal("expired")
    ),
    grandfathered: v.optional(v.boolean()),
    grandfatheredRate: v.optional(v.number()),
    grandfatheredFrom: v.optional(
      v.union(
        v.literal("safetunes"),
        v.literal("safetube"),
        v.literal("safereads")
      )
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify admin key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || args.adminKey !== expectedKey) {
      throw new Error("Unauthorized: Invalid admin key");
    }

    const now = Date.now();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Update existing user
      const updates: Record<string, unknown> = {
        subscriptionStatus: args.subscriptionStatus,
        entitledApps: ALL_APPS,
      };

      if (args.name) updates.name = args.name;
      if (args.grandfathered) {
        updates.grandfathered = args.grandfathered;
        updates.grandfatheredRate = args.grandfatheredRate;
        updates.grandfatheredFrom = args.grandfatheredFrom;
        updates.migratedAt = now;
      }
      if (args.stripeCustomerId) updates.stripeCustomerId = args.stripeCustomerId;
      if (args.stripeSubscriptionId) updates.stripeSubscriptionId = args.stripeSubscriptionId;

      await ctx.db.patch(existingUser._id, updates);

      return { success: true, userId: existingUser._id, action: "updated" };
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      subscriptionStatus: args.subscriptionStatus,
      entitledApps: ALL_APPS,
      grandfathered: args.grandfathered,
      grandfatheredRate: args.grandfatheredRate,
      grandfatheredFrom: args.grandfatheredFrom,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      migratedAt: now,
      createdAt: now,
      onboardingCompleted: {
        safetunes: false,
        safetube: false,
        safereads: false,
      },
    });

    return { success: true, userId, action: "created" };
  },
});

/**
 * Get migration status/report
 *
 * Shows all migrated users and their grandfathered status.
 */
export const getMigrationReport = mutation({
  args: {
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify admin key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || args.adminKey !== expectedKey) {
      throw new Error("Unauthorized: Invalid admin key");
    }

    const users = await ctx.db.query("users").collect();

    const report = {
      totalUsers: users.length,
      grandfatheredUsers: 0,
      lifetimeUsers: 0,
      activeUsers: 0,
      trialUsers: 0,
      grandfatheredByApp: {
        safetunes: 0,
        safetube: 0,
        safereads: 0,
      } as Record<string, number>,
      users: [] as Array<{
        email: string;
        status: string;
        grandfathered: boolean;
        grandfatheredRate?: number;
        grandfatheredFrom?: string;
        entitledApps: string[];
      }>,
    };

    for (const user of users) {
      if (user.grandfathered) {
        report.grandfatheredUsers++;
        if (user.grandfatheredFrom) {
          report.grandfatheredByApp[user.grandfatheredFrom]++;
        }
      }

      if (user.subscriptionStatus === "lifetime") report.lifetimeUsers++;
      if (user.subscriptionStatus === "active") report.activeUsers++;
      if (user.subscriptionStatus === "trial") report.trialUsers++;

      report.users.push({
        email: user.email ?? "unknown",
        status: user.subscriptionStatus ?? "unknown",
        grandfathered: user.grandfathered ?? false,
        grandfatheredRate: user.grandfatheredRate,
        grandfatheredFrom: user.grandfatheredFrom,
        entitledApps: (user.entitledApps ?? []) as string[],
      });
    }

    return report;
  },
});
