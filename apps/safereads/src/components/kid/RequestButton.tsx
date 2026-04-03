"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Heart, Check, X, Loader2 } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

interface RequestButtonProps {
  kidId: Id<"kids">;
  googleBookId: string;
  title: string;
  author: string;
  coverUrl?: string;
  /** Current status from bookRequests query: null = not requested, "pending", "approved", "denied" */
  requestStatus: string | null;
  /** Whether the book is already approved */
  isApproved: boolean;
}

export function RequestButton({
  kidId,
  googleBookId,
  title,
  author,
  coverUrl,
  requestStatus,
  isApproved,
}: RequestButtonProps) {
  const createRequest = useMutation(api.bookRequests.create);
  const [isLoading, setIsLoading] = useState(false);
  const [justRequested, setJustRequested] = useState(false);

  if (isApproved) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <Check className="h-3.5 w-3.5" />
        On Your Shelf
      </span>
    );
  }

  if (requestStatus === "pending" || justRequested) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
        <Loader2 className="h-3.5 w-3.5" />
        Asked Parent
      </span>
    );
  }

  if (requestStatus === "denied") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600">
        <X className="h-3.5 w-3.5" />
        Not Right Now
      </span>
    );
  }

  if (requestStatus === "approved") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <Check className="h-3.5 w-3.5" />
        Approved
      </span>
    );
  }

  const handleRequest = async () => {
    setIsLoading(true);
    try {
      await createRequest({
        kidId,
        googleBookId,
        title,
        author,
        coverUrl,
      });
      setJustRequested(true);
    } catch (err) {
      console.error("Failed to create request:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleRequest}
      disabled={isLoading}
      className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-95 disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Heart className="h-3.5 w-3.5" />
      )}
      Ask Parent
    </button>
  );
}
