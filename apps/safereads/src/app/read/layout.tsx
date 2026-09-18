"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { PauseCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
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
 * Universal family setting from the hub: when the parent pauses this kid,
 * every kid page (library, reader, search, Bible...) shows a pause notice
 * instead. The selected kid comes from the saved session; the flag is a live
 * Convex query so un-pausing takes effect without a reload.
 */
function KidPauseGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [kidId, setKidId] = useState<Id<"kids"> | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("safereads_kid_profile");
      const parsed = raw ? (JSON.parse(raw) as { _id?: string }) : null;
      setKidId(parsed?._id ? (parsed._id as Id<"kids">) : null);
    } catch {
      setKidId(null);
    }
  }, []);
  const access = useQuery(api.kids.kidAccess, kidId ? { kidId } : "skip");

  if (!access?.accessPaused) return <>{children}</>;

  const switchReader = () => {
    localStorage.removeItem("safereads_kid_profile");
    router.push("/read");
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-50">
        <PauseCircle className="h-9 w-9 text-accent-600" aria-hidden="true" />
      </div>
      <p className="mt-5 text-xl font-bold text-brand-navy">
        Reading is paused right now.
      </p>
      <p className="mt-2 max-w-xs text-sm text-gray-500">Ask your parent.</p>
      <button
        onClick={switchReader}
        className="kid-touch mt-6 rounded-full bg-white px-6 py-3 text-sm font-bold text-accent-700 shadow-md transition-all hover:shadow-lg active:scale-95"
      >
        Switch reader
      </button>
    </div>
  );
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
  // /read is both the family-code screen and the profile picker.
  const showNav =
    pathname !== "/read" &&
    !isFullScreenRoute &&
    !isOnboardingRoute;

  // The login / profile picker is never gated — a paused kid must still be
  // able to switch to a sibling who isn't.
  const isEntryRoute = pathname === "/read";
  const gated = isEntryRoute ? children : <KidPauseGate>{children}</KidPauseGate>;

  // Reader and listen routes get a clean full-screen wrapper (no padding, no bg pattern)
  if (isFullScreenRoute) {
    return <HubPlayGuard>{gated}</HubPlayGuard>;
  }

  return (
    <HubPlayGuard>
    <div className="kid-bg-pattern min-h-screen overflow-x-hidden">
      <div className={`${showNav ? "lg:pl-[200px]" : ""}`}>
        <div className={`mx-auto max-w-2xl px-4 lg:max-w-4xl ${showNav ? "pb-40 lg:pb-8" : ""}`}>
          {gated}
        </div>
      </div>
      {showNav && <KidNav />}
    </div>
    </HubPlayGuard>
  );
}
