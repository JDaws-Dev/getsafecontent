import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { posts } from "#site/content";
import { Calendar, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog - Parenting Tips for Digital Safety",
  description:
    "Practical guides for parents on managing kids' music, videos, and books. Learn how to set up parental controls and keep your family safe online.",
  openGraph: {
    title: "Safe Family Blog - Digital Parenting Tips",
    description:
      "Practical guides for parents on managing kids' music, videos, and books.",
    type: "website",
  },
};

const categoryColors: Record<string, string> = {
  SafeTunes: "bg-purple-100 text-purple-700",
  SafeTube: "bg-red-100 text-red-700",
  SafeReads: "bg-emerald-100 text-emerald-700",
  General: "bg-gray-100 text-gray-700",
};

export default function BlogPage() {
  // Sort posts by date (newest first) and filter published only
  // Also filter out future-dated posts (scheduled publishing)
  const now = new Date();
  const publishedPosts = posts
    .filter((post) => post.published && new Date(post.date) <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const featuredPost = publishedPosts.find((post) => post.featured);
  const regularPosts = publishedPosts.filter((post) => !post.featured);

  return (
    <>
      <Header />
      <main className="bg-cream min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-navy mb-4">
              Safe Family Blog
            </h1>
            <p className="text-xl text-navy/70 max-w-2xl mx-auto">
              Practical guides for parents navigating the digital world with
              their kids.
            </p>
          </div>

          {/* Featured Post */}
          {featuredPost && (
            <div className="mb-12">
              <Link href={featuredPost.permalink} className="group block">
                <article className="card-soft overflow-hidden">
                  <div className="md:flex">
                    {/* Image */}
                    <div className="md:w-1/2">
                      <div className="aspect-video md:aspect-auto md:h-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                        {featuredPost.image ? (
                          <img
                            src={featuredPost.image}
                            alt={featuredPost.imageAlt || featuredPost.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-6xl">
                            {featuredPost.category === "SafeTunes" && "🎵"}
                            {featuredPost.category === "SafeTube" && "📺"}
                            {featuredPost.category === "SafeReads" && "📚"}
                            {featuredPost.category === "General" && "🏠"}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Content */}
                    <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-medium bg-peach-start/20 text-peach-end px-2.5 py-1 rounded-full">
                          Featured
                        </span>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[featuredPost.category]}`}
                        >
                          {featuredPost.category}
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-navy mb-3 group-hover:text-indigo-600 transition-colors">
                        {featuredPost.title}
                      </h2>
                      <p className="text-navy/70 mb-4 line-clamp-3">
                        {featuredPost.description}
                      </p>
                      <div className="flex items-center text-sm text-navy/50">
                        <Calendar className="w-4 h-4 mr-1.5" />
                        {new Date(featuredPost.date).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            </div>
          )}

          {/* Post Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularPosts.map((post) => (
              <Link key={post.slug} href={post.permalink} className="group">
                <article className="card-soft overflow-hidden h-full flex flex-col">
                  {/* Image */}
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    {post.image ? (
                      <img
                        src={post.image}
                        alt={post.imageAlt || post.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl">
                        {post.category === "SafeTunes" && "🎵"}
                        {post.category === "SafeTube" && "📺"}
                        {post.category === "SafeReads" && "📚"}
                        {post.category === "General" && "🏠"}
                      </span>
                    )}
                  </div>
                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[post.category]}`}
                      >
                        {post.category}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-navy mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-navy/70 text-sm mb-4 line-clamp-2 flex-1">
                      {post.description}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-navy/50 flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        {new Date(post.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-indigo-600 font-medium flex items-center group-hover:gap-2 transition-all">
                        Read
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {/* Empty State */}
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
