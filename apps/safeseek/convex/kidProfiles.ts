import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all kid profiles for a user
export const getProfiles = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get a single kid profile by ID
export const getProfile = query({
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
    allowImageSearch: v.boolean(),
    allowFollowUp: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const profileId = await ctx.db.insert("kidProfiles", {
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
    });

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
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
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

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.kidProfileId, updates);
    }

    return { success: true };
  },
});

// Delete a kid profile and all related data
export const deleteProfile = mutation({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.kidProfileId);
    if (!profile) {
      throw new Error("Kid profile not found");
    }

    // Delete search history
    const searchHistory = await ctx.db
      .query("searchHistory")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();
    for (const h of searchHistory) {
      await ctx.db.delete(h._id);
    }

    // Delete blocked searches
    const blockedSearches = await ctx.db
      .query("blockedSearches")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();
    for (const b of blockedSearches) {
      await ctx.db.delete(b._id);
    }

    // Delete time limits
    const timeLimits = await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();
    for (const t of timeLimits) {
      await ctx.db.delete(t._id);
    }

    // Delete the profile itself
    await ctx.db.delete(args.kidProfileId);

    return {
      success: true,
      deletedSearchHistory: searchHistory.length,
      deletedBlockedSearches: blockedSearches.length,
      deletedTimeLimits: timeLimits.length,
    };
  },
});
