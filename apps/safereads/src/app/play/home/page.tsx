"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { KidBookshelf } from "@/components/kid/KidBookshelf";
import { BookCard } from "@/components/kid/BookCard";
import { GenreBrowser } from "@/components/kid/GenreBrowser";
import { StylizedCover } from "@/components/kid/StylizedCover";
import { BookOpen, Search, Trophy, TrendingUp, Loader2, Library, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Id } from "../../../../convex/_generated/dataModel";

interface KidProfile {
  _id: string;
  name: string;
  age?: number;
  color: string;
}

const GREETING_EMOJIS: Record<string, string> = {
  red: "\uD83D\uDC32",
  blue: "\uD83D\uDE80",
  green: "\uD83E\uDD89",
  purple: "\u2B50",
  orange: "\uD83E\uDD81",
  pink: "\uD83E\uDD84",
  teal: "\uD83D\uDC2C",
  yellow: "\u26A1",
};

const COLOR_GRADIENTS: Record<string, string> = {
  red: "from-red-400 via-rose-500 to-pink-500",
  blue: "from-blue-400 via-indigo-500 to-violet-500",
  green: "from-emerald-400 via-teal-500 to-cyan-500",
  purple: "from-purple-400 via-violet-500 to-indigo-500",
  orange: "from-orange-400 via-amber-500 to-yellow-500",
  pink: "from-pink-400 via-rose-400 to-fuchsia-500",
  teal: "from-teal-400 via-cyan-500 to-blue-500",
  yellow: "from-yellow-400 via-amber-400 to-orange-400",
};

interface FreeBook {
  id: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  source: "gutenberg";
}

export default function KidHomePage() {
  const router = useRouter();
  const [kidProfile, setKidProfile] = useState<KidProfile | null>(null);
  const [freeBooks, setFreeBooks] = useState<FreeBook[]>([]);
  const [freeBooksLoading, setFreeBooksLoading] = useState(false);
  const [freeBooksLoaded, setFreeBooksLoaded] = useState(false);

  const getCuratedFreeBooks = useAction(api.freeBooks.getCuratedFreeBooks);

  useEffect(() => {
    const profileData = localStorage.getItem("safereads_kid_profile");
    if (!profileData) {
      router.replace("/play");
      return;
    }
    try {
      setKidProfile(JSON.parse(profileData));
    } catch {
      router.replace("/play");
    }
  }, [router]);

  // Load curated free books
  useEffect(() => {
    if (!kidProfile || freeBooksLoaded) return;

    let cancelled = false;
    async function loadFreeBooks() {
      setFreeBooksLoading(true);
      try {
        const books = await getCuratedFreeBooks({
          age: kidProfile?.age || undefined,
        });
        if (!cancelled) {
          setFreeBooks(books);
          setFreeBooksLoaded(true);
        }
      } catch (err) {
        console.error("Failed to load free books:", err);
      } finally {
        if (!cancelled) setFreeBooksLoading(false);
      }
    }

    loadFreeBooks();
    return () => { cancelled = true; };
  }, [kidProfile, freeBooksLoaded, getCuratedFreeBooks]);

  const kidId = kidProfile?._id as Id<"kids"> | undefined;

  // Fetch kid's data
  const approvedBooks = useQuery(
    api.approvedBooks.listForKid,
    kidId ? { kidId } : "skip"
  );
  const readingProgress = useQuery(
    api.readingProgress.getForKid,
    kidId ? { kidId } : "skip"
  );
  const currentlyReading = useQuery(
    api.readingProgress.getCurrentlyReading,
    kidId ? { kidId } : "skip"
  );
  const stats = useQuery(
    api.readingProgress.getStats,
    kidId ? { kidId } : "skip"
  );
  const pendingRequests = useQuery(
    api.bookRequests.listByKid,
    kidId ? { kidId } : "skip"
  );
  const preApprovedBooks = useQuery(
    api.preApprovedBooks.getPreApprovedBooks,
    kidId ? { age: kidProfile?.age, kidId } : "skip"
  );

  // Build book identifiers for cover cache lookups
  const classicIdentifiers = useMemo(
    () => (preApprovedBooks || []).map((b) => b.gutenbergId),
    [preApprovedBooks]
  );
  const freeBookIdentifiers = useMemo(
    () => freeBooks.map((b) => b.id),
    [freeBooks]
  );
  const allIdentifiers = useMemo(
    () => [...classicIdentifiers, ...freeBookIdentifiers],
    [classicIdentifiers, freeBookIdentifiers]
  );

  // Batch lookup cached covers
  const cachedCovers = useQuery(
    api.bookCovers.getCachedCovers,
    allIdentifiers.length > 0 ? { bookIdentifiers: allIdentifiers } : "skip"
  );

  if (!kidProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />
      </div>
    );
  }

  const gradientClass = COLOR_GRADIENTS[kidProfile.color] || COLOR_GRADIENTS.purple;
  const greetingEmoji = GREETING_EMOJIS[kidProfile.color] || "\u2B50";
  const pendingCount = pendingRequests?.filter((r) => r.status === "pending").length || 0;

  // Match currently reading books with their approved book data
  const currentlyReadingBooks = (currentlyReading || [])
    .map((progress) => {
      const book = (approvedBooks || []).find(
        (b) => b.googleBookId === progress.googleBookId
      );
      return book ? { ...book, progress: progress.percentComplete } : null;
    })
    .filter(Boolean) as Array<{
      _id: string;
      googleBookId: string;
      title: string;
      author: string;
      coverUrl?: string;
      progress: number;
    }>;

  return (
    <div className="py-6">
      {/* Welcome Header - Hero */}
      <div className={`animate-fade-up overflow-hidden rounded-3xl bg-gradient-to-r ${gradientClass} p-4 text-white shadow-xl sm:p-6`}
           style={{ animationDelay: "0s" }}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur-sm sm:h-16 sm:w-16 sm:text-3xl">
            {greetingEmoji}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold sm:text-2xl">
              Hi, {kidProfile.name}!
            </h1>
            <p className="mt-1 text-sm font-medium text-white/80 sm:text-base">
              Ready for a reading adventure?
            </p>
          </div>
        </div>

        {/* Quick Stats inline */}
        {stats && (stats.totalBooks > 0 || stats.finishedBooks > 0) && (
          <div className="mt-5 flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 backdrop-blur-sm sm:px-3">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-xs font-bold sm:text-sm">{stats.currentlyReading}</span>
              <span className="text-[10px] text-white/70 sm:text-xs">reading</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 backdrop-blur-sm sm:px-3">
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-xs font-bold sm:text-sm">{stats.finishedBooks}</span>
              <span className="text-[10px] text-white/70 sm:text-xs">finished</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 backdrop-blur-sm sm:px-3">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-xs font-bold sm:text-sm">{stats.totalPages}</span>
              <span className="text-[10px] text-white/70 sm:text-xs">pages</span>
            </div>
          </div>
        )}
      </div>

      {/* Currently Reading - prominent card */}
      {currentlyReadingBooks.length > 0 && (
        <section className="animate-fade-up mt-6" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <h2 className="text-lg font-bold text-gray-800">
              Continue Reading
            </h2>
          </div>
          <div className="mt-3 space-y-3">
            {currentlyReadingBooks.map((book) => (
              <button
                key={book._id}
                onClick={() => router.push(`/play/read/${encodeURIComponent(book.googleBookId)}`)}
                className="kid-touch flex w-full items-center gap-4 rounded-2xl bg-white p-3.5 shadow-md ring-1 ring-black/5 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              >
                <div className="book-tilt relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm">
                  {book.coverUrl ? (
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <StylizedCover title={book.title} author={book.author} size="sm" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="line-clamp-1 text-sm font-bold text-gray-900">{book.title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{book.author}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-purple-100">
                      <div
                        className="progress-gradient h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(book.progress, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-purple-600">
                      {Math.round(book.progress)}%
                    </span>
                  </div>
                </div>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-purple-600 shadow-md">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Genre Browse */}
      <section className="animate-fade-up mt-7" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{"\uD83C\uDF1F"}</span>
          <h2 className="text-lg font-bold text-gray-800">
            Browse by Genre
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          Tap a category to discover free books
        </p>
        <div className="mt-3">
          <GenreBrowser layout="grid" />
        </div>
      </section>

      {/* Library Classics (Pre-Approved) */}
      {preApprovedBooks && preApprovedBooks.length > 0 && (
        <section className="animate-fade-up mt-7" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-800">
              Library Classics
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            Timeless stories ready to read now
          </p>
          <div className="mt-3 flex gap-3 overflow-x-auto overscroll-contain pb-2 scrollbar-none">
            {preApprovedBooks.slice(0, 12).map((book) => {
              const cachedUrl = cachedCovers?.[book.gutenbergId]?.coverUrl;
              const displayUrl = cachedUrl || book.coverUrl;
              return (
              <button
                key={book.gutenbergId}
                onClick={() => router.push(`/play/read/${encodeURIComponent(book.googleBookId)}`)}
                className="group flex flex-shrink-0 flex-col items-start text-left"
              >
                <div className="book-tilt relative h-40 w-28 overflow-hidden rounded-xl bg-gray-100 shadow-md ring-1 ring-black/5 transition-all group-active:scale-[0.97]">
                  {displayUrl ? (
                    <Image
                      src={displayUrl}
                      alt={book.title}
                      fill
                      sizes="112px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <StylizedCover
                      title={book.title}
                      author={book.author}
                      size="md"
                    />
                  )}
                  {/* Classic badge overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-700/90 to-transparent px-2 pb-1.5 pt-4 text-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white">Classic</span>
                  </div>
                </div>
                <p
                  className="mt-2 line-clamp-2 text-[11px] font-semibold leading-tight text-gray-800 group-hover:text-amber-700"
                  style={{ maxWidth: "112px" }}
                >
                  {book.title}
                </p>
                <p
                  className="mt-0.5 line-clamp-1 text-[9px] text-gray-400"
                  style={{ maxWidth: "112px" }}
                >
                  {book.author}
                </p>
              </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Recommended for You — shows when bookshelf is empty */}
      {approvedBooks !== undefined && approvedBooks.length === 0 && preApprovedBooks && preApprovedBooks.length > 0 && (
        <section className="animate-fade-up mt-7" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <h2 className="text-lg font-bold text-gray-800">
              Recommended for You
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {kidProfile.age && kidProfile.age <= 6
              ? "Great first books to start your reading journey!"
              : kidProfile.age && kidProfile.age <= 9
                ? "Adventures and stories picked just for you!"
                : "Classics you might enjoy — tap to start reading!"}
          </p>
          <div className="mt-3 flex gap-3 overflow-x-auto overscroll-contain pb-2 scrollbar-none">
            {preApprovedBooks.slice(0, 5).map((book) => {
              const cachedUrl = cachedCovers?.[book.gutenbergId]?.coverUrl;
              const displayUrl = cachedUrl || book.coverUrl;
              return (
                <button
                  key={book.gutenbergId}
                  onClick={() => router.push(`/play/read/${encodeURIComponent(book.googleBookId)}`)}
                  className="group flex flex-shrink-0 flex-col items-start text-left"
                >
                  <div className="book-tilt relative h-44 w-32 overflow-hidden rounded-xl bg-gray-100 shadow-lg ring-1 ring-black/5 transition-all group-active:scale-[0.97]">
                    {displayUrl ? (
                      <Image
                        src={displayUrl}
                        alt={book.title}
                        fill
                        sizes="128px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <StylizedCover
                        title={book.title}
                        author={book.author}
                        size="lg"
                      />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-violet-700/90 to-transparent px-2 pb-2 pt-5 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white">Start Reading</span>
                    </div>
                  </div>
                  <p
                    className="mt-2 line-clamp-2 text-xs font-semibold leading-tight text-gray-800 group-hover:text-purple-700"
                    style={{ maxWidth: "128px" }}
                  >
                    {book.title}
                  </p>
                  <p
                    className="mt-0.5 line-clamp-1 text-[10px] text-gray-400"
                    style={{ maxWidth: "128px" }}
                  >
                    {book.author}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Pending Requests */}
      {pendingCount > 0 && (
        <div className="animate-fade-up mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm ring-1 ring-amber-200" style={{ animationDelay: "0.25s" }}>
          <span className="text-2xl">{"\uD83D\uDE4F"}</span>
          <div>
            <p className="text-sm font-bold text-amber-800">
              {pendingCount} book{pendingCount > 1 ? "s" : ""} waiting for approval
            </p>
            <p className="mt-0.5 text-xs text-amber-600">
              Your parent will review your requests soon!
            </p>
          </div>
        </div>
      )}

      {/* Free Books to Explore */}
      <section className="animate-fade-up mt-7" style={{ animationDelay: "0.3s" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{"\uD83D\uDCDA"}</span>
            <h2 className="text-lg font-bold text-gray-800">
              Free Books
            </h2>
          </div>
          <Link
            href="/play/search?tab=free"
            className="kid-touch flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-600 transition-colors hover:bg-purple-100"
          >
            See All
          </Link>
        </div>
        <div className="mt-3">
          {freeBooksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : freeBooks.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto overscroll-contain pb-2 scrollbar-none">
              {freeBooks.map((book) => {
                const cachedUrl = cachedCovers?.[book.id]?.coverUrl;
                const displayUrl = cachedUrl || book.coverUrl;
                return (
                <button
                  key={book.id}
                  onClick={() => router.push("/play/search?tab=free")}
                  className="group flex flex-shrink-0 flex-col items-start text-left"
                >
                  <div className="book-tilt relative h-40 w-28 overflow-hidden rounded-xl bg-gray-100 shadow-md ring-1 ring-black/5 transition-all group-active:scale-[0.97]">
                    {displayUrl ? (
                      <Image
                        src={displayUrl}
                        alt={book.title}
                        fill
                        sizes="112px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <StylizedCover
                        title={book.title}
                        author={book.authors.join(", ") || "Unknown"}
                        size="md"
                      />
                    )}
                    {/* Free badge overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600/90 to-transparent px-2 pb-1.5 pt-4 text-center">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white">Free</span>
                    </div>
                  </div>
                  <p
                    className="mt-2 line-clamp-2 text-[11px] font-semibold leading-tight text-gray-800 group-hover:text-purple-700"
                    style={{ maxWidth: "112px" }}
                  >
                    {book.title}
                  </p>
                  <p
                    className="mt-0.5 line-clamp-1 text-[9px] text-gray-400"
                    style={{ maxWidth: "112px" }}
                  >
                    {book.authors.join(", ")}
                  </p>
                </button>
                );
              })}
            </div>
          ) : freeBooksLoaded ? (
            <div className="flex flex-col items-center rounded-2xl bg-white px-4 py-8 text-center shadow-sm">
              <span className="text-3xl">{"\uD83D\uDCDA"}</span>
              <p className="mt-2 text-sm font-medium text-gray-500">
                Free books will appear here soon!
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* My Bookshelf */}
      <section className="animate-fade-up mt-7" style={{ animationDelay: "0.35s" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{"\uD83D\uDCDA"}</span>
            <h2 className="text-lg font-bold text-gray-800">My Bookshelf</h2>
          </div>
          <Link
            href="/play/search"
            className="kid-touch flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-600 transition-colors hover:bg-purple-100"
          >
            <Search className="h-3.5 w-3.5" />
            Find Books
          </Link>
        </div>
        <div className="mt-3">
          {approvedBooks === undefined ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 w-full animate-pulse rounded-xl bg-purple-100/50"
                />
              ))}
            </div>
          ) : (
            <KidBookshelf
              books={approvedBooks}
              progress={readingProgress || []}
              onBookClick={(book) =>
                router.push(`/play/read/${encodeURIComponent(book.googleBookId)}`)
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
