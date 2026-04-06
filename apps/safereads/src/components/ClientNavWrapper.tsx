"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";

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

// Public pages that should show a footer (not auth flows or app pages)
const footerPages = ["/privacy", "/terms", "/contact", "/about"];

export function ClientNavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide parent nav on kid-facing /read pages and landing page (has its own nav)
  const isPlayPage = pathname?.startsWith("/read");
  const isLandingPage = pathname === "/";

  if (isPlayPage || isLandingPage) {
    return <main>{children}</main>;
  }

  const showFooter = footerPages.some((p) => pathname?.startsWith(p));

  return (
    <>
      <Navbar />
      <main className="pb-20 sm:pb-0">{children}</main>
      {showFooter && <Footer />}
      <BottomNav />
    </>
  );
}
