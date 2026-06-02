import { ConvexHttpClient } from 'convex/browser';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { api } from '../../../../convex/_generated/api';
import { injectSparkDb } from '../../../lib/inject-spark-db';
import ShareViewer from './ShareViewer';

// Route-specific viewport: disable pinch-zoom AND swipe-back on /s/.
// Mobile games inside the iframe were fighting the browser's default
// pinch/scroll/pull-to-refresh — two fingers on iPhone shrunk the
// canvas, swipe-from-left navigated back. We accept the trade-off
// (visitors can't zoom into text here) because the share viewer is a
// game/app surface, not a text-content page. The rest of the site
// keeps accessibility-friendly default viewport.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

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
      <ShareViewer title={share.title} srcDoc={injectSparkDb(share.html, share.projectId)} />
    </main>
  );
}
