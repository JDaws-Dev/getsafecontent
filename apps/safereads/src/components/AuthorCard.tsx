"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, User } from "lucide-react";

export interface AuthorCardData {
  name: string;
  bookCount: number;
  topBooks: Array<{
    title: string;
    coverUrl?: string;
  }>;
  categories: string[];
}

interface AuthorCardProps {
  author: AuthorCardData;
}

export function AuthorCard({ author }: AuthorCardProps) {
  const encodedName = encodeURIComponent(author.name);

  return (
    <Link
      href={`/dashboard/author/${encodedName}`}
      className="group flex gap-4 rounded-lg border border-parchment-300 bg-parchment-50 p-4 transition-colors hover:border-parchment-400 hover:shadow-sm"
    >
      {/* Author avatar / icon */}
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-parchment-200">
        <User className="h-8 w-8 text-parchment-500" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-parchment-200 px-2 py-0.5 text-xs font-medium text-ink-600">
            Author
          </span>
        </div>
        <h3 className="mt-1 font-serif text-base font-bold text-ink-900 group-hover:text-parchment-700">
          {author.name}
        </h3>
        <p className="mt-0.5 text-sm text-ink-500">
          {author.bookCount} {author.bookCount === 1 ? "book" : "books"} found
        </p>

        {/* Book cover thumbnails */}
        {author.topBooks.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {author.topBooks.slice(0, 4).map((book, i) => (
              <div
                key={i}
                className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-parchment-100"
              >
                {book.coverUrl ? (
                  <Image
                    src={book.coverUrl}
                    alt={book.title}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-3 w-3 text-parchment-300" />
                  </div>
                )}
              </div>
            ))}
            {author.bookCount > 4 && (
              <div className="flex h-12 w-8 flex-shrink-0 items-center justify-center rounded bg-parchment-100 text-xs text-ink-400">
                +{author.bookCount - 4}
              </div>
            )}
          </div>
        )}

        {/* Category badges */}
        {author.categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {author.categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-parchment-100 px-2 py-0.5 text-xs text-ink-500"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
