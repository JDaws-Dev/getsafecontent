"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useEffect, useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

/**
 * ConvexClientProvider wraps the app with:
 * 1. ConvexProvider - Basic Convex React provider for queries/mutations
 * 2. AuthProvider - Our JWT-based central auth context
 *
 * We use plain ConvexProvider instead of ConvexAuthNextjsProvider to avoid
 * prerendering issues. User authentication is handled by our JWT-based AuthProvider.
 *
 * Note: This means `getAuthUserId` won't work in Convex functions.
 * User identity should be passed explicitly from the JWT auth context.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // Only render children after client-side mount to avoid hydration issues
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR/prerendering, render a minimal placeholder
  if (!mounted) {
    return (
      <ConvexProvider client={convex}>
        <div className="min-h-screen" />
      </ConvexProvider>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ConvexProvider>
  );
}
