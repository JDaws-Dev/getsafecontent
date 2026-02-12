import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  // Extended users table (overrides authTables.users with custom fields)
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
        v.literal("incomplete")
      )
    ),
    subscriptionCurrentPeriodEnd: v.optional(v.number()),
    trialExpiresAt: v.optional(v.number()), // Unix timestamp when trial expires
    analysisCount: v.optional(v.number()),
    // Coupon system
    redeemedCoupon: v.optional(v.string()), // Coupon code that was redeemed
    // Central accounts sync
    centralAccessCacheExpiry: v.optional(v.number()), // When central access cache expires (for 5-min caching)
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_stripe_customer_id", ["stripeCustomerId"]),

  couponCodes: defineTable({
    code: v.string(), // The coupon code (e.g., "DAWSFRIEND")
    type: v.union(v.literal("lifetime"), v.literal("trial")),
    usageLimit: v.optional(v.number()), // null = unlimited
    usageCount: v.number(),
    active: v.boolean(),
    description: v.optional(v.string()),
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
});
