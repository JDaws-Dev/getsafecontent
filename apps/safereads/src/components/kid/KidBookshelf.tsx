"use client";

import { BookCard } from "./BookCard";
import { BookOpen, Search } from "lucide-react";
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
      <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <BookOpen className="h-8 w-8 text-emerald-300" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-800">
          No books yet!
        </h3>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          Search for books and ask your parent to add them to your shelf.
        </p>
        <Link
          href="/play/search"
          className="mt-5 flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
        >
          <Search className="h-4 w-4" />
          Find Books
        </Link>
      </div>
    );
  }

  return (
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
  );
}
