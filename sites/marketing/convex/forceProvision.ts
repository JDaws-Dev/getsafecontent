"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

// App endpoints for provisioning
const APP_ENDPOINTS = {
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
  safestudy: "https://strong-scorpion-227.convex.site",
} as const;

type AppName = "safetunes" | "safetube" | "safereads" | "safestudy";

/**
 * Helper to provision a single app
 */
async function provisionToApp(
  ctx: { runMutation: Function },
  email: string,
  name: string | undefined,
  passwordHash: string | undefined,
  subscriptionStatus: string,
  app: AppName,
  adminKey: string
): Promise<{ success: boolean; error?: string; details?: unknown }> {
  const encodedKey = encodeURIComponent(adminKey);
  const endpoint = APP_ENDPOINTS[app];

  try {
    const response = await fetch(`${endpoint}/provisionUser?key=${encodedKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        name,
        passwordHash,
        subscriptionStatus,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Update central record to mark as provisioned
      await ctx.runMutation(internal.accounts.markProvisioned, {
        email,
        app,
      });

      return {
        success: true,
        details: result,
      };
    } else {
      return {
        success: false,
        error: result.error || result.reason || "Provisioning failed",
        details: result,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

/**
 * Force Provision User
 *
 * Force re-provisions a user to a specific app.
 * Used for admin troubleshooting when normal provisioning failed.
 */
export const forceProvisionUser = action({
  args: {
    email: v.string(),
    app: v.union(
      v.literal("safetunes"),
      v.literal("safetube"),
      v.literal("safereads"),
      v.literal("safestudy")
    ),
    adminKey: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    app?: string;
    email?: string;
    message?: string;
    details?: unknown;
  }> => {
    const { email, app, adminKey } = args;

    // Verify admin key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || adminKey !== expectedKey) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get user from central database
    const centralUser = await ctx.runQuery(internal.signupInternal.getUserCredentials, {
      email: normalizedEmail,
    });

    if (!centralUser?.exists) {
      return {
        success: false,
        error: "User not found in central database",
      };
    }

    const result = await provisionToApp(
      ctx,
      normalizedEmail,
      centralUser.name ?? undefined,
      centralUser.passwordHash,
      centralUser.subscriptionStatus === "lifetime" ? "lifetime" : "active",
      app,
      adminKey
    );

    if (result.success) {
      return {
        success: true,
        app,
        email: normalizedEmail,
        message: `Successfully provisioned ${normalizedEmail} to ${app}`,
        details: result.details,
      };
    } else {
      return {
        success: false,
        error: result.error,
        details: result.details,
      };
    }
  },
});

/**
 * Force Provision All Apps
 *
 * Force re-provisions a user to all entitled apps.
 */
export const forceProvisionAll = action({
  args: {
    email: v.string(),
    adminKey: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    email?: string;
    results?: { app: string; success: boolean; error?: string }[];
    message?: string;
  }> => {
    const { email, adminKey } = args;

    // Verify admin key
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || adminKey !== expectedKey) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get user from central database
    const centralUser = await ctx.runQuery(internal.signupInternal.getUserCredentials, {
      email: normalizedEmail,
    });

    if (!centralUser?.exists) {
      return {
        success: false,
        error: "User not found in central database",
      };
    }

    // Get entitled apps
    const account = await ctx.runQuery(api.accounts.getAccountByEmail, { email: normalizedEmail });
    const entitledApps: AppName[] = (account?.entitledApps as AppName[]) || ["safetunes", "safetube", "safereads", "safestudy"];

    const results: { app: string; success: boolean; error?: string }[] = [];
    const subscriptionStatus = centralUser.subscriptionStatus === "lifetime" ? "lifetime" : "active";

    for (const app of entitledApps) {
      const result = await provisionToApp(
        ctx,
        normalizedEmail,
        centralUser.name ?? undefined,
        centralUser.passwordHash,
        subscriptionStatus,
        app,
        adminKey
      );

      results.push({
        app,
        success: result.success,
        error: result.error,
      });
    }

    const allSuccess = results.every((r) => r.success);

    return {
      success: allSuccess,
      email: normalizedEmail,
      results,
      message: allSuccess
        ? `Successfully provisioned ${normalizedEmail} to all apps`
        : `Provisioning completed with some failures`,
    };
  },
});
