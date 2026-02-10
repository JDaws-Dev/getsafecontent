"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";

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
    if (convexUser && !convexUser.onboardingComplete) {
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

  // Redirect to onboarding if not complete
  if (convexUser && !convexUser.onboardingComplete) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {children}
    </div>
  );
}
