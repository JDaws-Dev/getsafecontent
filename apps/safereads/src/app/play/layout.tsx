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

  // Don't show kid nav on the code entry page, profile selection, or reader
  const isReaderRoute = pathname?.startsWith("/play/read/");
  const showNav =
    pathname !== "/play" &&
    pathname !== "/play/profiles" &&
    !isReaderRoute;

  // Reader route gets a clean full-screen wrapper (no padding, no bg pattern)
  if (isReaderRoute) {
    return <>{children}</>;
  }

  return (
    <div className="kid-bg-pattern min-h-screen overflow-x-hidden">
      <div className={`mx-auto max-w-2xl px-4 lg:max-w-4xl ${showNav ? "pb-40" : ""}`}>
        {children}
      </div>
      {showNav && <KidNav />}
    </div>
  );
}
