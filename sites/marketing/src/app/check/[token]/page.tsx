"use client";

/**
 * "Check a kid's device" — opened ON THE CHILD'S DEVICE from a one-time link
 * the parent made on the dashboard.
 *
 *   1. Plays a short muted video through youtube-nocookie.com (what SafeTube
 *      uses) and waits for the player to talk back.
 *   2. Quietly loads a regular www.youtube.com player. On a locked-down device
 *      it should stay silent; if it talks back, regular YouTube is reachable.
 *   3. The parent taps "Try to open YouTube" and says what happened.
 *
 * Each result is sent with the token, and the parent's dashboard updates live.
 * The token only ever reveals this one check's own results.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { detectDeviceKind, DEVICE_LABEL, fixesFor, verdict, type CheckResults, type DeviceKind } from "@/lib/deviceCheck";

// Big Buck Bunny (Blender Foundation) — public, embeddable, safe for kids.
const VIDEO_ID = "aqz-KE-bpKQ";
const SAFE_TIMEOUT_MS = 15000;
const DIRECT_TIMEOUT_MS = 10000;
const NONCE_KEY = "safefamily_check_device_id";

function getNonce(): string {
  const make = () => {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  };
  try {
    let n = localStorage.getItem(NONCE_KEY);
    if (!n || n.length < 16) { n = make(); localStorage.setItem(NONCE_KEY, n); }
    return n;
  } catch {
    return make();
  }
}

function cleanError(e: unknown): string {
  const raw = String((e as Error)?.message || e);
  return raw.match(/Uncaught Error: ([^\n]*)/)?.[1]?.trim() || "Something went wrong. Reload the page and try again.";
}

function embedSrc(host: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `https://${host}/embed/${VIDEO_ID}?enablejsapi=1&autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&origin=${encodeURIComponent(origin)}`;
}

/** Loads a player and reports whether it talked back before the timeout. */
function EmbedProbe({
  src,
  accept,
  timeoutMs,
  onDone,
  title,
  className,
}: {
  src: string;
  accept: (origin: string) => boolean;
  timeoutMs: number;
  onDone: (alive: boolean) => void;
  title: string;
  className?: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const acceptRef = useRef(accept);
  acceptRef.current = accept;

  useEffect(() => {
    let finished = false;
    const finish = (alive: boolean) => {
      if (finished) return;
      finished = true;
      cleanup();
      done.current(alive);
    };
    const onMessage = (e: MessageEvent) => {
      if (acceptRef.current(e.origin)) finish(true);
    };
    window.addEventListener("message", onMessage);
    // Same handshake SafeTube's own player uses: ask the embed to start
    // reporting, and treat any reply from it as "this player works here".
    const ping = setInterval(() => {
      ref.current?.contentWindow?.postMessage('{"event":"listening"}', "*");
    }, 500);
    const timer = setTimeout(() => finish(false), timeoutMs);
    function cleanup() {
      window.removeEventListener("message", onMessage);
      clearInterval(ping);
      clearTimeout(timer);
    }
    return () => { finished = true; cleanup(); };
  }, [src, timeoutMs]);

  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      className={className}
      allow="autoplay; encrypted-media"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}

const acceptAnyYouTube = (origin: string) => /youtube/i.test(origin);
const acceptRegularYouTube = (origin: string) => {
  try {
    const h = new URL(origin).hostname;
    return h === "www.youtube.com" || h === "youtube.com" || h === "m.youtube.com";
  } catch {
    return false;
  }
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5A962] to-[#E88B6A] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3C7 3 3 7 3 12h18c0-5-4-9-9-9Z" /><path d="M12 12v7a2 2 0 0 0 4 0" /></svg>
          </span>
          <span className="text-lg font-bold text-navy">Safe Family device check</span>
        </div>
        <div className="rounded-2xl bg-white border border-navy/10 p-6 space-y-5">{children}</div>
      </div>
    </div>
  );
}

function StepHeading({ n, title, state }: { n: number; title: string; state: "now" | "done" | "later" }) {
  return (
    <div className={`flex items-center gap-3 ${state === "later" ? "opacity-40" : ""}`}>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${state === "done" ? "bg-green-600 text-white" : "bg-navy text-white"}`}>
        {state === "done" ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
        ) : n}
      </span>
      <span className="font-semibold text-navy">{title}</span>
    </div>
  );
}

export default function CheckDevicePage() {
  const params = useParams<{ token: string }>();
  const token = (params?.token ?? "").toString();
  const [nonce, setNonce] = useState<string | null>(null);
  const [kind, setKind] = useState<DeviceKind>("other");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [override, setOverride] = useState(false);
  const [local, setLocal] = useState<Partial<CheckResults>>({});
  const [openedTab, setOpenedTab] = useState(false);

  useEffect(() => {
    setNonce(getNonce());
    setKind(detectDeviceKind(navigator.userAgent, navigator.maxTouchPoints || 0));
  }, []);

  const state = useQuery(api.deviceChecks.byToken, nonce ? { token, deviceNonce: nonce } : "skip");
  const claim = useMutation(api.deviceChecks.claim);
  const record = useMutation(api.deviceChecks.record);

  const results: CheckResults = useMemo(() => {
    const s = state && (state.status === "running" || state.status === "done") ? state : null;
    const safeEmbed = local.safeEmbed ?? s?.safeEmbed ?? null;
    const directEmbed = local.directEmbed ?? s?.directEmbed ?? null;
    const manualOpen = local.manualOpen ?? s?.manualOpen ?? null;
    return { safeEmbed, directEmbed, manualOpen, completed: !!(safeEmbed && directEmbed && manualOpen) };
  }, [state, local]);

  const report = useCallback(
    async (step: "safeEmbed" | "directEmbed" | "manualOpen", result: string) => {
      setLocal((l) => ({ ...l, [step]: result }));
      if (!nonce) return;
      try {
        await record({ token, deviceNonce: nonce, step, result });
      } catch (e) {
        setError(cleanError(e));
      }
    },
    [nonce, record, token]
  );

  const begin = async () => {
    if (!nonce) return;
    setError(null);
    setStarting(true);
    try {
      await claim({ token, deviceNonce: nonce, deviceKind: kind, userAgent: navigator.userAgent });
    } catch (e) {
      setError(cleanError(e));
    } finally {
      setStarting(false);
    }
  };

  if (!nonce || state === undefined) {
    return <Shell><p className="text-navy/60">Loading...</p></Shell>;
  }

  if (state.status === "missing" || state.status === "expired" || state.status === "taken") {
    const msg =
      state.status === "missing" ? "This check link isn't valid."
      : state.status === "expired" ? "This check link has expired."
      : "This check link was already used on another device.";
    return (
      <Shell>
        <h1 className="text-xl font-bold text-navy">{msg}</h1>
        <p className="text-navy/70">Make a new one from your Safe Family dashboard: Family tab, then &ldquo;Check a kid&rsquo;s device&rdquo;. Each link works once, for 30 minutes.</p>
      </Shell>
    );
  }

  if (state.status === "ready") {
    return (
      <Shell>
        <h1 className="text-xl font-bold text-navy">Check this {DEVICE_LABEL[kind]}</h1>
        <p className="text-navy/70">
          This takes about two minutes. It plays a short cartoon the way SafeTube does, tests whether regular YouTube
          can load here, and then asks you to try opening YouTube yourself. Nothing on the device is changed.
        </p>
        <p className="text-navy/70">Run it in the browser your child normally uses, signed in as your child.</p>
        {state.parentSignedInHere && !override ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 space-y-3">
            <div>
              It looks like this is your own device: you&rsquo;re signed in to your parent account here. The check only means
              something on the device your child uses.
            </div>
            <button onClick={() => setOverride(true)} className="font-semibold underline">This is my child&rsquo;s device. Run it anyway.</button>
          </div>
        ) : (
          <button onClick={begin} disabled={starting} className="w-full rounded-full bg-navy text-white text-base font-semibold px-5 py-3 disabled:opacity-40">
            {starting ? "Starting..." : "Start the check"}
          </button>
        )}
        {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">{error}</div>}
      </Shell>
    );
  }

  // Running or done. Work out which step is current from what's been recorded.
  const phase = !results.safeEmbed ? 1 : !results.directEmbed ? 2 : !results.manualOpen ? 3 : 4;
  const stepState = (n: number) => (phase > n ? "done" : phase === n ? "now" : "later") as "now" | "done" | "later";
  const v = verdict(results, "your child");
  const reachable = results.directEmbed === "talked" || results.manualOpen === "opened";
  const fixes = reachable ? fixesFor(kind, "youtube") : results.safeEmbed === "failed" ? fixesFor(kind, "safetube") : [];

  return (
    <Shell>
      <h1 className="text-xl font-bold text-navy">Checking this {DEVICE_LABEL[kind]}</h1>

      <div className="space-y-3">
        <StepHeading n={1} title="SafeTube's video player" state={stepState(1)} />
        {phase === 1 && (
          <div className="space-y-2">
            <p className="text-sm text-navy/70">A short muted cartoon should start playing below. This can take up to 15 seconds.</p>
            <EmbedProbe
              src={embedSrc("www.youtube-nocookie.com")}
              accept={acceptAnyYouTube}
              timeoutMs={SAFE_TIMEOUT_MS}
              onDone={(alive) => report("safeEmbed", alive ? "ok" : "failed")}
              title="SafeTube player test"
              className="w-full aspect-video rounded-xl border border-navy/10 bg-black"
            />
          </div>
        )}
        {phase > 1 && (
          <p className={`text-sm font-semibold ${results.safeEmbed === "ok" ? "text-green-700" : "text-red-700"}`}>
            {results.safeEmbed === "ok" ? "It plays." : "It didn't load on this device."}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <StepHeading n={2} title="Regular YouTube player" state={stepState(2)} />
        {phase === 2 && (
          <div className="space-y-2">
            <p className="text-sm text-navy/70">Testing whether a regular YouTube player can load here. On a locked-down device this box stays blank or shows a blocked message. About 10 seconds.</p>
            <EmbedProbe
              src={embedSrc("www.youtube.com")}
              accept={acceptRegularYouTube}
              timeoutMs={DIRECT_TIMEOUT_MS}
              onDone={(alive) => report("directEmbed", alive ? "talked" : "silent")}
              title="Regular YouTube test"
              className="w-full aspect-video rounded-xl border border-navy/10 bg-cream"
            />
          </div>
        )}
        {phase > 2 && (
          <p className={`text-sm font-semibold ${results.directEmbed === "silent" ? "text-green-700" : "text-red-700"}`}>
            {results.directEmbed === "silent" ? "Blocked. Good." : "It loaded. Regular YouTube is reachable here."}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <StepHeading n={3} title="Try to open YouTube" state={stepState(3)} />
        {phase === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-navy/70">Tap the button. A new tab will try to open youtube.com. Then come back here and tell us what happened.</p>
            <a
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpenedTab(true)}
              className="block w-full text-center rounded-full bg-navy text-white text-base font-semibold px-5 py-3"
            >
              Try to open YouTube
            </a>
            {openedTab && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => report("manualOpen", "blocked")} className="rounded-full border-2 border-green-600 text-green-800 font-semibold px-4 py-3">It was blocked</button>
                <button onClick={() => report("manualOpen", "opened")} className="rounded-full border-2 border-red-600 text-red-800 font-semibold px-4 py-3">YouTube opened</button>
              </div>
            )}
          </div>
        )}
        {phase > 3 && (
          <p className={`text-sm font-semibold ${results.manualOpen === "blocked" ? "text-green-700" : "text-red-700"}`}>
            {results.manualOpen === "blocked" ? "Blocked. Good." : "YouTube opened. You can close that tab now."}
          </p>
        )}
      </div>

      {phase === 4 && (
        <div className="space-y-4 pt-2 border-t border-navy/10">
          <div className={`rounded-xl border px-4 py-3 ${v.tone === "good" ? "bg-green-50 border-green-200 text-green-900" : v.tone === "bad" ? "bg-red-50 border-red-200 text-red-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
            <div className="font-semibold">{v.headline}</div>
            <div className="mt-1 text-sm opacity-90">{v.detail}</div>
          </div>
          {fixes.map((f) => (
            <div key={f.title} className="text-sm">
              <div className="font-semibold text-navy">{f.title}</div>
              <ol className="list-decimal pl-5 mt-1 space-y-1 text-navy/80">
                {f.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              {f.note && <p className="text-navy/60 mt-1">{f.note}</p>}
            </div>
          ))}
          <p className="text-sm text-navy/60">These results are on your Safe Family dashboard too. After changing a setting, make a new check link and run it again.</p>
        </div>
      )}

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">{error}</div>}
    </Shell>
  );
}
