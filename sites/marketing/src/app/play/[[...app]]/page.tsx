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

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const CODE_KEY = "safefamily_family_code";
const LAST_APP_KEY = "safefamily_last_kid_app";

const APPS = [
  { slug: "tunes", name: "Music", app: "SafeTunes", color: "#7C4DE0", path: "/tunes/play" },
  { slug: "tube", name: "Videos", app: "SafeTube", color: "#F0603A", path: "/tube/play" },
  { slug: "reads", name: "Books", app: "SafeReads", color: "#3AA06B", path: "/reads/read" },
  { slug: "study", name: "Search", app: "SafeStudy", color: "#2F6BF0", path: "/study/play" },
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

const Glyph = ({ slug }: { slug: string }) => {
  const c = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (slug) {
    case "tunes": return <svg {...c}><path d="M9 17V5l10-2v12M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /></svg>;
    case "tube": return <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5Z" /></svg>;
    case "reads": return <svg {...c}><path d="M4 5a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2V5Zm0 0a2 2 0 0 0 2 2h10" /></svg>;
    case "study": return <svg {...c}><path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" /></svg>;
    default: return <svg {...c}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" /></svg>;
  }
};

const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);

export default function PlayPage() {
  const params = useParams<{ app?: string[] }>();
  const search = useSearchParams();
  const router = useRouter();
  const slug = params?.app?.[0] ?? null;
  const active = useMemo(() => APPS.find((a) => a.slug === slug) ?? null, [slug]);

  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalize(input);
    if (c.length !== 6) return;
    try { localStorage.setItem(CODE_KEY, c); } catch { /* ignore */ }
    setCode(c);
    let last: string | null = null;
    try { last = localStorage.getItem(LAST_APP_KEY); } catch { /* ignore */ }
    router.replace(`/play/${last && APPS.some((a) => a.slug === last) ? last : "tube"}`);
  };

  const forget = () => {
    try { localStorage.removeItem(CODE_KEY); } catch { /* ignore */ }
    setCode(null); setInput("");
    router.replace("/play");
  };

  if (!ready) return <div className="min-h-screen bg-cream" />;

  // No code yet: the one place a kid ever types it.
  if (!code) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-3xl shadow-[0_8px_30px_rgba(34,29,46,0.10)] p-8 flex flex-col gap-5 text-center">
            <h1 className="text-3xl font-bold text-navy">Enter your family code</h1>
            <p className="text-navy/60 -mt-2">Ask a parent for the 6 letters and numbers.</p>
            <input
              value={input}
              onChange={(e) => setInput(normalize(e.target.value))}
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
    <div className="h-screen bg-cream flex flex-col">
      <Header code={code} onForget={forget} />
      <nav className="bg-white border-b border-navy/10 px-3 sm:px-6 flex items-center gap-1 overflow-x-auto" aria-label="Apps">
        {APPS.map((a) => {
          const on = active?.slug === a.slug;
          return (
            <Link
              key={a.slug}
              href={`/play/${a.slug}`}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-3 text-sm sm:text-base font-bold border-b-[3px] whitespace-nowrap ${on ? "text-navy" : "border-transparent text-navy/55 hover:text-navy"}`}
              style={on ? { borderColor: a.color } : undefined}
            >
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: a.color, opacity: on ? 1 : 0.6 }}><Glyph slug={a.slug} /></span>
              {a.name}
              {a.comingSoon && (
                <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy/55">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {active?.comingSoon ? (
        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="max-w-xl mx-auto text-center flex flex-col items-center gap-5">
            <span className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: active.color }}>
              <Glyph slug={active.slug} />
            </span>
            <h1 className="text-3xl font-bold text-navy">{active.name} is almost ready</h1>
            <p className="text-lg text-navy/70 leading-relaxed">{active.blurb}</p>
            <p className="text-base text-navy/55">
              It&rsquo;s not open yet. Check back soon!
            </p>
          </div>
        </main>
      ) : active ? (
        <iframe
          key={`${active.slug}-${code}`}
          title={`${active.app} for kids`}
          src={`${active.path}?fc=${encodeURIComponent(code)}&embed=1`}
          className="flex-1 w-full border-0 bg-cream"
          allow="autoplay; encrypted-media; clipboard-write; fullscreen"
        />
      ) : (
        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="max-w-3xl mx-auto text-center flex flex-col gap-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-navy">What do you want to do?</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {APPS.map((a) => (
                <Link key={a.slug} href={`/play/${a.slug}`} className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(34,29,46,0.10)] p-5 flex flex-col items-center gap-3 hover:-translate-y-0.5 transition">
                  <span className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: a.color }}><Glyph slug={a.slug} /></span>
                  <span className="text-lg font-bold text-navy">{a.name}</span>
                  <span className="text-xs text-navy/50">{a.comingSoon ? "Coming soon" : a.app}</span>
                </Link>
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

function Header({ code, onForget }: { code?: string; onForget?: () => void }) {
  return (
    <header className="h-16 shrink-0 bg-white border-b border-navy/10 px-4 sm:px-6 flex items-center justify-between">
      <Link href="/play" className="inline-flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5A962] to-[#E88B6A] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3C7 3 3 7 3 12h18c0-5-4-9-9-9Z" /><path d="M12 12v7a2 2 0 0 0 4 0" /></svg>
        </span>
        <span className="text-lg font-bold text-navy">Safe Family</span>
      </Link>
      <div className="flex items-center gap-3 text-sm">
        {code ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-cream px-3 py-1.5 text-navy/70">
            Family <span className="font-mono font-bold tracking-widest text-navy">{code}</span>
            <button onClick={onForget} className="text-navy/50 hover:text-navy font-semibold">Not you?</button>
          </span>
        ) : null}
        <Link href="/login" className="text-navy/50 hover:text-navy font-semibold">Parents</Link>
      </div>
    </header>
  );
}
