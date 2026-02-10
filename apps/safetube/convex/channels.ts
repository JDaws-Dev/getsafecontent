import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all approved channels for a kid
export const getApprovedChannels = query({
  args: { kidProfileId: v.id("kidProfiles") },
  handler: async (ctx, args) => {
    const channels = await ctx.db
      .query("approvedChannels")
      .withIndex("by_kid", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    return channels.sort((a, b) => b.addedAt - a.addedAt);
  },
});

// Check if a channel is approved for a kid
export const isChannelApproved = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    channelId: v.string(),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db
      .query("approvedChannels")
      .withIndex("by_channel", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("channelId", args.channelId)
      )
      .first();

    return !!channel;
  },
});

// Add a channel to the approved list
export const addApprovedChannel = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    channelId: v.string(),
    channelTitle: v.string(),
    thumbnailUrl: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.optional(v.string()),
    videoCount: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already approved
    const existing = await ctx.db
      .query("approvedChannels")
      .withIndex("by_channel", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("channelId", args.channelId)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        channelTitle: args.channelTitle,
        thumbnailUrl: args.thumbnailUrl,
        description: args.description,
        subscriberCount: args.subscriberCount,
        videoCount: args.videoCount,
      });
      return existing._id;
    }

    // Create new
    const channelDocId = await ctx.db.insert("approvedChannels", {
      userId: args.userId,
      kidProfileId: args.kidProfileId,
      channelId: args.channelId,
      channelTitle: args.channelTitle,
      thumbnailUrl: args.thumbnailUrl,
      description: args.description,
      subscriberCount: args.subscriberCount,
      videoCount: args.videoCount,
      addedAt: Date.now(),
    });

    return channelDocId;
  },
});

// Add a channel to multiple kid profiles at once
export const addChannelToMultipleKids = mutation({
  args: {
    userId: v.id("users"),
    kidProfileIds: v.array(v.id("kidProfiles")),
    channelId: v.string(),
    channelTitle: v.string(),
    thumbnailUrl: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.optional(v.string()),
    videoCount: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const kidProfileId of args.kidProfileIds) {
      // Check if already approved
      const existing = await ctx.db
        .query("approvedChannels")
        .withIndex("by_channel", (q) =>
          q.eq("kidProfileId", kidProfileId).eq("channelId", args.channelId)
        )
        .first();

      if (existing) {
        results.push(existing._id);
        continue;
      }

      // Create new
      const channelDocId = await ctx.db.insert("approvedChannels", {
        userId: args.userId,
        kidProfileId,
        channelId: args.channelId,
        channelTitle: args.channelTitle,
        thumbnailUrl: args.thumbnailUrl,
        description: args.description,
        subscriberCount: args.subscriberCount,
        videoCount: args.videoCount,
        addedAt: Date.now(),
      });

      results.push(channelDocId);
    }

    return results;
  },
});

// Remove a channel from approved list
export const removeApprovedChannel = mutation({
  args: {
    kidProfileId: v.id("kidProfiles"),
    channelId: v.string(),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db
      .query("approvedChannels")
      .withIndex("by_channel", (q) =>
        q.eq("kidProfileId", args.kidProfileId).eq("channelId", args.channelId)
      )
      .first();

    if (channel) {
      await ctx.db.delete(channel._id);
    }
  },
});
