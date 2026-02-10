import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Central Accounts Schema for Safe Family
 *
 * This is the unified authentication and subscription system for all Safe Family apps.
 * Users sign up once here, then their subscription status is synced to individual apps.
 *
 * Flow:
 * 1. User signs up on getsafefamily.com (creates account here)
 * 2. Stripe checkout creates subscription
 * 3. Webhook updates account status and entitledApps
 * 4. User accesses individual apps, which verify entitlement via API
 */

export default defineSchema({
  // Spread Convex Auth tables (authAccounts, authRefreshTokens, authSessions, authVerificationCodes, authVerifiers, etc.)
  ...authTables,

  // Central accounts table - single source of truth for all Safe Family users
  users: defineTable({
    // Convex Auth required fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.float64()),
    isAnonymous: v.optional(v.boolean()),

    // Subscription fields
    subscriptionStatus: v.optional(
      v.union(
        v.literal("trial"),
        v.literal("active"),
        v.literal("lifetime"),
        v.literal("canceled"),
        v.literal("past_due"),
        v.literal("incomplete"),
        v.literal("expired")
      )
    ),
    trialStartedAt: v.optional(v.number()), // Unix timestamp when trial started
    trialExpiresAt: v.optional(v.number()), // Unix timestamp when trial expires
    stripeCustomerId: v.optional(v.string()), // Stripe customer ID
    stripeSubscriptionId: v.optional(v.string()), // Stripe subscription ID
    subscriptionEndsAt: v.optional(v.number()), // When current period ends
    billingInterval: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),

    // Entitlements - which apps the user has access to
    // For bundle subscribers, all apps are included
    // For individual app subscribers, only their purchased apps
    entitledApps: v.optional(
      v.array(
        v.union(
          v.literal("safetunes"),
          v.literal("safetube"),
          v.literal("safereads")
        )
      )
    ),

    // Onboarding tracking per app - so we know if they've set up each app
    onboardingCompleted: v.optional(
      v.object({
        safetunes: v.optional(v.boolean()),
        safetube: v.optional(v.boolean()),
        safereads: v.optional(v.boolean()),
      })
    ),

    // Promo code tracking
    couponCode: v.optional(v.string()), // Coupon code used at signup (e.g., "DAWSFRIEND")
    couponRedeemedAt: v.optional(v.number()), // When coupon was redeemed

    // Account metadata
    createdAt: v.optional(v.number()), // When account was created
    lastLoginAt: v.optional(v.number()), // Last login timestamp
    timezone: v.optional(v.string()), // IANA timezone for notifications

    // Grandfather clause fields - for users migrated from individual apps
    // These users keep their original rate and get access to ALL apps
    grandfathered: v.optional(v.boolean()), // true if migrated from legacy single-app subscription
    grandfatheredRate: v.optional(v.number()), // Their locked-in monthly rate (e.g., 4.99)
    grandfatheredFrom: v.optional(
      v.union(
        v.literal("safetunes"),
        v.literal("safetube"),
        v.literal("safereads")
      )
    ), // Which app they originally subscribed to
    migratedAt: v.optional(v.number()), // When they were migrated to central accounts
  })
    .index("email", ["email"]) // Required by Convex Auth
    .index("phone", ["phone"]) // Required by Convex Auth
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"])
    .index("by_subscription_status", ["subscriptionStatus"]),

  // Coupon codes for lifetime access or extended trials
  couponCodes: defineTable({
    code: v.string(), // The coupon code (e.g., "DAWSFRIEND", "DEWITT")
    type: v.union(v.literal("lifetime"), v.literal("trial_extension")),
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
    createdAt: v.number(),
    expiresAt: v.optional(v.number()), // When code expires (null = never)
  }).index("by_code", ["code"]),

  // Subscription events - audit trail for debugging and analytics
  subscriptionEvents: defineTable({
    userId: v.optional(v.id("users")), // User affected (null if user not found yet)
    email: v.string(), // Email for tracking (in case user not yet created)
    eventType: v.string(), // Event types listed below
    /**
     * Event types:
     * - "checkout.started" - User started checkout
     * - "checkout.completed" - Stripe checkout session completed
     * - "subscription.created" - Subscription was created
     * - "subscription.updated" - Subscription was updated (status change, plan change)
     * - "subscription.canceled" - User canceled subscription
     * - "subscription.expired" - Subscription period ended without renewal
     * - "payment.succeeded" - Payment was successful
     * - "payment.failed" - Payment failed
     * - "trial.started" - Trial started
     * - "trial.expired" - Trial expired without conversion
     * - "coupon.applied" - Coupon code was applied
     * - "entitlement.granted" - App access was granted
     * - "entitlement.revoked" - App access was revoked
     * - "webhook.received" - Generic webhook received (for debugging)
     * - "webhook.error" - Webhook processing failed
     * - "api.access_denied" - User tried to access app without entitlement
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

  // App-specific data sync tracking - tracks when each app was last synced
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
    appUserId: v.optional(v.string()), // User ID in the app's database (for reference)
  })
    .index("by_user", ["userId"])
    .index("by_user_and_app", ["userId", "app"])
    .index("by_sync_status", ["syncStatus"]),
});
