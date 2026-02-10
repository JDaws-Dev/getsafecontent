import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

/**
 * Central Auth for Safe Family
 *
 * This is the unified authentication system for all Safe Family apps.
 * Supports:
 * - Email/password authentication
 * - Google OAuth
 * - Password reset via OTP email
 */

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Password authentication with email/password
    Password({
      // Enable password reset with OTP via Resend
      reset: ResendOTPPasswordReset,
      // Custom profile handler to extract name from signup form
      profile(params) {
        const result: { email: string; name?: string } = {
          email: params.email as string,
        };
        if (params.name) {
          result.name = params.name as string;
        }
        return result;
      },
    }),
    // Google OAuth
    Google,
  ],
  callbacks: {
    // Called after a user is created or updated
    // Use this to initialize Safe Family account fields
    async afterUserCreatedOrUpdated(ctx, args) {
      const { userId, existingUserId } = args;

      // Only initialize on first signup, not on subsequent logins
      if (existingUserId) {
        return; // User already exists, nothing to initialize
      }

      // Get the user to check if they already have fields set
      const user = await ctx.db.get(userId);
      if (!user) {
        console.error(
          "[afterUserCreatedOrUpdated] User not found after creation:",
          userId
        );
        return;
      }

      // If user already has a subscriptionStatus, they were already initialized
      if (user.subscriptionStatus) {
        return;
      }

      // Calculate trial expiration (7 days from now)
      const now = Date.now();
      const trialDays = 7;
      const trialExpiresAt = now + trialDays * 24 * 60 * 60 * 1000;

      // Initialize Safe Family fields for new user
      await ctx.db.patch(userId, {
        createdAt: now,
        trialStartedAt: now,
        trialExpiresAt,
        subscriptionStatus: "trial",
        // Grant access to all apps during trial
        entitledApps: ["safetunes", "safetube", "safereads"],
        // Initialize onboarding tracking
        onboardingCompleted: {
          safetunes: false,
          safetube: false,
          safereads: false,
        },
      });

      // Log subscription event
      await ctx.db.insert("subscriptionEvents", {
        userId,
        email: user.email || "unknown",
        eventType: "trial.started",
        subscriptionStatus: "trial",
        eventData: JSON.stringify({
          trialDays,
          trialExpiresAt,
          entitledApps: ["safetunes", "safetube", "safereads"],
        }),
        timestamp: now,
      });

      console.log(
        `[afterUserCreatedOrUpdated] Initialized Safe Family user: ${user.email} with ${trialDays}-day trial`
      );
    },
  },
});

/**
 * Helper to get the current authenticated user's ID
 * Use this in queries/mutations to get the logged-in user
 */
export { getAuthUserId };
