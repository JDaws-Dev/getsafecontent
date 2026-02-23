import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Migration script to create authAccounts entries for legacy users.
 *
 * Legacy users (created before Convex Auth migration) have:
 * - A users table entry with email and passwordHash
 * - NO authAccounts entry (preventing login)
 *
 * This migration creates authAccounts entries for users who:
 * 1. Have an email address
 * 2. Have a legacy passwordHash field
 * 3. Don't already have an authAccounts entry
 *
 * After running this migration, legacy users will be able to log in
 * using their original email/password credentials.
 */

/**
 * Query to find all users missing authAccounts entries
 */
export const findUsersMissingAuthAccounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all users
    const allUsers = await ctx.db.query("users").collect();

    const missingAuthAccounts: {
      userId: string;
      email: string;
      hasLegacyPasswordHash: boolean;
      hasAuthAccount: boolean;
    }[] = [];

    for (const user of allUsers) {
      if (!user.email) continue; // Skip users without email

      // Check if user has an authAccounts entry
      const authAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", user.email!.toLowerCase())
        )
        .first();

      // Also check by userId index
      const authAccountByUser = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) =>
          q.eq("userId", user._id).eq("provider", "password")
        )
        .first();

      const hasAuthAccount = !!(authAccount || authAccountByUser);
      const hasLegacyPasswordHash = !!(user as any).passwordHash;

      if (!hasAuthAccount) {
        missingAuthAccounts.push({
          userId: user._id,
          email: user.email,
          hasLegacyPasswordHash,
          hasAuthAccount: false,
        });
      }
    }

    return {
      totalUsers: allUsers.length,
      usersWithEmail: allUsers.filter(u => u.email).length,
      missingAuthAccounts: missingAuthAccounts.length,
      users: missingAuthAccounts,
    };
  },
});

/**
 * Migration mutation to create authAccounts for users with legacy passwordHash
 *
 * NOTE: Only migrates users who have a legacy passwordHash field.
 * Users without a passwordHash (e.g., Google OAuth users) are skipped.
 *
 * IMPORTANT: The legacy passwordHash should already be in Scrypt format
 * (same format as Convex Auth). If it's in a different format (e.g., bcrypt),
 * users will need to use password reset to set a new password.
 */
export const migrateAuthAccountsForLegacyUsers = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()), // If true, just log what would be done
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true; // Default to dry run for safety

    console.log(`[migrateAuthAccounts] Starting migration (dryRun: ${dryRun})`);

    // Get all users
    const allUsers = await ctx.db.query("users").collect();

    let processed = 0;
    let created = 0;
    let skippedNoPassword = 0;
    let skippedHasAuthAccount = 0;
    let skippedNoEmail = 0;
    let errors: { email: string; error: string }[] = [];

    for (const user of allUsers) {
      processed++;

      // Skip users without email
      if (!user.email) {
        skippedNoEmail++;
        continue;
      }

      // Check if user already has an authAccounts entry
      const existingAuthAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", user.email!.toLowerCase())
        )
        .first();

      if (existingAuthAccount) {
        skippedHasAuthAccount++;
        continue;
      }

      // Check for legacy passwordHash
      const legacyPasswordHash = (user as any).passwordHash;
      if (!legacyPasswordHash) {
        skippedNoPassword++;
        console.log(`[migrateAuthAccounts] Skipping ${user.email}: no legacy passwordHash`);
        continue;
      }

      console.log(`[migrateAuthAccounts] ${dryRun ? 'WOULD CREATE' : 'CREATING'} authAccount for: ${user.email}`);

      if (!dryRun) {
        try {
          await ctx.db.insert("authAccounts", {
            userId: user._id,
            provider: "password",
            providerAccountId: user.email.toLowerCase(),
            secret: legacyPasswordHash, // Use the legacy passwordHash
          });
          created++;
          console.log(`[migrateAuthAccounts] Created authAccount for: ${user.email}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ email: user.email, error: errorMessage });
          console.error(`[migrateAuthAccounts] Error creating authAccount for ${user.email}:`, error);
        }
      } else {
        created++; // Count what would be created in dry run
      }
    }

    const summary = {
      dryRun,
      totalProcessed: processed,
      authAccountsCreated: created,
      skippedNoEmail,
      skippedHasAuthAccount,
      skippedNoPassword,
      errors: errors.length,
      errorDetails: errors,
    };

    console.log(`[migrateAuthAccounts] Migration complete:`, summary);

    return summary;
  },
});

/**
 * Helper mutation to create authAccount for a single user by email
 * Useful for manual fixes
 */
export const createAuthAccountForUser = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.optional(v.string()), // If not provided, will use legacy passwordHash from user
  },
  handler: async (ctx, args) => {
    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    // Check if authAccount already exists
    const existingAuthAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email.toLowerCase())
      )
      .first();

    if (existingAuthAccount) {
      return {
        success: false,
        reason: "authAccount already exists",
        authAccountId: existingAuthAccount._id,
      };
    }

    // Get password hash
    const passwordHash = args.passwordHash ?? (user as any).passwordHash;
    if (!passwordHash) {
      throw new Error(`No passwordHash provided and no legacy passwordHash found for: ${args.email}`);
    }

    // Create authAccount
    const authAccountId = await ctx.db.insert("authAccounts", {
      userId: user._id,
      provider: "password",
      providerAccountId: args.email.toLowerCase(),
      secret: passwordHash,
    });

    console.log(`[createAuthAccountForUser] Created authAccount for: ${args.email}`);

    return {
      success: true,
      authAccountId,
      userId: user._id,
    };
  },
});

/**
 * Create authAccounts entries for users WITHOUT a legacy passwordHash.
 * These users will need to use "Forgot Password" to set their password.
 *
 * This creates entries with a random temporary password that won't work for login,
 * but allows the password reset flow to find the account and send OTP.
 */
export const createAuthAccountsForUsersWithoutPassword = internalMutation({
  args: {
    emails: v.optional(v.array(v.string())), // Specific emails to process, or all if not provided
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const targetEmails = args.emails?.map(e => e.toLowerCase());

    console.log(`[createAuthAccountsWithoutPassword] Starting (dryRun: ${dryRun})`);

    // Get all users (or filter by email if specified)
    const allUsers = await ctx.db.query("users").collect();

    let processed = 0;
    let created = 0;
    let skipped = 0;
    const results: { email: string; action: string }[] = [];

    for (const user of allUsers) {
      if (!user.email) continue;

      const emailLower = user.email.toLowerCase();

      // If specific emails provided, only process those
      if (targetEmails && !targetEmails.includes(emailLower)) {
        continue;
      }

      processed++;

      // Check if authAccount already exists
      const existingAuthAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", emailLower)
        )
        .first();

      if (existingAuthAccount) {
        results.push({ email: user.email, action: "skipped - already has authAccount" });
        skipped++;
        continue;
      }

      // Check if has legacy password (if so, they should use regular migration)
      if ((user as any).passwordHash) {
        results.push({ email: user.email, action: "skipped - has legacy passwordHash (use regular migration)" });
        skipped++;
        continue;
      }

      // Create a placeholder password - user MUST use forgot password to set real one
      // This is a special marker that won't match any real password attempt
      const placeholderSecret = `NEEDS_PASSWORD_RESET_${Date.now()}_${Math.random().toString(36)}`;

      if (!dryRun) {
        await ctx.db.insert("authAccounts", {
          userId: user._id,
          provider: "password",
          providerAccountId: emailLower,
          secret: placeholderSecret,
        });
        results.push({ email: user.email, action: "created - user must use Forgot Password" });
        created++;
        console.log(`[createAuthAccountsWithoutPassword] Created placeholder authAccount for: ${user.email}`);
      } else {
        results.push({ email: user.email, action: "WOULD CREATE - user must use Forgot Password" });
        created++;
      }
    }

    const summary = {
      dryRun,
      processed,
      created,
      skipped,
      results,
    };

    console.log(`[createAuthAccountsWithoutPassword] Complete:`, summary);
    return summary;
  },
});

/**
 * Debug query to inspect authAccounts entries
 * WARNING: This exposes sensitive data - use only for debugging
 */
export const debugAuthAccounts = query({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let authAccounts;

    if (args.email) {
      // Find specific user's authAccount
      authAccounts = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", args.email!.toLowerCase())
        )
        .collect();
    } else {
      // Get all authAccounts
      authAccounts = await ctx.db.query("authAccounts").collect();
    }

    // Redact sensitive secret field
    return authAccounts.map((acc) => ({
      _id: acc._id,
      userId: acc.userId,
      provider: acc.provider,
      providerAccountId: acc.providerAccountId,
      hasSecret: !!acc.secret,
      secretLength: acc.secret?.length ?? 0,
    }));
  },
});
