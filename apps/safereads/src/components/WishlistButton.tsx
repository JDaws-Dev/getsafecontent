"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import * as Dialog from "@radix-ui/react-dialog";
import { Heart, X, Check, Loader2 } from "lucide-react";

type Kid = {
  _id: Id<"kids">;
  name: string;
  age?: number;
};

export function WishlistButton({ bookId }: { bookId: Id<"books"> }) {
  const userId = useQuery(api.users.currentUserId);
  const kids = useQuery(
    api.kids.listByUser,
    userId ? { userId } : "skip"
  );

  const [dialogOpen, setDialogOpen] = useState(false);

  if (!kids || kids.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-parchment-300 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-parchment-50"
      >
        <Heart className="h-4 w-4" />
        Add to Wishlist
      </button>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink-900/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-parchment-50 p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="font-serif text-lg font-bold text-ink-900">
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

  async function handleToggle() {
    setLoading(true);
    try {
      if (isOnWishlist) {
        await removeFromWishlist({ kidId: kid._id, bookId });
      } else {
        await addToWishlist({ kidId: kid._id, bookId });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading || isOnWishlist === undefined}
      className="flex w-full items-center justify-between rounded-lg border border-parchment-200 bg-white px-4 py-3 text-left transition-colors hover:bg-parchment-50 disabled:opacity-50"
    >
      <div>
        <span className="font-medium text-ink-900">{kid.name}</span>
        {kid.age !== undefined && (
          <span className="ml-2 text-xs text-ink-400">Age {kid.age}</span>
        )}
      </div>
      <div className="shrink-0">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink-400" />
        ) : isOnWishlist ? (
          <Check className="h-4 w-4 text-verdict-safe" />
        ) : (
          <Heart className="h-4 w-4 text-ink-300" />
        )}
      </div>
    </button>
  );
}
