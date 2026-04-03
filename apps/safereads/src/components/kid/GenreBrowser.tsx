"use client";

import { useState, useCallback, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowLeft, Loader2, BookOpen } from "lucide-react";
import { StylizedCover } from "./StylizedCover";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Genre definitions with emoji, gradient, and search key
const GENRES = [
  { key: "adventure", label: "Adventure", emoji: "\uD83C\uDFF4\u200D\u2620\uFE0F", gradient: "from-orange-400 to-red-500", bg: "bg-orange-50" },
  { key: "animals", label: "Animals", emoji: "\uD83D\uDC3E", gradient: "from-amber-400 to-yellow-500", bg: "bg-amber-50" },
  { key: "fantasy", label: "Fantasy", emoji: "\uD83D\uDC09", gradient: "from-purple-400 to-violet-600", bg: "bg-purple-50" },
  { key: "science", label: "Science", emoji: "\uD83D\uDD2C", gradient: "from-cyan-400 to-blue-500", bg: "bg-cyan-50" },
  { key: "history", label: "History", emoji: "\u2694\uFE0F", gradient: "from-stone-400 to-stone-600", bg: "bg-stone-50" },
  { key: "fairy-tales", label: "Fairy Tales", emoji: "\uD83E\uDDDA", gradient: "from-pink-400 to-rose-500", bg: "bg-pink-50" },
  { key: "mystery", label: "Mystery", emoji: "\uD83D\uDD0D", gradient: "from-indigo-400 to-blue-600", bg: "bg-indigo-50" },
  { key: "space", label: "Space", emoji: "\uD83D\uDE80", gradient: "from-violet-500 to-indigo-700", bg: "bg-violet-50" },
  { key: "nature", label: "Nature", emoji: "\uD83C\uDF3F", gradient: "from-emerald-400 to-green-600", bg: "bg-emerald-50" },
  { key: "humor", label: "Humor", emoji: "\uD83D\uDE02", gradient: "from-yellow-400 to-orange-400", bg: "bg-yellow-50" },
  { key: "sports", label: "Sports", emoji: "\u26BD", gradient: "from-green-400 to-teal-500", bg: "bg-green-50" },
  { key: "art-music", label: "Art & Music", emoji: "\uD83C\uDFA8", gradient: "from-fuchsia-400 to-pink-600", bg: "bg-fuchsia-50" },
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
      setGenreBooks(books);
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
            {GENRES.map((genre) => (
              <button
                key={genre.key}
                onClick={() => handleGenreClick(genre.key)}
                className="genre-card flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-white p-3 shadow-md ring-1 ring-black/5"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${genre.gradient}`}>
                  <span className="text-2xl">{genre.emoji}</span>
                </div>
                <span className="text-[11px] font-bold text-gray-700">
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
                  <span className="text-2xl">{selectedGenreData.emoji}</span>
                  <h3 className="text-lg font-bold text-gray-800">
                    {selectedGenreData.label} Books
                  </h3>
                </div>
              )}
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                <p className="mt-3 text-sm font-medium text-gray-500">
                  Finding {selectedGenreData?.label?.toLowerCase()} books...
                </p>
              </div>
            ) : genreBooks.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {genreBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => router.push(`/play/read/${encodeURIComponent(`gutenberg:${book.id}`)}`)}
                    className="group flex flex-col items-start text-left"
                  >
                    <div className="book-tilt relative h-40 w-full overflow-hidden rounded-xl bg-gray-100 shadow-md ring-1 ring-black/5">
                      {book.coverUrl ? (
                        <Image
                          src={book.coverUrl}
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
                    <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-gray-800 group-hover:text-purple-700">
                      {book.title}
                    </p>
                    <p className="line-clamp-1 text-[9px] text-gray-400">
                      {book.authors.join(", ")}
                    </p>
                  </button>
                ))}
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
                    className="kid-touch rounded-full bg-purple-50 px-4 py-2 text-xs font-bold text-purple-600 transition-all hover:bg-purple-100 active:scale-95"
                  >
                    Browse Genres
                  </button>
                  <button
                    onClick={() => router.push("/play/search")}
                    className="kid-touch rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
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
          <span className="text-base">{genre.emoji}</span>
          {genre.label}
        </button>
      ))}
    </div>
  );
}
