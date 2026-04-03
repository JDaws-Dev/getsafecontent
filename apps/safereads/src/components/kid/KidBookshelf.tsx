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
      <div className="flex flex-col items-center rounded-3xl bg-gradient-to-b from-purple-50 to-violet-50 px-6 py-10 text-center">
        <div className="animate-float flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-200">
          <BookOpen className="h-10 w-10 text-purple-400" />
        </div>
        <h3 className="mt-5 text-xl font-bold text-gray-800">
          Time to fill your bookshelf!
        </h3>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          Every great reader starts somewhere. Try tapping a genre above or browse the Library Classics to find your first book!
        </p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/play/search"
            className="kid-touch flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200 transition-all hover:shadow-xl hover:shadow-purple-300 active:scale-95"
          >
            <Search className="h-4 w-4" />
            Search for Books
          </Link>
          <Link
            href="/play/search?tab=free"
            className="kid-touch flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-emerald-700 shadow-md ring-1 ring-emerald-200 transition-all hover:shadow-lg active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            Free Classics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bookshelf-bg rounded-2xl px-3 pt-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {books.map((book) => (
          <BookCard
            key={book._id}
            title={book.title}
            author={book.author}
            coverUrl={book.coverUrl}
            progress={progressMap.get(book.googleBookId)}
            onClick={() => onBookClick(book)}
            size="md"
          />
        ))}
      </div>
    </div>
  );
}
