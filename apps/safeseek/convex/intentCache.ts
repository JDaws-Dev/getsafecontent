import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Cache for LLM intent classifications. Intent depends only on the query
// text, so identical queries (very common with kids — same homework topics,
// same games) shouldn't re-bill gpt-4o-mini or pay its latency every time.
// Degraded results (classifier outage fallbacks) are never cached.

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function normalizeForIntentCache(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 200);
}

export const get = internalQuery({
  args: { normalizedQuery: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("intentCache")
      .withIndex("by_query", (q) => q.eq("normalizedQuery", args.normalizedQuery))
      .first();
    if (!row || row.expiresAt < Date.now()) return null;
    return {
      category: row.category,
      confidence: row.confidence,
      rationale: row.rationale,
    };
  },
});

export const put = internalMutation({
  args: {
    normalizedQuery: v.string(),
    category: v.string(),
    confidence: v.number(),
    rationale: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("intentCache")
      .withIndex("by_query", (q) => q.eq("normalizedQuery", args.normalizedQuery))
      .first();
    const fields = {
      category: args.category,
      confidence: args.confidence,
      rationale: args.rationale,
      cachedAt: Date.now(),
      expiresAt: Date.now() + TTL_MS,
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("intentCache", { normalizedQuery: args.normalizedQuery, ...fields });
    }
  },
});
