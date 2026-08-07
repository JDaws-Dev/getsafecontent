import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { cascadeDeleteKidProfile } from "./lib/cascadeDelete";
import { requireOwnerSoft, requireProfileOwner } from "./identity";

/**
 * Strip sensitive fields (pin, rate-limit internals) from a profile
 * before returning it to the client. Adds `hasPin: boolean` instead.
 */
function sanitizeProfile(profile: Record<string, any>) {
  const { pin, pinFailedAttempts, pinLockedUntil, ...rest } = profile;
  return { ...rest, hasPin: !!pin };
}

// Get all kid profiles for a user (client-safe: no PIN value)
export const getProfiles = query({
  args: { userId: v.id("users"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwnerSoft(ctx, args.userToken, args.userId, "kidProfiles.getProfiles");
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return profiles.map(sanitizeProfile);
  },
});

// Get a single kid profile by ID (client-safe: no PIN value)
export const getProfile = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) return null;
    return sanitizeProfile(profile);
  },
});

// Internal query: get full profile including PIN (for server-side use only)
export const getProfileInternal = internalQuery({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.kidProfileId);
  },
});

// Create a new kid profile
export const createProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    ageRange: v.object({
      min: v.number(),
      max: v.number(),
    }),
    contentStrictness: v.string(),
    blockedTopics: v.array(v.string()),
    allowedTopics: v.optional(v.array(v.string())),
    customInstructions: v.optional(v.string()),
    lexileLevel: v.optional(v.string()),
    accessibilityNeeds: v.optional(v.array(v.string())),
    allowImageSearch: v.boolean(),
    allowFollowUp: v.boolean(),
    allowTopicRequests: v.optional(v.boolean()),
    pin: v.optional(v.string()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwnerSoft(ctx, args.userToken, args.userId, "kidProfiles.createProfile");
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const data: Record<string, any> = {
      userId: args.userId,
      name: args.name.trim(),
      color: args.color,
      icon: args.icon,
      ageRange: args.ageRange,
      contentStrictness: args.contentStrictness,
      blockedTopics: args.blockedTopics,
      allowImageSearch: args.allowImageSearch,
      allowFollowUp: args.allowFollowUp,
      createdAt: Date.now(),
    };
    if (args.allowedTopics) data.allowedTopics = args.allowedTopics;
    if (args.customInstructions) data.customInstructions = args.customInstructions;
    if (args.lexileLevel) data.lexileLevel = args.lexileLevel;
    if (args.accessibilityNeeds) data.accessibilityNeeds = args.accessibilityNeeds;
    if (args.allowTopicRequests !== undefined) data.allowTopicRequests = args.allowTopicRequests;
    if (args.pin) data.pin = args.pin;

    const profileId = await ctx.db.insert("kidProfiles", data as any);

    return profileId;
  },
});

// Update a kid profile
export const updateProfile = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    ageRange: v.optional(v.object({
      min: v.number(),
      max: v.number(),
    })),
    contentStrictness: v.optional(v.string()),
    blockedTopics: v.optional(v.array(v.string())),
    allowedTopics: v.optional(v.array(v.string())),
    customInstructions: v.optional(v.string()),
    lexileLevel: v.optional(v.string()),
    accessibilityNeeds: v.optional(v.array(v.string())),
    allowImageSearch: v.optional(v.boolean()),
    allowFollowUp: v.optional(v.boolean()),
    allowTopicRequests: v.optional(v.boolean()),
    pin: v.optional(v.string()),
    userToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfileOwner(
      ctx,
      args.userToken,
      args.kidProfileId,
      "kidProfiles.updateProfile",
    );
    if (!profile) {
      throw new Error("Kid profile not found");
    }

    const updates: Record<string, any> = {};

    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.color !== undefined) updates.color = args.color;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.ageRange !== undefined) updates.ageRange = args.ageRange;
    if (args.contentStrictness !== undefined) updates.contentStrictness = args.contentStrictness;
    if (args.blockedTopics !== undefined) updates.blockedTopics = args.blockedTopics;
    if (args.allowedTopics !== undefined) updates.allowedTopics = args.allowedTopics;
    if (args.customInstructions !== undefined) updates.customInstructions = args.customInstructions;
    if (args.lexileLevel !== undefined) updates.lexileLevel = args.lexileLevel;
    if (args.accessibilityNeeds !== undefined) updates.accessibilityNeeds = args.accessibilityNeeds;
    if (args.allowImageSearch !== undefined) updates.allowImageSearch = args.allowImageSearch;
    if (args.allowFollowUp !== undefined) updates.allowFollowUp = args.allowFollowUp;
    if (args.allowTopicRequests !== undefined) updates.allowTopicRequests = args.allowTopicRequests;
    if (args.pin !== undefined) {
      updates.pin = args.pin === '' ? undefined : args.pin;
      // Reset rate-limit counters when PIN is changed
      updates.pinFailedAttempts = 0;
      updates.pinLockedUntil = undefined;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.kidProfileId, updates);
    }

    return { success: true };
  },
});

// Rate-limit constants for PIN verification
const MAX_PIN_ATTEMPTS = 5; // max failures within the window
const PIN_ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const PIN_LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Verify a kid's PIN (mutation so we can track failed attempts & lockout)
export const verifyKidPin = mutation({
  args: {
    profileId: v.id("kidProfiles"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return { valid: false, locked: false };
    if (!profile.pin) return { valid: true, locked: false };

    const now = Date.now();

    // Check if currently locked out
    if (profile.pinLockedUntil && profile.pinLockedUntil > now) {
      const remainingSeconds = Math.ceil((profile.pinLockedUntil - now) / 1000);
      return { valid: false, locked: true, remainingSeconds };
    }

    // If lockout has expired, reset counters
    if (profile.pinLockedUntil && profile.pinLockedUntil <= now) {
      await ctx.db.patch(args.profileId, {
        pinFailedAttempts: 0,
        pinLockedUntil: undefined,
      });
    }

    // Verify PIN
    if (profile.pin === args.pin) {
      // Success — reset failed attempts
      if (profile.pinFailedAttempts && profile.pinFailedAttempts > 0) {
        await ctx.db.patch(args.profileId, {
          pinFailedAttempts: 0,
          pinLockedUntil: undefined,
        });
      }
      return { valid: true, locked: false };
    }

    // Failed attempt — increment counter
    const failedAttempts = (profile.pinFailedAttempts || 0) + 1;
    const updates: Record<string, any> = { pinFailedAttempts: failedAttempts };

    if (failedAttempts >= MAX_PIN_ATTEMPTS) {
      // Lock the profile
      updates.pinLockedUntil = now + PIN_LOCKOUT_DURATION_MS;
      await ctx.db.patch(args.profileId, updates);
      return {
        valid: false,
        locked: true,
        remainingSeconds: Math.ceil(PIN_LOCKOUT_DURATION_MS / 1000),
      };
    }

    await ctx.db.patch(args.profileId, updates);
    return {
      valid: false,
      locked: false,
      attemptsRemaining: MAX_PIN_ATTEMPTS - failedAttempts,
    };
  },
});

// Delete a kid profile and all related data
export const deleteProfile = mutation({
  args: { kidProfileId: v.id("kidProfiles"), userToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profile = await requireProfileOwner(
      ctx,
      args.userToken,
      args.kidProfileId,
      "kidProfiles.deleteProfile",
    );
    if (!profile) {
      throw new Error("Kid profile not found");
    }

    const result = await cascadeDeleteKidProfile(ctx, args.kidProfileId);

    // Delete the profile itself
    await ctx.db.delete(args.kidProfileId);

    return {
      success: true,
      ...result,
    };
  },
});
