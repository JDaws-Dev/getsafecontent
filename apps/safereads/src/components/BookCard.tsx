"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

export interface BookCardBook {
  _id: Id<"books">;
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
}

interface BookCardProps {
  book: BookCardBook;
}

export function BookCard({ book }: BookCardProps) {
  const year = book.publishedDate?.slice(0, 4);

  return (
    <Link
      href={`/dashboard/book/${book._id}`}
      className="group flex gap-4 rounded-2xl border border-brand-cream-2 bg-white p-4 transition-colors hover:border-accent-300 hover:shadow-sm"
    >
      <div className="relative h-32 w-20 flex-shrink-0 overflow-hidden rounded bg-brand-cream-2">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-8 w-8 text-accent-300" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-base font-bold text-brand-navy group-hover:text-accent-700">
          {book.title}
        </h3>
        <p className="mt-0.5 text-sm text-ink-500">
          {book.authors.join(", ")}
          {year && <span className="text-ink-400"> · {year}</span>}
          {book.pageCount && (
            <span className="text-ink-400"> · {book.pageCount} pp</span>
          )}
        </p>
        {book.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-ink-600">
            {book.description}
          </p>
        )}
        {book.categories && book.categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {book.categories.slice(0, 3).map((cat: string) => (
              <span
                key={cat}
                className="rounded-full bg-brand-cream-2 px-2 py-0.5 text-xs text-ink-500"
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
