"use client";

// SafeReads is no longer offered to new families (owner decision 2026-11-25:
// Safe Family is SafeTunes, SafeTube and SafeStudy). Families who already use
// SafeReads keep full access: a signed-in parent is sent straight to the
// dashboard, and kids come in through the Safe Family kid door at /play/reads.
// The old sales page lives in git history (before this commit).

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Footer } from "@/components/Footer";

const HUB_URL = "https://getsafefamily.com";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  // Show nothing while redirecting signed-in users
  if (isLoading || isAuthenticated) {
    return <div className="min-h-[calc(100vh-4rem)]" />;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <nav className="border-b border-brand-cream-2 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-accent-700" />
            <span className="font-display text-lg font-bold text-brand-navy">SafeReads</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-ink-600 transition-colors hover:text-brand-navy"
          >
            Parent sign in
          </Link>
        </div>
      </nav>

      <main className="flex-1 bg-brand-cream px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-xl space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-600 text-white shadow-md">
            <BookOpen className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">
            SafeReads isn&apos;t taking new families right now
          </h1>
          <p className="text-lg leading-relaxed text-ink-600">
            Thank you for your interest. If you&apos;re looking for safe music, videos and study
            help for your kids, take a look at Safe Family.
          </p>
          <div className="flex justify-center">
            <a
              href={HUB_URL}
              className="inline-flex items-center gap-2 rounded-full bg-accent-600 px-7 py-3.5 font-semibold text-white shadow-md transition-colors hover:bg-accent-700"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Go to getsafefamily.com
            </a>
          </div>

          <div className="mt-10 space-y-4 rounded-3xl border border-brand-cream-2 bg-white p-6 text-left">
            <p className="font-display text-lg font-bold text-brand-navy">Already a SafeReads family?</p>
            <p className="text-sm leading-relaxed text-ink-600">
              Nothing changes for you. Parents sign in as usual, and kids keep getting in with your
              family code.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="rounded-full bg-brand-navy px-5 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Parent sign in
              </Link>
              <a
                href={`${HUB_URL}/play/reads`}
                className="rounded-full border-2 border-brand-cream-2 px-5 py-2.5 text-center text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-cream"
              >
                Kids: start here
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
