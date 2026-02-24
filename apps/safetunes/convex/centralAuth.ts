import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Central auth URL (SafeReads hosts the centralUsers table)
const CENTRAL_AUTH_URL = "https://exuberant-puffin-838.convex.site";

// The app name for entitlement checks
const THIS_APP = "safetunes";

// Timeout for central auth requests (5 seconds)
const CENTRAL_AUTH_TIMEOUT_MS = 5000;

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
 * This action is called by the login page BEFORE calling Convex Auth signIn().
 *
 * Flow:
 * 1. Call central /verifyCentralCredentials endpoint
 * 2. If valid + entitled to safetunes → provision user locally → return success
 * 3. If valid + NOT entitled → return success with entitled=false (show upgrade prompt)
 * 4. If central unreachable → try local auth as fallback
 * 5. If invalid credentials → return error
 */
export const verifyCentralCredentialsAndProvision = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<CentralAuthResult> => {
    const email = args.email.toLowerCase().trim();
    const adminKey = process.env.ADMIN_KEY;

    if (!adminKey) {
      console.error("[centralAuth] ADMIN_KEY not configured");
      return {
        success: false,
        error: "Server configuration error",
        errorCode: "INTERNAL_ERROR",
      };
    }

    try {
      // Call central auth endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CENTRAL_AUTH_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(`${CENTRAL_AUTH_URL}/verifyCentralCredentials`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify({
            email,
            password: args.password,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      // Parse response
      const data = await response.json();

      // Handle rate limiting
      if (response.status === 429) {
        console.warn(`[centralAuth] Rate limited for: ${email}`);
        return {
          success: false,
          error: "Too many login attempts. Please try again in a minute.",
          errorCode: "RATE_LIMITED",
        };
      }

      // Handle invalid credentials
      if (response.status === 401 || !data.success) {
        console.log(`[centralAuth] Invalid credentials for: ${email}`);
        // Don't fall back to local - if central says invalid, it's invalid
        return {
          success: false,
          error: "Invalid email or password",
          errorCode: "INVALID_CREDENTIALS",
        };
      }

      // Success - check entitlement
      const entitledApps: string[] = data.entitledApps || [];
      const isEntitled = entitledApps.includes(THIS_APP);

      console.log(`[centralAuth] Verified: ${email}, entitled to ${THIS_APP}: ${isEntitled}`);

      if (isEntitled) {
        // User is entitled - provision them locally if needed
        try {
          await ctx.runMutation(internal.users.provisionUserInternal, {
            email,
            passwordHash: data.passwordHash,
            name: data.name || null,
            subscriptionStatus: data.subscriptionStatus || "active",
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
          email: data.email,
          name: data.name || null,
          subscriptionStatus: data.subscriptionStatus || "trial",
          entitledApps,
        },
        ...(isEntitled
          ? {}
          : {
              upgradeUrl: `https://getsafefamily.com/account?upgrade=${THIS_APP}&email=${encodeURIComponent(email)}`,
            }),
      };
    } catch (error) {
      // Central auth is unreachable - fall back to local
      console.warn("[centralAuth] Central unreachable, trying local auth:", error);

      // Check if user exists locally
      const localUser = await ctx.runQuery(internal.centralAuth.getUserByEmailInternal, { email });

      if (!localUser) {
        // User doesn't exist locally either
        return {
          success: false,
          error: "Invalid email or password",
          errorCode: "INVALID_CREDENTIALS",
        };
      }

      // User exists locally - let Convex Auth handle the password verification
      // Return a special response indicating fallback mode
      console.log(`[centralAuth] Falling back to local auth for: ${email}`);

      return {
        success: true,
        source: "local",
        entitled: true, // If they exist locally, they were entitled at some point
        user: {
          email: localUser.email,
          name: localUser.name || null,
          subscriptionStatus: localUser.subscriptionStatus || "trial",
          entitledApps: [THIS_APP], // Assume entitled to this app if they exist locally
        },
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
