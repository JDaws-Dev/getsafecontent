"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  ArrowLeft, Loader2, BookOpen,
  Compass, PawPrint, Castle, FlaskConical, Landmark, Crown, Fingerprint,
  Rocket, Leaf, Laugh, Trophy, Palette, Ghost, MessageSquare, Zap,
} from "lucide-react";
import { StylizedCover } from "./StylizedCover";
import { useCoverFetcher } from "@/hooks/useCoverFetcher";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Genre definitions with icon, gradient, and search key
const GENRES = [
  { key: "adventure", label: "Adventure", Icon: Compass, gradient: "from-orange-400 to-red-500", bg: "bg-orange-50" },
  { key: "animals", label: "Animals", Icon: PawPrint, gradient: "from-amber-400 to-yellow-500", bg: "bg-amber-50" },
  { key: "fantasy", label: "Fantasy", Icon: Castle, gradient: "from-purple-400 to-violet-600", bg: "bg-purple-50" },
  { key: "science", label: "Science", Icon: FlaskConical, gradient: "from-cyan-400 to-blue-500", bg: "bg-cyan-50" },
  { key: "history", label: "History", Icon: Landmark, gradient: "from-stone-400 to-stone-600", bg: "bg-stone-50" },
  { key: "fairy-tales", label: "Fairy Tales", Icon: Crown, gradient: "from-pink-400 to-rose-500", bg: "bg-pink-50" },
  { key: "mystery", label: "Mystery", Icon: Fingerprint, gradient: "from-indigo-400 to-blue-600", bg: "bg-indigo-50" },
  { key: "space", label: "Space", Icon: Rocket, gradient: "from-violet-500 to-indigo-700", bg: "bg-violet-50" },
  { key: "nature", label: "Nature", Icon: Leaf, gradient: "from-emerald-400 to-green-600", bg: "bg-emerald-50" },
  { key: "humor", label: "Humor", Icon: Laugh, gradient: "from-yellow-400 to-orange-400", bg: "bg-yellow-50" },
  { key: "sports", label: "Sports", Icon: Trophy, gradient: "from-green-400 to-teal-500", bg: "bg-green-50" },
  { key: "art-music", label: "Art & Music", Icon: Palette, gradient: "from-fuchsia-400 to-pink-600", bg: "bg-fuchsia-50" },
  { key: "scary", label: "Scary Stories", Icon: Ghost, gradient: "from-gray-600 to-gray-900", bg: "bg-gray-100" },
  { key: "comics", label: "Comics", Icon: MessageSquare, gradient: "from-sky-400 to-blue-500", bg: "bg-sky-50" },
  { key: "action", label: "Action", Icon: Zap, gradient: "from-red-500 to-rose-600", bg: "bg-red-50" },
];

interface GenreBrowserProps {
  /** "grid" for home page (compact), "pills" for search page (horizontal scroll) */
  layout: "grid" | "pills";
  onGenreSelect?: (genre: string) => void;
}

interface FreeBook {
  id: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  source: "gutenberg";
}

export function GenreBrowser({ layout, onGenreSelect }: GenreBrowserProps) {
  const router = useRouter();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreBooks, setGenreBooks] = useState<FreeBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const browseByGenre = useAction(api.freeBooks.browseByGenre);

  // Batch lookup cached covers for genre results
  const genreBookIds = useMemo(
    () => genreBooks.map((b) => b.id.replace(/^(gutenberg|bloom|lit2go|librivox|bookdash):/, "")),
    [genreBooks]
  );
  const cachedCovers = useQuery(
    api.bookCovers.getCachedCovers,
    genreBookIds.length > 0 ? { bookIdentifiers: genreBookIds } : "skip"
  );

  // Background cover fetching
  const booksForCoverFetch = useMemo(
    () =>
      genreBooks.map((b) => {
        const rawId = b.id.replace(/^(gutenberg|bloom|lit2go|librivox|bookdash):/, "");
        return {
          identifier: rawId,
          title: b.title,
          author: b.authors?.join(", ") || "Unknown",
          hasCachedCover: !!cachedCovers?.[rawId]?.coverUrl,
          hasSourceCover: !!b.coverUrl && !b.coverUrl.includes("gutenberg.org"),
        };
      }),
    [genreBooks, cachedCovers]
  );
  useCoverFetcher(booksForCoverFetch);

  const handleGenreClick = useCallback(async (genreKey: string) => {
    if (onGenreSelect) {
      onGenreSelect(genreKey);
      return;
    }

    setSelectedGenre(genreKey);
    setIsLoading(true);
    setGenreBooks([]);
    try {
      const books = await browseByGenre({ genre: genreKey });
      setGenreBooks(books as unknown as FreeBook[]);
    } catch (err) {
      console.error("Failed to browse genre:", err);
    } finally {
      setIsLoading(false);
    }
  }, [browseByGenre, onGenreSelect]);

  const selectedGenreData = GENRES.find((g) => g.key === selectedGenre);

  // Grid layout for home page
  if (layout === "grid") {
    return (
      <div>
        {!selectedGenre ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {GENRES.map((genre, index) => (
              <button
                key={genre.key}
                onClick={() => handleGenreClick(genre.key)}
                className="genre-card group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-3 shadow-md ring-1 ring-black/5"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${genre.gradient} shadow-sm transition-transform duration-200 group-hover:scale-110 group-active:scale-95`}>
                  <genre.Icon className="h-7 w-7 text-white drop-shadow-sm" strokeWidth={2.25} />
                </div>
                <span className="text-[11px] font-bold text-gray-700 transition-colors group-hover:text-accent-600">
                  {genre.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div>
            {/* Genre results header */}
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={() => { setSelectedGenre(null); setGenreBooks([]); }}
                className="kid-touch flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md transition-all hover:shadow-lg active:scale-95"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </button>
              {selectedGenreData && (
                <div className="flex items-center gap-2">
                  <selectedGenreData.Icon className="h-6 w-6 text-accent-600" strokeWidth={2.25} />
                  <h3 className="font-display text-lg font-bold text-brand-navy">
                    {selectedGenreData.label} Books
                  </h3>
                </div>
              )}
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
                <p className="mt-3 text-sm font-medium text-gray-500">
                  Finding {selectedGenreData?.label?.toLowerCase()} books...
                </p>
              </div>
            ) : genreBooks.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {genreBooks.map((book) => {
                  const rawId = book.id.replace(/^(gutenberg|bloom|lit2go|librivox|bookdash):/, "");
                  const displayUrl = cachedCovers?.[rawId]?.coverUrl || book.coverUrl;
                  return (
                  <button
                    key={book.id}
                    onClick={() => router.push(`/read/book/${encodeURIComponent(`gutenberg:${book.id}`)}`)}
                    className="group flex flex-col items-start text-left"
                  >
                    <div className="book-tilt relative h-40 w-full overflow-hidden rounded-xl bg-gray-100 shadow-md ring-1 ring-black/5">
                      {displayUrl ? (
                        <Image
                          src={displayUrl}
                          alt={book.title}
                          fill
                          sizes="120px"
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
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600/90 to-transparent px-2 pb-1.5 pt-4 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white">Free</span>
                      </div>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-gray-800 group-hover:text-accent-700">
                      {book.title}
                    </p>
                    <p className="line-clamp-1 text-[9px] text-gray-400">
                      {book.authors.join(", ")}
                    </p>
                  </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-2xl bg-white px-4 py-8 text-center shadow-sm">
                <span className="text-3xl">{"\uD83D\uDD0D"}</span>
                <p className="mt-2 text-sm font-medium text-gray-600">
                  No {selectedGenreData?.label?.toLowerCase()} books found right now
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Try another genre or search for something specific!
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => { setSelectedGenre(null); setGenreBooks([]); }}
                    className="kid-touch rounded-full bg-accent-50 px-4 py-2 text-xs font-bold text-accent-600 transition-all hover:bg-accent-100 active:scale-95"
                  >
                    Browse Genres
                  </button>
                  <button
                    onClick={() => router.push("/read/search")}
                    className="kid-touch rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
                  >
                    Search Books
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Pills layout for search page (horizontal scroll)
  return (
    <div className="flex gap-2 overflow-x-auto overscroll-contain pb-2 scrollbar-none">
      {GENRES.map((genre) => (
        <button
          key={genre.key}
          onClick={() => handleGenreClick(genre.key)}
          className={`kid-touch flex min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold shadow-sm transition-all duration-200 active:scale-95 ${
            selectedGenre === genre.key
              ? `bg-gradient-to-r ${genre.gradient} text-white shadow-md`
              : "bg-white text-gray-700 ring-1 ring-black/5 hover:shadow-md"
          }`}
        >
          <genre.Icon className="h-4 w-4" strokeWidth={2.25} />
          {genre.label}
        </button>
      ))}
    </div>
  );
}
