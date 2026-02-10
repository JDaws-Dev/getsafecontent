import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Default icons and colors
const DEFAULT_ICONS = ['🦁', '🐻', '🐼', '🐨', '🐯', '🦊', '🐰', '🐸', '🦄', '🚀'];
const DEFAULT_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];

// Get all kid profiles for a user
export const getKidProfiles = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return profiles.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Get kid profiles by family code (for kid access)
export const getKidProfilesByFamilyCode = query({
  args: { familyCode: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_familyCode", (q) => q.eq("familyCode", args.familyCode.toUpperCase()))
      .first();

    if (!user) return { profiles: [], isTrialExpired: false };

    // Check if trial has expired
    const isTrialExpired = user.subscriptionStatus === "trial" &&
      user.trialEndsAt &&
      Date.now() > user.trialEndsAt;

    // If trial is expired, return empty profiles so kids can't access
    if (isTrialExpired) {
      return { profiles: [], isTrialExpired: true };
    }

    const profiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return {
      profiles: profiles.sort((a, b) => a.createdAt - b.createdAt),
      isTrialExpired: false,
    };
  },
});

// Create a new kid profile
export const createKidProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    shortsEnabled: v.optional(v.boolean()),
    maxVideosPerChannel: v.optional(v.number()),
    requestsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get existing profiles to pick unique icon/color
    const existing = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const usedIcons = new Set(existing.map((p) => p.icon));
    const usedColors = new Set(existing.map((p) => p.color));

    // Pick first unused icon or random
    const icon = args.icon || DEFAULT_ICONS.find((i) => !usedIcons.has(i)) || DEFAULT_ICONS[Math.floor(Math.random() * DEFAULT_ICONS.length)];
    const color = args.color || DEFAULT_COLORS.find((c) => !usedColors.has(c)) || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];

    const profileId = await ctx.db.insert("kidProfiles", {
      userId: args.userId,
      name: args.name,
      icon,
      color,
      shortsEnabled: args.shortsEnabled ?? true, // default to true
      maxVideosPerChannel: args.maxVideosPerChannel ?? 5, // default to 5
      requestsEnabled: args.requestsEnabled ?? true, // default to true
      createdAt: Date.now(),
    });

    return profileId;
  },
});

// Update a kid profile
export const updateKidProfile = mutation({
  args: {
    profileId: v.id("kidProfiles"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    shortsEnabled: v.optional(v.boolean()),
    videoPaused: v.optional(v.boolean()),
    maxVideosPerChannel: v.optional(v.number()),
    requestsEnabled: v.optional(v.boolean()),
    pin: v.optional(v.string()), // 4-digit PIN (or empty string to remove)
  },
  handler: async (ctx, args) => {
    const updates: Record<string, string | boolean | number | undefined> = {};
    if (args.name) updates.name = args.name;
    if (args.icon) updates.icon = args.icon;
    if (args.color) updates.color = args.color;
    if (args.shortsEnabled !== undefined) updates.shortsEnabled = args.shortsEnabled;
    if (args.videoPaused !== undefined) updates.videoPaused = args.videoPaused;
    if (args.maxVideosPerChannel !== undefined) updates.maxVideosPerChannel = args.maxVideosPerChannel;
    if (args.requestsEnabled !== undefined) updates.requestsEnabled = args.requestsEnabled;
    // Handle PIN: empty string removes it, otherwise set the new PIN
    if (args.pin !== undefined) {
      updates.pin = args.pin === '' ? undefined : args.pin;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.profileId, updates);
    }
  },
});

// Verify a kid's PIN
export const verifyKidPin = query({
  args: {
    profileId: v.id("kidProfiles"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return { valid: false, error: "Profile not found" };

    // If no PIN is set, always valid
    if (!profile.pin) return { valid: true };

    // Check if PIN matches
    return { valid: profile.pin === args.pin };
  },
});

// Delete a kid profile and all their content
export const deleteKidProfile = mutation({
  args: { profileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    // Delete all approved channels
    const channels = await ctx.db
      .query("approvedChannels")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const channel of channels) {
      await ctx.db.delete(channel._id);
    }

    // Delete all approved videos
    const videos = await ctx.db
      .query("approvedVideos")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const video of videos) {
      await ctx.db.delete(video._id);
    }

    // Delete watch history
    const history = await ctx.db
      .query("watchHistory")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const h of history) {
      await ctx.db.delete(h._id);
    }

    // Delete video requests
    const requests = await ctx.db
      .query("videoRequests")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const req of requests) {
      await ctx.db.delete(req._id);
    }

    // Delete time limits
    const limits = await ctx.db
      .query("timeLimits")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.profileId))
      .collect();
    for (const lim of limits) {
      await ctx.db.delete(lim._id);
    }

    // Delete the profile
    await ctx.db.delete(args.profileId);
  },
});
