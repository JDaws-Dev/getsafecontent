"use client";

type Severity = "none" | "mild" | "moderate" | "heavy";

export interface ContentFlag {
  category: string;
  severity: Severity;
  details: string;
}

interface ContentFlagListProps {
  flags: ContentFlag[];
}

const severityConfig: Record<
  Severity,
  { label: string; dotClass: string; textClass: string }
> = {
  none: {
    label: "None",
    dotClass: "bg-gray-300",
    textClass: "text-ink-400",
  },
  mild: {
    label: "Mild",
    dotClass: "bg-verdict-safe",
    textClass: "text-ink-600",
  },
  moderate: {
    label: "Moderate",
    dotClass: "bg-verdict-caution",
    textClass: "text-ink-700",
  },
  heavy: {
    label: "Heavy",
    dotClass: "bg-verdict-warning",
    textClass: "text-ink-800",
  },
};

export function ContentFlagList({ flags }: ContentFlagListProps) {
  if (flags.length === 0) return null;

  return (
    <div className="rounded-xl border border-parchment-200 bg-white p-5">
      <h3 className="font-serif text-lg font-bold text-ink-900">
        Content Flags
      </h3>
      <div className="mt-3 space-y-3">
        {flags.map((flag: ContentFlag) => {
          const config = severityConfig[flag.severity];
          return (
            <div key={flag.category} className="flex items-start gap-3">
              <div className="flex items-center gap-2 pt-0.5">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${config.dotClass}`}
                />
                <span className="w-20 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {config.label}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <span className={`text-sm font-medium ${config.textClass}`}>
                  {flag.category}
                </span>
                {flag.severity !== "none" && flag.details && (
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                    {flag.details}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
