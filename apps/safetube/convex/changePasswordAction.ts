"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Scrypt } from "lucia";

const scrypt = new Scrypt();

// Marketing site endpoint for password sync
const MARKETING_SYNC_ENDPOINT = "https://getsafefamily.com/api/auth/sync-password";

/**
 * Change a user's password with proper Scrypt hashing.
 *
 * This action:
 * 1. Verifies the current password against authAccounts.secret
 * 2. Hashes the new password using Scrypt (same as Convex Auth)
 * 3. Updates authAccounts.secret
 * 4. Syncs the new password to other apps via the marketing site
 *
 * Usage in frontend:
 *   await changePassword({
 *     email: user.email,
 *     currentPassword: 'oldpass',
 *     newPassword: 'newpass',
 *   });
 */
export const changePassword = action({
  args: {
    email: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; synced?: boolean }> => {
    const email = args.email.toLowerCase().trim();
    console.log(`[changePassword] Starting for ${email}`);

    // Validate new password
    if (args.newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters" };
    }

    if (args.currentPassword === args.newPassword) {
      return { success: false, error: "New password must be different from current password" };
    }

    // Get the current password hash from authAccounts
    const authAccountData = await ctx.runQuery(internal.passwordSyncQueries.getPasswordHash, { email });

    if (!authAccountData?.passwordHash) {
      console.log(`[changePassword] No authAccount found for ${email}`);
      return { success: false, error: "Account not found" };
    }

    // Verify current password using Scrypt
    let isValidPassword: boolean;
    try {
      isValidPassword = await scrypt.verify(authAccountData.passwordHash, args.currentPassword);
    } catch (error) {
      console.error(`[changePassword] Error verifying password for ${email}:`, error);
      return { success: false, error: "Failed to verify password" };
    }

    if (!isValidPassword) {
      console.log(`[changePassword] Invalid current password for ${email}`);
      return { success: false, error: "Current password is incorrect" };
    }

    // Hash the new password using Scrypt
    let newPasswordHash: string;
    try {
      newPasswordHash = await scrypt.hash(args.newPassword);
    } catch (error) {
      console.error(`[changePassword] Error hashing new password for ${email}:`, error);
      return { success: false, error: "Failed to process new password" };
    }

    // Update authAccounts.secret with the new hash
    try {
      const result = await ctx.runMutation(internal.users.updatePasswordInternal, {
        email,
        passwordHash: newPasswordHash,
      });

      if (!result.updated) {
        console.log(`[changePassword] Failed to update password for ${email}:`, result.reason);
        return { success: false, error: "Failed to update password" };
      }
    } catch (error) {
      console.error(`[changePassword] Error updating authAccounts for ${email}:`, error);
      return { success: false, error: "Failed to save new password" };
    }

    console.log(`[changePassword] Password updated locally for ${email}`);

    // Sync to other apps (fire and forget - don't fail if sync fails)
    let synced = false;
    try {
      const ADMIN_KEY = process.env.ADMIN_KEY;
      if (ADMIN_KEY) {
        const response = await fetch(MARKETING_SYNC_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            newPasswordHash,
            sourceApp: "safetube",
            adminKey: ADMIN_KEY,
          }),
          signal: AbortSignal.timeout(10000),
        });

        const syncResult = await response.json();
        if (response.ok && syncResult.success) {
          synced = true;
          console.log(`[changePassword] Password synced for ${email}:`, syncResult);
        } else {
          console.warn(`[changePassword] Sync failed for ${email}:`, syncResult);
        }
      } else {
        console.warn(`[changePassword] No ADMIN_KEY configured, skipping sync`);
      }
    } catch (error) {
      console.warn(`[changePassword] Sync error for ${email}:`, error);
      // Don't fail the password change just because sync failed
    }

    return { success: true, synced };
  },
});
