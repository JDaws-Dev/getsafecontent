"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Clock, Loader2 } from "lucide-react";

/**
 * Reading-time controls for one child.
 *
 * Two limits, and the parent gets exactly one of them:
 *   - "One limit for all apps" — held by Marketing Central, shared by all five
 *     Safe Family apps. Turning it on IS the toggle; while it's on it REPLACES
 *     the SafeReads limit and those controls grey out.
 *   - A SafeReads-only limit, for parents who want reading treated differently
 *     from video and music (a common and reasonable wish).
 *
 * Never both — two competing caps is the kind of setting that produces support
 * emails rather than trust.
 */

const TIME_PRESETS = [
  { value: 15, label: "15m" },
  { value: 30, label: "30m" },
  { value: 45, label: "45m" },
  { value: 60, label: "1h" },
  { value: 90, label: "1.5h" },
  { value: 120, label: "2h" },
];

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

type FamilyLimit = {
  available: boolean;
  limitSet?: boolean;
  limitMinutes?: number;
  usedMinutes?: number;
};

export function ScreenTimeControls({
  kidId,
  kidName,
  userToken,
}: {
  kidId: Id<"kids">;
  kidName: string;
  userToken?: string;
}) {
  // Both reads are ownership-checked server-side and throw without a valid
  // token, so hold off until the parent's token has actually loaded rather
  // than firing a call that's guaranteed to fail.
  const limit = useQuery(
    api.timeLimits.getTimeLimit,
    userToken ? { kidId, userToken } : "skip"
  );
  const setTimeLimit = useMutation(api.timeLimits.setTimeLimit);
  const deleteTimeLimit = useMutation(api.timeLimits.deleteTimeLimit);

  const getFamilyLimit = useAction(api.sharedScreenTime.getFamilyLimit);
  const setFamilyLimitAction = useAction(api.sharedScreenTime.setFamilyLimit);

  const [familyLimit, setFamilyLimitState] = useState<FamilyLimit | null>(null);
  const [busy, setBusy] = useState(false);

  const loadFamilyLimit = useCallback(() => {
    if (!userToken) return;
    getFamilyLimit({ kidId, userToken })
      .then((r) => setFamilyLimitState(r as FamilyLimit))
      .catch(() => setFamilyLimitState({ available: false }));
  }, [getFamilyLimit, kidId, userToken]);

  useEffect(() => { loadFamilyLimit(); }, [loadFamilyLimit]);

  const familyLimitOn = !!familyLimit?.limitSet;

  async function saveFamilyLimit(minutes: number) {
    setBusy(true);
    try {
      const res = await setFamilyLimitAction({
        kidId,
        dailyLimitMinutes: minutes,
        userToken,
      });
      if (res.ok) {
        // Optimistic, then reconcile with what central actually stored.
        setFamilyLimitState((prev) => ({
          ...(prev ?? { available: true }),
          available: true,
          limitSet: minutes > 0,
          limitMinutes: minutes,
        }));
        loadFamilyLimit();
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveAppLimit(fields: {
    dailyLimitMinutes?: number;
    weekendLimitMinutes?: number | null;
    allowedStartHour?: number | null;
    allowedEndHour?: number | null;
  }) {
    setBusy(true);
    try {
      await setTimeLimit({
        kidId,
        dailyLimitMinutes:
          fields.dailyLimitMinutes ?? limit?.dailyLimitMinutes ?? 60,
        weekendLimitMinutes:
          fields.weekendLimitMinutes === null
            ? undefined
            : (fields.weekendLimitMinutes ?? limit?.weekendLimitMinutes),
        allowedStartHour:
          fields.allowedStartHour === null
            ? undefined
            : (fields.allowedStartHour ?? limit?.allowedStartHour),
        allowedEndHour:
          fields.allowedEndHour === null
            ? undefined
            : (fields.allowedEndHour ?? limit?.allowedEndHour),
        userToken,
      });
    } finally {
      setBusy(false);
    }
  }

  const appLimitOn = !!limit && limit.dailyLimitMinutes > 0;

  return (
    <div className="mt-3 border-t border-brand-cream-2 pt-3">
      {/* One limit across every Safe Family app */}
      <div className="rounded-xl border border-accent-200 bg-accent-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-navy">
              One limit for all apps
            </p>
            <p className="mt-0.5 text-xs text-ink-500">
              {kidName}&rsquo;s time counts across SafeTunes, SafeTube, SafeReads,
              SafeStudy and SafeSpark together &mdash; not a separate allowance
              in each.
            </p>
          </div>
          <Toggle
            enabled={familyLimitOn}
            disabled={busy || familyLimit === null}
            onChange={(on) =>
              saveFamilyLimit(on ? (familyLimit?.limitMinutes || 60) : 0)
            }
          />
        </div>

        {familyLimit?.available === false && (
          <p className="mt-2 text-xs text-amber-700">
            Couldn&rsquo;t load this right now. The SafeReads limit below still
            applies.
          </p>
        )}

        {familyLimitOn && (
          <div className="mt-3">
            <PresetRow
              value={familyLimit?.limitMinutes}
              disabled={busy}
              onSelect={saveFamilyLimit}
            />
            {typeof familyLimit?.usedMinutes === "number" && (
              <p className="mt-2 text-xs text-ink-500">
                Used today across all apps:{" "}
                {formatMinutes(familyLimit.usedMinutes)}
                {familyLimit.limitMinutes
                  ? ` of ${formatMinutes(familyLimit.limitMinutes)}`
                  : ""}
              </p>
            )}
          </div>
        )}
      </div>

      {/* SafeReads-only limit — ignored entirely while the all-apps limit is on */}
      <div className={`mt-3 ${familyLimitOn ? "pointer-events-none opacity-40" : ""}`}>
        {familyLimitOn && (
          <p className="mb-2 text-xs text-ink-400">
            Turned off while &ldquo;One limit for all apps&rdquo; is on.
          </p>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-navy">
              Daily reading limit
            </p>
            <p className="mt-0.5 text-xs text-ink-500">
              Counts books, the Bible and audiobooks &mdash; active time only.
            </p>
          </div>
          <Toggle
            enabled={appLimitOn}
            disabled={busy || limit === undefined}
            onChange={(on) =>
              on
                ? saveAppLimit({ dailyLimitMinutes: 60 })
                : deleteTimeLimit({ kidId, userToken })
            }
          />
        </div>

        {appLimitOn && (
          <div className="mt-3 space-y-3 border-l-2 border-brand-cream-2 pl-3">
            <PresetRow
              value={limit?.dailyLimitMinutes}
              disabled={busy}
              onSelect={(m) => saveAppLimit({ dailyLimitMinutes: m })}
            />

            <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-600">
              <input
                type="checkbox"
                checked={limit?.weekendLimitMinutes !== undefined}
                onChange={(e) =>
                  saveAppLimit({
                    weekendLimitMinutes: e.target.checked
                      ? (limit?.dailyLimitMinutes ?? 60)
                      : null,
                  })
                }
                className="h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-500"
              />
              Different limit at weekends
            </label>

            {limit?.weekendLimitMinutes !== undefined && (
              <PresetRow
                value={limit?.weekendLimitMinutes}
                disabled={busy}
                onSelect={(m) => saveAppLimit({ weekendLimitMinutes: m })}
              />
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
              <Clock className="h-3.5 w-3.5 text-ink-400" />
              <span>Only between</span>
              <HourSelect
                value={limit?.allowedStartHour}
                disabled={busy}
                onChange={(h) =>
                  saveAppLimit({
                    allowedStartHour: h,
                    allowedEndHour: h === null ? null : (limit?.allowedEndHour ?? 20),
                  })
                }
              />
              <span>and</span>
              <HourSelect
                value={limit?.allowedEndHour}
                disabled={busy || limit?.allowedStartHour === undefined}
                onChange={(h) => saveAppLimit({ allowedEndHour: h })}
              />
            </div>
          </div>
        )}
      </div>

      {busy && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </p>
      )}
    </div>
  );
}

function PresetRow({
  value,
  disabled,
  onSelect,
}: {
  value: number | undefined;
  disabled: boolean;
  onSelect: (minutes: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {TIME_PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(preset.value)}
          className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            value === preset.value
              ? "bg-accent-600 text-white"
              : "bg-brand-cream-2 text-ink-600 hover:bg-accent-100"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

function HourSelect({
  value,
  disabled,
  onChange,
}: {
  value: number | undefined;
  disabled: boolean;
  onChange: (hour: number | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) =>
        onChange(e.target.value === "" ? null : Number(e.target.value))
      }
      className="rounded-lg border border-brand-cream-2 bg-white px-2 py-1 text-xs text-ink-700 disabled:opacity-50"
    >
      <option value="">any time</option>
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  enabled,
  disabled,
  onChange,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        enabled ? "bg-accent-600" : "bg-ink-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
