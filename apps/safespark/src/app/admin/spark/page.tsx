'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../../convex/_generated/api';
import { useAuth as useMarketingAuth } from '@/contexts/AuthContext';
import type { Id } from '../../../../convex/_generated/dataModel';

type Tab = 'prompts' | 'blocked' | 'concerns';

/**
 * Operator review surface for SafeSpark.
 *
 * Rewritten 2026-05-29 because the prior version was:
 *  (a) silently rejecting jedaws@gmail.com (used Convex auth.getUserIdentity
 *      which can't verify Marketing Central HS256 JWTs);
 *  (b) only showing prompts — no replies, no blocked events, no
 *      concern alerts, no thread drill-in. Useless for quality review.
 *
 * Now uses `userToken` (Marketing JWT) for auth — same path as the
 * rest of the app. Surfaces three streams (prompts/blocked/concerns)
 * with project-thread drill-in for any prompt that's tied to a project.
 */
export default function AdminSparkPage() {
  const marketing = useMarketingAuth();
  const isLoaded = !marketing.isLoading;
  const isSignedIn = marketing.isAuthenticated;
  const userToken = marketing.token ?? undefined;

  const [tab, setTab] = useState<Tab>('prompts');
  const [filter, setFilter] = useState('');
  const [openProjectId, setOpenProjectId] = useState<Id<'safesparkProjects'> | null>(null);

  const feed = useQuery(
    api.safespark.opsReviewFeed,
    isSignedIn ? { userToken, promptLimit: 200, blockedLimit: 100, concernLimit: 50 } : 'skip',
  );

  // Hook calls MUST happen before any early return — derive filtered
  // arrays from whatever feed currently is. Empty when feed isn't ready.
  const promptsAll = feed && feed !== null ? feed.prompts : [];
  const blockedAll = feed && feed !== null ? feed.blocked : [];
  const concernsAll = feed && feed !== null ? feed.concerns : [];
  const filteredPrompts = useFilterPrompts(promptsAll, filter);
  const filteredBlocked = useFilterBlocked(blockedAll, filter);
  const filteredConcerns = useFilterConcerns(concernsAll, filter);

  // Gate rendering.
  if (!isLoaded) {
    return <main className="flex min-h-screen items-center justify-center text-slate-500">Loading…</main>;
  }
  if (!isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <h1 className="text-2xl font-black text-slate-800">Sign in required</h1>
          <p className="text-sm text-slate-600">Operator review requires a signed-in Safe Family operator account.</p>
          <Link href="/login" className="inline-block rounded-2xl bg-violet-600 px-5 py-2 text-sm font-black text-white hover:bg-violet-700">
            Sign in
          </Link>
        </div>
      </main>
    );
  }
  if (feed === null) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <h1 className="text-2xl font-black text-slate-800">Not authorized</h1>
          <p className="text-sm text-slate-600">
            This dashboard is for the SafeSpark operator only.<br />
            <span className="text-xs">Auth resolved your account but your email doesn&apos;t match PARENT_EMAIL.</span>
          </p>
          <Link href="/" className="text-sm font-bold text-violet-600 hover:text-violet-800">Back to home</Link>
        </div>
      </main>
    );
  }
  if (feed === undefined) {
    return <main className="flex min-h-screen items-center justify-center text-slate-500">Loading review feed…</main>;
  }

  const uniqueUsers = new Set(feed.prompts.map((p) => p.email || p.clerkUserId)).size;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-500">SafeSpark · Operator</p>
            <h1 className="text-2xl font-black text-slate-900">Review feed</h1>
            <p className="text-sm text-slate-600">
              All kid-Spark interactions across every family. Click any row to inspect the full thread.
            </p>
          </div>
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter prompts / emails / projects…"
            className="w-64 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400"
          />
        </header>

        <section className="grid gap-3 sm:grid-cols-4">
          <Stat label="Total prompts (last 200)" value={feed.prompts.length} />
          <Stat label="Unique kids/parents" value={uniqueUsers} />
          <Stat label="Blocked events" value={feed.blocked.length} />
          <Stat label="Concern alerts" value={feed.concerns.length} highlight={feed.concerns.length > 0} />
        </section>

        <div className="flex gap-1 rounded-2xl bg-white p-1 shadow-sm border border-slate-200 w-fit">
          {(['prompts', 'blocked', 'concerns'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? 'rounded-xl bg-violet-600 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white'
                  : 'rounded-xl px-4 py-1.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800'
              }
            >
              {t === 'prompts' ? `Prompts (${filteredPrompts.length})` :
               t === 'blocked' ? `Blocked (${filteredBlocked.length})` :
               `Concerns (${filteredConcerns.length})`}
            </button>
          ))}
        </div>

        {tab === 'prompts' && (
          <PromptTable
            rows={filteredPrompts}
            onOpen={(id) => setOpenProjectId(id)}
          />
        )}
        {tab === 'blocked' && <BlockedTable rows={filteredBlocked} />}
        {tab === 'concerns' && <ConcernsTable rows={filteredConcerns} />}

        {openProjectId && (
          <ProjectThreadModal
            projectId={openProjectId}
            userToken={userToken}
            onClose={() => setOpenProjectId(null)}
          />
        )}
      </div>
    </main>
  );
}

type ReviewFeed = NonNullable<FunctionReturnType<typeof api.safespark.opsReviewFeed>>;
type PromptRow = ReviewFeed['prompts'][number];
type BlockedRow = ReviewFeed['blocked'][number];
type ConcernRow = ReviewFeed['concerns'][number];

function useFilterPrompts(rows: PromptRow[], filter: string): PromptRow[] {
  return useMemo(() => {
    if (!filter.trim()) return rows;
    const f = filter.toLowerCase();
    return rows.filter(
      (r) =>
        (r.email && r.email.toLowerCase().includes(f)) ||
        r.prompt.toLowerCase().includes(f) ||
        (r.projectTitle && r.projectTitle.toLowerCase().includes(f)) ||
        (r.lastReply && r.lastReply.toLowerCase().includes(f)),
    );
  }, [rows, filter]);
}

function useFilterBlocked(rows: BlockedRow[], filter: string): BlockedRow[] {
  return useMemo(() => {
    if (!filter.trim()) return rows;
    const f = filter.toLowerCase();
    return rows.filter(
      (r) =>
        r.prompt.toLowerCase().includes(f) ||
        r.message.toLowerCase().includes(f) ||
        (r.clerkUserId ? r.clerkUserId.toLowerCase().includes(f) : false),
    );
  }, [rows, filter]);
}

function useFilterConcerns(rows: ConcernRow[], filter: string): ConcernRow[] {
  return useMemo(() => {
    if (!filter.trim()) return rows;
    const f = filter.toLowerCase();
    return rows.filter(
      (r) =>
        r.kidName.toLowerCase().includes(f) ||
        r.query.toLowerCase().includes(f) ||
        r.rationale.toLowerCase().includes(f) ||
        r.category.toLowerCase().includes(f),
    );
  }, [rows, filter]);
}

function PromptTable({
  rows,
  onOpen,
}: {
  rows: PromptRow[];
  onOpen: (id: Id<'safesparkProjects'>) => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-3 py-3">When</th>
            <th className="px-3 py-3">Who</th>
            <th className="px-3 py-3">Project</th>
            <th className="px-3 py-3 w-[28%]">Kid&apos;s prompt</th>
            <th className="px-3 py-3 w-[28%]">Spark&apos;s reply</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700 align-top">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-3 py-3 text-xs font-mono text-slate-500">{formatDate(r.createdAt)}</td>
              <td className="px-3 py-3 text-xs">
                <div className="font-bold text-slate-800">{r.email || '(no email)'}</div>
                <div className="text-[10px] font-mono text-slate-400">{r.clerkUserId.slice(0, 20)}</div>
              </td>
              <td className="px-3 py-3 text-xs">
                <div className="font-bold text-slate-700">{r.projectTitle ?? '—'}</div>
                {r.isCommunication && (
                  <span className="mt-0.5 inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-800">
                    chat
                  </span>
                )}
              </td>
              <td className="px-3 py-3 text-sm leading-relaxed text-slate-800">{r.prompt}</td>
              <td className="px-3 py-3 text-sm leading-relaxed text-slate-600">
                {r.lastReply ?? <span className="italic text-slate-400">no reply captured</span>}
              </td>
              <td className="px-3 py-3 text-right">
                {r.projectId && (
                  <button
                    type="button"
                    onClick={() => onOpen(r.projectId!)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-600 hover:bg-violet-50"
                  >
                    Thread
                  </button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                No prompts match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function BlockedTable({ rows }: { rows: BlockedRow[] }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-rose-200 bg-rose-50 text-xs font-bold uppercase tracking-widest text-rose-700">
          <tr>
            <th className="px-3 py-3">When</th>
            <th className="px-3 py-3">Who</th>
            <th className="px-3 py-3">Attempted prompt</th>
            <th className="px-3 py-3">Block reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rose-100 text-slate-700 align-top">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-rose-50/40">
              <td className="whitespace-nowrap px-3 py-3 text-xs font-mono text-slate-500">{formatDate(r.createdAt)}</td>
              <td className="px-3 py-3 text-[10px] font-mono text-slate-400">{(r.clerkUserId ?? '—').slice(0, 28)}</td>
              <td className="px-3 py-3 text-sm font-semibold text-rose-900">{r.prompt}</td>
              <td className="px-3 py-3 text-xs text-rose-700">{r.message}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500">
                No blocked events match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function ConcernsTable({ rows }: { rows: ConcernRow[] }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-rose-300 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-rose-300 bg-rose-100 text-xs font-bold uppercase tracking-widest text-rose-800">
          <tr>
            <th className="px-3 py-3">When</th>
            <th className="px-3 py-3">Kid</th>
            <th className="px-3 py-3">Category</th>
            <th className="px-3 py-3">Query</th>
            <th className="px-3 py-3">Classifier rationale</th>
            <th className="px-3 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rose-200 text-slate-700 align-top">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-rose-50/40">
              <td className="whitespace-nowrap px-3 py-3 text-xs font-mono text-slate-500">{formatDate(r.createdAt)}</td>
              <td className="px-3 py-3 text-xs font-bold text-slate-800">{r.kidName}</td>
              <td className="px-3 py-3">
                <span className="inline-block rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  {r.category === 'self_harm_adjacent' ? 'Self-harm' : 'ED'}
                </span>
              </td>
              <td className="px-3 py-3 text-sm font-black text-rose-900">{r.query}</td>
              <td className="px-3 py-3 text-xs italic text-rose-700">{r.rationale}</td>
              <td className="px-3 py-3 text-xs">
                {r.acknowledged ? (
                  <span className="font-bold text-emerald-700">✓ Acknowledged</span>
                ) : (
                  <span className="font-bold text-rose-700">Pending parent ack</span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                No concern alerts. ✓
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function ProjectThreadModal({
  projectId,
  userToken,
  onClose,
}: {
  projectId: Id<'safesparkProjects'>;
  userToken?: string;
  onClose: () => void;
}) {
  const thread = useQuery(api.safespark.opsGetProjectThread, { projectId, userToken });
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-slate-900/60 backdrop-blur-sm">
      <div className="m-auto flex h-[90vh] w-[95vw] max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-500">Project thread</p>
            <h2 className="text-lg font-black text-slate-900">
              {thread === undefined ? 'Loading…' : thread === null ? 'Not found' : thread.title}
            </h2>
            {thread && thread !== null && (
              <p className="text-xs font-semibold text-slate-500">
                {thread.ownerLabel}
                {thread.isCommunication && (
                  <span className="ml-2 inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-800">chat project</span>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </header>
        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
          <div className="overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Conversation</h3>
            {thread && thread !== null ? (
              <ol className="space-y-3">
                {thread.messages.map((m, i) => (
                  <li
                    key={i}
                    className={
                      m.role === 'user'
                        ? 'rounded-2xl border border-slate-200 bg-white p-3'
                        : 'rounded-2xl border border-violet-200 bg-violet-50 p-3'
                    }
                  >
                    <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {m.role === 'user' ? 'Kid' : 'Spark'}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{m.content}</div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">Thread unavailable.</p>
            )}
          </div>
          <div className="overflow-hidden bg-white">
            <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Live preview (read-only)
            </h3>
            {thread && thread !== null ? (
              <iframe
                srcDoc={thread.html}
                title={thread.title}
                className="h-full w-full"
                sandbox=""
              />
            ) : (
              <div className="p-4 text-sm text-slate-500">No HTML.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div
      className={
        highlight
          ? 'rounded-2xl border border-rose-300 bg-rose-50 p-4 shadow-sm'
          : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
      }
    >
      <p className={highlight ? 'text-xs font-bold text-rose-700' : 'text-xs font-bold text-slate-500'}>{label}</p>
      <p className={highlight ? 'mt-1 text-2xl font-black text-rose-900' : 'mt-1 text-2xl font-black text-slate-900'}>
        {value}
      </p>
    </div>
  );
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
