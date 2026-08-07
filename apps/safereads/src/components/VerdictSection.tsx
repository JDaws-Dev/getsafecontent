"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { VerdictCard, VerdictCardAnalysis } from "./VerdictCard";
import { ContentFlagList, ContentFlag } from "./ContentFlagList";
import { ParentInsightsCard, ParentInsightsData } from "./ParentInsightsCard";
import { AnalyzeButton } from "./AnalyzeButton";
import { ReportButton } from "./ReportButton";
import { ShareVerdictButton } from "./ShareVerdictButton";
import { UpgradePrompt } from "./UpgradePrompt";
import { useNotification } from "@/hooks/useNotification";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";

interface VerdictSectionProps {
  bookId: Id<"books">;
  bookTitle: string;
}

export function VerdictSection({ bookId, bookTitle }: VerdictSectionProps) {
  const { user } = useAuth();
  const cachedAnalysis = useQuery(api.analyses.getByBook, { bookId });
  const access = useQuery(
    api.subscriptions.checkAccess,
    user?.email ? { email: user.email } : "skip"
  ) as {
    hasAccess: boolean;
    isSubscribed: boolean;
    status: string | null;
    trialDaysRemaining: number;
    analysisCount: number;
  } | undefined;
  const { notify } = useNotification();

  const analyzeAction = useAction(api.analyses.analyze);
  const [analyzing, setAnalyzing] = useState(false);
  const [actionResult, setActionResult] = useState<{
    verdict: string;
    summary: string;
    ageRecommendation?: string;
    reasoning?: string;
    contentFlags: ContentFlag[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  async function handleAnalyze() {
    if (!user?.email) {
      setError("Please log in to analyze books.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeAction({ bookId, email: user.email });
      setActionResult(result as typeof actionResult);
      notify(`SafeReads: ${bookTitle}`, {
        body: `Review complete \u2014 ${(result as { verdict: string }).verdict.replace("_", " ")}`,
        tag: `review-${bookId as string}`,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes("UPGRADE_REQUIRED")) {
        setShowUpgrade(true);
      } else {
        setError(
          err instanceof Error ? err.message : "Review failed. Please try again."
        );
      }
    } finally {
      setAnalyzing(false);
    }
  }

  // Determine which analysis to display (cached query result or fresh action result)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const rawAnalysis = cachedAnalysis ?? actionResult;
  const analysis: VerdictCardAnalysis | null = cachedAnalysis
    ? {
        verdict: cachedAnalysis.verdict,
        summary: cachedAnalysis.summary,
        ageRecommendation: cachedAnalysis.ageRecommendation,
        ageGuidance: (cachedAnalysis as any)?.ageGuidance ?? undefined,
        reasoning: cachedAnalysis.reasoning,
      }
    : actionResult
      ? {
          verdict: actionResult.verdict as VerdictCardAnalysis["verdict"],
          summary: actionResult.summary,
          ageRecommendation: actionResult.ageRecommendation,
          ageGuidance: (actionResult as any)?.ageGuidance ?? undefined,
          reasoning: actionResult.reasoning,
        }
      : null;

  const flags: ContentFlag[] =
    (cachedAnalysis?.contentFlags as ContentFlag[] | undefined) ??
    actionResult?.contentFlags ??
    [];

  // Build parent insights from whichever source has data
  const parentInsights: ParentInsightsData | null = rawAnalysis
    ? {
        parentCommunityNotes: (rawAnalysis as any)?.parentCommunityNotes ?? undefined,
        challengedBookStatus: (rawAnalysis as any)?.challengedBookStatus ?? undefined,
        seriesContext: (rawAnalysis as any)?.seriesContext ?? undefined,
        parentTalkingPoints: (rawAnalysis as any)?.parentTalkingPoints ?? undefined,
        comparableBooks: (rawAnalysis as any)?.comparableBooks ?? undefined,
      }
    : null;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-brand-navy">
        Content Review
      </h2>

      {analysis ? (
        <>
          <VerdictCard analysis={analysis} />
          <ContentFlagList flags={flags} />
          {parentInsights && <ParentInsightsCard insights={parentInsights} />}
          <div className="flex items-center justify-end gap-2">
            {analysis && (
              <ShareVerdictButton
                bookTitle={bookTitle}
                verdict={analysis.verdict}
                summary={analysis.summary}
                ageRecommendation={analysis.ageRecommendation}
                bookUrl={currentUrl}
              />
            )}
            {cachedAnalysis?._id && (
              <ReportButton
                bookId={bookId}
                analysisId={cachedAnalysis._id}
              />
            )}
          </div>
        </>
      ) : access && !access.hasAccess ? (
        <div className="rounded-2xl border border-brand-cream-2 bg-white p-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-accent-400" />
          <p className="mt-3 font-display text-lg font-bold text-brand-navy">
            Your 7-day trial has expired
          </p>
          <p className="mt-1 text-sm text-ink-500">
            Subscribe to continue reviewing books.
          </p>
          <button
            onClick={() => setShowUpgrade(true)}
            className="btn-brand mt-4 inline-flex items-center gap-2 rounded-lg text-sm"
          >
            Upgrade — $4.99/mo
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-brand-cream-2 bg-white p-6 text-center">
          <p className="mb-4 text-sm text-ink-600">
            Get an objective content review of this book.
          </p>
          <AnalyzeButton onClick={handleAnalyze} loading={analyzing} />
          {access && !access.isSubscribed && access.trialDaysRemaining > 0 && (
            <p className="mt-3 text-xs text-ink-400">
              {access.trialDaysRemaining} {access.trialDaysRemaining === 1 ? "day" : "days"} left in your free trial
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {showUpgrade && (
        <UpgradePrompt onDismiss={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}
