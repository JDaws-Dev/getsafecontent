'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { useEffect } from 'react';
import { Copy, Plus, Users, Settings2, X, LogOut } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuth as useMarketingAuth } from '@/contexts/AuthContext';

export default function ParentDashboard() {
  // Dual-auth: either Clerk (legacy) OR Marketing Central JWT (federated).
  // The federated path is how Michelle, Jenny, Ben Purves, Jolene, et al.
  // (the 23 backfilled lifetime users) reach this page.
  const { isSignedIn: clerkSignedIn, isLoaded: clerkLoaded, user: clerkUser } = useUser();
  const marketing = useMarketingAuth();

  const isLoaded = clerkLoaded && !marketing.isLoading;
  const isClerkAuth = clerkSignedIn === true;
  const isFederatedAuth = marketing.isAuthenticated;
  const isSignedIn = isClerkAuth || isFederatedAuth;

  // Display data — prefer Clerk when present (legacy users), fall back to
  // Marketing user data for federated users.
  const displayEmail = isClerkAuth
    ? clerkUser?.primaryEmailAddress?.emailAddress
    : marketing.user?.email;
  const displayName = isClerkAuth
    ? (clerkUser?.firstName ?? clerkUser?.fullName ?? 'Parent')
    : (marketing.user?.name ?? marketing.user?.email?.split('@')[0] ?? 'Parent');

  const me = useQuery(api.users.getCurrent, isSignedIn ? {} : 'skip');
  const upsertMe = useMutation(api.users.upsertFromClerk);

  // upsertFromClerk only applies to Clerk-authed users; federated users
  // already have their SafeSpark row (provisioned via /provisionUser during
  // the May 27 backfill or live signup webhook).
  useEffect(() => {
    if (isClerkAuth && me === null) {
      void upsertMe({ displayName });
    }
  }, [isClerkAuth, me, upsertMe, displayName]);

  const family = useQuery(api.safespark.listFamilyForParent, isSignedIn ? {} : 'skip');
  const usage = useQuery(api.safespark.getFamilyUsageThisMonth, isSignedIn ? {} : 'skip');
  const ensureFamily = useMutation(api.families.ensureForParent);
  const [codeCopied, setCodeCopied] = useState(false);

  if (!isLoaded) {
    return <main className="flex min-h-screen items-center justify-center text-slate-500">Loading…</main>;
  }
  if (!isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <h1 className="text-2xl font-black text-slate-800">Sign in to open your dashboard</h1>
          <Link href="/login" className="inline-block rounded-2xl bg-violet-600 px-5 py-2 text-sm font-black text-white hover:bg-violet-700">
            Sign in with Safe Family
          </Link>
          <div>
            <Link href="/" className="text-sm font-bold text-violet-600 hover:text-violet-800">Back to home</Link>
          </div>
        </div>
      </main>
    );
  }

  const code = family?.family?.code;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/" className="text-xs font-bold uppercase tracking-widest text-violet-500 hover:text-violet-700">
              SafeSpark
            </Link>
            <h1 className="text-2xl font-black text-slate-900">Parent dashboard</h1>
            <p className="text-sm text-slate-600">Signed in as {displayEmail}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/make" className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-700">
              Open SafeSpark →
            </Link>
            {isClerkAuth ? (
              <UserButton />
            ) : (
              <button
                type="button"
                onClick={() => {
                  marketing.logout();
                  window.location.href = '/login';
                }}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            )}
          </div>
        </header>

        {usage && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-500">
                  This month · {usage.yearMonth}
                </p>
                <h2 className="text-lg font-black text-slate-900">Family usage</h2>
              </div>
              <p className="text-xs font-bold text-slate-500">Resets on the 1st</p>
            </div>
            <div className="mt-4 space-y-4">
              <CapMeter
                label="Chat turns"
                used={usage.chatTurns}
                cap={usage.caps.chatTurns}
                pct={usage.pct.chatTurns}
              />
              <CapMeter
                label="Image restyles"
                used={usage.imageTransforms}
                cap={usage.caps.imageTransforms}
                pct={usage.pct.imageTransforms}
              />
            </div>
            {usage.perMember.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-700">
                  Per-profile breakdown ({usage.perMember.length})
                </summary>
                <div className="mt-2 space-y-1.5">
                  {usage.perMember.map((m) => (
                    <div key={m.clerkUserId} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                      <span className="font-bold text-slate-700">{m.email || m.clerkUserId}</span>
                      <span className="font-mono font-black text-slate-500">
                        {m.turns} turns · {m.images} images
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>
        )}

        <section className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-500 via-pink-500 to-amber-500 p-[1.5px] shadow-lg">
          <div className="rounded-[22px] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-500">Family code</p>
                <h2 className="text-lg font-black text-slate-900">Everyone in your family uses this to sign in on any device</h2>
              </div>
              {!code ? (
                <button
                  type="button"
                  onClick={() => {
                    if (me?._id) void ensureFamily({ parentUserId: me._id });
                  }}
                  disabled={!me?._id}
                  className="rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <Plus className="mr-1 inline h-4 w-4" />
                  Create my family code
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="rounded-2xl bg-slate-900 px-4 py-2.5 font-mono text-2xl font-black tracking-[0.3em] text-emerald-300">
                    {code}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(code);
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="mr-1 inline h-3.5 w-3.5" />
                    {codeCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
            {code && (
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                On any device, open{' '}
                <Link href="/start" className="font-bold text-violet-600 underline">
                  getsafespark.com/start
                </Link>{' '}
                and enter <span className="font-mono font-black text-slate-900">{code}</span>. Pick a profile —
                yours or a kid&apos;s — and every project saves under your family.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-violet-500">Profiles in your family</p>
              <h2 className="text-lg font-black text-slate-900">
                {family?.kids.length ?? 0} profile{family?.kids.length === 1 ? '' : 's'}
              </h2>
            </div>
            <Link
              href="/parent/setup"
              className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <Users className="h-4 w-4" />
              Add a profile
            </Link>
          </div>

          {!family?.kids.length ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
              No profiles yet. Add yourself or a kid in setup, then everyone in the family signs in with the code above.
            </p>
          ) : (
            <div className="space-y-4">
              {family.kids.map((kid) => (
                <KidRow key={kid.id} kid={kid} />
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

type Kid = {
  id: Id<'kidProfiles'>;
  displayName: string;
  age?: number;
  avatarColor?: string;
  projects: { id: Id<'safesparkProjects'>; title: string; html: string; updatedAt: number; lastPrompt?: string }[];
};

function KidRow({ kid }: { kid: Kid }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const colorClass =
    {
      violet: 'from-violet-500 to-pink-500',
      pink: 'from-pink-500 to-rose-400',
      emerald: 'from-emerald-500 to-teal-400',
      amber: 'from-amber-500 to-orange-400',
      sky: 'from-sky-500 to-cyan-400',
    }[kid.avatarColor ?? 'violet'] ?? 'from-violet-500 to-pink-500';

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/parent/profile/${kid.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl -m-1 p-1 hover:bg-white/60"
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${colorClass} text-lg font-black text-white shadow`}>
            {kid.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-slate-900">{kid.displayName}</h3>
            <p className="text-xs font-bold text-slate-500">
              {kid.age != null ? `Age ${kid.age} · ` : ''}{kid.projects.length} project{kid.projects.length === 1 ? '' : 's'} · View all →
            </p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
          aria-expanded={settingsOpen}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Settings
        </button>
      </div>
      {settingsOpen && <KidSettingsPanel kidProfileId={kid.id} />}
      {kid.projects.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {kid.projects.slice(0, 8).map((p) => (
            <ProjectThumb key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function KidSettingsPanel({ kidProfileId }: { kidProfileId: Id<'kidProfiles'> }) {
  const settings = useQuery(api.safespark.getKidSettings, { kidProfileId });
  const setKidSettings = useMutation(api.safespark.setKidSettings);
  const setBlockedTopics = useMutation(api.safespark.setBlockedTopics);
  const [topicInput, setTopicInput] = useState('');

  if (!settings) {
    return (
      <div className="mt-3 rounded-xl bg-white p-3 text-xs font-semibold text-slate-400">
        Loading settings…
      </div>
    );
  }

  const toggle = async (
    key: 'allowImageRestyle' | 'allowVoice' | 'allowWebData' | 'allowSharing',
    next: boolean,
  ) => {
    try {
      await setKidSettings({ kidProfileId, [key]: next } as Parameters<typeof setKidSettings>[0]);
    } catch (err) {
      console.error('setKidSettings failed', err);
    }
  };

  const addTopic = async () => {
    const t = topicInput.trim();
    if (!t) return;
    const next = Array.from(new Set([...settings.blockedTopics, t.toLowerCase()]));
    setTopicInput('');
    try {
      await setBlockedTopics({ kidProfileId, topics: next });
    } catch (err) {
      console.error('setBlockedTopics failed', err);
    }
  };

  const removeTopic = async (topic: string) => {
    const next = settings.blockedTopics.filter((t) => t !== topic);
    try {
      await setBlockedTopics({ kidProfileId, topics: next });
    } catch (err) {
      console.error('setBlockedTopics failed', err);
    }
  };

  return (
    <div className="mt-3 space-y-4 rounded-2xl border border-violet-100 bg-white p-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-violet-500">Allowed for this profile</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <ToggleRow
            label="AI image restyle"
            on={settings.allowImageRestyle}
            onChange={(v) => toggle('allowImageRestyle', v)}
          />
          <ToggleRow
            label="Voice input"
            on={settings.allowVoice}
            onChange={(v) => toggle('allowVoice', v)}
          />
          <ToggleRow
            label="Wikipedia facts"
            on={settings.allowWebData}
            onChange={(v) => toggle('allowWebData', v)}
          />
          <ToggleRow
            label="Share links"
            on={settings.allowSharing}
            onChange={(v) => toggle('allowSharing', v)}
          />
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-violet-500">Topics Spark won&apos;t build</p>
        <p className="mt-1 text-xs text-slate-500">
          Add words or phrases. Spark refuses to build projects whose prompt contains any of these.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {settings.blockedTopics.length === 0 ? (
            <span className="text-xs italic text-slate-400">No blocked topics yet.</span>
          ) : (
            settings.blockedTopics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700"
              >
                {topic}
                <button
                  type="button"
                  onClick={() => removeTopic(topic)}
                  className="rounded-full text-rose-500 hover:text-rose-700"
                  aria-label={`Remove ${topic}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addTopic();
              }
            }}
            placeholder="e.g. guns, dating, gambling"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:bg-white focus:outline-none"
            maxLength={80}
          />
          <button
            type="button"
            onClick={() => void addTopic()}
            disabled={!topicInput.trim()}
            className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-violet-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

function ProjectThumb({
  project,
}: {
  project: { id: Id<'safesparkProjects'>; title: string; html: string; updatedAt: number; lastPrompt?: string };
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <iframe
          srcDoc={project.html}
          sandbox=""
          title={project.title}
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{ width: '400%', height: '400%', transform: 'scale(0.25)' }}
          loading="lazy"
        />
      </div>
      <div className="px-3 py-2">
        <p className="line-clamp-1 text-xs font-black text-slate-900">{project.title}</p>
        <p className="text-[10px] font-bold text-slate-500">{formatDate(project.updatedAt)}</p>
      </div>
    </div>
  );
}

function CapMeter({ label, used, cap, pct }: { label: string; used: number; cap: number; pct: number }) {
  const tone =
    pct >= 95
      ? { bar: 'bg-rose-500', text: 'text-rose-700', track: 'bg-rose-100', note: `Cap reached soon — Spark will pause until next month.` }
      : pct >= 80
        ? { bar: 'bg-amber-500', text: 'text-amber-700', track: 'bg-amber-100', note: `Approaching this month's cap.` }
        : { bar: 'bg-emerald-500', text: 'text-emerald-700', track: 'bg-slate-100', note: null };
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-sm font-bold text-slate-700">{label}</p>
        <p className={`font-mono text-xs font-black ${tone.text}`}>
          {used.toLocaleString()} <span className="text-slate-400">/ {cap.toLocaleString()}</span>
        </p>
      </div>
      <div className={`mt-1.5 h-2 w-full overflow-hidden rounded-full ${tone.track}`}>
        <div className={`h-full ${tone.bar} transition-all`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      {tone.note && <p className={`mt-1 text-[11px] font-semibold ${tone.text}`}>{tone.note}</p>}
    </div>
  );
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}
