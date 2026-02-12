"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { InactiveUserPrompt } from "@/components/InactiveUserPrompt";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  const convexUser = useQuery(
    api.users.currentUser,
    isAuthenticated ? {} : "skip"
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
      return;
    }
    // Only redirect to onboarding if user has valid subscription status
    const validActiveStatuses = ["active", "trial", "lifetime"];
    if (convexUser && !convexUser.onboardingComplete && validActiveStatuses.includes(convexUser.subscriptionStatus || "")) {
      router.replace("/onboarding");
    }
  }, [isLoading, isAuthenticated, convexUser, router]);

  // Show loading state while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-parchment-300 border-t-parchment-700" />
        </div>
      </div>
    );
  }

  // Show loading state while fetching user
  if (convexUser === undefined) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-parchment-300 border-t-parchment-700" />
        </div>
      </div>
    );
  }

  // Show InactiveUserPrompt for users with 'inactive' status
  // (have Safe Family credentials but not entitled to SafeReads)
  if (convexUser?.subscriptionStatus === "inactive") {
    return <InactiveUserPrompt user={convexUser} />;
  }

  // Also show for unknown/invalid status (safety net)
  // Note: SafeReads schema uses "canceled" (US spelling)
  const validStatuses: string[] = ["active", "trial", "lifetime"];
  const expiredStatuses: string[] = ["canceled", "past_due", "incomplete"];
  if (convexUser && convexUser.subscriptionStatus && !validStatuses.includes(convexUser.subscriptionStatus)) {
    // Don't show InactiveUserPrompt for expired/past_due - those should see the regular upgrade prompt
    if (!expiredStatuses.includes(convexUser.subscriptionStatus)) {
      return <InactiveUserPrompt user={convexUser} />;
    }
  }

  // Redirect to onboarding if not complete (for valid subscription users)
  if (convexUser && !convexUser.onboardingComplete) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {children}
    </div>
  );
}
