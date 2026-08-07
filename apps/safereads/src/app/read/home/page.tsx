"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { KidBookshelf } from "@/components/kid/KidBookshelf";
import { BookCard } from "@/components/kid/BookCard";
import { GenreBrowser } from "@/components/kid/GenreBrowser";
import { StylizedCover } from "@/components/kid/StylizedCover";
import { ReadingStreaks } from "@/components/kid/ReadingStreaks";
import { BookOpen, Search, Trophy, TrendingUp, Loader2, Library, Sparkles, Star, Clock, Headphones, Wand2, Hourglass } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { SafeFamilyHeaderSwitcher } from "@/components/SafeFamilySwitcher";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useCoverFetcher } from "@/hooks/useCoverFetcher";

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

const AVATAR_BG: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  yellow: "bg-yellow-500",
};

/** Greeting that changes based on time of day */
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface FreeBook {
  id: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  source: "gutenberg" | "bloom" | "lit2go" | "librivox" | "bookdash" | "storyweaver";
  hasAudio?: boolean;
  totalTime?: string;
  rssUrl?: string;
}

/** Well-known classic titles that deserve a "Classic" badge */
const CLASSIC_TITLES = new Set([
  "Alice's Adventures in Wonderland",
  "The Adventures of Tom Sawyer",
  "Treasure Island",
  "The Jungle Book",
  "Peter Pan",
  "The Wind in the Willows",
  "Black Beauty",
  "Little Women",
  "The Secret Garden",
  "Anne of Green Gables",
  "A Little Princess",
  "The Call of the Wild",
  "The Wonderful Wizard of Oz",
  "Robinson Crusoe",
  "Heidi",
  "The Adventures of Huckleberry Finn",
  "Oliver Twist",
  "A Christmas Carol",
  "Frankenstein",
  "Dracula",
  "Pride and Prejudice",
  "Jane Eyre",
  "Moby Dick",
  "The Count of Monte Cristo",
  "Gulliver's Travels",
  "Swiss Family Robinson",
  "The Prince and the Pauper",
  "Around the World in 80 Days",
  "20,000 Leagues Under the Sea",
  "The Three Musketeers",
  "Aesop's Fables",
  "Robin Hood",
  "King Arthur",
]);

/** Check if a title is a well-known classic */
function isWellKnownClassic(title: string): boolean {
  const normalized = title.trim();
  for (const classic of CLASSIC_TITLES) {
    if (normalized.toLowerCase().includes(classic.toLowerCase()) ||
        classic.toLowerCase().includes(normalized.toLowerCase())) {
      return true;
    }
  }
  return false;
}

interface MergedBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  cachedCoverUrl?: string;
  hasAudio: boolean;
  isClassic: boolean;
  /** Navigation target */
  href: string;
  totalTime?: string;
  rssUrl?: string;
  source: "preApproved" | "free" | "audiobook";
}

export default function KidHomePage() {
  const router = useRouter();
  const [kidProfile, setKidProfile] = useState<KidProfile | null>(null);
  const [freeBooks, setFreeBooks] = useState<FreeBook[]>([]);
  const [freeBooksLoading, setFreeBooksLoading] = useState(false);
  const [freeBooksLoaded, setFreeBooksLoaded] = useState(false);
  const [audiobooks, setAudiobooks] = useState<FreeBook[]>([]);
  const [audiobooksLoading, setAudiobooksLoading] = useState(false);
  const [audiobooksLoaded, setAudiobooksLoaded] = useState(false);

  const getCuratedFreeBooks = useAction(api.freeBooks.getCuratedFreeBooks);
  const getCuratedAudiobooks = useAction(api.freeBooks.getCuratedAudiobooks);

  // Clear session and redirect to /play
  const clearSession = useCallback(() => {
    localStorage.removeItem("safereads_kid_profile");
    localStorage.removeItem("safereads_family_code");
    localStorage.removeItem("safereads_session_started");
    router.replace("/read");
  }, [router]);

  // Cross-app kid pass: mint a short-lived token for the current kid so the
  // header switcher can hand it to a sibling app (one-tap, no PIN re-entry).
  // Refreshed well inside its 5-minute TTL so the links never go stale.
  const [kidToken, setKidToken] = useState<string | undefined>(undefined);
  const mintKidPass = useMutation(api.kidPass.mintKidPass);
  useEffect(() => {
    const fc = typeof window !== "undefined" ? localStorage.getItem("safereads_family_code") : null;
    if (!fc || !kidProfile?.name) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const res = await mintKidPass({
          familyCode: fc,
          kidName: kidProfile.name,
          color: kidProfile.color,
        });
        if (active && res?.token) setKidToken(res.token);
      } catch {
        // non-fatal — the switcher still works; the destination just asks for the PIN
      }
    };
    refresh();
    const id = setInterval(refresh, 4 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [kidProfile?.name, kidProfile?.color, mintKidPass]);

  useEffect(() => {
    const profileData = localStorage.getItem("safereads_kid_profile");
    if (!profileData) {
      router.replace("/read");
      return;
    }

    // Check session TTL (24 hours)
    const sessionStarted = localStorage.getItem("safereads_session_started");
    const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
    if (sessionStarted && Date.now() - parseInt(sessionStarted, 10) > SESSION_TTL_MS) {
      clearSession();
      return;
    }

    try {
      setKidProfile(JSON.parse(profileData));
    } catch {
      router.replace("/read");
    }
  }, [router, clearSession]);

  // Check if kid needs onboarding (redirect before showing home)
  const needsOnboarding = useQuery(
    api.kids.needsOnboarding,
    kidProfile ? { kidId: kidProfile._id as Id<"kids"> } : "skip"
  );

  useEffect(() => {
    if (needsOnboarding === true) {
      router.replace("/read/onboarding");
    }
  }, [needsOnboarding, router]);

  // Re-validate session against Convex (checks: code still valid, subscription active, profile exists)
  // Also fetches fresh profile data (fixes stale name/color after parent edits)
  const savedCode = typeof window !== "undefined" ? localStorage.getItem("safereads_family_code") : null;
  const sessionValidation = useQuery(
    api.familyCodes.revalidateSession,
    kidProfile && savedCode
      ? { code: savedCode, kidId: kidProfile._id as Id<"kids"> }
      : "skip"
  );

  useEffect(() => {
    if (!sessionValidation) return;
    if (!sessionValidation.valid) {
      // Session invalid — code changed, subscription expired, or profile deleted
      clearSession();
      return;
    }
    // Update localStorage with fresh profile data from Convex (issue #13)
    if (sessionValidation.valid && "kid" in sessionValidation && sessionValidation.kid) {
      const freshKid = sessionValidation.kid;
      const current = kidProfile;
      if (
        current &&
        (current.name !== freshKid.name ||
          current.age !== freshKid.age ||
          current.color !== freshKid.color)
      ) {
        const updatedProfile = {
          _id: freshKid._id,
          name: freshKid.name,
          age: freshKid.age,
          color: freshKid.color,
        };
        localStorage.setItem("safereads_kid_profile", JSON.stringify(updatedProfile));
        setKidProfile(updatedProfile as KidProfile);
      }
    }
  }, [sessionValidation, clearSession, kidProfile]);

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
          setFreeBooks(books as unknown as FreeBook[]);
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

  // Load curated audiobooks
  useEffect(() => {
    if (!kidProfile || audiobooksLoaded) return;

    let cancelled = false;
    async function loadAudiobooks() {
      setAudiobooksLoading(true);
      try {
        const books = await getCuratedAudiobooks({
          age: kidProfile?.age || undefined,
        });
        if (!cancelled) {
          setAudiobooks(books as unknown as FreeBook[]);
          setAudiobooksLoaded(true);
        }
      } catch (err) {
        console.error("Failed to load audiobooks:", err);
      } finally {
        if (!cancelled) setAudiobooksLoading(false);
      }
    }

    loadAudiobooks();
    return () => { cancelled = true; };
  }, [kidProfile, audiobooksLoaded, getCuratedAudiobooks]);

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
  const streakData = useQuery(
    api.readingStreaks.getStreak,
    kidId ? { kidId } : "skip"
  );
  const badgeData = useQuery(
    api.readingStreaks.getBadges,
    kidId ? { kidId } : "skip"
  );
  const recommendations = useQuery(
    api.recommendations.getRecommendations,
    kidId ? { kidId } : "skip"
  );
  const preApprovedBooks = useQuery(
    api.preApprovedBooks.getPreApprovedBooks,
    kidId ? { age: kidProfile?.age, kidId } : "skip"
  );
  const savedVerses = useQuery(
    api.bible.getSavedVerses,
    kidId ? { kidId } : "skip"
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
  const recommendationIdentifiers = useMemo(
    () => (recommendations || []).map((b) => b.gutenbergId),
    [recommendations]
  );
  const allIdentifiers = useMemo(
    () => [...classicIdentifiers, ...freeBookIdentifiers, ...recommendationIdentifiers],
    [classicIdentifiers, freeBookIdentifiers, recommendationIdentifiers]
  );

  // Batch lookup cached covers
  const cachedCovers = useQuery(
    api.bookCovers.getCachedCovers,
    allIdentifiers.length > 0 ? { bookIdentifiers: allIdentifiers } : "skip"
  );

  // Merge all book sources into one "Recommended for You" list
  const recommendedBooks = useMemo(() => {
    const merged: MergedBook[] = [];
    const seenTitles = new Set<string>();

    // Pre-approved classics first (already age-sorted)
    for (const book of (preApprovedBooks || [])) {
      const key = book.title.toLowerCase();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);

      const cachedUrl = cachedCovers?.[book.gutenbergId]?.coverUrl;
      merged.push({
        id: `pre-${book.gutenbergId}`,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        cachedCoverUrl: cachedUrl,
        hasAudio: false,
        isClassic: isWellKnownClassic(book.title),
        href: `/read/book/${encodeURIComponent(book.googleBookId)}`,
        source: "preApproved",
      });
    }

    // Curated free books (excluding audiobooks, those go in their own section)
    for (const book of freeBooks) {
      const key = book.title.toLowerCase();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);

      const cachedUrl = cachedCovers?.[book.id]?.coverUrl;
      const bookHasAudio = book.hasAudio || book.source === "librivox" || book.source === "lit2go";
      merged.push({
        id: `free-${book.id}`,
        title: book.title,
        author: book.authors.join(", ") || "Unknown",
        coverUrl: book.coverUrl,
        cachedCoverUrl: cachedUrl,
        hasAudio: bookHasAudio,
        isClassic: isWellKnownClassic(book.title),
        href: "/read/search",
        source: "free",
      });
    }

    // Mix in audiobooks that aren't already listed
    for (const book of audiobooks) {
      const key = book.title.toLowerCase();
      if (seenTitles.has(key)) {
        // Mark the existing entry as having audio
        const existing = merged.find(m => m.title.toLowerCase() === key);
        if (existing) existing.hasAudio = true;
        continue;
      }
      seenTitles.add(key);

      const rawId = book.id.replace(/^librivox:/, "");
      const cachedUrl = cachedCovers?.[rawId]?.coverUrl;
      merged.push({
        id: `audio-${book.id}`,
        title: book.title,
        author: book.authors.join(", ") || "Unknown",
        coverUrl: book.coverUrl,
        cachedCoverUrl: cachedUrl,
        hasAudio: true,
        isClassic: isWellKnownClassic(book.title),
        href: "/read/search?tab=audio",
        source: "audiobook",
        totalTime: book.totalTime,
      });
    }

    return merged.slice(0, 15);
  }, [preApprovedBooks, freeBooks, audiobooks, cachedCovers]);

  // Books with audio for "Listen to a Story"
  const listenBooks = useMemo(() => {
    const books: MergedBook[] = [];
    const seenTitles = new Set<string>();

    for (const book of audiobooks) {
      const key = book.title.toLowerCase();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);

      const rawId = book.id.replace(/^librivox:/, "");
      const cachedUrl = cachedCovers?.[rawId]?.coverUrl;

      books.push({
        id: `listen-${book.id}`,
        title: book.title,
        author: book.authors.join(", ") || "Unknown",
        coverUrl: book.coverUrl,
        cachedCoverUrl: cachedUrl,
        hasAudio: true,
        isClassic: false,
        href: `/read/listen/${encodeURIComponent(book.id)}`,
        source: "audiobook",
        totalTime: book.totalTime,
        rssUrl: book.rssUrl,
      });
    }

    return books.slice(0, 8);
  }, [audiobooks, cachedCovers]);

  // ---- Background cover fetching for books without cached covers ----
  const recsNeedingCovers = useMemo(() => {
    return (recommendations || []).map((book) => ({
      identifier: book.gutenbergId,
      title: book.title,
      author: book.author,
      hasCachedCover: !!cachedCovers?.[book.gutenbergId]?.coverUrl,
      hasSourceCover: !!book.coverUrl && !book.coverUrl.includes("gutenberg.org"),
    }));
  }, [recommendations, cachedCovers]);

  const booksNeedingCovers = useMemo(() => {
    const all = [...recommendedBooks, ...listenBooks];
    return all.map((book) => {
      const rawId = book.id
        .replace(/^(pre|free|audio|listen)-/, "")
        .replace(/^(gutenberg|bloom|lit2go|librivox|bookdash):/, "");
      return {
        identifier: rawId,
        title: book.title,
        author: book.author,
        hasCachedCover: !!book.cachedCoverUrl,
        hasSourceCover: !!book.coverUrl && !book.coverUrl.includes("gutenberg.org"),
      };
    });
  }, [recommendedBooks, listenBooks]);

  useCoverFetcher([...booksNeedingCovers, ...recsNeedingCovers]);

  const recommendedLoading = freeBooksLoading || audiobooksLoading;
  const recommendedLoaded = freeBooksLoaded || audiobooksLoaded || (preApprovedBooks && preApprovedBooks.length > 0);

  if (!kidProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-200 border-t-accent-600" />
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

  // Time-aware greeting
  const timeGreeting = getTimeGreeting();
  const avatarBg = AVATAR_BG[kidProfile.color] || AVATAR_BG.purple;

  return (
    <div className="py-6">
      {/* Sticky Kid Header -- profile pill + search shortcut */}
      <div className="sticky-kid-header animate-fade-up sticky -top-1 z-20 -mx-4 mb-4 flex items-center justify-between bg-brand-cream/95 px-4 py-2.5 backdrop-blur-md"
           style={{ animationDelay: "0s" }}>
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${avatarBg} text-sm font-bold text-white shadow-md`}>
            {kidProfile.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-gray-400">{timeGreeting}</p>
            <p className="truncate text-sm font-bold text-gray-900">{kidProfile.name}</p>
          </div>
        </div>
        {/* Safe Family switcher — desktop (always visible on lg+) */}
        <div className="hidden lg:flex">
          <SafeFamilyHeaderSwitcher current="safereads" familyCode={savedCode || ""} kidToken={kidToken} />
        </div>
        <Link
          href="/read/search"
          className="kid-touch flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-500 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md active:scale-95"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Find Books</span>
        </Link>
      </div>

      {/* Safe Family switcher — mobile row (always visible < lg) */}
      <div className="lg:hidden mb-4 flex justify-center">
        <SafeFamilyHeaderSwitcher current="safereads" familyCode={savedCode || ""} kidToken={kidToken} tile={40} />
      </div>

      {/* 1. Welcome Header - Hero */}
      <div className={`animate-fade-up overflow-hidden rounded-3xl bg-gradient-to-br ${gradientClass} p-5 text-white shadow-xl sm:p-6`}
           style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl backdrop-blur-sm sm:h-[72px] sm:w-[72px] sm:text-4xl">
            {greetingEmoji}
          </div>
          <div className="min-w-0">
            <h1 className="font-display truncate text-xl font-bold sm:text-2xl">
              {timeGreeting}, {kidProfile.name}!
            </h1>
            <p className="mt-1 text-sm font-medium text-white/80 sm:text-base">
              Ready for a reading adventure?
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-5 flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 backdrop-blur-sm sm:px-3">
            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs font-bold sm:text-sm">{stats?.currentlyReading || 0}</span>
            <span className="text-[10px] text-white/70 sm:text-xs">reading</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 backdrop-blur-sm sm:px-3">
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs font-bold sm:text-sm">{stats?.finishedBooks || 0}</span>
            <span className="text-[10px] text-white/70 sm:text-xs">finished</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 backdrop-blur-sm sm:px-3">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs font-bold sm:text-sm">{stats?.totalPages || 0}</span>
            <span className="text-[10px] text-white/70 sm:text-xs">pages</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 backdrop-blur-sm sm:px-3">
            <Library className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs font-bold sm:text-sm">{approvedBooks?.length || 0}</span>
            <span className="text-[10px] text-white/70 sm:text-xs">books</span>
          </div>
          {streakData && streakData.currentStreak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 backdrop-blur-sm sm:px-3">
              <span className="text-xs sm:text-sm">{"\uD83D\uDD25"}</span>
              <span className="text-xs font-bold sm:text-sm">{streakData.currentStreak}</span>
              <span className="text-[10px] text-white/70 sm:text-xs">streak</span>
            </div>
          )}
        </div>
      </div>

      {/* Reading Streaks & Badges */}
      <section className="animate-fade-up mt-5" style={{ animationDelay: "0.08s" }}>
        <ReadingStreaks
          streak={streakData}
          badges={badgeData}
          kidColor={kidProfile.color}
        />
      </section>

      {/* 2. Continue Reading */}
      {currentlyReadingBooks.length > 0 && (
        <section className="animate-fade-up mt-6" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-500" />
              <h2 className="font-display text-lg font-bold text-brand-navy">
                Continue Reading
              </h2>
            </div>
            <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[10px] font-bold text-accent-500">
              {currentlyReadingBooks.length} book{currentlyReadingBooks.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {currentlyReadingBooks.map((book, index) => (
              <button
                key={book._id}
                onClick={() => router.push(`/read/book/${encodeURIComponent(book.googleBookId)}`)}
                className="kid-touch flex w-full items-center gap-4 rounded-2xl bg-white p-3.5 shadow-md ring-1 ring-black/5 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="book-tilt relative h-[72px] w-[52px] flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm">
                  {book.coverUrl ? (
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      fill
                      sizes="52px"
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
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-accent-100">
                      <div
                        className="progress-shimmer h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(book.progress, 100)}%` }}
                      />
                    </div>
                    <span className="min-w-[32px] text-right text-[11px] font-bold text-accent-600">
                      {Math.round(book.progress)}%
                    </span>
                  </div>
                </div>
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg shadow-accent-200 transition-transform group-hover:scale-105">
                  <BookOpen className="h-4.5 w-4.5 text-white" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. Read the Bible — prominent for homeschool audience */}
      <section className="animate-fade-up mt-5" style={{ animationDelay: "0.12s" }}>
        <button
          onClick={() => router.push("/read/bible")}
          className="kid-touch flex w-full items-center gap-4 rounded-2xl bg-accent-50 p-4 shadow-md ring-1 ring-accent-200/60 transition-all hover:shadow-lg active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-accent-500 text-2xl shadow-lg shadow-accent-200">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-base font-bold text-accent-900">Read the Bible</p>
            <p className="mt-0.5 text-xs text-accent-700/70">
              ESV, NIV, NLT, NKJV, KJV and more
            </p>
          </div>
          <div className="flex-shrink-0 text-accent-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </section>

      {/* 3b. Recommended for You (personalized) */}
      {recommendations !== undefined && (
        <section className="animate-fade-up mt-7" style={{ animationDelay: "0.14s" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-accent-500" />
              <h2 className="font-display text-lg font-bold text-brand-navy">
                Recommended for You
              </h2>
            </div>
            <Link
              href="/read/search"
              className="kid-touch flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-600 transition-colors hover:bg-accent-100"
            >
              Explore
            </Link>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            Picked just for you based on what you love
          </p>
          <div className="mt-3">
            {recommendations.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto overscroll-contain pb-2 scrollbar-none">
                {recommendations.map((book) => {
                  const cachedUrl = cachedCovers?.[book.gutenbergId]?.coverUrl;
                  const displayUrl = cachedUrl || book.coverUrl;
                  return (
                    <button
                      key={book.gutenbergId}
                      onClick={() => router.push(`/read/book/${encodeURIComponent(book.googleBookId)}`)}
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
                      </div>
                      <p
                        className="mt-2 line-clamp-2 text-[11px] font-semibold leading-tight text-gray-800 group-hover:text-accent-700"
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
                      <span
                        className="mt-1 inline-block max-w-[112px] truncate rounded-full bg-accent-50 px-2 py-0.5 text-[8px] font-semibold text-accent-600 ring-1 ring-accent-100"
                      >
                        {book.reason}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-2xl bg-white px-4 py-8 text-center shadow-sm">
                <Wand2 className="h-8 w-8 text-accent-200" />
                <p className="mt-2 text-sm font-medium text-gray-600">
                  Start reading to get personalized picks!
                </p>
                <Link
                  href="/read/search"
                  className="kid-touch mt-3 rounded-full bg-accent-100 px-4 py-2 text-xs font-bold text-accent-700 transition-colors hover:bg-accent-200"
                >
                  Browse Books
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Browse by Genre */}
      <section className="animate-fade-up mt-7" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{"\uD83C\uDF1F"}</span>
          <h2 className="font-display text-lg font-bold text-brand-navy">
            Browse by Genre
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          Tap a category to discover books
        </p>
        <div className="mt-3">
          <GenreBrowser layout="grid" />
        </div>
      </section>

      {/* 5. Discover More Books (merged classics + free books + audiobooks) */}
      <section className="animate-fade-up mt-7" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-accent-500" />
            <h2 className="font-display text-lg font-bold text-brand-navy">
              Discover More Books
            </h2>
          </div>
          <Link
            href="/read/library"
            className="kid-touch flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-600 transition-colors hover:bg-accent-100"
          >
            See All
          </Link>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          {kidProfile.age && kidProfile.age <= 6
            ? "Great books to start your reading journey!"
            : kidProfile.age && kidProfile.age <= 9
              ? "Adventures and stories picked just for you!"
              : "Books you might enjoy — tap to start reading!"}
        </p>
        <div className="mt-3">
          {recommendedLoading && recommendedBooks.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent-400" />
            </div>
          ) : recommendedBooks.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto overscroll-contain pb-2 scrollbar-none">
              {recommendedBooks.map((book) => {
                const displayUrl = book.cachedCoverUrl || book.coverUrl;
                return (
                  <button
                    key={book.id}
                    onClick={() => router.push(book.href)}
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
                      {/* Subtle headphones icon for books with audio */}
                      {book.hasAudio && (
                        <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500/80 backdrop-blur-sm">
                          <Headphones className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      {/* Classic badge for well-known titles */}
                      {book.isClassic && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-accent-700/80 to-transparent px-2 pb-1.5 pt-4 text-center">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-white">Classic</span>
                        </div>
                      )}
                    </div>
                    <p
                      className="mt-2 line-clamp-2 text-[11px] font-semibold leading-tight text-gray-800 group-hover:text-accent-700"
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
          ) : recommendedLoaded ? (
            <div className="flex flex-col items-center rounded-2xl bg-white px-4 py-8 text-center shadow-sm">
              <span className="text-3xl">{"\uD83D\uDCDA"}</span>
              <p className="mt-2 text-sm font-medium text-gray-500">
                Recommendations will appear here soon!
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* 5. Listen to a Story (audiobooks) */}
      <section className="animate-fade-up mt-7" style={{ animationDelay: "0.25s" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-accent-500" />
            <h2 className="font-display text-lg font-bold text-brand-navy">
              Listen to a Story
            </h2>
          </div>
          <Link
            href="/read/library?format=audio"
            className="kid-touch flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-600 transition-colors hover:bg-accent-100"
          >
            See All
          </Link>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          Put on your headphones and listen!
        </p>
        <div className="mt-3">
          {audiobooksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent-400" />
            </div>
          ) : listenBooks.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto overscroll-contain pb-2 scrollbar-none">
              {listenBooks.map((book) => {
                const displayUrl = book.cachedCoverUrl || book.coverUrl;
                return (
                  <button
                    key={book.id}
                    onClick={() => {
                      localStorage.setItem("safereads_listen_book", JSON.stringify({
                        title: book.title,
                        author: book.author,
                        coverUrl: displayUrl,
                        rssUrl: book.rssUrl,
                        totalTime: book.totalTime,
                      }));
                      router.push(book.href);
                    }}
                    className="group flex flex-shrink-0 flex-col items-start text-left"
                  >
                    <div className="book-tilt relative h-40 w-28 overflow-hidden rounded-xl bg-accent-50 shadow-md ring-1 ring-accent-200/50 transition-all group-active:scale-[0.97]">
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
                      {/* Prominent play/headphones overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-accent-700/90 to-transparent px-2 pb-1.5 pt-4 text-center">
                        <span className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white">
                          <Headphones className="h-2.5 w-2.5" />
                          Listen
                        </span>
                      </div>
                      {/* Headphones indicator */}
                      <div className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent-500 shadow-sm">
                        <Headphones className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <p
                      className="mt-2 line-clamp-2 text-[11px] font-semibold leading-tight text-gray-800 group-hover:text-accent-700"
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
                    {book.totalTime && (
                      <p
                        className="mt-0.5 text-[9px] font-medium text-accent-400"
                        style={{ maxWidth: "112px" }}
                      >
                        {book.totalTime}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : audiobooksLoaded ? (
            <div className="flex flex-col items-center rounded-2xl bg-white px-4 py-8 text-center shadow-sm">
              <Headphones className="h-8 w-8 text-accent-200" />
              <p className="mt-2 text-sm font-medium text-gray-500">
                Audiobooks will appear here soon!
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Bible section moved to position 3 above */}

      {/* My Saved Verses */}
      {savedVerses && (savedVerses as Array<{ bookName: string; chapter: number; verse: number; verseText: string; translation: string; color?: string }>).length > 0 && (
        <section className="animate-fade-up mt-4" style={{ animationDelay: "0.3s" }}>
          <button
            onClick={() => router.push("/read/bible/saved")}
            className={`kid-touch w-full rounded-2xl border-l-4 border-l-accent-400 bg-accent-50 p-4 text-left shadow-sm ring-1 ring-accent-200/60 transition-all hover:shadow-md active:scale-[0.98]`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent-600">
              My Latest Saved Verse
            </p>
            <p className="mt-1.5 font-serif text-sm leading-relaxed text-gray-800 italic">
              &ldquo;{(savedVerses as Array<{ verseText: string }>)[0].verseText.slice(0, 120)}{(savedVerses as Array<{ verseText: string }>)[0].verseText.length > 120 ? "..." : ""}&rdquo;
            </p>
            <p className="mt-1.5 text-xs font-medium text-accent-700">
              {(savedVerses as Array<{ bookName: string; chapter: number; verse: number; translation: string }>)[0].bookName}{" "}
              {(savedVerses as Array<{ chapter: number }>)[0].chapter}:{(savedVerses as Array<{ verse: number }>)[0].verse}{" "}
              ({(savedVerses as Array<{ translation: string }>)[0].translation})
            </p>
          </button>
        </section>
      )}

      {/* Pending Requests */}
      {pendingCount > 0 && (
        <div className="animate-fade-up mt-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-4 shadow-sm ring-1 ring-amber-200/60" style={{ animationDelay: "0.32s" }}>
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-800">
              {pendingCount} book{pendingCount > 1 ? "s" : ""} waiting for approval
            </p>
            <p className="mt-0.5 text-xs text-amber-600/80">
              Your parent will review your requests soon!
            </p>
          </div>
          <div className="flex-shrink-0">
            <Hourglass className="h-5 w-5 animate-pulse text-amber-500" />
          </div>
        </div>
      )}

      {/* 7. My Bookshelf */}
      <section id="bookshelf" className="animate-fade-up mt-7" style={{ animationDelay: "0.35s" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{"\uD83D\uDCDA"}</span>
            <h2 className="font-display text-lg font-bold text-brand-navy">My Bookshelf</h2>
          </div>
          <Link
            href="/read/search"
            className="kid-touch flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md active:scale-95"
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
                  className="h-40 w-full animate-pulse rounded-xl bg-accent-100/50"
                />
              ))}
            </div>
          ) : (
            <KidBookshelf
              books={approvedBooks}
              progress={readingProgress || []}
              onBookClick={(book) =>
                router.push(`/read/book/${encodeURIComponent(book.googleBookId)}`)
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
