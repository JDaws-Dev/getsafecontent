import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BLOG_POSTS, findPost } from '@/lib/blog-posts';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) return { title: 'Not found' };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'SafeSpark',
      url: 'https://getsafespark.com',
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://getsafespark.com/blog/${post.slug}` },
  };

  return (
    <main className="min-h-screen px-4 py-12 sm:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-3xl">
        <header className="mb-8 space-y-4">
          <Link href="/blog" className="text-xs font-bold uppercase tracking-widest text-accent-700 hover:text-accent-800">
            ← All posts
          </Link>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {formatDate(post.publishedAt)} · {post.readingMinutes} min read
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">{post.title}</h1>
          <p className="text-lg leading-relaxed text-slate-600">{post.description}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-bold text-accent-700">
                {t}
              </span>
            ))}
          </div>
        </header>
        <Markdown body={post.body} />
        <footer className="mt-12 rounded-2xl border border-brand-cream-2 bg-accent-50/60 p-5 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Ready to let your kid build something today?
          </p>
          <Link
            href="/"
            className="mt-3 inline-block rounded-2xl bg-accent-500 px-5 py-2.5 text-sm font-bold text-brand-navy hover:bg-accent-600"
          >
            Try SafeSpark free →
          </Link>
        </footer>
      </article>
    </main>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(
    new Date(iso),
  );
}

// Minimal markdown renderer — handles **bold**, *italic*, `code`, # headings,
// ## subheadings, bullet lists, links, and paragraphs. Enough for the seed
// posts. Replace with MDX or a real renderer when content scales.
function Markdown({ body }: { body: string }) {
  const blocks = body.split(/\n\n+/);
  return (
    <div className="prose-safespark space-y-4 text-slate-700">
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

function renderBlock(block: string, key: number) {
  const trimmed = block.trim();
  if (trimmed.startsWith('### ')) {
    return (
      <h3 key={key} className="mt-8 text-xl font-black text-slate-900">
        {inline(trimmed.slice(4))}
      </h3>
    );
  }
  if (trimmed.startsWith('## ')) {
    return (
      <h2 key={key} className="mt-10 text-2xl font-black text-slate-900">
        {inline(trimmed.slice(3))}
      </h2>
    );
  }
  if (trimmed.startsWith('# ')) {
    return (
      <h1 key={key} className="mt-10 text-3xl font-black text-slate-900">
        {inline(trimmed.slice(2))}
      </h1>
    );
  }
  if (/^[-*]\s/.test(trimmed)) {
    const items = trimmed.split('\n').map((line) => line.replace(/^[-*]\s+/, ''));
    return (
      <ul key={key} className="list-disc space-y-1.5 pl-6 leading-relaxed">
        {items.map((item, j) => (
          <li key={j}>{inline(item)}</li>
        ))}
      </ul>
    );
  }
  if (trimmed.startsWith('---')) {
    return <hr key={key} className="my-8 border-slate-200" />;
  }
  return (
    <p key={key} className="leading-relaxed">
      {inline(trimmed)}
    </p>
  );
}

function inline(text: string): React.ReactNode {
  // Tokens we recognize, in order: link, bold, italic, inline code.
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyCounter = 0;
  // Replace newlines with spaces inside a paragraph
  remaining = remaining.replace(/\n/g, ' ');
  // Process patterns left-to-right
  const patterns: [RegExp, (match: RegExpExecArray) => React.ReactNode][] = [
    [/\[([^\]]+)\]\(([^)]+)\)/, (m) => <a key={keyCounter++} href={m[2]} className="font-bold text-accent-700 underline">{m[1]}</a>],
    [/\*\*([^*]+)\*\*/, (m) => <strong key={keyCounter++} className="font-black text-slate-900">{m[1]}</strong>],
    [/\*([^*]+)\*/, (m) => <em key={keyCounter++}>{m[1]}</em>],
    [/`([^`]+)`/, (m) => <code key={keyCounter++} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.875em] text-accent-700">{m[1]}</code>],
  ];

  while (remaining.length > 0) {
    let earliest: { idx: number; len: number; node: React.ReactNode } | null = null;
    for (const [re, render] of patterns) {
      const match = re.exec(remaining);
      if (match && (earliest === null || match.index < earliest.idx)) {
        earliest = { idx: match.index, len: match[0].length, node: render(match) };
      }
    }
    if (!earliest) {
      parts.push(remaining);
      break;
    }
    if (earliest.idx > 0) parts.push(remaining.slice(0, earliest.idx));
    parts.push(earliest.node);
    remaining = remaining.slice(earliest.idx + earliest.len);
  }
  return <>{parts}</>;
}
