import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Debug Auth Query
 *
 * Returns comprehensive auth status for a user across all apps.
 * Used for admin troubleshooting of auth issues.
 */
export const getAuthStatus = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Find user in Marketing (central)
    const centralUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    // Check for authAccount using providerAndAccountId index
    let authAccount = null;
    if (centralUser?.email) {
      authAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", centralUser.email!)
        )
        .first();
    }

    // Also check for Google OAuth account
    let oauthAccount = null;
    if (centralUser?.email) {
      oauthAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "google").eq("providerAccountId", centralUser.email!)
        )
        .first();
    }

    // Determine auth type
    const hasPasswordAuth = !!authAccount;
    const hasOAuthAuth = !!oauthAccount;
    const needsPasswordReset =
      authAccount?.secret?.toString().startsWith("NEEDS_PASSWORD_RESET:") || false;

    // Build central status
    const centralStatus = {
      exists: !!centralUser,
      userId: centralUser?._id,
      name: centralUser?.name,
      subscriptionStatus: centralUser?.subscriptionStatus,
      entitledApps: centralUser?.entitledApps || [],
      stripeCustomerId: centralUser?.stripeCustomerId,
      createdAt: centralUser?.createdAt,
      hasAuthAccount: hasPasswordAuth || hasOAuthAuth,
      authType: hasOAuthAuth
        ? "oauth"
        : hasPasswordAuth
          ? needsPasswordReset
            ? "password_needs_reset"
            : "password"
          : "none",
    };

    // Query each app's status (we can't directly query other Convex deployments,
    // but we can return the central view of what should be provisioned)
    const appStatus = {
      safetunes: {
        entitled: centralUser?.entitledApps?.includes("safetunes") || false,
        provisionedAt: centralUser?.provisionedAt?.safetunes,
      },
      safetube: {
        entitled: centralUser?.entitledApps?.includes("safetube") || false,
        provisionedAt: centralUser?.provisionedAt?.safetube,
      },
      safereads: {
        entitled: centralUser?.entitledApps?.includes("safereads") || false,
        provisionedAt: centralUser?.provisionedAt?.safereads,
      },
    };

    return {
      email,
      central: centralStatus,
      apps: appStatus,
      // Quick diagnosis
      issues: diagnoseIssues(centralStatus, appStatus),
    };
  },
});

/**
 * Diagnose potential auth issues
 */
function diagnoseIssues(
  central: {
    exists: boolean;
    hasAuthAccount: boolean;
    authType: string;
    subscriptionStatus?: string;
    entitledApps?: string[];
  },
  apps: {
    safetunes: { entitled: boolean; provisionedAt?: number };
    safetube: { entitled: boolean; provisionedAt?: number };
    safereads: { entitled: boolean; provisionedAt?: number };
  }
): string[] {
  const issues: string[] = [];

  if (!central.exists) {
    issues.push("User does not exist in central database");
    return issues;
  }

  if (!central.hasAuthAccount) {
    issues.push("No auth account found - user cannot login");
  }

  if (central.authType === "password_needs_reset") {
    issues.push("User needs to reset password (BetterAuth migration)");
  }

  if (central.subscriptionStatus === "expired" || central.subscriptionStatus === "canceled") {
    issues.push(`Subscription status is ${central.subscriptionStatus}`);
  }

  // Check for entitlement mismatches
  const entitledApps = central.entitledApps || [];
  for (const [app, status] of Object.entries(apps)) {
    if (status.entitled && !status.provisionedAt) {
      issues.push(`${app}: entitled but never provisioned`);
    }
    if (!status.entitled && status.provisionedAt) {
      issues.push(`${app}: provisioned but not entitled (may need cleanup)`);
    }
  }

  if (entitledApps.length === 0 && central.subscriptionStatus !== "trial") {
    issues.push("User has no entitled apps");
  }

  return issues;
}
