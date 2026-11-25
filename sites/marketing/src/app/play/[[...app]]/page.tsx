"use client";

/**
 * The ONE kid front door.
 *
 * Kids used to enter their family code in each app. Now they enter it once
 * here, and every app is a tab: each tab renders that app's kid screens in a
 * same-origin iframe with the code passed along (?fc=) and the app's own
 * app-switcher hidden (?embed=1). Deep links to an app's own kid page under
 * the hub redirect here, so there is one place kids go.
 *
 * Deliberately no parent chrome: no account, no sign-out, no admin links —
 * only a small "Parents" link to the sign-in page.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { SafeFamilyLogo } from "@/components/brand/Brand";
import { isRetiredApp } from "@/lib/retiredApps";

const CODE_KEY = "safefamily_family_code";
const LAST_APP_KEY = "safefamily_last_kid_app";

// Every kid app. Retired ones (src/lib/retiredApps.ts: SafeReads "Books" and
// SafeSpark "Build" since 2026-11-25) are dropped below: no tab, no tile, and
// /play/reads or /play/spark goes back to /play. Kept here so taking an app off
// the retired list brings its tab straight back.
const ALL_APPS = [
  { slug: "tunes", name: "Music", app: "SafeTunes", color: "#7C4DE0", path: "/tunes/play" },
  { slug: "tube", name: "Videos", app: "SafeTube", color: "#F0603A", path: "/tube/play" },
  { slug: "reads", name: "Books", app: "SafeReads", color: "#3AA06B", path: "/reads/read" },
  { slug: "study", name: "Study", app: "SafeStudy", color: "#2F6BF0", path: "/study/play" },
  // Coming soon: the tab still shows so kids know it's on the way, but it opens a
  // short explainer instead of the app.
  {
    slug: "spark",
    name: "Build",
    app: "SafeSpark",
    color: "#F2A413",
    path: "/spark/make",
    comingSoon: true,
    blurb:
      "Build your own games, stories and apps, with AI helping you along the way. You ask for what you want, try it out, then make it better.",
  },
];
const APPS = ALL_APPS.filter((a) => !isRetiredApp(a.slug));

const Glyph = ({ slug, size = 22 }: { slug: string; size?: number }) => {
  const c = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (slug) {
    case "tunes": return <svg {...c}><path d="M9 17V5l10-2v12M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /></svg>;
    case "tube": return <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5Z" /></svg>;
    case "reads": return <svg {...c}><path d="M4 5a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2V5Zm0 0a2 2 0 0 0 2 2h10" /></svg>;
    // Graduation cap: SafeStudy is a daily lesson + tutor, not just a search box.
    case "study": return <svg {...c}><path d="M2 9l10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6" /></svg>;
    default: return <svg {...c}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" /></svg>;
  }
};

const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);

// A kid pass lives 5 minutes and the app in the tab re-mints it every 4, so
// one older than this may already be dead: drop it and let the next app ask.
const PASS_MAX_AGE_MS = 4 * 60 * 1000;

// The kid signed in inside the current tab (apps post it, src/lib/kidDoor.js
// in each app). Carried to the next tab as ?kt= so switching apps keeps the
// same kid without a second name + PIN. Kept in sessionStorage, not state: the
// page remounts on every tab change, and a fresher pass must not reload the
// frame that is already open.
const PASS_KEY = "safefamily_kid_pass";
function savePass(token: string | null) {
  try {
    if (token) sessionStorage.setItem(PASS_KEY, JSON.stringify({ token, at: Date.now() }));
    else sessionStorage.removeItem(PASS_KEY);
  } catch { /* storage unavailable: the next app just asks for the name */ }
}
function freshPass(): string | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(PASS_KEY) || "null") as { token?: string; at?: number } | null;
    return p?.token && p.at && Date.now() - p.at < PASS_MAX_AGE_MS ? p.token : null;
  } catch { return null; }
}

// A "bad code" from one app does not always mean a wrong code: a family can be
// set up in some apps and not (yet) in another. Remember which code an app
// rejected so the second rejection of the same code (the kid typed it again,
// or another app already signed a kid in with it) shows "not set up here"
// for that one tab instead of looping back to the code screen.
const BAD_KEY = "safefamily_bad_code";
const OK_KEY = "safefamily_code_ok";
function readBad(): { code?: string } | null {
  try { return JSON.parse(sessionStorage.getItem(BAD_KEY) || "null"); } catch { return null; }
}

export default function PlayPage() {
  const params = useParams<{ app?: string[] }>();
  const search = useSearchParams();
  const router = useRouter();
  const slug = params?.app?.[0] ?? null;
  const active = useMemo(() => APPS.find((a) => a.slug === slug) ?? null, [slug]);
  // A retired or unknown app in the URL (old bookmark, home-screen icon) goes
  // back to the kid door instead of showing an empty frame.
  useEffect(() => {
    if (slug && !active) router.replace("/play");
  }, [slug, active, router]);
  // Solo: one app on its own, no tab bar and a slim header. Home-screen icons
  // added from /play/<app> open this way (see kid-app-manifest).
  const solo = search.get("solo") === "1" && !!active && !active.comingSoon;
  const soloHref = active ? `/play/${active.slug}?solo=1` : "/play";

  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);
  const [codeError, setCodeError] = useState("");
  // Tabs whose app has no family for this code (see BAD_KEY).
  const [notSetUp, setNotSetUp] = useState<string[]>([]);
  useEffect(() => {
    if (search.get("bad") === "1") setCodeError("We couldn't find that family code. Check it with a parent and try again.");
  }, [search]);


  // Family code: ?fc= wins (and is remembered), else what this device remembers.
  useEffect(() => {
    try {
      const fromUrl = normalize(search.get("fc") || "");
      if (fromUrl.length === 6) {
        localStorage.setItem(CODE_KEY, fromUrl);
        setCode(fromUrl);
      } else {
        const saved = localStorage.getItem(CODE_KEY);
        setCode(saved && saved.length === 6 ? saved : null);
      }
    } catch { /* storage unavailable */ }
    setReady(true);
  }, [search]);

  // Remember the last app so a return visit lands straight back in it.
  useEffect(() => {
    try { if (active) localStorage.setItem(LAST_APP_KEY, active.slug); } catch { /* ignore */ }
  }, [active]);

  // Phone: the tab strip scrolls sideways and the last tabs sit off-screen at
  // 390px, so centre the active tab. Scroll only the strip (scrollIntoView
  // would scroll the page too).
  const tabsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const strip = tabsRef.current;
    if (!strip || !active) return;
    const tab = strip.querySelector<HTMLElement>(`[data-tab="${active.slug}"]`);
    if (!tab) return;
    const s = strip.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    strip.scrollLeft = Math.max(0, strip.scrollLeft + (t.left - s.left) - (s.width - t.width) / 2);
  }, [active, code]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalize(input);
    if (c.length !== 6) return;
    try { localStorage.setItem(CODE_KEY, c); } catch { /* ignore */ }
    setCodeError("");
    setCode(c);
    // Same code an app just rejected: the chooser, not straight back into it.
    if (readBad()?.code === c) { router.replace("/play"); return; }
    let last: string | null = null;
    try { last = localStorage.getItem(LAST_APP_KEY); } catch { /* ignore */ }
    if (solo) { router.replace(soloHref); return; }
    router.replace(`/play/${last && APPS.some((a) => a.slug === last) ? last : "tube"}`);
  };

  const forget = useCallback((reason?: "bad-code") => {
    try { localStorage.removeItem(CODE_KEY); } catch { /* ignore */ }
    savePass(null);
    setCode(null); setInput("");
    // The page remounts on a new path, so the reason rides in the URL.
    const base = solo ? soloHref : "/play";
    router.replace(reason ? `${base}${base.includes("?") ? "&" : "?"}bad=1` : base);
  }, [router, solo, soloHref]);

  // Messages from the app inside the tab (same origin only).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { source?: string; type?: string; token?: string | null } | null;
      if (!d || d.source !== "safefamily-kid") return;
      if (d.type === "kid-pass") {
        savePass(d.token || null);
        // A kid signed in somewhere with this code, so the code itself is good.
        if (d.token && code) { try { sessionStorage.setItem(OK_KEY, code); } catch { /* ignore */ } }
      } else if (d.type === "bad-code") {
        let confirmed = false;
        try { confirmed = !!code && sessionStorage.getItem(OK_KEY) === code; } catch { /* ignore */ }
        if (code && (confirmed || readBad()?.code === code)) {
          // The code works elsewhere: only this tab isn't set up.
          if (active) setNotSetUp((prev) => (prev.includes(active.slug) ? prev : [...prev, active.slug]));
          return;
        }
        // The app could not find this family: back to the one code screen
        // here rather than the app's own code box inside the frame.
        try {
          if (code) sessionStorage.setItem(BAD_KEY, JSON.stringify({ code }));
          localStorage.removeItem(LAST_APP_KEY);
        } catch { /* ignore */ }
        forget("bad-code");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [forget, code, active]);

  // The frame's address is fixed when the tab (or code) changes, picking up
  // the kid pass from the tab the kid just left.
  const frameSrc = useMemo(() => {
    if (!active || active.comingSoon || !code) return "";
    const fresh = freshPass();
    return `${active.path}?fc=${encodeURIComponent(code)}&embed=1${fresh ? `&kt=${encodeURIComponent(fresh)}` : ""}`;
  }, [active, code]);

  if (!ready) return <div className="min-h-screen bg-cream" />;

  // No code yet: the one place a kid ever types it.
  if (!code) {
    return (
      <div className="min-h-[100dvh] bg-cream flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Header slim={solo} />
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-16">
          <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-3xl shadow-[0_8px_30px_rgba(34,29,46,0.10)] p-6 sm:p-8 flex flex-col gap-5 text-center">
            <h1 className="text-3xl font-bold text-navy">Enter your family code</h1>
            <p className="text-navy/60 -mt-2">Ask a parent for the 6 letters and numbers.</p>
            {codeError && (
              <p role="alert" className="rounded-2xl bg-[#F0603A]/10 px-4 py-3 text-sm font-semibold text-[#B8401F]">{codeError}</p>
            )}
            <input
              value={input}
              onChange={(e) => { setInput(normalize(e.target.value)); if (codeError) setCodeError(""); }}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="ABC123"
              className="h-16 rounded-2xl border-2 border-navy/10 text-center font-mono text-3xl font-bold tracking-[0.3em] text-navy focus:border-navy/40 outline-none"
              aria-label="Family code"
            />
            <button type="submit" disabled={input.length !== 6} className="h-14 rounded-full bg-gradient-to-br from-[#F5A962] to-[#E88B6A] text-white text-lg font-bold disabled:opacity-40">
              Let's go
            </button>
          </form>
        </main>
      </div>
    );
  }

  // Code known: tabs + the chosen app inside.
  return (
    // Safe areas: on an iPhone home-screen app the page runs edge to edge
    // (viewport-fit=cover in layout.tsx). Apps inside the frame can't see the
    // insets, so the door keeps them clear of the notch and home bar.
    <div className="h-[100dvh] bg-cream flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Header code={code} onForget={() => forget()} slim={solo} />
      {!solo && <nav ref={tabsRef} className="shrink-0 bg-white border-b border-navy/10 px-2 sm:px-6 flex items-stretch sm:justify-center gap-1 sm:gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Apps">
        {APPS.map((a) => {
          const on = active?.slug === a.slug;
          return (
            <Link
              key={a.slug}
              href={`/play/${a.slug}`}
              data-tab={a.slug}
              aria-current={on ? "page" : undefined}
              className={`flex-1 sm:flex-none min-w-0 min-h-[52px] inline-flex items-center justify-center gap-2 px-2 sm:px-5 py-2.5 text-[15px] sm:text-base font-bold border-b-[3px] whitespace-nowrap ${on ? "text-navy" : "border-transparent text-navy/55 hover:text-navy"}`}
              style={on ? { borderColor: a.color } : undefined}
            >
              <span className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center" style={{ background: a.color, opacity: on ? 1 : 0.6 }}><Glyph slug={a.slug} size={20} /></span>
              {a.name}
              {a.comingSoon && (
                <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy/55">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>}
      {active?.comingSoon ? (
        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="max-w-xl mx-auto text-center flex flex-col items-center gap-5">
            <span className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: active.color }}>
              <Glyph slug={active.slug} size={40} />
            </span>
            <h1 className="text-3xl font-bold text-navy">{active.name} is almost ready</h1>
            <p className="text-lg text-navy/70 leading-relaxed">{active.blurb}</p>
            <p className="text-base text-navy/55">
              It&rsquo;s not open yet. Check back soon!
            </p>
          </div>
        </main>
      ) : active && notSetUp.includes(active.slug) ? (
        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="max-w-xl mx-auto text-center flex flex-col items-center gap-5">
            <span className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: active.color }}>
              <Glyph slug={active.slug} size={40} />
            </span>
            <h1 className="text-3xl font-bold text-navy">{active.name} isn&rsquo;t ready yet</h1>
            <p className="text-lg text-navy/70 leading-relaxed">
              It isn&rsquo;t set up for your family yet. Ask a parent to help.
            </p>
          </div>
        </main>
      ) : active ? (
        <iframe
          key={`${active.slug}-${code}`}
          title={`${active.app} for kids`}
          src={frameSrc}
          className="flex-1 w-full border-0 bg-cream"
          allow="autoplay; encrypted-media; clipboard-write; fullscreen"
        />
      ) : (
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="max-w-3xl mx-auto text-center flex flex-col gap-6 sm:gap-8">
            <h1 className="text-[28px] leading-tight sm:text-4xl font-bold text-navy">What do you want to do?</h1>
            {/* Phone: one big row per app. Wider: tiles side by side. */}
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 ${APPS.length >= 5 ? "lg:grid-cols-5" : APPS.length === 4 ? "lg:grid-cols-4" : ""}`}>
              {APPS.map((a) => (
                <Link key={a.slug} href={`/play/${a.slug}`} className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(34,29,46,0.10)] p-4 sm:p-6 flex sm:flex-col items-center gap-4 sm:gap-3 text-left sm:text-center hover:-translate-y-0.5 active:scale-[0.99] transition">
                  <span className="w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center" style={{ background: a.color }}><Glyph slug={a.slug} size={32} /></span>
                  <span className="flex flex-col sm:items-center gap-0.5">
                    <span className="text-xl font-bold text-navy">{a.name}</span>
                    <span className="text-sm text-navy/50">{a.comingSoon ? "Coming soon" : a.app}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

function Header({ code, onForget, slim }: { code?: string; onForget?: () => void; slim?: boolean }) {
  // No "Parents" link here: a home-screen app has no back button, so a kid who
  // tapped it would be stranded on the parent sign-in page.
  if (slim) {
    if (!code) return null;
    return (
      <header className="h-9 shrink-0 bg-white border-b border-navy/10 px-3 flex items-center justify-end gap-3 text-xs">
        <button onClick={onForget} className="min-h-[36px] px-1 text-navy/45 hover:text-navy font-semibold">Not you?</button>
      </header>
    );
  }
  return (
    <header className="h-14 sm:h-16 shrink-0 bg-white border-b border-navy/10 px-4 sm:px-6 flex items-center justify-between gap-3">
      <Link href="/play" className="inline-flex shrink-0" aria-label="Safe Family">
        <SafeFamilyLogo />
      </Link>
      <div className="flex items-center gap-3 sm:gap-4 text-sm whitespace-nowrap">
        {code ? (
          <>
            {/* Desktop: the family pill. Phone: just "Not you?" — kids don't need the code. */}
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-navy/10 bg-cream px-3 py-1.5 text-navy/70">
              Family <span className="font-mono font-bold tracking-widest text-navy">{code}</span>
              <button onClick={onForget} className="text-navy/50 hover:text-navy font-semibold">Not you?</button>
            </span>
            <button onClick={onForget} className="sm:hidden min-h-[44px] rounded-full border border-navy/10 bg-cream px-4 text-navy/60 hover:text-navy font-semibold">
              Not you?
            </button>
          </>
        ) : null}
        {/* Only before a code: once a kid is in, a stray tap on a home-screen
            app (no back button) would strand them on the parent sign-in. */}
        {!code && <Link href="/login" className="text-navy/50 hover:text-navy font-semibold">Parents</Link>}
      </div>
    </header>
  );
}
