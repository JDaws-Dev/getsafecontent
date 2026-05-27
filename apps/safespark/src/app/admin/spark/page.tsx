'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from '../../../../convex/_generated/api';

export default function AdminSparkPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [limit, setLimit] = useState(200);
  const rows = useQuery(api.safespark.listAllRequests, isSignedIn ? { limit } : 'skip');
  const [filter, setFilter] = useState('');

  if (!isLoaded) {
    return <main className="flex min-h-screen items-center justify-center text-slate-500">Loading…</main>;
  }
  if (!isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <h1 className="text-2xl font-black text-slate-800">Sign in required</h1>
          <p className="text-sm text-slate-600">Admin viewing requires a signed-in operator account.</p>
          <Link href="/" className="text-sm font-bold text-violet-600 hover:text-violet-800">
            Back to home
          </Link>
        </div>
      </main>
    );
  }
  if (rows === null) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <h1 className="text-2xl font-black text-slate-800">Not authorized</h1>
          <p className="text-sm text-slate-600">This dashboard is for the SafeSpark operator only.</p>
          <Link href="/" className="text-sm font-bold text-violet-600 hover:text-violet-800">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const filtered = filter.trim()
    ? rows?.filter(
        (row) =>
          row.email.toLowerCase().includes(filter.toLowerCase()) ||
          row.prompt.toLowerCase().includes(filter.toLowerCase()),
      )
    : rows;

  const byUser = new Map<string, number>();
  rows?.forEach((row) => {
    byUser.set(row.email || row.clerkUserId, (byUser.get(row.email || row.clerkUserId) ?? 0) + 1);
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-500">SafeSpark · Admin</p>
            <h1 className="text-2xl font-black text-slate-900">Prompt eval log</h1>
            <p className="text-sm text-slate-600">Every signed-in prompt sent to Spark. Guests are not logged.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter by email or prompt"
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400"
            />
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
            >
              <option value={100}>Last 100</option>
              <option value={200}>Last 200</option>
              <option value={500}>Last 500</option>
            </select>
          </div>
        </header>

        <section className="mb-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Total prompts" value={rows?.length ?? 0} />
          <Stat label="Unique users" value={byUser.size} />
          <Stat label="Newest" value={rows?.[0] ? formatDate(rows[0].createdAt) : '—'} />
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Family (email)</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Prompt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered?.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-slate-500">{formatDate(row.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-800">{row.email || '(no email)'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.projectTitle ?? '—'}</td>
                  <td className="px-4 py-3 text-sm leading-relaxed">{row.prompt}</td>
                </tr>
              ))}
              {filtered?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500">
                    No prompts match this filter yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
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
