"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { BookHeader } from "@/components/BookHeader";
import { AmazonButton } from "@/components/AmazonButton";
import { WishlistButton } from "@/components/WishlistButton";
import { VerdictSection } from "@/components/VerdictSection";
import { AlternativesSuggestions } from "@/components/AlternativesSuggestions";
import { ContentFlagSummary } from "@/components/ContentFlagSummary";
import { BookNotes } from "@/components/BookNotes";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const book = useQuery(api.books.getById, {
    bookId: id as Id<"books">,
  });

  if (book === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-parchment-400" />
      </div>
    );
  }

  if (book === null) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-ink-500">Book not found.</p>
        <Link
          href="/dashboard/search"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-parchment-700 hover:text-parchment-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/search"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Link>

      <BookHeader
        book={book}
        actions={
          <div className="flex flex-wrap gap-2">
            <AmazonButton
              title={book.title}
              authors={book.authors}
              isbn={book.isbn13 ?? book.isbn10}
            />
            <WishlistButton bookId={book._id} />
          </div>
        }
      />

      <div className="mt-4">
        <ContentFlagSummary bookId={book._id} />
      </div>

      <div className="mt-6">
        <BookNotes bookId={book._id} />
      </div>

      <div className="mt-8">
        <VerdictSection bookId={book._id} bookTitle={book.title} />
      </div>

      <div className="mt-8">
        <AlternativesSuggestions bookId={book._id} />
      </div>
    </div>
  );
}
