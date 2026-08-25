"use client";

import { use, useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  BookOpen,
  Plus,
  Search,
  RotateCcw,
  AlertTriangle,
  User,
  Check as CheckIcon,
  Library,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "@/contexts/AuthContext";

type ApprovedBook = {
  _id: Id<"approvedBooks">;
  kidId: Id<"kids">;
  userId: Id<"users">;
  googleBookId: string;
  title: string;
  author: string;
  coverUrl?: string;
  addedAt: number;
  addedBy: string;
  notes?: string;
  gutenbergId?: string;
  isFreeBook?: boolean;
};

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  parent: { label: "Parent added", color: "text-blue-600 bg-blue-50" },
  request_approved: { label: "Request approved", color: "text-emerald-600 bg-emerald-50" },
  pre_approved: { label: "Pre-approved classic", color: "text-amber-600 bg-amber-50" },
};

export default function ManageBooksPage({
  params,
}: {
  params: Promise<{ kidId: string }>;
}) {
  const { kidId } = use(params);
  const { token } = useAuth();
  const kid = useQuery(api.kids.getById, {
    kidId: kidId as Id<"kids">,
    userToken: token ?? undefined,
  });
  const approvedBooks = useQuery(api.approvedBooks.listForKid, {
    kidId: kidId as Id<"kids">,
  });
  const preApprovedBooks = useQuery(api.preApprovedBooks.getPreApprovedBooks, {
    kidId: kidId as Id<"kids">,
    age: kid?.age,
  });

  const removeBook = useMutation(api.approvedBooks.removeForKid);
  const restorePreApproved = useMutation(api.preApprovedBooks.includeForKid);
  const excludePreApproved = useMutation(api.preApprovedBooks.excludeForKid);

  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "remove" | "exclude";
    bookId: string;
    title: string;
  } | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);

  // Filter books by search
  const filteredBooks = useMemo(() => {
    if (!approvedBooks) return [];
    if (!searchFilter) return approvedBooks;
    const q = searchFilter.toLowerCase();
    return (approvedBooks as ApprovedBook[]).filter(
      (b: ApprovedBook) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q)
    );
  }, [approvedBooks, searchFilter]);

  // Sort: most recently added first
  const sortedBooks = useMemo(() => {
    return [...filteredBooks].sort((a, b) => b.addedAt - a.addedAt);
  }, [filteredBooks]);

  // Get excluded pre-approved books
  const excludedBooks = useMemo(() => {
    if (!kid?.excludedPreApproved || !preApprovedBooks) return [];
    // We need to reference the full pre-approved list to get titles
    // The kid's excludedPreApproved is an array of gutenbergIds
    return kid.excludedPreApproved;
  }, [kid, preApprovedBooks]);

  async function handleRemoveConfirmed() {
    if (!confirmDialog) return;
    const { bookId } = confirmDialog;
    setRemoving(bookId);
    setConfirmDialog(null);
    try {
      await removeBook({
        kidId: kidId as Id<"kids">,
        googleBookId: bookId,
        userToken: token ?? undefined,
      });
    } finally {
      setRemoving(null);
    }
  }

  async function handleExcludeConfirmed() {
    if (!confirmDialog) return;
    const { bookId } = confirmDialog;
    setRemoving(bookId);
    setConfirmDialog(null);
    try {
      await excludePreApproved({
        kidId: kidId as Id<"kids">,
        gutenbergId: bookId,
      });
    } finally {
      setRemoving(null);
    }
  }

  async function handleRestore(gutenbergId: string) {
    setRestoring(gutenbergId);
    try {
      await restorePreApproved({
        kidId: kidId as Id<"kids">,
        gutenbergId: gutenbergId,
      });
    } finally {
      setRestoring(null);
    }
  }

  if (kid === undefined || approvedBooks === undefined) {
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

  return (
    <div>
      <Link
        href="/dashboard/kids"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to kids
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-navy">
            {kid.name}&apos;s Bookshelf
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {approvedBooks.length} approved book{approvedBooks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/search"
          className="flex items-center gap-2 rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-accent-50 transition-colors hover:bg-accent-800"
        >
          <Plus className="h-4 w-4" />
          Add Book
        </Link>
      </div>

      {/* Search filter */}
      {approvedBooks.length > 5 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter books..."
            className="w-full rounded-lg border border-brand-cream-2 bg-white py-2 pl-9 pr-4 text-sm text-brand-navy placeholder-ink-400 outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-400"
          />
        </div>
      )}

      {/* Approved books list */}
      {sortedBooks.length === 0 && !searchFilter ? (
        <div className="rounded-2xl border border-brand-cream-2 bg-white p-8 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-ink-300" />
          <p className="text-ink-600">
            No approved books yet. Search for books to add to {kid.name}&apos;s shelf.
          </p>
          <Link
            href="/dashboard/search"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-accent-50 transition-colors hover:bg-accent-800"
          >
            <Search className="h-4 w-4" />
            Search Books
          </Link>
        </div>
      ) : sortedBooks.length === 0 && searchFilter ? (
        <div className="rounded-2xl border border-brand-cream-2 bg-white p-6 text-center">
          <p className="text-sm text-ink-500">No books match &quot;{searchFilter}&quot;</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedBooks.map((book: ApprovedBook) => {
            const source = SOURCE_LABELS[book.addedBy] || SOURCE_LABELS.parent;
            const addedDate = new Date(book.addedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const isRemoving = removing === book.googleBookId;

            return (
              <div
                key={book._id}
                className={`rounded-2xl border border-brand-cream-2 bg-white px-4 py-3 transition-opacity ${
                  isRemoving ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Cover */}
                  <div className="shrink-0">
                    {book.coverUrl ? (
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        width={48}
                        height={72}
                        className="rounded object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-[72px] w-[48px] items-center justify-center rounded bg-brand-cream-2">
                        <BookOpen className="h-5 w-5 text-ink-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-medium text-brand-navy line-clamp-1">{book.title}</p>
                    <p className="text-sm text-ink-500 line-clamp-1">{book.author}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${source.color}`}>
                        {book.addedBy === "parent" && <User className="h-2.5 w-2.5" />}
                        {book.addedBy === "request_approved" && <CheckIcon className="h-2.5 w-2.5" />}
                        {book.addedBy === "pre_approved" && <Library className="h-2.5 w-2.5" />}
                        {source.label}
                      </span>
                      <span className="text-[10px] text-ink-400">{addedDate}</span>
                      {book.isFreeBook && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                          Free
                        </span>
                      )}
                    </div>
                    {book.notes && (
                      <p className="mt-1 text-xs italic text-ink-400">{book.notes}</p>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() =>
                      setConfirmDialog({
                        type: "remove",
                        bookId: book.googleBookId,
                        title: book.title,
                      })
                    }
                    disabled={isRemoving}
                    className="shrink-0 rounded p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    title="Remove from bookshelf"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Excluded Pre-Approved Classics */}
      {excludedBooks.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
            <RotateCcw className="h-4 w-4 text-ink-400" />
            Excluded Classics
          </h2>
          <p className="mb-3 text-xs text-ink-400">
            These pre-approved classics have been removed from {kid.name}&apos;s shelf. Restore them below.
          </p>
          <div className="space-y-1.5">
            {excludedBooks.map((gutenbergId: string) => (
              <div
                key={gutenbergId}
                className="flex items-center justify-between rounded-lg border border-brand-cream-2 bg-brand-cream px-4 py-2.5"
              >
                <span className="text-sm text-ink-600">
                  Classic #{gutenbergId}
                </span>
                <button
                  onClick={() => handleRestore(gutenbergId)}
                  disabled={restoring === gutenbergId}
                  className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-accent-700 shadow-sm transition-colors hover:bg-brand-cream-2 disabled:opacity-50"
                >
                  {restoring === gutenbergId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Restore
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Confirmation Dialog */}
      <Dialog.Root
        open={confirmDialog !== null}
        onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-brand-navy/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-brand-cream p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <Dialog.Title className="font-display text-lg font-bold text-brand-navy">
                Remove Book?
              </Dialog.Title>
            </div>
            <p className="mb-5 text-sm text-ink-600">
              Are you sure you want to remove{" "}
              <span className="font-medium">&quot;{confirmDialog?.title}&quot;</span>{" "}
              from {kid.name}&apos;s bookshelf? They won&apos;t be able to read it anymore until you re-add it.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="rounded-lg border border-brand-cream-2 px-4 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-brand-cream-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog?.type === "remove" ? handleRemoveConfirmed : handleExcludeConfirmed}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
