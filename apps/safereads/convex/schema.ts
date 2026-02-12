import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * SafeReads + Central Accounts Schema
 *
 * This schema serves both:
 * 1. SafeReads app (book analysis, kids, wishlists)
 * 2. Safe Family marketing site (central accounts, subscriptions)
 *
 * The marketing site shares this Convex deployment (exuberant-puffin-838).
 */

export default defineSchema({
  ...authTables,
  // Extended users table (overrides authTables.users with custom fields)
  // Serves both SafeReads app AND central Safe Family accounts
  users: defineTable({
    // Convex Auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.float64()),
    isAnonymous: v.optional(v.boolean()),
    // Legacy Clerk fields (kept for backward compat with existing users)
    clerkId: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // SafeReads custom fields
    onboardingComplete: v.optional(v.boolean()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(
      v.union(
        v.literal("trial"),
        v.literal("active"),
        v.literal("lifetime"),
        v.literal("canceled"),
        v.literal("past_due"),
        v.literal("incomplete"),
        v.literal("inactive"), // User has credentials but isn't entitled to this app
        v.literal("expired")
      )
    ),
    subscriptionCurrentPeriodEnd: v.optional(v.number()),
    trialExpiresAt: v.optional(v.number()), // Unix timestamp when trial expires
    analysisCount: v.optional(v.number()),
    // Coupon system
    redeemedCoupon: v.optional(v.string()), // Coupon code that was redeemed
    // Central accounts sync
    centralAccessCacheExpiry: v.optional(v.number()), // When central access cache expires (for 5-min caching)

    // === Central accounts fields (for marketing site /account page) ===
    trialStartedAt: v.optional(v.number()), // Unix timestamp when trial started
    subscriptionEndsAt: v.optional(v.number()), // When current period ends
    billingInterval: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),

    // Entitlements - which apps the user has access to
    entitledApps: v.optional(
      v.array(
        v.union(
          v.literal("safetunes"),
          v.literal("safetube"),
          v.literal("safereads")
        )
      )
    ),

    // Onboarding tracking per app
    onboardingCompleted: v.optional(
      v.object({
        safetunes: v.optional(v.boolean()),
        safetube: v.optional(v.boolean()),
        safereads: v.optional(v.boolean()),
      })
    ),

    // Promo code tracking
    couponCode: v.optional(v.string()), // Coupon code used at signup
    couponRedeemedAt: v.optional(v.number()), // When coupon was redeemed

    // Account metadata
    createdAt: v.optional(v.number()), // When account was created
    lastLoginAt: v.optional(v.number()), // Last login timestamp
    timezone: v.optional(v.string()), // IANA timezone for notifications

    // Grandfather clause fields
    grandfathered: v.optional(v.boolean()),
    grandfatheredRate: v.optional(v.number()),
    grandfatheredFrom: v.optional(
      v.union(
        v.literal("safetunes"),
        v.literal("safetube"),
        v.literal("safereads")
      )
    ),
    migratedAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"])
    .index("by_subscription_status", ["subscriptionStatus"]),

  couponCodes: defineTable({
    code: v.string(), // The coupon code (e.g., "DAWSFRIEND", "DEWITT")
    type: v.union(v.literal("lifetime"), v.literal("trial"), v.literal("trial_extension")),
    grantedApps: v.optional(
      v.array(
        v.union(
          v.literal("safetunes"),
          v.literal("safetube"),
          v.literal("safereads")
        )
      )
    ), // Which apps this code grants access to (null = all apps)
    trialDays: v.optional(v.number()), // For trial_extension type, how many days to add
    usageLimit: v.optional(v.number()), // null = unlimited
    usageCount: v.number(),
    active: v.boolean(),
    description: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()), // When code expires (null = never)
  }).index("by_code", ["code"]),

  profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    violence: v.number(),
    language: v.number(),
    sexualContent: v.number(),
    substanceUse: v.number(),
    darkThemes: v.number(),
    religiousSensitivity: v.number(),
    isDefault: v.boolean(),
  }).index("by_user", ["userId"]),

  books: defineTable({
    googleBooksId: v.optional(v.string()),
    openLibraryKey: v.optional(v.string()),
    title: v.string(),
    authors: v.array(v.string()),
    description: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    pageCount: v.optional(v.number()),
    publishedDate: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    isbn10: v.optional(v.string()),
    isbn13: v.optional(v.string()),
    maturityRating: v.optional(v.string()),
    averageRating: v.optional(v.number()),
    ratingsCount: v.optional(v.number()),
    firstSentence: v.optional(v.string()),
  })
    .index("by_google_books_id", ["googleBooksId"])
    .index("by_isbn13", ["isbn13"]),

  kids: defineTable({
    userId: v.id("users"),
    name: v.string(),
    age: v.optional(v.number()),
    profileId: v.optional(v.id("profiles")),
  }).index("by_user", ["userId"]),

  wishlists: defineTable({
    kidId: v.id("kids"),
    bookId: v.id("books"),
    note: v.optional(v.string()),
  })
    .index("by_kid", ["kidId"])
    .index("by_kid_and_book", ["kidId", "bookId"]),

  analyses: defineTable({
    bookId: v.id("books"),
    profileHash: v.optional(v.string()), // Legacy field — kept for backward compat with old records
    verdict: v.union(
      v.literal("safe"),
      v.literal("caution"),
      v.literal("warning"),
      v.literal("no_verdict")
    ),
    ageRecommendation: v.optional(v.string()),
    summary: v.string(),
    contentFlags: v.array(
      v.object({
        category: v.string(),
        severity: v.union(
          v.literal("none"),
          v.literal("mild"),
          v.literal("moderate"),
          v.literal("heavy")
        ),
        details: v.string(),
      })
    ),
    reasoning: v.optional(v.string()),
  }).index("by_book", ["bookId"]),

  notes: defineTable({
    userId: v.id("users"),
    bookId: v.id("books"),
    content: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_book", ["userId", "bookId"]),

  searchHistory: defineTable({
    userId: v.id("users"),
    query: v.string(),
    resultCount: v.number(),
  }).index("by_user", ["userId"]),

  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    lastMessageAt: v.number(),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  }).index("by_conversation", ["conversationId"]),

  authorOverviews: defineTable({
    authorName: v.string(),
    summary: v.string(),
    typicalAgeRange: v.optional(v.string()),
    commonThemes: v.array(v.string()),
    contentPatterns: v.string(),
  }).index("by_author_name", ["authorName"]),

  reports: defineTable({
    userId: v.id("users"),
    bookId: v.id("books"),
    analysisId: v.id("analyses"),
    reason: v.union(
      v.literal("too_lenient"),
      v.literal("too_strict"),
      v.literal("factual_error"),
      v.literal("missing_content"),
      v.literal("other")
    ),
    details: v.optional(v.string()),
  })
    .index("by_book", ["bookId"])
    .index("by_user", ["userId"])
    .index("by_user_and_analysis", ["userId", "analysisId"]),

  // ========================================================================
  // Central Users Table (for Safe Family marketing site)
  // ========================================================================
  // This table stores user credentials centrally before provisioning to apps.
  // Users authenticate once on the marketing site, and their credentials are
  // synced to individual apps (SafeTunes, SafeTube, SafeReads).
  //
  // IMPORTANT: passwordHash uses Scrypt format (from lucia package) to match
  // what Convex Auth Password provider expects.
  // ========================================================================
  centralUsers: defineTable({
    email: v.string(),
    passwordHash: v.string(), // Scrypt format from lucia
    name: v.optional(v.string()),
    createdAt: v.number(), // Unix timestamp
    lastLoginAt: v.optional(v.number()), // Unix timestamp of last login
    entitledApps: v.array(v.string()), // ["safetunes", "safetube", "safereads"]
    stripeCustomerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    subscriptionStatus: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("lifetime"),
      v.literal("cancelled"),
      v.literal("expired")
    ),
  })
    .index("by_email", ["email"])
    .index("by_stripe_customer_id", ["stripeCustomerId"]),

  // ========================================================================
  // Subscription Events Table (audit trail for marketing site)
  // ========================================================================
  subscriptionEvents: defineTable({
    userId: v.optional(v.id("users")), // User affected (null if user not found yet)
    email: v.string(), // Email for tracking (in case user not yet created)
    eventType: v.string(), // Event type (see below)
    /**
     * Event types:
     * - "checkout.started" - User started checkout
     * - "checkout.completed" - Stripe checkout session completed
     * - "subscription.created" - Subscription was created
     * - "subscription.updated" - Subscription was updated
     * - "subscription.canceled" - User canceled subscription
     * - "subscription.apps_changed" - User changed app selection
     * - "payment.succeeded" - Payment was successful
     * - "payment.failed" - Payment failed
     * - "trial.started" - Trial started
     * - "trial.expired" - Trial expired without conversion
     * - "coupon.applied" - Coupon code was applied
     * - "entitlement.granted" - App access was granted
     * - "entitlement.revoked" - App access was revoked
     * - "account.deleted" - User deleted their account
     * - "subscription.update_failed" - Update failed
     */
    eventData: v.optional(v.string()), // JSON stringified event data
    subscriptionStatus: v.optional(v.string()), // Status after this event
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeEventId: v.optional(v.string()), // Stripe event ID for deduplication
    errorMessage: v.optional(v.string()), // Error message if event failed
    ipAddress: v.optional(v.string()), // For security audit
    userAgent: v.optional(v.string()), // Browser/device info
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_type", ["eventType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_email_and_timestamp", ["email", "timestamp"])
    .index("by_stripe_event_id", ["stripeEventId"]),

  // ========================================================================
  // App Sync Status Table (tracks sync state for marketing site)
  // ========================================================================
  appSyncStatus: defineTable({
    userId: v.id("users"),
    app: v.union(
      v.literal("safetunes"),
      v.literal("safetube"),
      v.literal("safereads")
    ),
    lastSyncedAt: v.number(), // When we last synced to this app
    syncStatus: v.union(
      v.literal("synced"),
      v.literal("pending"),
      v.literal("failed")
    ),
    lastError: v.optional(v.string()), // Error message if sync failed
    appUserId: v.optional(v.string()), // User ID in the app's database
  })
    .index("by_user", ["userId"])
    .index("by_user_and_app", ["userId", "app"])
    .index("by_sync_status", ["syncStatus"]),
});
