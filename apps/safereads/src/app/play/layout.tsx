"use client";

import { usePathname } from "next/navigation";
import { KidNav } from "@/components/kid/KidNav";

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

  // Don't show kid nav on the code entry page or profile selection
  const showNav =
    pathname !== "/play" &&
    pathname !== "/play/profiles";

  return (
    <div className="kid-bg-pattern min-h-screen">
      <div className={`mx-auto max-w-2xl px-4 ${showNav ? "pb-28" : ""}`}>
        {children}
      </div>
      {showNav && <KidNav />}
    </div>
  );
}
