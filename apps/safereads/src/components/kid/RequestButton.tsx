"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Heart, Check, X, Loader2, Clock } from "lucide-react";
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
      <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 px-3.5 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
        <Check className="h-3.5 w-3.5" />
        On Your Shelf
      </span>
    );
  }

  if (requestStatus === "pending" || justRequested) {
    return (
      <span className={`flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 px-3.5 py-2 text-xs font-bold text-amber-700 ring-1 ring-amber-200 ${justRequested ? "animate-bounce-once" : ""}`}>
        <Clock className="h-3.5 w-3.5" />
        {justRequested ? "Requested! \uD83D\uDE4F" : "Waiting on Parent"}
      </span>
    );
  }

  if (requestStatus === "denied") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-2 text-xs font-bold text-red-500 ring-1 ring-red-200">
        <X className="h-3.5 w-3.5" />
        Not Right Now
      </span>
    );
  }

  if (requestStatus === "approved") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 px-3.5 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
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
      className="kid-touch flex min-h-[44px] items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-200 transition-all duration-200 hover:from-violet-600 hover:to-purple-700 hover:shadow-lg active:scale-95 disabled:opacity-50"
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
