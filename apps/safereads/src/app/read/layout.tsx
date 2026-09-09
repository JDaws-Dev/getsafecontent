"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { KidNav } from "@/components/kid/KidNav";
import { redirectKidToHubPlay } from "@/lib/embed";

/**
 * A kid deep link under the hub (any /read/* opened directly, not inside the
 * hub's /play iframe) goes to the one kid front door, /play/reads, carrying the
 * family code from the URL or the saved session. Inside the frame this is a
 * no-op. Children are held back until the check runs so a redirecting page
 * never flashes.
 */
function HubPlayGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    let fc: string | null = null;
    try {
      fc =
        new URLSearchParams(window.location.search).get("fc") ||
        localStorage.getItem("safereads_family_code");
    } catch {
      fc = null;
    }
    if (!redirectKidToHubPlay(fc)) setChecked(true);
  }, []);
  if (!checked) return null;
  return <>{children}</>;
}

/**
 * Layout for kid-facing pages (/play/*).
 * Hides parent nav (which is handled by ClientNavWrapper checking pathname).
 * Shows the kid bottom nav on authenticated kid pages.
 */
export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't show kid nav on the code entry page, profile selection, reader, or Bible reading view
  const isReaderRoute = pathname?.startsWith("/read/book/");
  const isListenRoute = pathname?.startsWith("/read/listen/");
  const isBibleRoute = pathname?.startsWith("/read/bible");
  const isFullScreenRoute = isReaderRoute || isListenRoute;
  const isOnboardingRoute = pathname === "/read/onboarding";
  const showNav =
    pathname !== "/read" &&
    pathname !== "/read/profiles" &&
    !isFullScreenRoute &&
    !isOnboardingRoute;

  // Reader and listen routes get a clean full-screen wrapper (no padding, no bg pattern)
  if (isFullScreenRoute) {
    return <HubPlayGuard>{children}</HubPlayGuard>;
  }

  return (
    <HubPlayGuard>
    <div className="kid-bg-pattern min-h-screen overflow-x-hidden">
      <div className={`${showNav ? "lg:pl-[200px]" : ""}`}>
        <div className={`mx-auto max-w-2xl px-4 lg:max-w-4xl ${showNav ? "pb-40 lg:pb-8" : ""}`}>
          {children}
        </div>
      </div>
      {showNav && <KidNav />}
    </div>
    </HubPlayGuard>
  );
}
