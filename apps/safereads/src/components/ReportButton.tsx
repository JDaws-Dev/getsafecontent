"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import * as Dialog from "@radix-ui/react-dialog";
import { Flag, X, Check } from "lucide-react";

const REASONS = [
  { value: "too_lenient", label: "Verdict is too lenient" },
  { value: "too_strict", label: "Verdict is too strict" },
  { value: "factual_error", label: "Factual error in review" },
  { value: "missing_content", label: "Missing content concerns" },
  { value: "other", label: "Other" },
] as const;

type ReportReason = (typeof REASONS)[number]["value"];

interface ReportButtonProps {
  bookId: Id<"books">;
  analysisId: Id<"analyses">;
}

export function ReportButton({ bookId, analysisId }: ReportButtonProps) {
  const userId = useQuery(api.users.currentUserId);

  const existingReport = useQuery(
    api.reports.getByUserAndAnalysis,
    userId
      ? { userId, analysisId }
      : "skip"
  );

  const submitReport = useMutation(api.reports.submit);
  const removeReport = useMutation(api.reports.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!userId) return null;

  const hasExistingReport = existingReport !== undefined && existingReport !== null;

  async function handleSubmit() {
    if (!reason || !userId) return;
    setSubmitting(true);
    try {
      await submitReport({
        userId,
        bookId,
        analysisId,
        reason,
        details: details.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        setDialogOpen(false);
        setSubmitted(false);
        setReason(null);
        setDetails("");
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveReport() {
    if (!userId) return;
    setSubmitting(true);
    try {
      await removeReport({
        userId,
        analysisId,
      });
      setDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
          hasExistingReport
            ? "border-verdict-warning/30 bg-verdict-warning/5 text-verdict-warning hover:bg-verdict-warning/10"
            : "border-parchment-300 bg-white text-ink-600 hover:bg-parchment-50"
        }`}
      >
        <Flag className="h-3.5 w-3.5" />
        {hasExistingReport ? "Reported" : "Report Issue"}
      </button>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink-900/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-parchment-50 p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="font-serif text-lg font-bold text-ink-900">
                Report Review Issue
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

            {submitted ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <Check className="h-8 w-8 text-verdict-safe" />
                <p className="text-sm font-medium text-ink-700">
                  Report submitted. Thank you!
                </p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-ink-500">
                  Help us improve by reporting issues with this review.
                </p>

                <fieldset className="mb-4 space-y-2">
                  <legend className="mb-1 text-sm font-medium text-ink-700">
                    What&apos;s wrong?
                  </legend>
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                        reason === r.value
                          ? "border-parchment-500 bg-parchment-100 text-ink-900"
                          : "border-parchment-200 bg-white text-ink-700 hover:bg-parchment-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="sr-only"
                      />
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          reason === r.value
                            ? "border-parchment-600 bg-parchment-600"
                            : "border-parchment-300"
                        }`}
                      >
                        {reason === r.value && (
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      {r.label}
                    </label>
                  ))}
                </fieldset>

                <div className="mb-4">
                  <label
                    htmlFor="report-details"
                    className="mb-1 block text-sm font-medium text-ink-700"
                  >
                    Details{" "}
                    <span className="font-normal text-ink-400">(optional)</span>
                  </label>
                  <textarea
                    id="report-details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Tell us more about the issue..."
                    rows={3}
                    className="w-full rounded-lg border border-parchment-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-parchment-500 focus:outline-none focus:ring-1 focus:ring-parchment-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  {hasExistingReport && (
                    <button
                      onClick={handleRemoveReport}
                      disabled={submitting}
                      className="text-xs text-ink-400 hover:text-verdict-warning disabled:opacity-50"
                    >
                      Remove report
                    </button>
                  )}
                  <div className="ml-auto flex gap-2">
                    <Dialog.Close asChild>
                      <button className="rounded-lg border border-parchment-300 bg-white px-4 py-2 text-sm font-medium text-ink-600 hover:bg-parchment-50">
                        Cancel
                      </button>
                    </Dialog.Close>
                    <button
                      onClick={handleSubmit}
                      disabled={!reason || submitting}
                      className="rounded-lg bg-parchment-700 px-4 py-2 text-sm font-medium text-white hover:bg-parchment-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Submitting…" : "Submit"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
