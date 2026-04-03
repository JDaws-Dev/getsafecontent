"use client";

import { BookCard } from "./BookCard";
import { BookOpen, Search, Sparkles } from "lucide-react";
import Link from "next/link";

interface ApprovedBook {
  _id: string;
  googleBookId: string;
  title: string;
  author: string;
  coverUrl?: string;
}

interface ReadingProgressItem {
  googleBookId: string;
  percentComplete: number;
}

interface KidBookshelfProps {
  books: ApprovedBook[];
  progress: ReadingProgressItem[];
  onBookClick: (book: ApprovedBook) => void;
}

export function KidBookshelf({ books, progress, onBookClick }: KidBookshelfProps) {
  const progressMap = new Map(
    progress.map((p) => [p.googleBookId, p.percentComplete])
  );

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center overflow-hidden rounded-3xl bg-gradient-to-b from-purple-50 via-violet-50 to-indigo-50 px-6 py-10 text-center ring-1 ring-purple-100">
        {/* Decorative book stack illustration */}
        <div className="relative">
          <div className="animate-float flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-purple-300 shadow-lg shadow-purple-200/50">
            <BookOpen className="h-12 w-12 text-white" />
          </div>
          {/* Floating decorative books */}
          <span className="absolute -left-6 -top-2 animate-float text-2xl opacity-60" style={{ animationDelay: "0.5s" }}>{"📖"}</span>
          <span className="absolute -right-5 top-0 animate-float text-xl opacity-50" style={{ animationDelay: "1s" }}>{"📚"}</span>
          <span className="absolute -bottom-2 -right-4 animate-float text-lg opacity-40" style={{ animationDelay: "1.5s" }}>{"✨"}</span>
        </div>
        <h3 className="mt-6 text-xl font-bold text-gray-800">
          Your bookshelf is waiting!
        </h3>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          Every great reader starts somewhere. Browse genres, explore classics, or search for your favorite books!
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/play/search"
            className="kid-touch flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-200 transition-all hover:shadow-xl hover:shadow-purple-300 active:scale-95"
          >
            <Search className="h-4 w-4" />
            Search for Books
          </Link>
          <Link
            href="/play/search?tab=free"
            className="kid-touch flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-emerald-700 shadow-md ring-1 ring-emerald-200 transition-all hover:shadow-lg active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            Free Classics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bookshelf-bg rounded-2xl px-3 pt-4 pb-1">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {books.map((book, index) => (
          <div
            key={book._id}
            className="animate-fade-up"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <BookCard
              title={book.title}
              author={book.author}
              coverUrl={book.coverUrl}
              progress={progressMap.get(book.googleBookId)}
              onClick={() => onBookClick(book)}
              size="md"
            />
          </div>
        ))}
      </div>
      {/* Bookshelf count */}
      <div className="mt-3 pb-2 text-center">
        <span className="text-[10px] font-bold text-amber-700/60">
          {books.length} book{books.length !== 1 ? "s" : ""} on your shelf
        </span>
      </div>
    </div>
  );
}
