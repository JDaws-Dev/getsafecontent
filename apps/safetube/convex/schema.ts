import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  // Spread Convex Auth tables (authAccounts, authRefreshTokens, authSessions, authVerificationCodes, authVerifiers, etc.)
  ...authTables,

  // Override the users table with Convex Auth fields + SafeTube custom fields
  users: defineTable({
    // Convex Auth required fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.float64()),
    isAnonymous: v.optional(v.boolean()),

    // SafeTube custom fields
    familyCode: v.optional(v.string()), // Unique code for kids to access
    parentPin: v.optional(v.string()), // PIN to protect parent mode (hashed)
    couponCode: v.optional(v.string()), // Promo code used at signup
    appleMusicAuthorized: v.optional(v.boolean()), // Apple Music authorization status (legacy)
    appleMusicAuthDate: v.optional(v.number()), // When Apple Music was authorized (legacy)
    globalHideArtwork: v.optional(v.boolean()), // Global toggle to hide all album artwork
    timezone: v.optional(v.string()), // IANA timezone (e.g., "America/New_York")
    expoPushToken: v.optional(v.string()), // Expo push notification token
    onboardingCompleted: v.optional(v.boolean()), // Track if user finished onboarding
    subscriptionStatus: v.optional(v.string()), // "trial", "active", "cancelled", "expired", "lifetime"
    stripeCustomerId: v.optional(v.string()), // Stripe customer ID
    subscriptionId: v.optional(v.string()), // Stripe subscription ID
    subscriptionEndsAt: v.optional(v.number()), // When subscription ends
    trialEndsAt: v.optional(v.number()), // When trial expires
    createdAt: v.optional(v.number()), // When user was created

    // Legacy fields from old auth system
    passwordHash: v.optional(v.string()), // Legacy - kept for backward compat

    // Central accounts sync
    centralAccessCacheExpiry: v.optional(v.number()), // When central access cache expires (for 5-min caching)
  })
    .index("email", ["email"]) // Required by Convex Auth
    .index("phone", ["phone"]) // Required by Convex Auth
    .index("by_familyCode", ["familyCode"])
    .index("by_subscription", ["subscriptionId"]),

  // Kid profiles - each kid has their own whitelist
  kidProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    icon: v.optional(v.string()), // Emoji icon (optional for legacy profiles)
    avatar: v.optional(v.string()), // Legacy field for backwards compatibility
    ageRange: v.optional(v.string()), // Legacy field for backwards compatibility
    favoriteGenres: v.optional(v.array(v.string())), // Legacy field for backwards compatibility
    favoriteArtists: v.optional(v.array(v.string())), // Legacy field for backwards compatibility
    musicPreferences: v.optional(v.string()), // Legacy field for backwards compatibility
    pin: v.optional(v.string()), // Legacy field for backwards compatibility
    dailyTimeLimitMinutes: v.optional(v.number()), // Legacy field for backwards compatibility
    expoPushToken: v.optional(v.string()), // Legacy field for backwards compatibility
    musicPaused: v.optional(v.boolean()), // Legacy field for backwards compatibility
    color: v.string(), // Theme color
    shortsEnabled: v.optional(v.boolean()), // Allow Shorts videos (default true)
    videoPaused: v.optional(v.boolean()), // If true, kid cannot watch videos (parent lockout)
    maxVideosPerChannel: v.optional(v.number()), // Limit feed videos per channel (default 5)
    requestsEnabled: v.optional(v.boolean()), // Allow kid to request content (default true)
    timeLimitEnabled: v.optional(v.boolean()), // Legacy field for backwards compatibility
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Approved YouTube channels
  approvedChannels: defineTable({
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    channelId: v.string(), // YouTube channel ID
    channelTitle: v.string(),
    thumbnailUrl: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.optional(v.string()),
    videoCount: v.optional(v.string()),
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_kid", ["kidProfileId"])
    .index("by_channel", ["kidProfileId", "channelId"]),

  // Approved YouTube videos
  approvedVideos: defineTable({
    userId: v.id("users"),
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(), // YouTube video ID
    title: v.string(),
    thumbnailUrl: v.string(),
    channelId: v.string(),
    channelTitle: v.string(),
    duration: v.string(), // ISO 8601 duration
    durationSeconds: v.number(),
    madeForKids: v.boolean(),
    isShort: v.optional(v.boolean()), // True if video is ≤60 seconds (YouTube Short)
    publishedAt: v.optional(v.string()),
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_kid", ["kidProfileId"])
    .index("by_video", ["kidProfileId", "videoId"])
    .index("by_channel", ["kidProfileId", "channelId"]),

  // Watch history for kids
  watchHistory: defineTable({
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(),
    title: v.string(),
    thumbnailUrl: v.string(),
    channelTitle: v.string(),
    watchedAt: v.number(),
    watchDurationSeconds: v.optional(v.number()),
  })
    .index("by_kid", ["kidProfileId"])
    .index("by_kid_recent", ["kidProfileId", "watchedAt"]),

  // Video requests from kids to parents
  videoRequests: defineTable({
    userId: v.id("users"), // Parent user
    kidProfileId: v.id("kidProfiles"),
    videoId: v.string(),
    title: v.string(),
    thumbnailUrl: v.string(),
    channelId: v.string(),
    channelTitle: v.string(),
    duration: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    requestedAt: v.number(),
    status: v.string(), // 'pending', 'approved', 'denied'
    respondedAt: v.optional(v.number()),
    denyReason: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_kid", ["kidProfileId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_video", ["kidProfileId", "videoId"]),

  // Channel requests from kids to parents
  channelRequests: defineTable({
    userId: v.id("users"), // Parent user
    kidProfileId: v.id("kidProfiles"),
    channelId: v.string(),
    channelTitle: v.string(),
    thumbnailUrl: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.optional(v.string()),
    requestedAt: v.number(),
    status: v.string(), // 'pending', 'approved', 'denied'
    respondedAt: v.optional(v.number()),
    denyReason: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_kid", ["kidProfileId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_channel", ["kidProfileId", "channelId"]),

  // Time limits for kids
  timeLimits: defineTable({
    kidProfileId: v.id("kidProfiles"),
    dailyLimitMinutes: v.number(), // 0 = unlimited
    weekendLimitMinutes: v.optional(v.number()), // Optional different limit for weekends
    allowedStartHour: v.optional(v.number()), // 0-23, optional time window start
    allowedEndHour: v.optional(v.number()), // 0-23, optional time window end
    updatedAt: v.number(),
  })
    .index("by_kid", ["kidProfileId"]),

  // Kid playlists - kids can organize their approved videos into playlists
  kidPlaylists: defineTable({
    kidProfileId: v.id("kidProfiles"),
    name: v.string(),
    emoji: v.optional(v.string()), // Optional emoji icon for playlist
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_kid", ["kidProfileId"]),

  // Videos in kid playlists
  kidPlaylistVideos: defineTable({
    playlistId: v.id("kidPlaylists"),
    kidProfileId: v.id("kidProfiles"), // Denormalized for easy querying
    videoId: v.string(), // YouTube video ID
    title: v.string(),
    thumbnailUrl: v.string(),
    channelTitle: v.string(),
    durationSeconds: v.optional(v.number()),
    sortOrder: v.number(), // For ordering videos in playlist
    addedAt: v.number(),
  })
    .index("by_playlist", ["playlistId"])
    .index("by_kid", ["kidProfileId"])
    .index("by_playlist_order", ["playlistId", "sortOrder"]),

  // AI Channel Review Cache - stores OpenAI analysis of YouTube channels
  channelReviewCache: defineTable({
    channelId: v.string(), // YouTube channel ID
    channelTitle: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.optional(v.string()),
    summary: v.string(),
    contentCategories: v.array(v.string()),
    concerns: v.array(v.object({
      category: v.string(),
      severity: v.string(),
      description: v.string(),
    })),
    recommendation: v.string(), // "Recommended", "Review Videos First", "Not Recommended"
    ageRecommendation: v.string(),
    reviewedAt: v.number(),
    timesReused: v.number(),
    lastAccessedAt: v.number(),
  })
    .index("by_channel_id", ["channelId"]),

  // YouTube Search Cache - stores YouTube API search results to reduce API quota usage
  youtubeSearchCache: defineTable({
    query: v.string(), // Normalized search query (lowercase, trimmed)
    searchType: v.string(), // "channels" or "videos" or "channelVideos"
    maxResults: v.optional(v.number()), // For deduplication (same query with different maxResults)
    channelId: v.optional(v.string()), // For channelVideos searches
    results: v.any(), // The cached search results array
    cachedAt: v.number(), // Timestamp when cached
    expiresAt: v.number(), // When cache expires
    timesReused: v.number(), // How many times this cache entry was used
    lastAccessedAt: v.number(), // Last time this cache was accessed
  })
    .index("by_query_type", ["query", "searchType"])
    .index("by_query_type_max", ["query", "searchType", "maxResults"])
    .index("by_channel_id", ["channelId", "searchType"])
    .index("by_expires", ["expiresAt"]),

  // Subscription events log - tracks Stripe webhook events for debugging
  subscriptionEvents: defineTable({
    email: v.string(),
    eventType: v.string(), // e.g., "checkout.completed", "subscription.updated", "payment.failed"
    subscriptionStatus: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    eventData: v.optional(v.string()), // JSON string of additional event data
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_created", ["createdAt"]),

  // Blocked search attempts - logged when kids search for inappropriate content
  blockedSearches: defineTable({
    userId: v.id("users"), // Parent user
    kidProfileId: v.id("kidProfiles"),
    query: v.string(), // The search query that was blocked
    blockedKeyword: v.string(), // The specific keyword that triggered the block
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_kid", ["kidProfileId"])
    .index("by_user_recent", ["userId", "timestamp"]),
});
