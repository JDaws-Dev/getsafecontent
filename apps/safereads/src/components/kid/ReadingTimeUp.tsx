"use client";

import Link from "next/link";
import { Hourglass, ArrowLeft } from "lucide-react";
import { limitMessage, type ReadingTimeStatus } from "@/hooks/useReadingTime";

/**
 * What a child sees when their daily reading time is used up.
 *
 * Warm, plain, and final — no countdown to stare at, no "ask a grown-up"
 * button that turns a boundary into a negotiation. The parent set the limit;
 * this screen just delivers it kindly. Nothing technical ever appears here.
 */
export function ReadingTimeUp({
  status,
  onBack,
  backHref = "/read/home",
  fullScreen = false,
}: {
  status: ReadingTimeStatus | undefined;
  /** Supply for in-app back behaviour (the reader); otherwise a link is shown. */
  onBack?: () => void;
  backHref?: string;
  fullScreen?: boolean;
}) {
  const body = (
    <div className="flex flex-col items-center px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-50 ring-1 ring-accent-200">
        <Hourglass className="h-9 w-9 text-accent-500" />
      </div>
      <h2 className="mt-5 font-display text-xl font-bold text-brand-navy">
        Time to rest your eyes
      </h2>
      <p className="mt-2 max-w-xs text-sm text-ink-500">{limitMessage(status)}</p>

      {typeof status?.minutesUsed === "number" && status.minutesUsed > 0 && (
        <p className="mt-4 text-xs text-ink-400">
          You read for {formatMinutes(status.minutesUsed)} today
          {status.scope === "family" ? " across your Safe Family apps" : ""}.
        </p>
      )}

      {onBack ? (
        <button
          onClick={onBack}
          className="kid-touch mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-accent-200 transition-transform active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bookshelf
        </button>
      ) : (
        <Link
          href={backHref}
          className="kid-touch mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-accent-200 transition-transform active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bookshelf
        </Link>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-brand-cream">
        {body}
      </div>
    );
  }
  return <div className="flex min-h-[60vh] items-center justify-center">{body}</div>;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${h}h ${m}m`;
}
