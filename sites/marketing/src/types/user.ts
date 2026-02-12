/**
 * Central User Types for Safe Family
 *
 * These types represent the unified authentication and subscription
 * system for all Safe Family apps.
 */

/**
 * App names used throughout the system
 */
export type AppName = "safetunes" | "safetube" | "safereads";

/**
 * Possible subscription statuses
 */
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "lifetime"
  | "canceled"
  | "past_due"
  | "incomplete"
  | "expired";

/**
 * Billing interval options
 */
export type BillingInterval = "monthly" | "yearly";

/**
 * Onboarding completion tracking per app
 */
export interface OnboardingCompleted {
  safetunes?: boolean;
  safetube?: boolean;
  safereads?: boolean;
}

/**
 * Central User - The main user record stored in the marketing site's Convex database.
 * This is the source of truth for user authentication and subscription status.
 */
export interface CentralUser {
  /** Convex document ID */
  id: string;

  /** User's email address (unique) */
  email: string;

  /** User's display name */
  name?: string;

  /** Profile image URL (from OAuth providers) */
  image?: string;

  /** Email verification timestamp */
  emailVerificationTime?: number;

  /** Phone number (optional) */
  phone?: string;

  /** Phone verification timestamp */
  phoneVerificationTime?: number;

  /** Whether this is an anonymous user */
  isAnonymous?: boolean;

  // Subscription fields

  /** Current subscription status */
  subscriptionStatus?: SubscriptionStatus;

  /** Unix timestamp when trial started */
  trialStartedAt?: number;

  /** Unix timestamp when trial expires */
  trialExpiresAt?: number;

  /** Stripe customer ID */
  stripeCustomerId?: string;

  /** Stripe subscription ID */
  stripeSubscriptionId?: string;

  /** Unix timestamp when current billing period ends */
  subscriptionEndsAt?: number;

  /** Billing interval (monthly or yearly) */
  billingInterval?: BillingInterval;

  // Entitlements

  /**
   * Which apps the user has access to.
   * For bundle subscribers, includes all apps.
   * For individual app subscribers, only their purchased apps.
   */
  entitledApps?: AppName[];

  /** Onboarding completion status per app */
  onboardingCompleted?: OnboardingCompleted;

  // Promo/coupon tracking

  /** Coupon code used at signup (e.g., "DAWSFRIEND") */
  couponCode?: string;

  /** Unix timestamp when coupon was redeemed */
  couponRedeemedAt?: number;

  // Account metadata

  /** Unix timestamp when account was created */
  createdAt?: number;

  /** Unix timestamp of last login */
  lastLoginAt?: number;

  /** IANA timezone for notifications */
  timezone?: string;

  // Grandfather clause fields (for migrated users)

  /** Whether this user was migrated from a legacy single-app subscription */
  grandfathered?: boolean;

  /** Their locked-in monthly rate (e.g., 4.99) */
  grandfatheredRate?: number;

  /** Which app they originally subscribed to */
  grandfatheredFrom?: AppName;

  /** Unix timestamp when they were migrated to central accounts */
  migratedAt?: number;
}

/**
 * Minimal user data returned by public queries
 */
export interface PublicUserInfo {
  id: string;
  email: string;
  name?: string;
  subscriptionStatus?: SubscriptionStatus;
  entitledApps?: AppName[];
}

/**
 * User data for app access verification
 */
export interface AppAccessInfo {
  hasAccess: boolean;
  reason: string;
  subscriptionStatus: SubscriptionStatus | null;
  trialExpiresAt?: number;
  subscriptionEndsAt?: number;
  entitledApps: AppName[];
  userName?: string;
  userId?: string;
  onboardingCompleted?: boolean;
}

/**
 * Data required to create a new central user
 */
export interface CreateCentralUserInput {
  email: string;
  name?: string;
  selectedApps: AppName[];
  couponCode?: string;
}

/**
 * Result of creating a new central user
 */
export interface CreateCentralUserResult {
  userId: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  entitledApps: AppName[];
  trialExpiresAt?: number;
}

/**
 * Data required to provision a user to an individual app
 * This is sent from the marketing site to app /provisionUser endpoints
 */
export interface ProvisionUserInput {
  /** User's email address */
  email: string;

  /**
   * Pre-hashed password (Scrypt format from Convex Auth).
   * IMPORTANT: Must use same hashing algorithm as Convex Auth (Scrypt from lucia).
   */
  passwordHash: string;

  /** User's display name */
  name?: string | null;

  /** Subscription status to set in the app */
  subscriptionStatus: SubscriptionStatus;

  /** Whether user has paid for this specific app */
  entitledToThisApp: boolean;

  /** Stripe customer ID */
  stripeCustomerId?: string | null;

  /** Stripe subscription ID */
  subscriptionId?: string | null;
}

/**
 * Result from app /provisionUser endpoint
 */
export interface ProvisionUserResult {
  success: boolean;
  userId?: string;
  provisioned: boolean;
  updated: boolean;
  authAccountCreated: boolean;
  error?: string;
}

/**
 * Coupon code types
 */
export type CouponType = "lifetime" | "trial_extension";

/**
 * Coupon code validation result
 */
export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
  type?: CouponType;
  grantedApps?: AppName[];
}

/**
 * Subscription update input for add/remove apps
 */
export interface UpdateSubscriptionAppsInput {
  subscriptionId: string;
  newApps: AppName[];
  isYearly?: boolean;
}

/**
 * Subscription preview result
 */
export interface SubscriptionPreview {
  currentPlan: {
    apps: AppName[];
    price: number;
    billingCycle: BillingInterval;
  };
  proposedPlan: {
    apps: AppName[];
    price: number;
    billingCycle: BillingInterval;
  };
  proration: {
    unusedCredit: number;
    immediateCharge: number;
    netChange: number;
  };
  effectiveDate: string;
  savings?: number;
}
