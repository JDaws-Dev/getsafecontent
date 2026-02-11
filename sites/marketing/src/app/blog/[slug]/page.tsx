import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SocialShare from "@/components/blog/SocialShare";
import SignupCTA from "@/components/blog/SignupCTA";
import { posts } from "#site/content";
import { Calendar, ArrowLeft, User } from "lucide-react";
import { MDXContent } from "@/components/blog/MDXContent";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

function getPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug && post.published);
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

  // Get related posts (same category, excluding current)
  const relatedPosts = posts
    .filter(
      (p) =>
        p.published && p.category === post.category && p.slug !== post.slug
    )
    .slice(0, 3);

  return (
    <>
      <Header />
      <main className="bg-cream min-h-screen pt-24 pb-16">
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
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

          {/* Bottom CTA */}
          <div className="mt-12">
            <SignupCTA
              product={
                post.category === "General"
                  ? "all"
                  : (post.category as "SafeTunes" | "SafeTube" | "SafeReads")
              }
            />
          </div>
        </article>

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
