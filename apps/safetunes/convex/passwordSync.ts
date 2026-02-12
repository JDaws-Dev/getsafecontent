"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Marketing site endpoint for password sync
const MARKETING_SYNC_ENDPOINT = "https://getsafefamily.com/api/auth/sync-password";

// Admin key for authenticating with the marketing site
// Note: This should be the same ADMIN_KEY used across all apps
const HARDCODED_ADMIN_KEY = "u2A0NLQwYgNCGVz3/6b9v97bFsP6v3TnqqtxFL8rOQ0=";

/**
 * Sync a password change to all other apps via the marketing site.
 *
 * This action should be called AFTER a password has been successfully changed locally.
 * It will:
 * 1. Get the new password hash from authAccounts
 * 2. Call the marketing site sync-password endpoint
 * 3. Marketing site updates centralUsers and calls other apps
 *
 * Usage in frontend after password reset:
 *   await syncPasswordToOtherApps({ email: userEmail });
 */
export const syncPasswordToOtherApps = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    console.log(`[syncPasswordToOtherApps] Starting sync for ${email}`);

    // Get the current password hash from authAccounts
    const authAccountData = await ctx.runQuery(internal.passwordSyncQueries.getPasswordHash, { email });

    if (!authAccountData?.passwordHash) {
      console.log(`[syncPasswordToOtherApps] No password hash found for ${email}`);
      return {
        success: false,
        error: "No password hash found",
      };
    }

    const ADMIN_KEY = process.env.ADMIN_KEY || HARDCODED_ADMIN_KEY;

    try {
      const response = await fetch(MARKETING_SYNC_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          newPasswordHash: authAccountData.passwordHash,
          sourceApp: "safetunes",
          adminKey: ADMIN_KEY,
        }),
        // 10 second timeout
        signal: AbortSignal.timeout(10000),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log(`[syncPasswordToOtherApps] Sync successful for ${email}:`, result);
        return {
          success: true,
          centralUpdated: result.centralUpdated,
          appsUpdated: result.appsUpdated,
        };
      } else {
        console.error(`[syncPasswordToOtherApps] Sync failed for ${email}:`, result);
        return {
          success: false,
          error: result.error || "Sync failed",
        };
      }
    } catch (error) {
      console.error(`[syncPasswordToOtherApps] Error syncing for ${email}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
