import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Password Reset Token Management
 *
 * Internal mutations for managing OTP tokens for the central JWT auth password reset flow.
 * These are called by the /requestPasswordReset and /resetPassword HTTP endpoints.
 */

/**
 * Delete any existing password reset tokens for an email
 * Called before creating a new token to ensure only one valid token exists
 */
export const deleteExistingTokens = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Find all tokens for this email
    const tokens = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    // Delete them all
    for (const token of tokens) {
      await ctx.db.delete(token._id);
    }

    return { deleted: tokens.length };
  },
});

/**
 * Create a new password reset token
 */
export const createToken = internalMutation({
  args: {
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const tokenId = await ctx.db.insert("passwordResetTokens", {
      email: args.email.toLowerCase().trim(),
      token: args.token,
      expiresAt: args.expiresAt,
      used: false,
      createdAt: now,
    });

    return { tokenId };
  },
});

/**
 * Verify a password reset token and mark it as used
 *
 * Returns { valid: true } if the token is valid and not expired
 * Returns { valid: false, error: "..." } if invalid
 */
export const verifyAndConsumeToken = internalMutation({
  args: {
    email: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const token = args.token.trim();
    const now = Date.now();

    // Find the token
    const resetToken = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_email_and_token", (q) =>
        q.eq("email", email).eq("token", token)
      )
      .first();

    if (!resetToken) {
      return { valid: false, error: "Invalid reset code" };
    }

    // Check if already used
    if (resetToken.used) {
      return { valid: false, error: "This reset code has already been used" };
    }

    // Check if expired
    if (resetToken.expiresAt < now) {
      // Clean up expired token
      await ctx.db.delete(resetToken._id);
      return { valid: false, error: "This reset code has expired" };
    }

    // Mark as used (don't delete - keep for audit trail)
    await ctx.db.patch(resetToken._id, { used: true });

    return { valid: true };
  },
});

/**
 * Clean up expired tokens (can be called periodically)
 */
export const cleanupExpiredTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all tokens
    const tokens = await ctx.db.query("passwordResetTokens").collect();

    let deleted = 0;
    for (const token of tokens) {
      // Delete if expired and used, or if very old (> 7 days)
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      if ((token.expiresAt < now && token.used) || token.createdAt < sevenDaysAgo) {
        await ctx.db.delete(token._id);
        deleted++;
      }
    }

    return { deleted };
  },
});
