"use client";

import { Loader2, Sparkles } from "lucide-react";

interface AnalyzeButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}

export function AnalyzeButton({ onClick, loading, disabled }: AnalyzeButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-parchment-700 px-4 py-2 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Reviewing…
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Get Review
        </>
      )}
    </button>
  );
}
