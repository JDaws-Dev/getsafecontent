'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { ChevronLeft, Database } from 'lucide-react';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { useAuth as useMarketingAuth } from '@/contexts/AuthContext';

const COLOR_CLASSES: Record<string, string> = {
  violet: 'from-violet-500 to-pink-500',
  pink: 'from-pink-500 to-amber-500',
  emerald: 'from-emerald-500 to-sky-500',
  amber: 'from-amber-500 to-rose-500',
  sky: 'from-sky-500 to-violet-500',
};

export default function ProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Dual-auth: Clerk (legacy) OR Marketing JWT (federated, the 23
  // backfilled lifetime users). Mirrors the pattern in /parent/page.tsx.
  const { isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useUser();
  const marketing = useMarketingAuth();
  const isLoaded = clerkLoaded && !marketing.isLoading;
  const isSignedIn = clerkSignedIn === true || marketing.isAuthenticated;
  const profileId = id as Id<'kidProfiles'>;
  const detail = useQuery(api.safespark.getProfileDetail, isSignedIn ? { profileId } : 'skip');

  if (!isLoaded) {
    return <main className="flex min-h-screen items-center justify-center text-slate-500">Loading…</main>;
  }
  if (!isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <h1 className="text-2xl font-black text-slate-800">Sign in to view this profile</h1>
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
  if (detail === undefined) {
    return <main className="flex min-h-screen items-center justify-center text-slate-400">Loading profile…</main>;
  }
  if (detail === null) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <h1 className="text-2xl font-black text-slate-800">Profile not found</h1>
          <p className="text-sm text-slate-500">Either it doesn&apos;t exist or it belongs to a different family.</p>
          <Link href="/parent" className="text-sm font-bold text-violet-600 hover:text-violet-800">← Back to dashboard</Link>
        </div>
      </main>
    );
  }

  const { profile, projects, recentRequests, usageThisMonth } = detail;
  const colorClass = COLOR_CLASSES[profile.avatarColor ?? 'violet'] ?? COLOR_CLASSES.violet;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/parent" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-violet-500 hover:text-violet-700">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>

        <header className="flex flex-wrap items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${colorClass} text-2xl font-black text-white shadow`}>
            {profile.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-slate-900">{profile.displayName}</h1>
            <p className="text-xs font-bold text-slate-500">
              {profile.age != null ? `Age ${profile.age} · ` : ''}
              {profile.sex === 'adult' ? 'Adult' : profile.sex === 'girl' ? 'Girl' : 'Boy'}
              {' · '}
              {projects.length} project{projects.length === 1 ? '' : 's'}
            </p>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          <StatTile label="Chat turns this month" value={usageThisMonth.chatTurns.toLocaleString()} />
          <StatTile label="Image restyles this month" value={usageThisMonth.imageTransforms.toLocaleString()} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-black text-slate-900">All projects</h2>
          {projects.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
              No projects yet. They&apos;ll show here as soon as {profile.displayName} starts building.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCardWithWipe key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>

        {recentRequests.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-black text-slate-900">Recent prompts</h2>
            <ul className="space-y-2">
              {recentRequests.map((r) => (
                <li key={r.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs">
                  <p className="font-semibold text-slate-700">{r.prompt}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {r.projectTitle ? `${r.projectTitle} · ` : ''}{formatDate(r.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function ProjectCardWithWipe({
  project,
}: {
  project: {
    id: Id<'safesparkProjects'>;
    title: string;
    html: string;
    updatedAt: number;
    lastPrompt?: string;
  };
}) {
  const wipe = useMutation(api.sparkdb.dbWipe);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const onWipe = async () => {
    if (!confirm(`Wipe shared data for "${project.title}"? Any leaderboard / message wall / shared state will be cleared.`)) {
      return;
    }
    setBusy(true);
    try {
      const r = await wipe({ projectId: project.id });
      setResult(`Wiped ${r.deleted} row${r.deleted === 1 ? '' : 's'}.`);
      setTimeout(() => setResult(null), 4000);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Wipe failed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-video w-full bg-slate-100">
        <iframe
          srcDoc={project.html}
          title={project.title}
          className="pointer-events-none h-full w-full"
          sandbox=""
        />
      </div>
      <div className="p-3">
        <h3 className="truncate font-black text-slate-900" title={project.title}>{project.title}</h3>
        {project.lastPrompt && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-500" title={project.lastPrompt}>{project.lastPrompt}</p>
        )}
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {formatDate(project.updatedAt)}
        </p>
        <button
          type="button"
          onClick={onWipe}
          disabled={busy}
          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          title="Wipe leaderboard / shared data for this project"
        >
          <Database className="h-3 w-3" />
          {busy ? 'Wiping…' : 'Wipe shared data'}
        </button>
        {result && <p className="mt-1 text-[10px] font-bold text-emerald-700">{result}</p>}
      </div>
    </article>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ts));
}
