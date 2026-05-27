import { ConvexHttpClient } from 'convex/browser';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { api } from '../../../../convex/_generated/api';
import { injectSparkDb } from '../../../lib/inject-spark-db';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? '';

type Props = { params: Promise<{ id: string }> };

async function fetchShare(shortId: string) {
  if (!convexUrl) return null;
  const client = new ConvexHttpClient(convexUrl);
  return await client.query(api.safespark.getShare, { shortId });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const share = await fetchShare(id);
  if (!share) return { title: 'Not found · SafeSpark' };
  return {
    title: `${share.title} · SafeSpark`,
    description: `${share.title} — a kid-built project on SafeSpark.`,
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const share = await fetchShare(id);
  if (!share) notFound();
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-900 text-white">
      <header className="flex flex-none items-center justify-between gap-3 border-b border-white/10 bg-slate-950 px-4 py-3">
        <div className="min-w-0">
          <Link href="/" className="text-[10px] font-bold uppercase tracking-widest text-violet-300 hover:text-violet-200">
            SafeSpark
          </Link>
          <h1 className="truncate text-base font-black text-white">{share.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/make"
            className="rounded-full bg-violet-500 px-4 py-1.5 text-xs font-black text-white hover:bg-violet-600"
          >
            Make your own →
          </Link>
        </div>
      </header>
      <div className="flex-1 bg-slate-200 p-3">
        <iframe
          title={share.title}
          srcDoc={injectSparkDb(share.html, share.projectId)}
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full rounded-2xl bg-white shadow-inner"
        />
      </div>
    </main>
  );
}
