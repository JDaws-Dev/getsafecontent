"use client";

import { useEffect } from "react";
import { BookOpen } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <BookOpen className="h-12 w-12 text-accent-300" />
      <h2 className="mt-4 font-display text-xl font-bold text-brand-navy">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-accent-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-700"
      >
        Try again
      </button>
    </div>
  );
}
