import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SocialShare from "@/components/blog/SocialShare";
import SignupCTA from "@/components/blog/SignupCTA";
import EmailCapture from "@/components/blog/EmailCapture";
import { posts } from "#site/content";
import { Calendar, ArrowLeft, ArrowRight, User, Clock } from "lucide-react";
import { MDXContent } from "@/components/blog/MDXContent";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

function getPostBySlug(slug: string) {
  const now = new Date();
  return posts.find(
    (post) => post.slug === slug && post.published && new Date(post.date) <= now
  );
}

export async function generateStaticParams() {
  return posts
    .filter((post) => post.published)
    .map((post) => ({
      slug: post.slug,
    }));
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_URL || "https://getsafefamily.com";
  const postUrl = `${siteUrl}/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.description,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated || post.date,
      authors: [post.author],
      url: postUrl,
      images: post.image
        ? [
            {
              url: post.image.startsWith("http")
                ? post.image
                : `${siteUrl}${post.image}`,
              width: 1200,
              height: 630,
              alt: post.imageAlt || post.title,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: post.image ? [post.image] : [],
    },
    alternates: {
      canonical: postUrl,
    },
  };
}

const categoryColors: Record<string, string> = {
  SafeTunes: "bg-purple-100 text-purple-700",
  SafeTube: "bg-red-100 text-red-700",
  SafeReads: "bg-emerald-100 text-emerald-700",
  General: "bg-gray-100 text-gray-700",
};

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_URL || "https://getsafefamily.com";
  const postUrl = `${siteUrl}/blog/${post.slug}`;

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: post.image
      ? post.image.startsWith("http")
        ? post.image
        : `${siteUrl}${post.image}`
      : undefined,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Safe Family",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon-512.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: postUrl,
      },
    ],
  };

  // Get related posts (same category, excluding current, only past dates)
  const now = new Date();
  const relatedPosts = posts
    .filter(
      (p) =>
        p.published &&
        p.category === post.category &&
        p.slug !== post.slug &&
        new Date(p.date) <= now
    )
    .slice(0, 3);

  // Previous / Next post (chronological, across all categories)
  const chronological = posts
    .filter((p) => p.published && new Date(p.date) <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const currentIndex = chronological.findIndex((p) => p.slug === post.slug);
  const newerPost = currentIndex > 0 ? chronological[currentIndex - 1] : null;
  const olderPost =
    currentIndex >= 0 && currentIndex < chronological.length - 1
      ? chronological[currentIndex + 1]
      : null;

  // Rough reading-time estimate. `post.body` is compiled MDX, so this over-counts
  // by whatever JSX overhead there is — still better than nothing for the sidebar.
  const estimatedWords = (post.body || "").length / 6;
  const readingMinutes = Math.max(1, Math.round(estimatedWords / 220));

  return (
    <>
      <Header />
      <main className="bg-cream min-h-screen pt-24 pb-16">
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="min-w-0">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center text-sm text-navy/60 hover:text-navy mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Blog
          </Link>

          {/* Post header */}
          <header className="mb-8">
            {/* Category badge */}
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${categoryColors[post.category]}`}
              >
                {post.category}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mb-4 leading-tight">
              {post.title}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-navy/60 mb-6">
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1.5" />
                {post.author}
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1.5" />
                {new Date(post.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1.5" />
                {readingMinutes} min read
              </span>
            </div>

            {/* Featured image */}
            {post.image && (
              <div className="rounded-2xl overflow-hidden mb-8">
                <img
                  src={post.image}
                  alt={post.imageAlt || post.title}
                  className="w-full aspect-video object-cover"
                />
              </div>
            )}
          </header>

          {/* Post content */}
          <div className="prose prose-lg prose-navy max-w-none">
            <MDXContent code={post.body} />
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-navy/10">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm bg-cream-dark text-navy/70 px-3 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social share */}
          <div className="mt-6 pt-6 border-t border-navy/10">
            <SocialShare url={postUrl} title={post.title} />
          </div>

          {/* Email capture */}
          <div className="mt-12">
            <EmailCapture />
          </div>

          {/* Bottom CTA */}
          <div className="mt-8">
            <SignupCTA
              product={
                post.category === "General"
                  ? "all"
                  : (post.category as "SafeTunes" | "SafeTube" | "SafeReads")
              }
            />
          </div>

          {/* Previous / Next post navigation */}
          {(olderPost || newerPost) && (
            <nav
              aria-label="Post navigation"
              className="mt-12 grid gap-4 sm:grid-cols-2"
            >
              {olderPost ? (
                <Link
                  href={olderPost.permalink}
                  className="group card-soft p-5 flex flex-col text-left hover:-translate-y-0.5 transition-transform"
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-navy/40 flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    Previous
                  </span>
                  <span className="mt-2 font-semibold text-navy group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {olderPost.title}
                  </span>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}
              {newerPost ? (
                <Link
                  href={newerPost.permalink}
                  className="group card-soft p-5 flex flex-col text-right sm:text-right hover:-translate-y-0.5 transition-transform"
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-navy/40 flex items-center justify-end gap-1">
                    Next
                    <ArrowRight className="w-3 h-3" />
                  </span>
                  <span className="mt-2 font-semibold text-navy group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {newerPost.title}
                  </span>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}
            </nav>
          )}
          </article>

          {/* Right rail sidebar (lg+) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-5">
              {Array.isArray(post.toc) && post.toc.length > 0 && (
                <nav
                  aria-label="Table of contents"
                  className="card-soft p-5"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-navy/40 mb-3">
                    On this page
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {(post.toc as Array<{ title: string; url?: string; items?: unknown[] }>).map(
                      (item, i) => (
                        <li key={i}>
                          <span className="text-navy/80 leading-snug">
                            {item.title}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </nav>
              )}

              <div className="card-soft p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-navy/40 mb-3">
                  About the author
                </h3>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {post.author.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-navy text-sm">{post.author}</p>
                    <p className="text-xs text-navy/60 leading-relaxed mt-1">
                      Founder of Safe Family &mdash; a homeschool dad building
                      parental controls he&rsquo;d actually use for his own kids.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-soft p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-navy/40 mb-3">
                  Reading time
                </h3>
                <p className="text-navy flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-navy/60" />
                  ~{readingMinutes} minute{readingMinutes === 1 ? "" : "s"}
                </p>
                <p className="mt-4 text-xs text-navy/60">
                  Published{" "}
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white">
                <h3 className="font-semibold text-sm mb-1">Get the newsletter</h3>
                <p className="text-xs text-white/85 leading-relaxed mb-3">
                  New posts + homeschool parenting ideas. No spam, ever.
                </p>
                <Link
                  href="/#pricing"
                  className="inline-flex items-center justify-center w-full bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
                >
                  Try Safe Family free
                </Link>
              </div>

              {post.tags.length > 0 && (
                <div className="card-soft p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-navy/40 mb-3">
                    Tagged
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-cream-dark text-navy/70 px-2.5 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-navy mb-6">
              More from {post.category}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={relatedPost.permalink}
                  className="group"
                >
                  <article className="card-soft overflow-hidden h-full">
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      {relatedPost.image ? (
                        <img
                          src={relatedPost.image}
                          alt={relatedPost.imageAlt || relatedPost.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl">
                          {relatedPost.category === "SafeTunes" && "🎵"}
                          {relatedPost.category === "SafeTube" && "📺"}
                          {relatedPost.category === "SafeReads" && "📚"}
                          {relatedPost.category === "General" && "🏠"}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-navy group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
