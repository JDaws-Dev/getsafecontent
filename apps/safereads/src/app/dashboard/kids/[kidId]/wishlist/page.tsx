"use client";

import { use } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { ArrowLeft, Loader2, Trash2, BookOpen } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

type WishlistItem = {
  _id: Id<"wishlists">;
  kidId: Id<"kids">;
  bookId: Id<"books">;
  note?: string;
  verdict: string | null;
  book: {
    _id: Id<"books">;
    title: string;
    authors: string[];
    coverUrl?: string;
    publishedDate?: string;
  } | null;
};

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  safe: { bg: "bg-verdict-safe/10", text: "text-verdict-safe", label: "Safe" },
  caution: { bg: "bg-verdict-caution/10", text: "text-verdict-caution", label: "Caution" },
  warning: { bg: "bg-verdict-warning/10", text: "text-verdict-warning", label: "Warning" },
  no_verdict: { bg: "bg-parchment-100", text: "text-ink-400", label: "No Verdict" },
};

export default function WishlistPage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = use(params);
  const kid = useQuery(api.kids.getById, {
    kidId: kidId as Id<"kids">,
  });
  const wishlist = useQuery(api.wishlists.listByKid, {
    kidId: kidId as Id<"kids">,
  });
  const removeItem = useMutation(api.wishlists.remove);
  const [removing, setRemoving] = useState<Id<"wishlists"> | null>(null);

  async function handleRemove(wishlistId: Id<"wishlists">) {
    setRemoving(wishlistId);
    try {
      await removeItem({ wishlistId });
    } finally {
      setRemoving(null);
    }
  }

  if (kid === undefined || wishlist === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-parchment-400" />
      </div>
    );
  }

  if (kid === null) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-ink-500">Child not found.</p>
        <Link
          href="/dashboard/kids"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-parchment-700 hover:text-parchment-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to kids
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/kids"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to kids
      </Link>

      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-ink-900">
          {kid.name}&apos;s Wishlist
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Books saved for {kid.name}. Search for books to add more.
        </p>
      </div>

      {wishlist.length === 0 ? (
        <div className="rounded-lg border border-parchment-200 bg-white p-8 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-ink-300" />
          <p className="text-ink-600">
            No books on the wishlist yet. Search for books and add them here.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-parchment-700 px-4 py-2 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800"
          >
            Search Books
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {wishlist.map((item: WishlistItem) => {
            if (!item.book) return null;
            const year = item.book.publishedDate?.slice(0, 4);

            return (
              <div
                key={item._id}
                className="flex items-center gap-4 rounded-lg border border-parchment-200 bg-white px-4 py-3"
              >
                <Link
                  href={`/dashboard/book/${item.bookId}`}
                  className="shrink-0"
                >
                  {item.book.coverUrl ? (
                    <Image
                      src={item.book.coverUrl}
                      alt={item.book.title}
                      width={48}
                      height={72}
                      className="rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-[72px] w-[48px] items-center justify-center rounded bg-parchment-100">
                      <BookOpen className="h-5 w-5 text-ink-300" />
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/book/${item.bookId}`}
                    className="font-medium text-ink-900 hover:text-parchment-700"
                  >
                    {item.book.title}
                  </Link>
                  <p className="text-sm text-ink-500">
                    {item.book.authors.join(", ")}
                    {year && ` · ${year}`}
                  </p>
                  {item.note && (
                    <p className="mt-1 text-xs text-ink-400 italic">
                      {item.note}
                    </p>
                  )}
                </div>
                {item.verdict && VERDICT_STYLES[item.verdict] && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${VERDICT_STYLES[item.verdict].bg} ${VERDICT_STYLES[item.verdict].text}`}
                  >
                    {VERDICT_STYLES[item.verdict].label}
                  </span>
                )}
                <button
                  onClick={() => handleRemove(item._id)}
                  disabled={removing === item._id}
                  className="shrink-0 rounded p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-verdict-warning disabled:opacity-50"
                  title="Remove from wishlist"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
