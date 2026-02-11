import Link from "next/link";
import { posts } from "#site/content";
import { ArrowRight } from "lucide-react";

export default function BlogTeaser() {
  // Get the 3 most recent published posts (that are past their date)
  const now = new Date();
  const featuredPosts = posts
    .filter((post) => post.published && new Date(post.date) <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  if (featuredPosts.length === 0) return null;

  return (
    <section className="bg-cream py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-navy">
            From the Blog
          </h2>
          <p className="mt-3 text-navy/70 max-w-2xl mx-auto">
            Practical tips from a step-dad figuring out screen time for his kids
          </p>
        </div>

        {/* Posts Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Image */}
              {post.image && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.imageAlt || post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-5">
                {/* Category Badge */}
                <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 mb-3">
                  {post.category}
                </span>

                {/* Title */}
                <h3 className="font-semibold text-navy group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {post.title}
                </h3>

                {/* Description */}
                <p className="mt-2 text-sm text-navy/60 line-clamp-2">
                  {post.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Link */}
        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
          >
            View all articles
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
