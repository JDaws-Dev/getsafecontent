'use client';

// SafeSpark is no longer offered to new families (owner decision 2026-11-25:
// Safe Family is SafeTunes, SafeTube and SafeStudy). Families who already use
// SafeSpark keep full access: signed-in parents go to /parent, kids come in
// through the Safe Family kid door at /play/spark. The old sales page lives in
// git history (before this commit) if it is ever needed again.

import { useAuth as useMarketingAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

const HUB_URL = 'https://getsafefamily.com';

export default function HomePage() {
  const marketing = useMarketingAuth();
  const isLoaded = !marketing.isLoading;
  const isSignedIn = marketing.isAuthenticated;
  const user = marketing.user;
  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0];

  return (
    <main className="flex-1 flex flex-col">
      <nav className="px-4 sm:px-8 py-4 flex items-center justify-between gap-4 border-b border-brand-cream-2 bg-brand-cream">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-accent-500 shadow-md flex items-center justify-center text-brand-navy">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-brand-navy">SafeSpark</span>
        </Link>
        {isLoaded && isSignedIn ? (
          <Link
            href="/parent"
            className="px-5 py-2 rounded-2xl bg-accent-500 text-brand-navy font-bold shadow-md hover:bg-accent-600 transition text-sm"
          >
            Parent dashboard
          </Link>
        ) : (
          <Link href="/login" className="px-4 py-2 text-sm font-bold text-accent-700 hover:text-accent-800">
            Sign in
          </Link>
        )}
      </nav>

      <section className="flex-1 px-4 sm:px-8 py-16 sm:py-24">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-accent-500 shadow-md flex items-center justify-center text-brand-navy">
            <Sparkles className="h-8 w-8" aria-hidden="true" />
          </div>

          {isLoaded && isSignedIn ? (
            <>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-brand-navy">
                Welcome back{firstName ? `, ${firstName}` : ''}
              </h1>
              <p className="text-lg text-brand-ink-soft leading-relaxed">
                Your family&apos;s SafeSpark is right where you left it.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/parent"
                  className="px-7 py-3.5 rounded-2xl bg-accent-500 text-brand-navy font-bold shadow-md hover:bg-accent-600 transition"
                >
                  Open the parent dashboard
                </Link>
                <Link
                  href="/make"
                  className="px-7 py-3.5 rounded-2xl border-2 border-accent-200 bg-white text-brand-navy font-bold hover:bg-accent-50 transition"
                >
                  Open SafeSpark
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-brand-navy">
                SafeSpark isn&apos;t taking new families right now
              </h1>
              <p className="text-lg text-brand-ink-soft leading-relaxed">
                Thank you for your interest. If you&apos;re looking for safe music, videos and study
                help for your kids, take a look at Safe Family.
              </p>
              <div className="flex justify-center">
                <a
                  href={HUB_URL}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-accent-500 text-brand-navy font-bold shadow-md hover:bg-accent-600 transition"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Go to getsafefamily.com
                </a>
              </div>

              <div className="mt-10 rounded-3xl border border-brand-cream-2 bg-white p-6 text-left space-y-4">
                <p className="font-display text-lg font-bold text-brand-navy">Already a SafeSpark family?</p>
                <p className="text-sm text-brand-ink-soft leading-relaxed">
                  Nothing changes for you. Parents sign in as usual, and kids keep getting in with your
                  family code.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/login"
                    className="px-5 py-2.5 rounded-2xl bg-brand-navy text-white font-bold text-sm text-center hover:opacity-90 transition"
                  >
                    Parent sign in
                  </Link>
                  <a
                    href={`${HUB_URL}/play/spark`}
                    className="px-5 py-2.5 rounded-2xl border-2 border-brand-cream-2 text-brand-navy font-bold text-sm text-center hover:bg-brand-cream transition"
                  >
                    Kids: start here
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="px-4 sm:px-8 py-8 border-t border-brand-cream-2 bg-white">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-brand-ink-soft">
          <a href={HUB_URL} className="font-bold hover:text-accent-700">Part of Safe Family</a>
          <nav className="flex flex-wrap items-center gap-5 font-bold">
            <Link href="/privacy" className="hover:text-accent-700">Privacy</Link>
            <Link href="/terms" className="hover:text-accent-700">Terms</Link>
            <a href="mailto:jeremiah@getsafefamily.com" className="hover:text-accent-700">Contact</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
