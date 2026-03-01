import Google from "@auth/core/providers/google";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";
import { api } from "./_generated/api";
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Password authentication with email/password
    Password({
      // Enable password reset with OTP via Resend
      reset: ResendOTPPasswordReset,
      // Custom profile handler to extract name from signup form
      profile(params) {
        const profile: { email: string; name?: string } = {
          email: params.email as string,
        };
        if (params.name) {
          profile.name = params.name as string;
        }
        return profile;
      },
    }),
    // Google OAuth
    Google,
  ],
  callbacks: {
    // Called after a user is created or updated
    // Use this to initialize SafeReads-specific fields
    async afterUserCreatedOrUpdated(ctx, args) {
      const { userId, existingUserId } = args;

      // Only initialize on first signup, not on subsequent logins
      if (existingUserId) {
        return; // User already exists, nothing to initialize
      }

      // Get the user to check if they already have SafeReads fields set
      const user = await ctx.db.get(userId);
      if (!user) {
        console.error(
          "[afterUserCreatedOrUpdated] User not found after creation:",
          userId
        );
        return;
      }

      // If user already has a trialExpiresAt, they were already initialized
      if (user.trialExpiresAt) {
        return;
      }

      // Initialize SafeReads fields for new user
      await ctx.db.patch(userId, {
        subscriptionStatus: "trial", // All new users start with trial
        trialExpiresAt: Date.now() + TRIAL_DURATION_MS, // 7 days from now
        analysisCount: 0,
        onboardingComplete: false,
      });

      console.log(
        `[afterUserCreatedOrUpdated] Initialized SafeReads user: ${user.email}`
      );

      // Send admin notification email for new signup
      if (user.email) {
        await ctx.scheduler.runAfter(0, api.emails.sendTrialSignupNotification, {
          userEmail: user.email,
          userName: user.name,
        });

        // Schedule central sync for OAuth users
        // This will check if the user exists in central and sync their subscription status
        await ctx.scheduler.runAfter(0, api.users.syncOAuthUserWithCentral, {
          email: user.email,
          name: user.name,
        });
        console.log(
          `[afterUserCreatedOrUpdated] Scheduled central sync for OAuth user: ${user.email}`
        );
      }
    },
  },
});

/**
 * Helper to get the current authenticated user's ID
 * Use this in queries/mutations to get the logged-in user
 */
export { getAuthUserId };

/**
 * Internal query to get the password hash for a user.
 * Used by password sync actions to retrieve the hash.
 *
 * SECURITY NOTE: This is internal only, never exposed publicly.
 */
export const getPasswordHashByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email.toLowerCase())
      )
      .first();

    if (!authAccount) {
      return null;
    }

    return {
      passwordHash: authAccount.secret,
    };
  },
});
