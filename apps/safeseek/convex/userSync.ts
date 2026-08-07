import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { resolveStudyIdentity } from "./identity";

/**
 * Central subscription sync for SafeStudy.
 *
 * Central (the Marketing deployment, adamant-crow-705) holds the authoritative
 * subscriptionStatus for a family. SafeStudy keeps its own copy on the local
 * `users` row because every AI call gates on it (users.checkSubscriptionActive).
 * Without a pull, an operator comping a customer centrally never reaches this
 * app and the customer stays locked out — which is exactly what happened to a
 * real paying customer. This module is that pull.
 *
 * Mirrors apps/safetunes/convex/userSync.ts and apps/safetube/convex/userSync.ts.
 */

/**
 * Base URL for the central accounts service.
 *
 * NOTE: /verifyAppAccess is served by Marketing's *Convex HTTP router*, not by
 * the getsafefamily.com Next app — that app has no such route and no rewrite for
 * it, so `https://getsafefamily.com/verifyAppAccess` returns 404. A 404 lands in
 * the graceful-degradation branch below, which means the sync would silently
 * no-op forever. So the default here is the convex.site origin (the same one
 * src/contexts/AuthContext.jsx already hardcodes for login). The env var stays
 * as an override in case central ever moves.
 */
const CENTRAL_ACCOUNTS_URL =
  process.env.CENTRAL_ACCOUNTS_URL || "https://adamant-crow-705.convex.site";

// How long a central verification is trusted before we ask again. Short enough
// that a comp lands within minutes, long enough that a page reload storm doesn't
// hammer central.
const CENTRAL_ACCESS_CACHE_MS = 5 * 60 * 1000;

/**
 * Look up a local user by email, tolerating case drift between the JWT claim and
 * the stored row. Same dual-path lookup users.getUser already uses.
 */
async function findUserByEmail(ctx: QueryCtx | MutationCtx, email: string) {
  const normalized = email.toLowerCase().trim();
  let user = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", normalized))
    .first();

  if (!user && normalized !== email) {
    user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
  }

  return user;
}

/**
 * What the LOCAL row alone says about access. This is the answer we fall back to
 * whenever central can't be reached — a central outage must never lock out a
 * paying customer. Mirrors users.checkSubscriptionActive so the two can't drift.
 */
function localHasAccess(user: Doc<"users">) {
  const status = user.subscriptionStatus;
  if (status === "active" || status === "lifetime") return true;
  if (status === "trial") {
    return !(user.trialEndsAt && Date.now() > user.trialEndsAt);
  }
  return false;
}

/**
 * Resolve who the sync is for.
 *
 * Prefers the verified Marketing JWT claim so a caller can't sync (and probe the
 * subscription status of) an arbitrary email. Falls back to the client-supplied
 * email when no/invalid token is present, matching the additive-migration
 * posture of identity.requireOwnerSoft — an older frontend build, or a
 * deployment missing MARKETING_JWT_SECRET, still syncs rather than going dark.
 */
export const resolveSyncTarget = internalQuery({
  args: {
    email: v.string(),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const verified = await resolveStudyIdentity(ctx, args.userToken);
    if (verified) {
      return { email: verified.email ?? args.email, verified: true };
    }
    if (args.userToken) {
      console.warn("[verifyCentralAccess] token present but did not verify; falling back to client email");
    }
    return { email: args.email, verified: false };
  },
});

/**
 * Internal query to get a user by email (for use by actions).
 */
export const getUserByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await findUserByEmail(ctx, args.email);
  },
});

/**
 * Verify access with the central Safe Family accounts service.
 *
 * Calls central's /verifyAppAccess with app="safestudy" and syncs the local
 * user's subscriptionStatus with the answer. Returns the cached result if we
 * checked within the last CENTRAL_ACCESS_CACHE_MS.
 *
 * GRACEFUL DEGRADATION: if ADMIN_KEY is missing, or central errors, times out,
 * or answers non-ok, we return the LOCAL status rather than denying. Locking a
 * paying family out of their homework tool because central hiccuped is far worse
 * than briefly serving a stale "active".
 */
export const verifyCentralAccess = action({
  args: {
    email: v.string(),
    // Marketing Central JWT (AuthContext's `token`). Optional so a stale
    // frontend build keeps working — see resolveSyncTarget.
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    hasAccess: boolean;
    reason: string;
    subscriptionStatus: string | null;
    cached: boolean;
  }> => {
    const target = await ctx.runQuery(internal.userSync.resolveSyncTarget, {
      email: args.email,
      userToken: args.userToken,
    });
    const email = target.email;

    const user = await ctx.runQuery(internal.userSync.getUserByEmailInternal, { email });

    if (!user) {
      return {
        hasAccess: false,
        reason: "user_not_found",
        subscriptionStatus: null,
        cached: false,
      };
    }

    // Still inside the trust window — don't call central.
    const now = Date.now();
    if (user.centralAccessCacheExpiry && user.centralAccessCacheExpiry > now) {
      return {
        hasAccess: localHasAccess(user),
        reason: "cached_" + (user.subscriptionStatus || "unknown"),
        subscriptionStatus: user.subscriptionStatus || null,
        cached: true,
      };
    }

    const adminKey = process.env.ADMIN_KEY;
    if (!adminKey) {
      console.error("[verifyCentralAccess] ADMIN_KEY not configured");
      // Fall back to local status if we can't verify.
      return {
        hasAccess: localHasAccess(user),
        reason: "central_unavailable",
        subscriptionStatus: user.subscriptionStatus || null,
        cached: false,
      };
    }

    try {
      const url = new URL("/verifyAppAccess", CENTRAL_ACCOUNTS_URL);
      url.searchParams.set("email", email);
      url.searchParams.set("app", "safestudy");
      url.searchParams.set("key", adminKey);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("[verifyCentralAccess] Central service returned error:", response.status);
        // Fall back to local status.
        return {
          hasAccess: localHasAccess(user),
          reason: "central_error",
          subscriptionStatus: user.subscriptionStatus || null,
          cached: false,
        };
      }

      const result = await response.json() as {
        hasAccess: boolean;
        reason: string;
        subscriptionStatus: string | null;
        trialExpiresAt?: number;
        subscriptionEndsAt?: number;
        entitledApps?: string[];
        userName?: string;
        userId?: string;
        onboardingCompleted?: boolean;
      };

      // Sync local subscription status with central if different.
      if (result.subscriptionStatus && result.subscriptionStatus !== user.subscriptionStatus) {
        await ctx.runMutation(internal.userSync.syncFromCentralAccess, {
          email,
          subscriptionStatus: result.subscriptionStatus,
          subscriptionEndsAt: result.subscriptionEndsAt,
          trialExpiresAt: result.trialExpiresAt,
        });
      } else {
        // Just update the cache expiry.
        await ctx.runMutation(internal.userSync.updateCentralAccessCache, { email });
      }

      return {
        hasAccess: result.hasAccess,
        reason: result.reason,
        subscriptionStatus: result.subscriptionStatus,
        cached: false,
      };
    } catch (error) {
      console.error("[verifyCentralAccess] Error calling central service:", error);
      // Fall back to local status.
      return {
        hasAccess: localHasAccess(user),
        reason: "central_unavailable",
        subscriptionStatus: user.subscriptionStatus || null,
        cached: false,
      };
    }
  },
});

/**
 * Write central's answer onto the local user row.
 *
 * internalMutation, NOT a public mutation: it takes an arbitrary
 * subscriptionStatus, so as a public function anyone could hit the deployment
 * URL and grant themselves "lifetime" (see CLAUDE.md — a key-gated HTTP action
 * is not a protected Convex mutation). Its only caller is the action above.
 */
export const syncFromCentralAccess = internalMutation({
  args: {
    email: v.string(),
    subscriptionStatus: v.string(),
    subscriptionEndsAt: v.optional(v.number()),
    trialExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await findUserByEmail(ctx, args.email);

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    const patch: Record<string, unknown> = {
      subscriptionStatus: args.subscriptionStatus,
      centralAccessCacheExpiry: now + CENTRAL_ACCESS_CACHE_MS,
    };

    if (args.subscriptionEndsAt !== undefined) {
      patch.subscriptionEndsAt = args.subscriptionEndsAt;
    }
    // Central calls it trialExpiresAt; SafeStudy's local column is trialEndsAt.
    if (args.trialExpiresAt !== undefined) {
      patch.trialEndsAt = args.trialExpiresAt;
    }

    await ctx.db.patch(user._id, patch);

    console.log(`[syncFromCentralAccess] ${args.email} -> ${args.subscriptionStatus}`);
    return { success: true };
  },
});

/**
 * Refresh the cache window without changing subscription status.
 * internalMutation for the same reason as syncFromCentralAccess.
 */
export const updateCentralAccessCache = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await findUserByEmail(ctx, args.email);

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      centralAccessCacheExpiry: Date.now() + CENTRAL_ACCESS_CACHE_MS,
    });

    return { success: true };
  },
});
