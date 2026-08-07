"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import * as Dialog from "@radix-ui/react-dialog";
import { Heart, X, Check, Loader2, BookMarked, Eye, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type WishlistStatus = "want_to_read" | "reading" | "finished" | "not_interested";

type Kid = {
  _id: Id<"kids">;
  name: string;
  age?: number;
};

const STATUS_OPTIONS: { value: WishlistStatus; label: string; icon: React.ReactNode }[] = [
  { value: "want_to_read", label: "Want to Read", icon: <BookMarked className="h-3.5 w-3.5" /> },
  { value: "reading", label: "Reading", icon: <Eye className="h-3.5 w-3.5" /> },
  { value: "finished", label: "Finished", icon: <Check className="h-3.5 w-3.5" /> },
  { value: "not_interested", label: "Not Interested", icon: <XCircle className="h-3.5 w-3.5" /> },
];

export function WishlistButton({ bookId }: { bookId: Id<"books"> }) {
  const { user: authUser, token } = useAuth();
  const userId = useQuery(api.users.currentUserId, authUser?.email ? { email: authUser.email } : "skip");
  const kids = useQuery(
    api.kids.listByUser,
    userId ? { userId, userToken: token ?? undefined } : "skip"
  );

  const [dialogOpen, setDialogOpen] = useState(false);

  if (!kids || kids.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-brand-cream-2 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-cream-2"
      >
        <Heart className="h-4 w-4" />
        Add to Wishlist
      </button>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-brand-navy/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-brand-cream p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="font-display text-lg font-bold text-brand-navy">
                Add to Wishlist
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="rounded p-1 text-ink-400 hover:text-ink-600"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            <p className="mb-3 text-sm text-ink-500">
              Choose which child&apos;s wishlist to add this book to:
            </p>
            <div className="space-y-2">
              {kids.map((kid: Kid) => (
                <WishlistKidRow
                  key={kid._id}
                  kid={kid}
                  bookId={bookId}
                />
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function WishlistKidRow({
  kid,
  bookId,
}: {
  kid: Kid;
  bookId: Id<"books">;
}) {
  const isOnWishlist = useQuery(api.wishlists.isOnWishlist, {
    kidId: kid._id,
    bookId,
  });
  const addToWishlist = useMutation(api.wishlists.add);
  const removeFromWishlist = useMutation(api.wishlists.removeByKidAndBook);
  const [loading, setLoading] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  async function handleAdd(status: WishlistStatus = "want_to_read") {
    setLoading(true);
    try {
      await addToWishlist({ kidId: kid._id, bookId, status });
      setShowStatusPicker(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setLoading(true);
    try {
      await removeFromWishlist({ kidId: kid._id, bookId });
    } finally {
      setLoading(false);
    }
  }

  if (isOnWishlist) {
    return (
      <button
        onClick={handleRemove}
        disabled={loading}
        className="flex w-full items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition-colors hover:bg-emerald-100 disabled:opacity-50"
      >
        <div>
          <span className="font-medium text-brand-navy">{kid.name}</span>
          {kid.age !== undefined && (
            <span className="ml-2 text-xs text-ink-400">Age {kid.age}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-ink-400" />
          ) : (
            <>
              <Check className="h-4 w-4 text-verdict-safe" />
              <span className="text-xs text-verdict-safe">Added</span>
            </>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-cream-2 bg-white transition-colors">
      {!showStatusPicker ? (
        <button
          onClick={() => setShowStatusPicker(true)}
          disabled={loading || isOnWishlist === undefined}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-brand-cream-2 disabled:opacity-50"
        >
          <div>
            <span className="font-medium text-brand-navy">{kid.name}</span>
            {kid.age !== undefined && (
              <span className="ml-2 text-xs text-ink-400">Age {kid.age}</span>
            )}
          </div>
          <Heart className="h-4 w-4 text-ink-300" />
        </button>
      ) : (
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-medium text-ink-500">
            Add to {kid.name}&apos;s list as:
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleAdd(opt.value)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-md border border-brand-cream-2 px-2.5 py-2 text-xs font-medium text-ink-600 transition-colors hover:bg-brand-cream-2 disabled:opacity-50"
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowStatusPicker(false)}
            className="mt-1.5 text-xs text-ink-400 hover:text-ink-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
