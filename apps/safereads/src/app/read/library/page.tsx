"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StylizedCover } from "@/components/kid/StylizedCover";
import { Search, Headphones, Loader2, BookOpen, ArrowUpDown, Library } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";

// ============================================================================
// Types
// ============================================================================

interface KidProfile {
  _id: string;
  name: string;
  age?: number;
  color: string;
}

interface LibraryBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  cachedCoverUrl?: string;
  hasAudio: boolean;
  source: "preApproved" | "free" | "audiobook";
  /** For navigating to reader or listen */
  href: string;
  /** For listen nav, store rss and time */
  rssUrl?: string;
  totalTime?: string;
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

// ============================================================================
// Genre definitions (same as GenreBrowser)
// ============================================================================

const GENRES = [
  { key: "adventure", label: "Adventure", emoji: "\uD83C\uDFF4\u200D\u2620\uFE0F", gradient: "from-orange-400 to-red-500", ring: "ring-orange-200", activeBg: "bg-orange-500", activeText: "text-white" },
  { key: "animals", label: "Animals", emoji: "\uD83D\uDC3E", gradient: "from-amber-400 to-yellow-500", ring: "ring-amber-200", activeBg: "bg-amber-500", activeText: "text-white" },
  { key: "fantasy", label: "Fantasy", emoji: "\uD83D\uDC09", gradient: "from-purple-400 to-violet-600", ring: "ring-purple-200", activeBg: "bg-purple-500", activeText: "text-white" },
  { key: "science", label: "Science", emoji: "\uD83D\uDD2C", gradient: "from-cyan-400 to-blue-500", ring: "ring-cyan-200", activeBg: "bg-cyan-500", activeText: "text-white" },
  { key: "history", label: "History", emoji: "\u2694\uFE0F", gradient: "from-stone-400 to-stone-600", ring: "ring-stone-200", activeBg: "bg-stone-500", activeText: "text-white" },
  { key: "fairy-tales", label: "Fairy Tales", emoji: "\uD83E\uDDDA", gradient: "from-pink-400 to-rose-500", ring: "ring-pink-200", activeBg: "bg-pink-500", activeText: "text-white" },
  { key: "mystery", label: "Mystery", emoji: "\uD83D\uDD0D", gradient: "from-indigo-400 to-blue-600", ring: "ring-indigo-200", activeBg: "bg-indigo-500", activeText: "text-white" },
  { key: "space", label: "Space", emoji: "\uD83D\uDE80", gradient: "from-violet-500 to-indigo-700", ring: "ring-violet-200", activeBg: "bg-violet-600", activeText: "text-white" },
  { key: "nature", label: "Nature", emoji: "\uD83C\uDF3F", gradient: "from-emerald-400 to-green-600", ring: "ring-emerald-200", activeBg: "bg-emerald-500", activeText: "text-white" },
  { key: "humor", label: "Humor", emoji: "\uD83D\uDE02", gradient: "from-yellow-400 to-orange-400", ring: "ring-yellow-200", activeBg: "bg-yellow-500", activeText: "text-white" },
  { key: "sports", label: "Sports", emoji: "\u26BD", gradient: "from-green-400 to-teal-500", ring: "ring-green-200", activeBg: "bg-green-500", activeText: "text-white" },
  { key: "art-music", label: "Art & Music", emoji: "\uD83C\uDFA8", gradient: "from-fuchsia-400 to-pink-600", ring: "ring-fuchsia-200", activeBg: "bg-fuchsia-500", activeText: "text-white" },
  { key: "scary", label: "Scary Stories", emoji: "\uD83D\uDC7B", gradient: "from-gray-600 to-gray-900", ring: "ring-gray-300", activeBg: "bg-gray-700", activeText: "text-white" },
  { key: "comics", label: "Comics", emoji: "\uD83D\uDCAC", gradient: "from-sky-400 to-blue-500", ring: "ring-sky-200", activeBg: "bg-sky-500", activeText: "text-white" },
  { key: "action", label: "Action", emoji: "\uD83D\uDCA5", gradient: "from-red-500 to-rose-600", ring: "ring-red-200", activeBg: "bg-red-500", activeText: "text-white" },
];

// ============================================================================
// Format filter options
// ============================================================================

type FormatFilter = "all" | "books" | "audio";
type SortMode = "popular" | "az";

// ============================================================================
// Skeleton placeholder for loading
// ============================================================================

function BookSkeleton() {
  return (
    <div className="flex flex-col items-start animate-pulse">
      <div className="aspect-[2/3] w-full rounded-xl bg-purple-100/60" />
      <div className="mt-2 h-3 w-4/5 rounded bg-gray-200" />
      <div className="mt-1 h-2.5 w-3/5 rounded bg-gray-100" />
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function LibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [kidProfile, setKidProfile] = useState<KidProfile | null>(null);

  // Filters
  const initialFormat = (searchParams.get("format") === "audio" ? "audio" : "all") as FormatFilter;
  const [formatFilter, setFormatFilter] = useState<FormatFilter>(initialFormat);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("popular");

  // Data
  const [freeBooks, setFreeBooks] = useState<FreeBook[]>([]);
  const [freeBooksLoaded, setFreeBooksLoaded] = useState(false);
  const [freeBooksLoading, setFreeBooksLoading] = useState(false);
  const [audiobooks, setAudiobooks] = useState<FreeBook[]>([]);
  const [audiobooksLoaded, setAudiobooksLoaded] = useState(false);
  const [audiobooksLoading, setAudiobooksLoading] = useState(false);
  const [genreBooks, setGenreBooks] = useState<FreeBook[]>([]);
  const [genreBooksLoading, setGenreBooksLoading] = useState(false);

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(30);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Actions
  const getCuratedFreeBooks = useAction(api.freeBooks.getCuratedFreeBooks);
  const getCuratedAudiobooks = useAction(api.freeBooks.getCuratedAudiobooks);
  const browseByGenre = useAction(api.freeBooks.browseByGenre);

  // ---- Session check ----
  useEffect(() => {
    const profileData = localStorage.getItem("safereads_kid_profile");
    if (!profileData) {
      router.replace("/read");
      return;
    }
    try {
      setKidProfile(JSON.parse(profileData));
    } catch {
      router.replace("/read");
    }
  }, [router]);

  const kidId = kidProfile?._id as Id<"kids"> | undefined;

  // ---- Queries ----
  const preApprovedBooks = useQuery(
    api.preApprovedBooks.getPreApprovedBooks,
    kidId ? { age: kidProfile?.age, kidId } : "skip"
  );

  // ---- Load curated free books ----
  useEffect(() => {
    if (!kidProfile || freeBooksLoaded) return;
    let cancelled = false;
    async function load() {
      setFreeBooksLoading(true);
      try {
        const books = await getCuratedFreeBooks({ age: kidProfile?.age || undefined });
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
    load();
    return () => { cancelled = true; };
  }, [kidProfile, freeBooksLoaded, getCuratedFreeBooks]);

  // ---- Load curated audiobooks ----
  useEffect(() => {
    if (!kidProfile || audiobooksLoaded) return;
    let cancelled = false;
    async function load() {
      setAudiobooksLoading(true);
      try {
        const books = await getCuratedAudiobooks({ age: kidProfile?.age || undefined });
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
    load();
    return () => { cancelled = true; };
  }, [kidProfile, audiobooksLoaded, getCuratedAudiobooks]);

  // ---- Load genre books when genre filter changes ----
  useEffect(() => {
    if (!genreFilter) {
      setGenreBooks([]);
      return;
    }
    let cancelled = false;
    async function load() {
      setGenreBooksLoading(true);
      try {
        const books = await browseByGenre({ genre: genreFilter! });
        if (!cancelled) {
          setGenreBooks(books as unknown as FreeBook[]);
        }
      } catch (err) {
        console.error("Failed to browse genre:", err);
      } finally {
        if (!cancelled) setGenreBooksLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [genreFilter, browseByGenre]);

  // ---- Build cover identifiers for batch lookup ----
  const classicIds = useMemo(
    () => (preApprovedBooks || []).map((b) => b.gutenbergId),
    [preApprovedBooks]
  );
  const freeIds = useMemo(() => freeBooks.map((b) => b.id), [freeBooks]);
  const genreIds = useMemo(() => genreBooks.map((b) => b.id), [genreBooks]);
  const allIdentifiers = useMemo(
    () => [...new Set([...classicIds, ...freeIds, ...genreIds])],
    [classicIds, freeIds, genreIds]
  );

  const cachedCovers = useQuery(
    api.bookCovers.getCachedCovers,
    allIdentifiers.length > 0 ? { bookIdentifiers: allIdentifiers } : "skip"
  );

  // ---- Merge all books ----
  const allBooks = useMemo(() => {
    const merged: LibraryBook[] = [];
    const seenTitles = new Set<string>();

    function addBook(book: LibraryBook) {
      const key = book.title.toLowerCase().trim();
      if (seenTitles.has(key)) {
        // If the existing entry doesn't have audio but this one does, mark it
        const existing = merged.find((m) => m.title.toLowerCase().trim() === key);
        if (existing && book.hasAudio) existing.hasAudio = true;
        return;
      }
      seenTitles.add(key);
      merged.push(book);
    }

    // If genre is selected, genre books are the primary source
    if (genreFilter && genreBooks.length > 0) {
      for (const book of genreBooks) {
        const rawId = book.id.replace(/^(gutenberg|bloom|lit2go|librivox|bookdash):/, "");
        const cachedUrl = cachedCovers?.[rawId]?.coverUrl;
        const bookHasAudio = book.hasAudio || book.source === "librivox" || book.source === "lit2go";
        addBook({
          id: `genre-${book.id}`,
          title: book.title,
          author: book.authors?.join(", ") || "Unknown",
          coverUrl: book.coverUrl,
          cachedCoverUrl: cachedUrl,
          hasAudio: bookHasAudio,
          source: "free",
          href: `/read/book/${encodeURIComponent(`gutenberg:${rawId}`)}`,
        });
      }
    }

    // Pre-approved classics
    for (const book of preApprovedBooks || []) {
      const cachedUrl = cachedCovers?.[book.gutenbergId]?.coverUrl;
      addBook({
        id: `pre-${book.gutenbergId}`,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        cachedCoverUrl: cachedUrl,
        hasAudio: false,
        source: "preApproved",
        href: `/read/book/${encodeURIComponent(book.googleBookId)}`,
      });
    }

    // Curated free books
    for (const book of freeBooks) {
      const cachedUrl = cachedCovers?.[book.id]?.coverUrl;
      const bookHasAudio = book.hasAudio || book.source === "librivox" || book.source === "lit2go";
      addBook({
        id: `free-${book.id}`,
        title: book.title,
        author: book.authors?.join(", ") || "Unknown",
        coverUrl: book.coverUrl,
        cachedCoverUrl: cachedUrl,
        hasAudio: bookHasAudio,
        source: "free",
        href: `/read/book/${encodeURIComponent(`gutenberg:${book.id}`)}`,
      });
    }

    // Audiobooks
    for (const book of audiobooks) {
      const rawId = book.id.replace(/^librivox:/, "");
      const cachedUrl = cachedCovers?.[rawId]?.coverUrl;
      addBook({
        id: `audio-${book.id}`,
        title: book.title,
        author: book.authors?.join(", ") || "Unknown",
        coverUrl: book.coverUrl,
        cachedCoverUrl: cachedUrl,
        hasAudio: true,
        source: "audiobook",
        href: `/read/listen/${encodeURIComponent(book.id)}`,
        rssUrl: book.rssUrl,
        totalTime: book.totalTime,
      });
    }

    return merged;
  }, [preApprovedBooks, freeBooks, audiobooks, genreBooks, genreFilter, cachedCovers]);

  // ---- Apply filters and sort ----
  const filteredBooks = useMemo(() => {
    let books = [...allBooks];

    // Format filter
    if (formatFilter === "audio") {
      books = books.filter((b) => b.hasAudio);
    } else if (formatFilter === "books") {
      books = books.filter((b) => !b.hasAudio || b.source !== "audiobook");
    }

    // Sort
    if (sortMode === "az") {
      books.sort((a, b) => a.title.localeCompare(b.title));
    }
    // "popular" keeps the natural order (pre-approved first, then curated)

    return books;
  }, [allBooks, formatFilter, sortMode]);

  // Visible slice for infinite scroll
  const visibleBooks = filteredBooks.slice(0, visibleCount);

  // ---- Infinite scroll observer ----
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredBooks.length) {
          setVisibleCount((prev) => Math.min(prev + 20, filteredBooks.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, filteredBooks.length]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(30);
  }, [formatFilter, genreFilter, sortMode]);

  // ---- Handle book tap ----
  const handleBookTap = useCallback(
    (book: LibraryBook) => {
      if (book.source === "audiobook" && book.rssUrl) {
        localStorage.setItem(
          "safereads_listen_book",
          JSON.stringify({
            title: book.title,
            author: book.author,
            coverUrl: book.cachedCoverUrl || book.coverUrl,
            rssUrl: book.rssUrl,
            totalTime: book.totalTime,
          })
        );
      }
      router.push(book.href);
    },
    [router]
  );

  // ---- Loading state ----
  const isLoading = freeBooksLoading || audiobooksLoading || genreBooksLoading;
  const hasLoadedSomething = freeBooksLoaded || audiobooksLoaded || (preApprovedBooks && preApprovedBooks.length > 0);

  if (!kidProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* ---- Top Bar ---- */}
      <div className="animate-fade-up mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
            <Library className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Library</h1>
            <p className="text-[10px] text-gray-400">Browse and discover books</p>
          </div>
        </div>
        <Link
          href="/read/search"
          className="kid-touch flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 transition-all hover:shadow-lg active:scale-95"
        >
          <Search className="h-4.5 w-4.5 text-gray-500" />
        </Link>
      </div>

      {/* ---- Sticky Filter Bar ---- */}
      <div className="sticky top-0 z-20 -mx-4 bg-[#FEF7EE]/95 px-4 pb-3 pt-2 backdrop-blur-md">
        {/* Format pills */}
        <div className="mb-2.5 flex items-center gap-2">
          {(
            [
              { key: "all", label: "All", icon: null },
              { key: "books", label: "Books", icon: BookOpen },
              { key: "audio", label: "Audiobooks", icon: Headphones },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFormatFilter(key)}
              className={`kid-touch flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all duration-200 active:scale-95 ${
                formatFilter === key
                  ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md"
                  : "bg-white text-gray-500 ring-1 ring-black/5 hover:shadow-sm"
              }`}
            >
              {Icon && (
                <Icon
                  className={`h-3.5 w-3.5 ${formatFilter === key ? "text-white" : "text-gray-400"}`}
                />
              )}
              {label}
            </button>
          ))}

          {/* Sort toggle */}
          <button
            onClick={() => setSortMode((prev) => (prev === "popular" ? "az" : "popular"))}
            className="kid-touch ml-auto flex min-h-[36px] items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-bold text-gray-500 ring-1 ring-black/5 transition-all active:scale-95 hover:shadow-sm"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortMode === "popular" ? "Popular" : "A-Z"}
          </button>
        </div>

        {/* Genre pills — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto overscroll-contain pb-1 scrollbar-none">
          <button
            onClick={() => setGenreFilter(null)}
            className={`kid-touch flex min-h-[34px] flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all duration-200 active:scale-95 ${
              !genreFilter
                ? "bg-purple-600 text-white shadow-md"
                : "bg-white text-gray-600 ring-1 ring-black/5"
            }`}
          >
            All Genres
          </button>
          {GENRES.map((genre) => (
            <button
              key={genre.key}
              onClick={() => setGenreFilter(genreFilter === genre.key ? null : genre.key)}
              className={`kid-touch flex min-h-[34px] flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all duration-200 active:scale-95 ${
                genreFilter === genre.key
                  ? `bg-gradient-to-r ${genre.gradient} text-white shadow-md`
                  : `bg-white text-gray-600 ring-1 ${genre.ring}`
              }`}
            >
              <span className="text-sm">{genre.emoji}</span>
              {genre.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Book count ---- */}
      {hasLoadedSomething && !isLoading && (
        <div className="mb-3 mt-1">
          <p className="text-[11px] font-medium text-gray-400">
            {filteredBooks.length} book{filteredBooks.length !== 1 ? "s" : ""}
            {genreFilter
              ? ` in ${GENRES.find((g) => g.key === genreFilter)?.label || genreFilter}`
              : ""}
            {formatFilter === "audio" ? " with audio" : formatFilter === "books" ? " to read" : ""}
          </p>
        </div>
      )}

      {/* ---- Loading skeletons ---- */}
      {isLoading && visibleBooks.length === 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <BookSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ---- Book Grid ---- */}
      {visibleBooks.length > 0 && (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {visibleBooks.map((book) => {
            const displayUrl = book.cachedCoverUrl || book.coverUrl;
            return (
              <button
                key={book.id}
                onClick={() => handleBookTap(book)}
                className="group flex flex-col items-start text-left"
              >
                <div className="book-tilt relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gray-100 shadow-md ring-1 ring-black/5 transition-all duration-200 group-hover:shadow-lg group-active:scale-[0.96]">
                  {displayUrl ? (
                    <Image
                      src={displayUrl}
                      alt={book.title}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
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
                  {/* Audio indicator */}
                  {book.hasAudio && (
                    <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/85 shadow-sm backdrop-blur-sm">
                      <Headphones className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  {/* Pre-approved "Classic" badge */}
                  {book.source === "preApproved" && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-700/80 to-transparent px-1.5 pb-1 pt-3 text-center">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-white">
                        Classic
                      </span>
                    </div>
                  )}
                  {/* Audiobook "Listen" badge */}
                  {book.source === "audiobook" && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-violet-700/85 to-transparent px-1.5 pb-1 pt-3 text-center">
                      <span className="flex items-center justify-center gap-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
                        <Headphones className="h-2 w-2" />
                        Listen
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 w-full text-[11px] font-semibold leading-tight text-gray-800 group-hover:text-purple-700">
                  {book.title}
                </p>
                <p className="line-clamp-1 w-full text-[9px] text-gray-400">
                  {book.author}
                </p>
                {book.totalTime && (
                  <p className="text-[9px] font-medium text-violet-400">
                    {book.totalTime}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ---- Empty state (should rarely happen) ---- */}
      {!isLoading && hasLoadedSomething && filteredBooks.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50">
            <BookOpen className="h-8 w-8 text-purple-300" />
          </div>
          <p className="mt-4 text-base font-bold text-gray-600">
            No books match your filters
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Try removing a filter or browsing a different genre
          </p>
          <button
            onClick={() => {
              setFormatFilter("all");
              setGenreFilter(null);
            }}
            className="kid-touch mt-4 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-95"
          >
            Show All Books
          </button>
        </div>
      )}

      {/* ---- Infinite scroll sentinel ---- */}
      {visibleCount < filteredBooks.length && (
        <div ref={sentinelRef} className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
        </div>
      )}

      {/* ---- Bottom padding for nav ---- */}
      <div className="h-4" />
    </div>
  );
}
