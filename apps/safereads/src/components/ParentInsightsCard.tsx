"use client";

import {
  MessageCircle,
  Ban,
  BookOpen,
  Users,
  Lightbulb,
} from "lucide-react";

interface ChallengedBookStatus {
  isChallenged: boolean;
  reason: string;
  context: string;
}

interface SeriesContext {
  seriesName: string;
  bookNumber?: string;
  contentProgression: string;
}

export interface ParentInsightsData {
  parentCommunityNotes?: string;
  challengedBookStatus?: ChallengedBookStatus;
  seriesContext?: SeriesContext;
  parentTalkingPoints?: string[];
  comparableBooks?: string;
}

interface ParentInsightsCardProps {
  insights: ParentInsightsData;
}

export function ParentInsightsCard({ insights }: ParentInsightsCardProps) {
  const {
    parentCommunityNotes,
    challengedBookStatus,
    seriesContext,
    parentTalkingPoints,
    comparableBooks,
  } = insights;

  // Don't render if there's nothing to show
  const hasContent =
    parentCommunityNotes ||
    (challengedBookStatus && challengedBookStatus.isChallenged) ||
    seriesContext ||
    (parentTalkingPoints && parentTalkingPoints.length > 0) ||
    comparableBooks;

  if (!hasContent) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg font-bold text-ink-900">
        Parent Insights
      </h3>

      {/* Challenged/Banned Book Alert */}
      {challengedBookStatus && challengedBookStatus.isChallenged && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Ban className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                Challenged / Banned Book
              </p>
              {challengedBookStatus.reason && (
                <p className="mt-1 text-sm leading-relaxed text-amber-800">
                  {challengedBookStatus.reason}
                </p>
              )}
              {challengedBookStatus.context && (
                <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
                  {challengedBookStatus.context}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Series Context */}
      {seriesContext && (
        <div className="rounded-xl border border-parchment-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-parchment-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">
                {seriesContext.seriesName}
                {seriesContext.bookNumber && (
                  <span className="ml-2 text-xs font-normal text-ink-500">
                    Book {seriesContext.bookNumber}
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                {seriesContext.contentProgression}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Parent Community Notes */}
      {parentCommunityNotes && (
        <div className="rounded-xl border border-parchment-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-parchment-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">
                What Parents Say
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                {parentCommunityNotes}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comparable Books */}
      {comparableBooks && (
        <div className="rounded-xl border border-parchment-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-parchment-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">
                How It Compares
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                {comparableBooks}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Parent Talking Points */}
      {parentTalkingPoints && parentTalkingPoints.length > 0 && (
        <div className="rounded-xl border border-parchment-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-parchment-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">
                Talking Points
              </p>
              <ul className="mt-2 space-y-2">
                {parentTalkingPoints.map((point, i) => (
                  <li
                    key={i}
                    className="text-sm leading-relaxed text-ink-600"
                  >
                    <span className="mr-1.5 text-parchment-400">&bull;</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
