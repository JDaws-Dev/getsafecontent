import type { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/blog-posts';

export const metadata: Metadata = {
  title: 'SafeSpark Blog',
  description:
    'Notes on safe AI for kids ages 10-13: how to teach AI habits, what to look for in a kid AI app, and product updates from SafeSpark.',
  alternates: { canonical: '/blog' },
};

export default function BlogIndex() {
  const sorted = [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  return (
    <main className="min-h-screen px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 space-y-3">
          <Link href="/" className="text-xs font-bold uppercase tracking-widest text-accent-700 hover:text-accent-800">
            ← SafeSpark
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">SafeSpark Blog</h1>
          <p className="text-base text-slate-600">
            Notes on safe AI for kids, from the team building{' '}
            <Link href="/" className="font-bold text-accent-700 underline">
              SafeSpark
            </Link>
            .
          </p>
        </header>

        <ul className="space-y-6">
          {sorted.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-accent-300 hover:shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {formatDate(post.publishedAt)} · {post.readingMinutes} min read
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-900 group-hover:text-accent-700">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{post.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.tags.map((t) => (
                    <span key={t} className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-bold text-accent-700">
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(
    new Date(iso),
  );
}
