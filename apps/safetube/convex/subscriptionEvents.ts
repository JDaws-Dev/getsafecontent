import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

// Log subscription event (internal - called from webhook handler)
export const logEvent = internalMutation({
  args: {
    email: v.string(),
    eventType: v.string(),
    subscriptionStatus: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    eventData: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("subscriptionEvents", {
      email: args.email,
      eventType: args.eventType,
      subscriptionStatus: args.subscriptionStatus,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      eventData: args.eventData,
      errorMessage: args.errorMessage,
      createdAt: Date.now(),
    });
  },
});

// Get recent subscription events (for admin dashboard debugging)
export const getRecentEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit || 50);

    return events;
  },
});

// Get events for a specific email
export const getEventsByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .order("desc")
      .take(50);

    return events;
  },
});
