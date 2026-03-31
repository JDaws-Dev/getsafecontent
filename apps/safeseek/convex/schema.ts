import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),

    // SafeStudy custom fields
    familyCode: v.optional(v.string()), // Unique 6-char code for kids to access
    parentPin: v.optional(v.string()), // PIN to protect parent mode (hashed)
    timezone: v.optional(v.string()), // IANA timezone (e.g., "America/New_York")
    subscriptionStatus: v.optional(v.string()), // "trial", "active", "lifetime", "cancelled", "expired", "past_due"
    stripeCustomerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    trialEndsAt: v.optional(v.number()),
    subscriptionEndsAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),

    // Trial expiration tracking
    trialWarningEmailSent: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("by_familyCode", ["familyCode"])
    .index("by_subscription", ["subscriptionId"]),

  // Kid profiles - each kid has their own search settings
  kidProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    pin: v.optional(v.string()), // 4-digit PIN for profile access
    ageRange: v.object({
      min: v.number(),
      max: v.number(),
    }),
    contentStrictness: v.string(), // "strict", "moderate", "light"
    blockedTopics: v.array(v.string()),
    allowedTopics: v.optional(v.array(v.string())), // whitelist overrides
    customInstructions: v.optional(v.string()), // parent notes to AI
    lexileLevel: v.optional(v.string()), // e.g., "200L", "800L", or "auto"
    accessibilityNeeds: v.optional(v.array(v.string())), // ["dyslexia", "low-vision", "adhd", "esl"]
    allowImageSearch: v.boolean(),
    allowFollowUp: v.boolean(),
    allowTopicRequests: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"]),

  // Search history for kids
  searchHistory: defineTable({
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
    results: v.string(), // JSON stringified results array
    aiSummary: v.string(),
    flagged: v.boolean(),
    flagReason: v.optional(v.string()),
    searchedAt: v.number(),
  })
    .index("by_kid", ["kidProfileId"])
    .index("by_kid_recent", ["kidProfileId", "searchedAt"]),

  // Blocked search attempts
  blockedSearches: defineTable({
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
    blockedReason: v.string(),
    searchedAt: v.number(),
  })
    .index("by_kid", ["kidProfileId"])
    .index("by_kid_recent", ["kidProfileId", "searchedAt"]),

  // Time limits for kids
  timeLimits: defineTable({
    kidProfileId: v.id("kidProfiles"),
    dailyLimitMinutes: v.number(), // 0 = unlimited (counts searches, not minutes)
    weekendLimitMinutes: v.optional(v.number()),
    allowedStartHour: v.optional(v.number()), // 0-23
    allowedEndHour: v.optional(v.number()), // 0-23
    updatedAt: v.number(),
  })
    .index("by_kid", ["kidProfileId"]),

  // Parent search settings (per-user, applies to all kids)
  searchSettings: defineTable({
    userId: v.id("users"),
    safeSearchLevel: v.string(), // "strict", "moderate", "off"
    allowedDomains: v.optional(v.array(v.string())),
    blockedDomains: v.optional(v.array(v.string())),
    customInstructions: v.optional(v.string()), // Parent notes to AI
  })
    .index("by_user", ["userId"]),

  // Topic requests — kids can request permission to search blocked topics
  topicRequests: defineTable({
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"), // parent
    query: v.string(), // what they searched
    reason: v.string(), // why it was blocked
    status: v.string(), // "pending", "approved", "denied"
    kidName: v.optional(v.string()),
    requestedAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId", "status"])
    .index("by_kid", ["kidProfileId"]),

  // Tutor session history — for parent dashboard visibility
  tutorSessions: defineTable({
    kidProfileId: v.id("kidProfiles"),
    messages: v.array(v.object({ role: v.string(), content: v.string(), timestamp: v.number() })),
    topic: v.optional(v.string()),
    startedAt: v.number(),
    lastMessageAt: v.number(),
  })
    .index("by_kid", ["kidProfileId"]),

  // Search result cache — avoids redundant AI calls for identical queries
  searchCache: defineTable({
    normalizedQuery: v.string(),
    ageGroup: v.string(),
    strictness: v.string(),
    profileKey: v.optional(v.string()), // hash of lexile+accessibility for cache differentiation
    response: v.string(),
    cachedAt: v.number(),
    expiresAt: v.number(),
    timesReused: v.number(),
  })
    .index("by_query", ["normalizedQuery", "ageGroup", "strictness"])
    .index("by_query_full", ["normalizedQuery", "profileKey"])
    .index("by_expires", ["expiresAt"]),
}, { schemaValidation: false });
