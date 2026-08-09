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

    // Weekly parent digest opt-out (Apr 2026)
    weeklyDigestOptOut: v.optional(v.boolean()),
    lastDigestSentAt: v.optional(v.number()),

    // Central subscription sync (see userSync.ts) — timestamp until which the
    // last /verifyAppAccess answer is trusted, so a page-load storm doesn't
    // hammer central. Unset/past = re-verify on next check.
    centralAccessCacheExpiry: v.optional(v.number()),
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
    pinFailedAttempts: v.optional(v.number()), // rate limiting: consecutive failed PIN attempts
    pinLockedUntil: v.optional(v.number()), // rate limiting: lockout timestamp (ms)
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
    // Daily query budget — null/undefined = use strictness default
    // (strict: 15, moderate: 25, light: 50, anything else: unlimited)
    dailyQueryBudget: v.optional(v.number()),
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
    // Intent classification (added Apr 2026 — see ai/intentClassifier.ts)
    intentCategory: v.optional(v.string()),
    intentConfidence: v.optional(v.number()),
    intentRationale: v.optional(v.string()),
  })
    .index("by_kid", ["kidProfileId"])
    .index("by_kid_recent", ["kidProfileId", "searchedAt"]),

  // Blocked search attempts
  blockedSearches: defineTable({
    kidProfileId: v.id("kidProfiles"),
    query: v.string(),
    blockedReason: v.string(),
    searchedAt: v.number(),
    // Intent classification (added Apr 2026)
    intentCategory: v.optional(v.string()),
    intentConfidence: v.optional(v.number()),
    intentRationale: v.optional(v.string()),
  })
    .index("by_kid", ["kidProfileId"])
    .index("by_kid_recent", ["kidProfileId", "searchedAt"]),

  // Concern alerts — eating-disorder, self-harm, etc. signals that escalate
  // immediately to parent. Separate table (not just blockedSearches) so it can
  // be queried fast and cleared independently.
  kidConcernAlerts: defineTable({
    kidProfileId: v.id("kidProfiles"),
    userId: v.id("users"),
    query: v.string(),
    category: v.string(), // intent category that triggered (e.g., "eating_disorder_adjacent")
    confidence: v.number(),
    rationale: v.string(),
    notifiedAt: v.optional(v.number()),
    acknowledgedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_kid", ["kidProfileId"])
    .index("by_user_unack", ["userId", "acknowledgedAt"]),

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

  // Cached verdict from the FAMILY-WIDE daily screen-time limit held by
  // Marketing Central (shared across all five Safe Family apps).
  //
  // Convex queries cannot make network calls, and the gate (timeLimits.canSearch)
  // is a query — so sharedScreenTime.sync (an action) refreshes this row and the
  // query reads it. A missing or stale row means "family limit doesn't apply",
  // which is the fail-open path back to SafeStudy's own per-app limit.
  sharedScreenTimeCache: defineTable({
    kidProfileId: v.id("kidProfiles"),
    day: v.string(), // "YYYY-MM-DD" in the family's timezone
    limitSet: v.boolean(), // is the family-wide limit in force?
    allowed: v.boolean(),
    usedMinutes: v.number(),
    limitMinutes: v.number(),
    remainingMinutes: v.optional(v.number()),
    // Engaged seconds already reported to central for this kid+day, so repeated
    // syncs send only the delta and never double-count.
    reportedSeconds: v.number(),
    syncedAt: v.number(),
  }).index("by_kid_day", ["kidProfileId", "day"]),

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
    // One timestamp per message exchange, appended as it happens (Aug 2026).
    // The `messages` array is rewritten wholesale on every save with synthetic
    // timestamps, so it can't be used to reconstruct when a kid was actually
    // active — this can. Used by sharedScreenTime to measure engaged minutes.
    messageTimestamps: v.optional(v.array(v.number())),
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

  // Rate limiting — sliding window counters per user per action
  rateLimits: defineTable({
    userId: v.id("users"),
    action: v.string(), // "search", "tutor", "research", "global"
    timestamps: v.array(v.number()), // request timestamps within the window
  })
    .index("by_user_action", ["userId", "action"]),

  // LLM intent-classification cache — intent depends only on query text.
  // See intentCache.ts.
  intentCache: defineTable({
    normalizedQuery: v.string(),
    category: v.string(),
    confidence: v.number(),
    rationale: v.string(),
    cachedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_query", ["normalizedQuery"]),

  // Operator-facing system events (e.g. classifier-down alert dedupe markers).
  // See opsAlerts.ts.
  systemEvents: defineTable({
    kind: v.string(),
    createdAt: v.number(),
    meta: v.optional(v.string()),
  })
    .index("by_kind_time", ["kind", "createdAt"]),
});
