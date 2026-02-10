import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";
import { DataModel } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

// Helper function to generate a unique 6-character family code
function generateFamilyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars: 0, O, I, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Password authentication with email/password
    Password({
      // Enable password reset with OTP via Resend
      reset: ResendOTPPasswordReset,
      // Custom profile handler to extract name from signup form
      profile(params) {
        return {
          email: params.email as string,
          name: (params.name as string) || undefined,
        };
      },
    }),
    // Google OAuth
    Google,
  ],
  callbacks: {
    // Called after a user is created or updated
    // Use this to initialize SafeTunes-specific fields
    async afterUserCreatedOrUpdated(ctx, args) {
      const { userId, existingUserId } = args;

      // Only initialize on first signup, not on subsequent logins
      if (existingUserId) {
        return; // User already exists, nothing to initialize
      }

      // Get the user to check if they already have SafeTunes fields set
      const user = await ctx.db.get(userId);
      if (!user) {
        console.error(
          "[afterUserCreatedOrUpdated] User not found after creation:",
          userId
        );
        return;
      }

      // If user already has a familyCode, they were already initialized
      if (user.familyCode) {
        return;
      }

      // Generate a unique family code
      let familyCode = generateFamilyCode();
      let codeExists = true;

      while (codeExists) {
        const existingCode = await ctx.db
          .query("users")
          .withIndex("by_family_code", (q) => q.eq("familyCode", familyCode))
          .first();

        if (!existingCode) {
          codeExists = false;
        } else {
          familyCode = generateFamilyCode();
        }
      }

      // Initialize SafeTunes fields for new user
      await ctx.db.patch(userId, {
        familyCode,
        createdAt: Date.now(),
        subscriptionStatus: "trial", // All new users start with trial
      });

      console.log(
        `[afterUserCreatedOrUpdated] Initialized SafeTunes user: ${user.email} with familyCode: ${familyCode}`
      );
    },
  },
});

/**
 * Helper to get the current authenticated user's ID
 * Use this in queries/mutations to get the logged-in user
 */
export { getAuthUserId };
