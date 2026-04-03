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
      <div className="flex flex-col items-center rounded-3xl bg-gradient-to-b from-purple-50 to-violet-50 px-6 py-12 text-center">
        <div className="animate-float flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-200">
          <BookOpen className="h-10 w-10 text-purple-400" />
        </div>
        <h3 className="mt-5 text-xl font-bold text-gray-800">
          Your bookshelf is empty!
        </h3>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          Search for books you love and ask your parent to add them. Your collection starts here!
        </p>
        <Link
          href="/play/search"
          className="kid-touch mt-6 flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-200 transition-all hover:shadow-xl hover:shadow-purple-300 active:scale-95"
        >
          <Search className="h-4 w-4" />
          Find Books
          <Sparkles className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bookshelf-bg rounded-2xl px-3 pt-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
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
