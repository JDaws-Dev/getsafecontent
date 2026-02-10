export interface SafeTunesUser {
  email: string;
  name: string | null;
  subscriptionStatus: string;
  createdAt: number | null;
  kidProfileCount: number;
  approvedSongCount: number;
  approvedAlbumCount: number;
  stripeCustomerId: string | null;
  subscriptionEndsAt: number | null;
  couponCode: string | null;
  lastActivity: {
    playedAt: number;
    itemName: string;
    kidName: string;
  } | null;
}

export interface SafeTubeUser {
  email: string;
  name: string | null;
  subscriptionStatus: string;
  createdAt: number | null;
  kidCount: number;
  channelCount: number;
  videoCount: number;
  familyCode: string | null;
  trialEndsAt: number | null;
  stripeCustomerId?: string | null;
}

export interface SafeReadsUser {
  email: string;
  name: string | null;
  subscriptionStatus: string;
  createdAt: number;
  analysisCount: number;
  kidCount: number;
  stripeCustomerId: string | null;
  subscriptionEndsAt: number | null;
  trialExpiresAt: number | null;
  couponCode: string | null;
  onboardingComplete: boolean;
}

// Legacy per-app user (kept for backward compat)
export interface UnifiedUser {
  email: string;
  name: string | null;
  app: "safetunes" | "safetube" | "safereads";
  subscriptionStatus: string;
  createdAt: number | null;
  stripeCustomerId: string | null;
  // App-specific data
  kidCount?: number;
  albumCount?: number;
  songCount?: number;
  channelCount?: number;
  videoCount?: number;
  analysisCount?: number;
  couponCode?: string | null;
}

// Per-app access info for grouped users
export interface AppAccess {
  app: "safetunes" | "safetube" | "safereads";
  subscriptionStatus: string;
  createdAt: number | null;
  stripeCustomerId: string | null;
  trialExpiresAt?: number | null;
  subscriptionEndsAt?: number | null;
  // App-specific stats
  kidCount?: number;
  albumCount?: number;
  songCount?: number;
  channelCount?: number;
  videoCount?: number;
  analysisCount?: number;
  couponCode?: string | null;
}

// Grouped user - one row per email with all their apps
export interface GroupedUser {
  email: string;
  name: string | null;
  apps: AppAccess[];
  // Derived fields
  subscriptionType: "3-app-bundle" | "2-app-bundle" | "single-app";
  planTier: "lifetime" | "yearly" | "monthly" | "trial" | "expired";
  earliestCreatedAt: number | null;
  latestTrialExpiry: number | null;
  hasExpiredTrial: boolean;
  totalKids: number;
  isActive: boolean; // has any non-expired subscription
}

export interface AppStats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  lifetimeUsers: number;
  monthlyRevenue: number;
}

export interface DashboardStats {
  safetunes: AppStats;
  safetube: AppStats;
  safereads: AppStats;
  combined: AppStats;
}

// Detailed revenue breakdown by plan type
export interface RevenueBreakdown {
  // Bundle subscribers (3-app)
  bundleMonthly: { count: number; mrr: number };
  bundleYearly: { count: number; mrr: number }; // mrr = yearly/12
  // 2-app bundle subscribers
  twoAppBundle: { count: number; mrr: number };
  // Single app subscribers
  singleApp: {
    safetunes: { count: number; mrr: number };
    safetube: { count: number; mrr: number };
    safereads: { count: number; mrr: number };
  };
  // Non-revenue users
  lifetime: number;
  trial: number;
  expired: number;
}

export interface RevenueStats {
  mrr: number;           // Monthly Recurring Revenue
  arr: number;           // Annual Recurring Revenue (MRR * 12)
  breakdown: RevenueBreakdown;
  // Summary metrics
  totalPaying: number;
  totalFree: number;     // trial + expired + lifetime
  trialConversionRate: number; // % of expired trials that converted
}
