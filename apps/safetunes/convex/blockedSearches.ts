import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Log a blocked search attempt
export const logBlockedSearch = mutation({
  args: {
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    searchQuery: v.string(),
    blockedReason: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("blockedSearches", {
      userId: args.userId,
      kidProfileId: args.kidProfileId,
      searchQuery: args.searchQuery,
      blockedReason: args.blockedReason,
      searchedAt: Date.now(),
      isRead: false, // New searches are unread by default
    });
  },
});

// Get all blocked searches for a parent user
export const getBlockedSearches = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const blockedSearches = await ctx.db
      .query("blockedSearches")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100); // Limit to most recent 100

    // Get kid profile names
    const kidProfiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Create a map of kidProfileId to kid name
    const kidNameMap = new Map(
      kidProfiles.map((kid) => [kid._id, kid.name])
    );

    // Add kid names to blocked searches
    return blockedSearches.map((search) => ({
      ...search,
      kidName: kidNameMap.get(search.kidProfileId) || "Unknown",
    }));
  },
});

// Delete a blocked search record
export const deleteBlockedSearch = mutation({
  args: {
    searchId: v.id("blockedSearches"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.searchId);
  },
});

// Clear all blocked searches for a user
export const clearAllBlockedSearches = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const searches = await ctx.db
      .query("blockedSearches")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const search of searches) {
      await ctx.db.delete(search._id);
    }

    return searches.length;
  },
});

// Get count of unread blocked searches
export const getUnreadBlockedSearchesCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unreadSearches = await ctx.db
      .query("blockedSearches")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    return unreadSearches.length;
  },
});

// Mark a blocked search as read
export const markBlockedSearchAsRead = mutation({
  args: {
    searchId: v.id("blockedSearches"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.searchId, {
      isRead: true,
    });
  },
});

// Mark all blocked searches as read for a user
export const markAllBlockedSearchesAsRead = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unreadSearches = await ctx.db
      .query("blockedSearches")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    for (const search of unreadSearches) {
      await ctx.db.patch(search._id, {
        isRead: true,
      });
    }

    return unreadSearches.length;
  },
});
