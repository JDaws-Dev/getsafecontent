"use client";

import { use } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { ArrowLeft, Loader2, Trash2, BookOpen, ChevronDown, Check, BookMarked, Eye, XCircle, Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type WishlistStatus = "want_to_read" | "reading" | "finished" | "not_interested";

type WishlistItem = {
  _id: Id<"wishlists">;
  kidId: Id<"kids">;
  bookId: Id<"books">;
  note?: string;
  status: WishlistStatus;
  verdict: string | null;
  book: {
    _id: Id<"books">;
    title: string;
    authors: string[];
    coverUrl?: string;
    publishedDate?: string;
    googleBooksId?: string;
  } | null;
};

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  safe: { bg: "bg-verdict-safe/10", text: "text-verdict-safe", label: "Safe" },
  caution: { bg: "bg-verdict-caution/10", text: "text-verdict-caution", label: "Caution" },
  warning: { bg: "bg-verdict-warning/10", text: "text-verdict-warning", label: "Warning" },
  no_verdict: { bg: "bg-brand-cream-2", text: "text-ink-400", label: "No Verdict" },
};

const STATUS_CONFIG: Record<WishlistStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  want_to_read: {
    label: "Want to Read",
    icon: <BookMarked className="h-4 w-4" />,
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  reading: {
    label: "Reading",
    icon: <Eye className="h-4 w-4" />,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  finished: {
    label: "Finished",
    icon: <Check className="h-4 w-4" />,
    color: "text-purple-700",
    bg: "bg-purple-50",
  },
  not_interested: {
    label: "Not Interested",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-gray-500",
    bg: "bg-gray-50",
  },
};

const STATUS_ORDER: WishlistStatus[] = ["reading", "want_to_read", "finished", "not_interested"];

export default function WishlistPage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = use(params);
  const { user: authUser, token } = useAuth();
  const currentUser = useQuery(
    api.users.currentUser,
    authUser?.email ? { email: authUser.email } : "skip"
  );
  const kid = useQuery(api.kids.getById, {
    kidId: kidId as Id<"kids">,
    userToken: token ?? undefined,
  });
  const wishlist = useQuery(api.wishlists.listByKid, {
    kidId: kidId as Id<"kids">,
  });
  const kids = useQuery(
    api.kids.listByUser,
    currentUser?._id ? { userId: currentUser._id, userToken: token ?? undefined } : "skip"
  );
  const removeItem = useMutation(api.wishlists.remove);
  const updateStatus = useMutation(api.wishlists.updateStatus);
  const addApprovedBook = useMutation(api.approvedBooks.addForKid);
  const [removing, setRemoving] = useState<Id<"wishlists"> | null>(null);
  const [statusMenu, setStatusMenu] = useState<Id<"wishlists"> | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  async function handleRemove(wishlistId: Id<"wishlists">) {
    setRemoving(wishlistId);
    try {
      await removeItem({ wishlistId });
    } finally {
      setRemoving(null);
    }
  }

  async function handleStatusChange(wishlistId: Id<"wishlists">, status: WishlistStatus) {
    await updateStatus({ wishlistId, status });
    setStatusMenu(null);
  }

  async function handleApproveForKid(item: WishlistItem, targetKidId: Id<"kids">) {
    if (!item.book || !currentUser) return;
    const key = `${item._id}-${targetKidId}`;
    setApproving(key);
    try {
      await addApprovedBook({
        userId: currentUser._id,
        kidId: targetKidId,
        googleBookId: item.book.googleBooksId || item.book._id,
        title: item.book.title,
        author: item.book.authors.join(", "),
        coverUrl: item.book.coverUrl,
        addedBy: "parent",
      });
    } finally {
      setApproving(null);
    }
  }

  if (kid === undefined || wishlist === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
      </div>
    );
  }

  if (kid === null) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-ink-500">Child not found.</p>
        <Link
          href="/dashboard/kids"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:text-accent-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to kids
        </Link>
      </div>
    );
  }

  // Group items by status
  const grouped: Record<WishlistStatus, WishlistItem[]> = {
    want_to_read: [],
    reading: [],
    finished: [],
    not_interested: [],
  };
  for (const item of (wishlist as WishlistItem[])) {
    const status = item.status || "want_to_read";
    grouped[status].push(item);
  }

  const totalCount = wishlist.length;
  const statusCounts = STATUS_ORDER.map((s) => ({
    status: s,
    count: grouped[s].length,
    ...STATUS_CONFIG[s],
  }));

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
        <h1 className="font-display text-2xl font-bold text-brand-navy">
          {kid.name}&apos;s Wishlist
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {totalCount} book{totalCount !== 1 ? "s" : ""} saved for {kid.name}.
        </p>
      </div>

      {/* Status summary pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {statusCounts.filter((s) => s.count > 0).map((s) => (
          <div
            key={s.status}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${s.bg} ${s.color}`}
          >
            {s.icon}
            <span>{s.label}</span>
            <span className="ml-0.5 font-bold">{s.count}</span>
          </div>
        ))}
      </div>

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-brand-cream-2 bg-white p-8 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-ink-300" />
          <p className="text-ink-600">
            No books on the wishlist yet. Search for books and add them here.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-accent-50 transition-colors hover:bg-accent-800"
          >
            Search Books
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {STATUS_ORDER.map((status) => {
            const items = grouped[status];
            if (items.length === 0) return null;
            const config = STATUS_CONFIG[status];

            return (
              <section key={status}>
                <h2 className={`mb-3 flex items-center gap-2 text-sm font-bold ${config.color}`}>
                  {config.icon}
                  {config.label}
                  <span className="ml-1 rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-ink-400">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-2">
                  {items.map((item: WishlistItem) => {
                    if (!item.book) return null;
                    const year = item.book.publishedDate?.slice(0, 4);

                    return (
                      <div
                        key={item._id}
                        className="rounded-2xl border border-brand-cream-2 bg-white px-4 py-3"
                      >
                        <div className="flex items-start gap-3">
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
                              <div className="flex h-[72px] w-[48px] items-center justify-center rounded bg-brand-cream-2">
                                <BookOpen className="h-5 w-5 text-ink-300" />
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/dashboard/book/${item.bookId}`}
                              className="font-display font-medium text-brand-navy hover:text-accent-700"
                            >
                              {item.book.title}
                            </Link>
                            <p className="text-sm text-ink-500">
                              {item.book.authors.join(", ")}
                              {year && ` \u00b7 ${year}`}
                            </p>
                            {item.note && (
                              <p className="mt-1 text-xs italic text-ink-400">
                                {item.note}
                              </p>
                            )}

                            {/* Action buttons row */}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {/* Status selector */}
                              <div className="relative">
                                <button
                                  onClick={() => setStatusMenu(statusMenu === item._id ? null : item._id)}
                                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${config.bg} ${config.color} hover:opacity-80`}
                                >
                                  {config.icon}
                                  <span className="hidden sm:inline">{config.label}</span>
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                                {statusMenu === item._id && (
                                  <div className="absolute left-0 top-full z-10 mt-1 w-44 rounded-lg border border-brand-cream-2 bg-white py-1 shadow-lg">
                                    {STATUS_ORDER.map((s) => {
                                      const sc = STATUS_CONFIG[s];
                                      return (
                                        <button
                                          key={s}
                                          onClick={() => handleStatusChange(item._id, s)}
                                          className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-brand-cream-2 ${
                                            status === s ? `${sc.color} ${sc.bg}` : "text-ink-600"
                                          }`}
                                        >
                                          {sc.icon}
                                          {sc.label}
                                          {status === s && <Check className="ml-auto h-3 w-3" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Approve for kid button(s) */}
                              {(kids || []).map((k) => {
                                const key = `${item._id}-${k._id}`;
                                return (
                                  <button
                                    key={k._id}
                                    onClick={() => handleApproveForKid(item, k._id as Id<"kids">)}
                                    disabled={approving === key}
                                    className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                                    title={`Approve for ${k.name}'s bookshelf`}
                                  >
                                    {approving === key ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Plus className="h-3 w-3" />
                                    )}
                                    <span className="hidden sm:inline">Approve for</span> {k.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right side: verdict + remove */}
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            {item.verdict && VERDICT_STYLES[item.verdict] && (
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${VERDICT_STYLES[item.verdict].bg} ${VERDICT_STYLES[item.verdict].text}`}
                              >
                                {VERDICT_STYLES[item.verdict].label}
                              </span>
                            )}
                            <button
                              onClick={() => handleRemove(item._id)}
                              disabled={removing === item._id}
                              className="rounded p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-verdict-warning disabled:opacity-50"
                              title="Remove from wishlist"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
