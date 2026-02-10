"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import {
  Search,
  ScanBarcode,
  Camera,
  BookOpen,
  Users,
  Shield,
  ChevronRight,
  MessageCircle,
  X,
} from "lucide-react";
import { SubscriptionSuccessModal } from "@/components/SubscriptionSuccessModal";

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  safe: { bg: "bg-verdict-safe", text: "text-white", label: "Safe" },
  caution: { bg: "bg-verdict-caution", text: "text-white", label: "Caution" },
  warning: { bg: "bg-verdict-warning", text: "text-white", label: "Warning" },
  no_verdict: { bg: "bg-parchment-300", text: "text-ink-600", label: "No Verdict" },
};

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Derive subscription banner from URL params (React pattern: derive state during render)
  const subscriptionParam = searchParams.get("subscription");
  const subscriptionBanner =
    !bannerDismissed && (subscriptionParam === "success" || subscriptionParam === "canceled")
      ? subscriptionParam
      : null;

  const convexUser = useQuery(api.users.currentUser);
  const userId = useQuery(api.users.currentUserId);

  const kids = useQuery(
    api.kids.listByUser,
    userId ? { userId } : "skip"
  );

  const recentAnalyses = useQuery(api.analyses.listRecent, { count: 5 });

  // Extract first name from user name
  const firstName = convexUser?.name?.split(" ")[0];

  // Clear URL parameter after reading (side effect only, no state sync)
  useEffect(() => {
    if (subscriptionParam === "success" || subscriptionParam === "canceled") {
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [subscriptionParam]);

  return (
    <div>
      {/* Subscription success modal */}
      {subscriptionBanner === "success" && (
        <SubscriptionSuccessModal onClose={() => setBannerDismissed(true)} />
      )}

      {/* Canceled checkout message */}
      {subscriptionBanner === "canceled" && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg bg-parchment-50 border border-parchment-200 px-4 py-3">
          <p className="text-sm text-ink-600">
            Checkout was canceled. You can upgrade anytime from Settings.
          </p>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-ink-400 hover:text-ink-600"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <h1 className="font-serif text-2xl font-bold text-ink-900 sm:text-3xl">
        Welcome{firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="mt-2 text-sm text-ink-500 sm:text-base">
        What would you like to do today?
      </p>

      {/* Ask Advisor — prominent CTA */}
      <Link
        href="/dashboard/chat"
        className="mt-6 flex items-center gap-4 rounded-xl border border-parchment-200 bg-gradient-to-r from-parchment-100 to-white p-4 transition-colors hover:border-parchment-300 hover:shadow-sm"
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-parchment-700 text-parchment-50">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base font-bold text-ink-900">
            Ask the SafeReads Advisor
          </p>
          <p className="mt-0.5 text-sm text-ink-500">
            &ldquo;What should my 8-year-old read?&rdquo; &middot; &ldquo;Is this book ok for my kid?&rdquo; &middot; &ldquo;Find safer alternatives&rdquo;
          </p>
        </div>
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-ink-300" />
      </Link>

      {/* Quick Actions */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <QuickAction
          href="/dashboard/search"
          icon={<Search className="h-5 w-5" />}
          title="Search Books"
          description="Search by title, author, or ISBN"
        />
        <QuickAction
          href="/dashboard/search"
          icon={<ScanBarcode className="h-5 w-5" />}
          title="Scan Barcode"
          description="Use your camera to scan an ISBN"
        />
        <QuickAction
          href="/dashboard/search"
          icon={<Camera className="h-5 w-5" />}
          title="Snap Cover"
          description="Photograph a book cover to identify it"
        />
      </div>

      {/* Recent Analyses */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-bold text-ink-900">
            <span className="sm:hidden">Recent Reviews</span>
            <span className="hidden sm:inline">Recently Reviewed on SafeReads</span>
          </h2>
          {recentAnalyses && recentAnalyses.length > 0 && (
            <Link
              href="/dashboard/search"
              className="hidden flex-shrink-0 text-sm font-medium text-parchment-700 hover:text-parchment-800 sm:inline"
            >
              Search more
            </Link>
          )}
        </div>

        {recentAnalyses === undefined ? (
          <div className="mt-4 flex gap-3 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-40 w-28 flex-shrink-0 animate-pulse rounded-lg bg-parchment-100"
              />
            ))}
          </div>
        ) : recentAnalyses.length === 0 ? (
          <div className="mt-4 rounded-lg border border-parchment-200 bg-white p-8 text-center">
            <Shield className="mx-auto h-10 w-10 text-parchment-300" />
            <p className="mt-3 text-sm text-ink-500">
              No reviews yet. Search for a book to get your first content
              review.
            </p>
            <Link
              href="/dashboard/search"
              className="mt-4 inline-block rounded-lg bg-parchment-700 px-4 py-2 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800"
            >
              Search Books
            </Link>
          </div>
        ) : (
          <div className="mt-4 -mx-4 px-4 flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-none">
            {recentAnalyses.map((analysis: AnalysisWithBook) => {
              const style = VERDICT_STYLES[analysis.verdict] ?? VERDICT_STYLES.no_verdict;
              return (
                <Link
                  key={analysis._id}
                  href={`/dashboard/book/${analysis.bookId}`}
                  className="group relative flex-shrink-0 snap-start"
                >
                  <div className="relative h-40 w-28 overflow-hidden rounded-lg bg-parchment-100 shadow-sm transition-shadow group-hover:shadow-md">
                    {analysis.book?.coverUrl ? (
                      <Image
                        src={analysis.book.coverUrl}
                        alt={analysis.book.title}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1 p-2">
                        <BookOpen className="h-6 w-6 text-parchment-300" />
                        <p className="text-center text-[10px] leading-tight text-ink-400">
                          {analysis.book?.title ?? "Unknown"}
                        </p>
                      </div>
                    )}
                    {/* Verdict badge overlay */}
                    <span
                      className={`absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold shadow ${style.bg} ${style.text}`}
                    >
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-1.5 w-28 truncate text-xs font-medium text-ink-800 group-hover:text-parchment-700">
                    {analysis.book?.title ?? "Unknown"}
                  </p>
                  <p className="w-28 truncate text-[10px] text-ink-400">
                    {analysis.book?.authors?.join(", ") ?? ""}
                  </p>
                </Link>
              );
            })}
            {/* Search more tile — mobile only (text link shown on sm+) */}
            <Link
              href="/dashboard/search"
              className="group flex-shrink-0 snap-start sm:hidden"
            >
              <div className="flex h-40 w-28 flex-col items-center justify-center gap-2 rounded-lg border border-parchment-200 bg-white transition-colors group-hover:border-parchment-300 group-hover:shadow-sm">
                <Search className="h-6 w-6 text-parchment-400 group-hover:text-parchment-600" />
                <p className="text-xs font-medium text-parchment-700 group-hover:text-parchment-800">
                  Search more
                </p>
              </div>
            </Link>
          </div>
        )}
      </section>

      {/* Kids Overview */}
      {kids !== undefined && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-ink-900">
              Your Kids
            </h2>
            <Link
              href="/dashboard/kids"
              className="text-sm font-medium text-parchment-700 hover:text-parchment-800"
            >
              Manage
            </Link>
          </div>

          {kids.length === 0 ? (
            <div className="mt-4 rounded-lg border border-parchment-200 bg-white p-6 text-center">
              <Users className="mx-auto h-10 w-10 text-parchment-300" />
              <p className="mt-3 text-sm text-ink-500">
                Add your kids to build wishlists and track reviews for each
                child.
              </p>
              <Link
                href="/dashboard/kids"
                className="mt-4 inline-block rounded-lg border border-parchment-300 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-parchment-50"
              >
                Add Kids
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {kids.map((kid: Kid) => (
                <Link
                  key={kid._id}
                  href={`/dashboard/kids/${kid._id}/wishlist`}
                  className="group flex items-center gap-3 rounded-lg border border-parchment-200 bg-white p-4 transition-colors hover:border-parchment-300 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-parchment-100 text-sm font-bold text-parchment-700">
                    {kid.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 group-hover:text-parchment-700">
                      {kid.name}
                    </p>
                    {kid.age !== undefined && (
                      <p className="text-xs text-ink-400">
                        Age {kid.age}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-300" />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border border-parchment-200 bg-white p-4 transition-colors hover:border-parchment-300 hover:shadow-sm"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-parchment-100 text-parchment-700 transition-colors group-hover:bg-parchment-200">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-ink-900 group-hover:text-parchment-700">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-ink-400">{description}</p>
      </div>
    </Link>
  );
}

// Types for Convex data (AnyApi returns `any`)
interface AnalysisWithBook {
  _id: string;
  bookId: string;
  verdict: string;
  summary: string;
  book: {
    title: string;
    authors: string[];
    coverUrl?: string;
  } | null;
}

interface Kid {
  _id: string;
  name: string;
  age?: number;
}
