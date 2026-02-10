import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get push subscriptions for a user
export const getSubscriptions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Check if user has any push subscriptions
export const hasSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return !!subscription;
  },
});

// Save a push subscription
export const saveSubscription = mutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    deviceInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if this endpoint already exists
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (existing) {
      // Update existing subscription
      await ctx.db.patch(existing._id, {
        p256dh: args.p256dh,
        auth: args.auth,
        deviceInfo: args.deviceInfo,
        lastUsedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new subscription
    return await ctx.db.insert("pushSubscriptions", {
      userId: args.userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      deviceInfo: args.deviceInfo,
      createdAt: Date.now(),
    });
  },
});

// Remove a push subscription
export const removeSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (subscription) {
      await ctx.db.delete(subscription._id);
    }
  },
});

// Remove all subscriptions for a user
export const removeAllSubscriptions = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const sub of subscriptions) {
      await ctx.db.delete(sub._id);
    }
  },
});

// Internal mutation to update last used timestamp
export const updateLastUsed = mutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      lastUsedAt: Date.now(),
    });
  },
});

// Internal mutation to remove invalid subscription
export const removeInvalidSubscription = mutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.subscriptionId);
  },
});
