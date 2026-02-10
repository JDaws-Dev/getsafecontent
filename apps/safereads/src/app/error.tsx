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
      <BookOpen className="h-12 w-12 text-parchment-300" />
      <h2 className="mt-4 font-serif text-xl font-bold text-ink-900">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-parchment-700 px-6 py-2.5 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800"
      >
        Try again
      </button>
    </div>
  );
}
