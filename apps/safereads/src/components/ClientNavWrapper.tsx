"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// Dynamically import nav components that use auth (no SSR to avoid prerender errors)
const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => (
    <nav className="border-b border-parchment-200 bg-parchment-50">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="h-8 w-8 animate-pulse rounded-xl bg-parchment-200" />
        <div className="h-8 w-24 animate-pulse rounded bg-parchment-200" />
      </div>
    </nav>
  ),
});

const BottomNav = dynamic(() => import("@/components/BottomNav").then((mod) => mod.BottomNav), {
  ssr: false,
});

export function ClientNavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide parent nav on kid-facing /play pages
  const isPlayPage = pathname?.startsWith("/read");
  const isLandingPage = pathname === "/";

  if (isPlayPage || isLandingPage) {
    return <main>{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="pb-20 sm:pb-0">{children}</main>
      <BottomNav />
    </>
  );
}
