import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Log a subscription event (internal - called from webhooks)
export const logEvent = internalMutation({
  args: {
    email: v.string(),
    eventType: v.string(),
    eventData: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Try to find the user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    await ctx.db.insert("subscriptionEvents", {
      userId: user?._id,
      email: args.email,
      eventType: args.eventType,
      eventData: args.eventData,
      subscriptionStatus: args.subscriptionStatus,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      errorMessage: args.errorMessage,
      timestamp: Date.now(),
    });

    console.log(`[SubscriptionEvent] ${args.eventType} for ${args.email}${args.errorMessage ? ` - Error: ${args.errorMessage}` : ''}`);
  },
});

// Log access denied event (public mutation - called from frontend)
export const logAccessDenied = mutation({
  args: {
    email: v.string(),
    reason: v.string(),
    subscriptionStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    await ctx.db.insert("subscriptionEvents", {
      userId: user?._id,
      email: args.email,
      eventType: "access.denied",
      subscriptionStatus: args.subscriptionStatus,
      eventData: JSON.stringify({ reason: args.reason }),
      timestamp: Date.now(),
    });

    console.log(`[Access Denied] ${args.email} - ${args.reason}`);
  },
});

// Get subscription events for a user
export const getEventsByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_email_and_timestamp", (q) => q.eq("email", args.email))
      .order("desc")
      .take(100);
  },
});

// Get recent subscription events (admin view)
export const getRecentEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

// Get events by type
export const getEventsByType = query({
  args: {
    eventType: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_type", (q) => q.eq("eventType", args.eventType))
      .order("desc")
      .take(limit);
  },
});
