"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const SEVERITY_COLORS: Record<string, string> = {
  mild: "bg-verdict-safe",
  moderate: "bg-verdict-caution",
  heavy: "bg-verdict-warning",
};

export function ContentFlagSummary({ bookId }: { bookId: Id<"books"> }) {
  const analysis = useQuery(api.analyses.getByBook, { bookId });

  if (!analysis) return null;

  const activeFlags = analysis.contentFlags.filter(
    (f: { severity: string }) => f.severity !== "none"
  );

  if (activeFlags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {activeFlags.map((flag: { category: string; severity: string }) => (
        <span
          key={flag.category}
          className="inline-flex items-center gap-1.5 rounded-full border border-parchment-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-700"
        >
          <span
            className={`h-2 w-2 rounded-full ${SEVERITY_COLORS[flag.severity] ?? "bg-ink-300"}`}
          />
          {flag.category}
        </span>
      ))}
    </div>
  );
}
