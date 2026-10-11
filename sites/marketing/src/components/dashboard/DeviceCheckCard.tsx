"use client";

/**
 * "Check a kid's device" — the parent makes a one-time link here, opens it on
 * the child's device, and watches the results arrive live. The QR code is
 * drawn locally (src/lib/qr.ts) so the link never goes to a third party.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { encodeQr, qrPath } from "@/lib/qr";
import { DEVICE_LABEL, fixesFor, verdict, type DeviceKind } from "@/lib/deviceCheck";

function QrCode({ text }: { text: string }) {
  const { path, size } = useMemo(() => qrPath(encodeQr(text)), [text]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-40 h-40 rounded-lg bg-white" shapeRendering="crispEdges" role="img" aria-label="QR code for the check link">
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#221D2E" />
    </svg>
  );
}

const STEP_TEXT = {
  safeEmbed: { label: "SafeTube's video player", ok: "Plays", bad: "Blocked" },
  directEmbed: { label: "Regular YouTube player", ok: "Blocked", bad: "Works" },
  manualOpen: { label: "Opening youtube.com", ok: "Blocked", bad: "Opened" },
} as const;

function StepRow({ step, value }: { step: keyof typeof STEP_TEXT; value: string | null }) {
  const t = STEP_TEXT[step];
  const good = value === "ok" || value === "silent" || value === "blocked";
  return (
    <li className="flex items-center justify-between gap-3 py-2 border-b border-navy/5 last:border-0">
      <span className="text-navy/80">{t.label}</span>
      {value === null ? (
        <span className="text-navy/40">Waiting</span>
      ) : (
        <span className={`font-semibold ${good ? "text-green-700" : "text-red-700"}`}>{good ? t.ok : t.bad}</span>
      )}
    </li>
  );
}

export function DeviceCheckCard() {
  const latest = useQuery(api.deviceChecks.latestMine, {});
  const start = useMutation(api.deviceChecks.start);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const make = async () => {
    setError(null);
    setBusy(true);
    try {
      await start({ userAgent: navigator.userAgent });
      setDismissed(null);
    } catch (e) {
      const raw = String((e as Error).message || e);
      setError(raw.match(/Uncaught Error: ([^\n]*)/)?.[1]?.trim() || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (latest === undefined) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://getsafefamily.com";
  const host = typeof window !== "undefined" ? window.location.host : "getsafefamily.com";
  const show = latest && !latest.expired && dismissed !== latest.token;

  return (
    <div className="rounded-2xl bg-white border border-navy/10 p-5 text-sm space-y-4">
      <div>
        <div className="font-semibold text-navy">Check a kid&rsquo;s device</div>
        <p className="text-navy/60 mt-1">
          Find out in about two minutes whether a device can reach regular YouTube, and whether SafeTube plays there.
          You&rsquo;ll get a link to open on your child&rsquo;s device. It works once and expires in 30 minutes.
        </p>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3">{error}</div>}

      {!show ? (
        <button onClick={make} disabled={busy} className="rounded-full bg-navy text-white font-semibold px-5 py-2.5 disabled:opacity-40">
          {busy ? "Making a link..." : "Make a check link"}
        </button>
      ) : !latest.claimedAt ? (
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <QrCode text={`${origin}/check/${latest.token}`} />
          <div className="space-y-3">
            <p className="text-navy/80">On your child&rsquo;s device, scan this code or type:</p>
            <div className="font-mono text-base sm:text-lg font-bold text-navy break-all">{host}/check/{latest.token}</div>
            <p className="text-navy/60">
              Open it in the browser your child normally uses, signed in as your child. This page updates by itself when the check starts.
            </p>
            <button onClick={() => setDismissed(latest.token)} className="text-navy/60 hover:text-navy font-semibold">Cancel</button>
          </div>
        </div>
      ) : (
        <ResultPanel latest={latest} onAgain={make} busy={busy} />
      )}
    </div>
  );
}

type Latest = NonNullable<FunctionReturnType<typeof api.deviceChecks.latestMine>>;

function ResultPanel({ latest, onAgain, busy }: { latest: Latest; onAgain: () => void; busy: boolean }) {
  const kind = (latest.deviceKind ?? "other") as DeviceKind;
  const v = verdict(latest);
  const reachable = latest.directEmbed === "talked" || latest.manualOpen === "opened";
  const fixes = reachable ? fixesFor(kind, "youtube") : latest.safeEmbed === "failed" ? fixesFor(kind, "safetube") : [];
  const toneClass =
    v.tone === "good" ? "bg-green-50 border-green-200 text-green-900"
    : v.tone === "bad" ? "bg-red-50 border-red-200 text-red-900"
    : v.tone === "warn" ? "bg-amber-50 border-amber-200 text-amber-900"
    : "bg-cream border-navy/10 text-navy";

  return (
    <div className="space-y-4">
      <div className="text-navy/60">Checking a {DEVICE_LABEL[kind]}.</div>
      {latest.looksLikeParentDevice && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3">
          This looks like it was opened on your own device (you&rsquo;re signed in there). The results only mean something
          when the check runs on your child&rsquo;s device.
        </div>
      )}
      <ul>
        <StepRow step="safeEmbed" value={latest.safeEmbed} />
        <StepRow step="directEmbed" value={latest.directEmbed} />
        <StepRow step="manualOpen" value={latest.manualOpen} />
      </ul>
      <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
        <div className="font-semibold">{v.headline}</div>
        <div className="mt-1 opacity-90">{v.detail}</div>
      </div>
      {fixes.map((f) => (
        <div key={f.title}>
          <div className="font-semibold text-navy">{f.title}</div>
          <ol className="list-decimal pl-5 mt-1 space-y-1 text-navy/80">
            {f.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
          {f.note && <p className="text-navy/60 mt-1">{f.note}</p>}
        </div>
      ))}
      <button onClick={onAgain} disabled={busy} className="rounded-full border border-navy/15 text-navy font-semibold px-5 py-2.5 disabled:opacity-40">
        {latest.completed ? "Check another device" : "Start over with a new link"}
      </button>
    </div>
  );
}
