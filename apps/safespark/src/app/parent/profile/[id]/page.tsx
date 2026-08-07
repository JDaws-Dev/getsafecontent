'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Check, ChevronLeft, Database, CornerUpRight } from 'lucide-react';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { useAuth as useMarketingAuth } from '@/contexts/AuthContext';

// Per-kid avatar hues. This is kid IDENTITY data (stored as `avatarColor` on
// the profile), not brand colour — the keys must keep matching what Convex
// writes. Flattened from gradients to solids so they sit quietly next to the
// one SafeSpark accent.
const COLOR_CLASSES: Record<string, string> = {
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  rose: 'bg-rose-500',
};

export default function ProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Marketing Central JWT only — Clerk retired 2026-05-28.
  const marketing = useMarketingAuth();
  const isLoaded = !marketing.isLoading;
  const isSignedIn = marketing.isAuthenticated;
  const profileId = id as Id<'kidProfiles'>;
  const detail = useQuery(
    api.safespark.getProfileDetail,
    isSignedIn ? { profileId, userToken: marketing.token ?? undefined } : 'skip',
  );
  // Other kids in the family — destinations for moving a game.
  const family = useQuery(
    api.safespark.listFamilyForParent,
    isSignedIn ? { userToken: marketing.token ?? undefined } : 'skip',
  );
  const siblings = (family?.kids ?? [])
    .filter((k) => k.id !== profileId)
    .map((k) => ({ id: k.id, name: k.displayName }));

  if (!isLoaded) {
    return <main className="flex min-h-screen items-center justify-center text-brand-ink-soft">Loading…</main>;
  }
  if (!isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <h1 className="font-display text-2xl font-bold text-brand-navy">Sign in to view this profile</h1>
          <Link href="/login" className="inline-block rounded-2xl bg-accent-600 px-5 py-2 text-sm font-black text-brand-navy hover:bg-accent-700">
            Sign in with Safe Family
          </Link>
          <div>
            <Link href="/" className="text-sm font-bold text-accent-700 hover:text-accent-800">Back to home</Link>
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
          <h1 className="font-display text-2xl font-bold text-brand-navy">Profile not found</h1>
          <p className="text-sm text-brand-ink-soft">Either it doesn&apos;t exist or it belongs to a different family.</p>
          <Link href="/parent" className="text-sm font-bold text-accent-700 hover:text-accent-800">← Back to dashboard</Link>
        </div>
      </main>
    );
  }

  const { profile, projects, recentRequests, blockedEvents, concernAlerts, usageThisMonth } = detail;

  // Build the chronological activity log — interleaves prompts, blocks,
  // and concern alerts so a parent can scroll one timeline instead of
  // hunting through three sections. Cap at 100 rows to keep the page
  // snappy; data fetch already pulled more so we can paginate later.
  type LogEntry =
    | { kind: 'prompt'; id: string; createdAt: number; prompt: string; projectTitle?: string }
    | { kind: 'blocked'; id: string; createdAt: number; prompt: string; message: string }
    | { kind: 'concern'; id: string; createdAt: number; query: string; category: 'self_harm_adjacent' | 'eating_disorder_adjacent'; rationale: string; acknowledged: boolean };
  const activityLog: LogEntry[] = [
    ...recentRequests.map((r): LogEntry => ({
      kind: 'prompt',
      id: String(r.id),
      createdAt: r.createdAt,
      prompt: r.prompt,
      projectTitle: r.projectTitle,
    })),
    ...blockedEvents.map((e): LogEntry => ({
      kind: 'blocked',
      id: String(e.id),
      createdAt: e.createdAt,
      prompt: e.prompt,
      message: e.message,
    })),
    ...concernAlerts.map((c): LogEntry => ({
      kind: 'concern',
      id: String(c.id),
      createdAt: c.createdAt,
      query: c.query,
      category: c.category,
      rationale: c.rationale,
      acknowledged: c.acknowledged,
    })),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 100);
  const colorClass = COLOR_CLASSES[profile.avatarColor ?? 'violet'] ?? COLOR_CLASSES.violet;

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/parent" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-accent-700 hover:text-accent-800">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>

        <header className="flex flex-wrap items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${colorClass} font-display text-2xl font-bold text-white shadow`}>
            {profile.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-brand-navy">{profile.displayName}</h1>
            <p className="text-xs font-bold text-brand-ink-soft">
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

        <section className="rounded-3xl border border-brand-cream-2 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display text-lg font-bold text-brand-navy">All projects</h2>
          {projects.length === 0 ? (
            <p className="rounded-2xl bg-brand-cream px-4 py-6 text-center text-sm font-semibold text-brand-ink-soft">
              No projects yet. They&apos;ll show here as soon as {profile.displayName} starts building.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCardWithWipe key={p.id} project={p} siblings={siblings} />
              ))}
            </div>
          )}
        </section>

        {/* Full activity log — interleaves prompts, blocked-topic
            attempts, and concern-alert events chronologically. The
            "everything {kid} typed to Spark" view Jeremiah asked for
            on 2026-05-29. Each entry color-coded by kind. */}
        <section className="rounded-3xl border border-brand-cream-2 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-brand-navy">Activity log</h2>
              <p className="text-xs font-bold text-brand-ink-soft">
                Everything {profile.displayName} asked Spark to build — including refusals
              </p>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {activityLog.length} {activityLog.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
          {activityLog.length === 0 ? (
            <p className="rounded-2xl bg-brand-cream px-4 py-6 text-center text-sm font-semibold text-brand-ink-soft">
              Nothing yet. When {profile.displayName} starts building, every prompt shows here.
            </p>
          ) : (
            <ol className="divide-y divide-brand-cream-2">
              {activityLog.map((entry) => (
                <li key={`${entry.kind}-${entry.id}`} className="py-3 first:pt-0 last:pb-0">
                  {entry.kind === 'prompt' && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent-700">
                          Asked Spark
                        </span>
                        {entry.projectTitle && (
                          <span className="truncate text-[11px] font-bold text-slate-400">
                            · {entry.projectTitle}
                          </span>
                        )}
                        <span className="ml-auto text-[11px] font-bold text-slate-400">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-brand-navy">{entry.prompt}</p>
                    </>
                  )}
                  {entry.kind === 'blocked' && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-700">
                          Blocked topic
                        </span>
                        <span className="truncate text-[11px] font-bold text-rose-500">
                          · {entry.message.replace(/^Blocked phrase:\s*/i, '')}
                        </span>
                        <span className="ml-auto text-[11px] font-bold text-slate-400">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-rose-700">{entry.prompt}</p>
                    </>
                  )}
                  {entry.kind === 'concern' && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                          {entry.category === 'self_harm_adjacent' ? 'Self-harm signal' : 'ED signal'}
                        </span>
                        {entry.acknowledged && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <Check className="h-3 w-3" aria-hidden="true" />
                            Acknowledged
                          </span>
                        )}
                        <span className="ml-auto text-[11px] font-bold text-slate-400">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-black text-rose-900">{entry.query}</p>
                      <p className="mt-1 text-xs italic text-rose-700">{entry.rationale}</p>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}

function ProjectCardWithWipe({
  project,
  siblings,
}: {
  project: {
    id: Id<'safesparkProjects'>;
    title: string;
    html: string;
    updatedAt: number;
    lastPrompt?: string;
    isCommunication?: boolean;
  };
  siblings: { id: Id<'kidProfiles'>; name: string }[];
}) {
  // Parent calls dbWipe through the Marketing JWT — dbWipe was made
  // auth-gated 2026-05-29 after the safety audit (previously public).
  // Without userToken the parent's wipe button would throw 401.
  const marketing = useMarketingAuth();
  const wipe = useMutation(api.sparkdb.dbWipe);
  const moveProject = useMutation(api.safespark.moveProjectToKid);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [moved, setMoved] = useState(false);

  const onMove = async (toKidProfileId: Id<'kidProfiles'>, name: string) => {
    if (!confirm(`Move "${project.title}" to ${name}? It keeps all its history and share link.`)) return;
    setMoving(name);
    try {
      await moveProject({
        projectId: project.id,
        toKidProfileId,
        userToken: marketing.token ?? undefined,
      });
      setMoved(true);
      setResult(`Moved to ${name}.`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Move failed.');
    } finally {
      setMoving(null);
    }
  };
  const onWipe = async () => {
    if (!confirm(`Wipe shared data for "${project.title}"? Any leaderboard / message wall / shared state will be cleared.`)) {
      return;
    }
    setBusy(true);
    try {
      const r = await wipe({
        projectId: project.id,
        userToken: marketing.token ?? undefined,
      });
      setResult(`Wiped ${r.deleted} row${r.deleted === 1 ? '' : 's'}.`);
      setTimeout(() => setResult(null), 4000);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Wipe failed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="overflow-hidden rounded-2xl border border-brand-cream-2 bg-white shadow-sm">
      <div className="aspect-video w-full bg-brand-cream-2">
        <iframe
          srcDoc={project.html}
          title={project.title}
          className="pointer-events-none h-full w-full"
          sandbox=""
        />
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <h3 className="flex-1 truncate font-bold text-brand-navy" title={project.title}>{project.title}</h3>
          {project.isCommunication && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800"
              title="Project contains chat / message wall / guestbook — inspect the shared data below"
            >
              Chat
            </span>
          )}
        </div>
        {project.lastPrompt && (
          <p className="mt-1 line-clamp-2 text-xs text-brand-ink-soft" title={project.lastPrompt}>{project.lastPrompt}</p>
        )}
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {formatDate(project.updatedAt)}
        </p>
        <ProjectDataInspector projectId={project.id} />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onWipe}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-cream-2 bg-white px-2 py-1 text-[10px] font-bold text-brand-ink-soft hover:bg-brand-cream disabled:opacity-50"
            title="Wipe leaderboard / shared data for this project"
          >
            <Database className="h-3 w-3" />
            {busy ? 'Wiping…' : 'Wipe shared data'}
          </button>
          {!moved &&
            siblings.map((sib) => (
              <button
                key={sib.id}
                type="button"
                onClick={() => onMove(sib.id, sib.name)}
                disabled={moving !== null}
                className="inline-flex items-center gap-1 rounded-lg border border-accent-200 bg-accent-50 px-2 py-1 text-[10px] font-bold text-accent-700 hover:bg-accent-100 disabled:opacity-50"
                title={`Move this game to ${sib.name}'s profile`}
              >
                <CornerUpRight className="h-3 w-3" />
                {moving === sib.name ? 'Moving…' : `Move to ${sib.name}`}
              </button>
            ))}
        </div>
        {result && <p className="mt-1 text-[10px] font-bold text-emerald-700">{result}</p>}
      </div>
    </article>
  );
}

// Phase 4 — parent visibility into what each project stores in spark.db.
// Collapsed by default to keep the project card tight; expanded shows
// every key + a preview of its value (chat messages, leaderboard rows,
// counters, etc). Lets a parent answer "what is my kid actually
// chatting about / collecting in this game?" without having to play
// the game themselves. Calls the existing dbList query — that one is
// public (reads aren't the security hole; writes are, which dbWipe now
// gates per 2026-05-29 audit fix).
function ProjectDataInspector({ projectId }: { projectId: Id<'safesparkProjects'> }) {
  const [open, setOpen] = useState(false);
  const rows = useQuery(
    api.sparkdb.dbList,
    open ? { projectId } : 'skip',
  );

  const summary = rows && rows.length > 0 ? `${rows.length} key${rows.length === 1 ? '' : 's'}` : 'none yet';

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg border border-brand-cream-2 bg-white px-2 py-1 text-[10px] font-bold text-brand-ink-soft hover:bg-brand-cream"
        aria-expanded={open}
        title="See what data this project stores (leaderboards, chat messages, etc.)"
      >
        <Database className="h-3 w-3" />
        {open ? 'Hide shared data' : `View shared data (${rows === undefined && open ? '…' : summary})`}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-brand-cream-2 bg-brand-cream p-2">
          {rows === undefined ? (
            <p className="text-[11px] font-semibold text-slate-400">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-[11px] font-semibold text-brand-ink-soft">
              Nothing stored yet. If this project is a chat / leaderboard / message wall,
              it&apos;ll show up here as soon as someone uses it.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {rows.map((row) => (
                <DataRow key={row.key} row={row} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function DataRow({ row }: { row: { key: string; value: string; updatedAt: number } }) {
  // Try to parse as JSON for readable rendering — kid games usually
  // store arrays (leaderboard, messages) or objects (counters, state).
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.value);
  } catch {
    parsed = row.value;
  }

  return (
    <li className="rounded bg-white px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <code className="truncate text-[10px] font-bold text-accent-700" title={row.key}>{row.key}</code>
        <span className="shrink-0 text-[9px] font-bold text-slate-400">{formatDate(row.updatedAt)}</span>
      </div>
      {Array.isArray(parsed) ? (
        <ul className="mt-1 list-inside list-disc space-y-0.5 pl-1 text-[11px] text-brand-navy">
          {parsed.slice(0, 10).map((item, idx) => (
            <li key={idx} className="line-clamp-1" title={typeof item === 'string' ? item : JSON.stringify(item)}>
              {typeof item === 'string'
                ? item
                : typeof item === 'object' && item !== null
                  ? Object.entries(item as Record<string, unknown>).slice(0, 3).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join(' · ')
                  : String(item)}
            </li>
          ))}
          {parsed.length > 10 && (
            <li className="text-[10px] italic text-slate-400">+ {parsed.length - 10} more</li>
          )}
        </ul>
      ) : typeof parsed === 'object' && parsed !== null ? (
        <pre className="mt-1 overflow-x-auto rounded bg-brand-cream-2 px-2 py-1 text-[10px] text-brand-navy">
          {JSON.stringify(parsed, null, 2).slice(0, 500)}
        </pre>
      ) : (
        <p className="mt-1 line-clamp-2 text-[11px] text-brand-navy" title={String(parsed)}>
          {String(parsed)}
        </p>
      )}
    </li>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-brand-cream-2 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-brand-navy">{value}</p>
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
