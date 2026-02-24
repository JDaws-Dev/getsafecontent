import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Central auth URL - SafeReads IS the central auth server, so we query locally
// The centralUsers table is hosted here
const THIS_APP = "safereads";

/**
 * Result type for central auth verification
 */
type CentralAuthResult =
  | {
      success: true;
      source: "central" | "local";
      entitled: boolean;
      user: {
        email: string;
        name: string | null;
        subscriptionStatus: string;
        entitledApps: string[];
      };
      // Only present if entitled=false
      upgradeUrl?: string;
    }
  | {
      success: false;
      error: string;
      errorCode:
        | "INVALID_CREDENTIALS"
        | "CENTRAL_UNREACHABLE"
        | "NOT_FOUND"
        | "RATE_LIMITED"
        | "INTERNAL_ERROR";
    };

/**
 * Verify user credentials against central auth, then check if they're entitled to this app.
 * If entitled, provisions user locally (creates authAccounts entry if needed).
 *
 * NOTE: SafeReads is special - it hosts the centralUsers table.
 * So we query the central users directly instead of making an HTTP call.
 *
 * This action is called by the login page BEFORE calling Convex Auth signIn().
 *
 * Flow:
 * 1. Query centralUsers table directly (local to SafeReads)
 * 2. Verify password with Scrypt
 * 3. If valid + entitled to safereads → provision user locally → return success
 * 4. If valid + NOT entitled → return success with entitled=false (show upgrade prompt)
 * 5. If invalid credentials → return error
 */
export const verifyCentralCredentialsAndProvision = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<CentralAuthResult> => {
    const email = args.email.toLowerCase().trim();

    try {
      // Query centralUsers table directly (SafeReads hosts this table)
      const centralUser = await ctx.runQuery(
        internal.centralUsers.verifyCentralUserCredentials,
        { email }
      );

      if (!centralUser.exists) {
        // Check if user exists locally (for backwards compatibility)
        const localUser = await ctx.runQuery(internal.centralAuth.getUserByEmailInternal, { email });

        if (!localUser) {
          return {
            success: false,
            error: "Invalid email or password",
            errorCode: "INVALID_CREDENTIALS",
          };
        }

        // User exists locally but not in central - fall back to local auth
        console.log(`[centralAuth] User ${email} exists locally but not in centralUsers, falling back to local auth`);
        return {
          success: true,
          source: "local",
          entitled: true, // If they exist locally, they were entitled at some point
          user: {
            email: localUser.email || email, // Use input email as fallback
            name: localUser.name || null,
            subscriptionStatus: localUser.subscriptionStatus || "trial",
            entitledApps: [THIS_APP],
          },
        };
      }

      // Verify password using Scrypt
      const { Scrypt } = await import("lucia");
      const scrypt = new Scrypt();
      const isValidPassword = await scrypt.verify(centralUser.passwordHash!, args.password);

      if (!isValidPassword) {
        return {
          success: false,
          error: "Invalid email or password",
          errorCode: "INVALID_CREDENTIALS",
        };
      }

      // Success - check entitlement
      const entitledApps: string[] = centralUser.entitledApps || [];
      const isEntitled = entitledApps.includes(THIS_APP);

      console.log(`[centralAuth] Verified: ${email}, entitled to ${THIS_APP}: ${isEntitled}`);

      if (isEntitled) {
        // User is entitled - provision them locally if needed
        try {
          await ctx.runMutation(internal.provisionUserInternal.provisionUserInternal, {
            email,
            passwordHash: centralUser.passwordHash!,
            name: centralUser.name || null,
            subscriptionStatus: centralUser.subscriptionStatus || "active",
            entitledToThisApp: true,
            stripeCustomerId: null,
            subscriptionId: null,
            isOAuthUser: false,
          });
          console.log(`[centralAuth] Provisioned user locally: ${email}`);
        } catch (provisionError) {
          // If provisioning fails but user exists locally, that's OK
          // They might already be provisioned
          console.warn(`[centralAuth] Provisioning note for ${email}:`, provisionError);
        }
      }

      return {
        success: true,
        source: "central",
        entitled: isEntitled,
        user: {
          email: centralUser.email,
          name: centralUser.name || null,
          subscriptionStatus: centralUser.subscriptionStatus || "trial",
          entitledApps,
        },
        ...(isEntitled
          ? {}
          : {
              upgradeUrl: `https://getsafefamily.com/account?upgrade=${THIS_APP}&email=${encodeURIComponent(email)}`,
            }),
      };
    } catch (error) {
      // Error querying central - shouldn't happen since we're local
      console.error("[centralAuth] Error:", error);
      return {
        success: false,
        error: "An error occurred. Please try again.",
        errorCode: "INTERNAL_ERROR",
      };
    }
  },
});

/**
 * Internal query to check if user exists locally
 */
export const getUserByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});
