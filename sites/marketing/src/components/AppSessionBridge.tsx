"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { hasFreshAppSession, storeAppSession, clearAppSession } from "@/lib/appSession";

/**
 * Keeps the apps' shared sign-in token in step with the hub session.
 * Mounted once in the root layout; renders nothing.
 *
 * - Hub signed in + no fresh app token → mint one (server route, admin-keyed)
 *   and store it. Apps under /tube, /tunes, … pick it up on load.
 * - Hub signed out (after having been signed in this page-life) → clear it,
 *   so "Sign out" on the hub really signs the parent out everywhere.
 */
export function AppSessionBridge() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(api.accounts.getCurrentUser, isAuthenticated ? {} : "skip");
  const minting = useRef(false);
  const wasAuthed = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      if (wasAuthed.current) clearAppSession();
      return;
    }
    wasAuthed.current = true;

    const email = currentUser?.email;
    if (!email || minting.current || hasFreshAppSession()) return;

    minting.current = true;
    (async () => {
      try {
        const res = await fetch("/api/oauth/generate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const result = await res.json();
        if (result?.success && result.token) {
          storeAppSession(result.token, result.expiresAt, result.user);
        }
      } catch (err) {
        console.warn("[AppSessionBridge] could not mint app token", err);
      } finally {
        minting.current = false;
      }
    })();
  }, [isAuthenticated, isLoading, currentUser?.email]);

  return null;
}
