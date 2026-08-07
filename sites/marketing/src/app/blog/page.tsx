import { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { posts } from "#site/content";
import { BlogListClient } from "@/components/blog/BlogListClient";

export const metadata: Metadata = {
  title: "Blog - Parenting Tips for Digital Safety",
  description:
    "Practical guides for parents on managing kids' music, videos, and books. Learn how to set up parental controls and keep your family safe online.",
  openGraph: {
    title: "Safe Family Blog - Digital Parenting Tips",
    description:
      "Practical guides for parents on managing kids' music, videos, and books.",
    type: "website",
    images: [
      {
        url: "https://getsafefamily.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Safe Family - Parental controls for music, YouTube, books, and search",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Safe Family Blog - Digital Parenting Tips",
    description:
      "Practical guides for parents on managing kids' music, videos, and books.",
    images: ["https://getsafefamily.com/og-image.png"],
  },
};

export default function BlogPage() {
  // Sort posts by date (newest first) and filter published only
  // Also filter out future-dated posts (scheduled publishing)
  const now = new Date();
  const publishedPosts = posts
    .filter((post) => post.published && new Date(post.date) <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const featuredPost = publishedPosts.find((post) => post.featured) ?? null;
  const regularPosts = publishedPosts.filter((post) => !post.featured);

  // Derive category list from actual posts so filter chips always match content
  const categories = Array.from(
    new Set(publishedPosts.map((p) => p.category).filter(Boolean))
  );

  return (
    <>
      <Header />
      <main className="bg-cream min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold text-navy mb-4">
              Safe Family Blog
            </h1>
            <p className="text-xl text-navy/70 max-w-2xl mx-auto">
              Practical guides for parents navigating the digital world with
              their kids.
            </p>
          </div>

          <BlogListClient
            featuredPost={featuredPost as never}
            regularPosts={regularPosts as never}
            categories={categories}
          />

          {publishedPosts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-navy/50 text-lg">
                No posts yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
