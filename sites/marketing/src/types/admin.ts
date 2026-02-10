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
