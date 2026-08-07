"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";

interface BlogPost {
  slug: string;
  permalink: string;
  title: string;
  description: string;
  date: string;
  category: string;
  image?: string;
  imageAlt?: string;
  featured?: boolean;
}

interface BlogListClientProps {
  featuredPost: BlogPost | null;
  regularPosts: BlogPost[];
  categories: string[];
}

const categoryColors: Record<string, string> = {
  SafeTunes: "bg-purple-100 text-purple-700",
  SafeTube: "bg-red-100 text-red-700",
  SafeReads: "bg-emerald-100 text-emerald-700",
  SafeStudy: "bg-cyan-100 text-cyan-700",
  General: "bg-gray-100 text-gray-700",
};

const categoryEmoji: Record<string, string> = {
  SafeTunes: "🎵",
  SafeTube: "📺",
  SafeReads: "📚",
  SafeStudy: "🔍",
  General: "🏠",
};

export function BlogListClient({
  featuredPost,
  regularPosts,
  categories,
}: BlogListClientProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const visibleFeatured =
    featuredPost && (activeCategory === "All" || featuredPost.category === activeCategory)
      ? featuredPost
      : null;

  const visibleRegular = useMemo(
    () =>
      activeCategory === "All"
        ? regularPosts
        : regularPosts.filter((p) => p.category === activeCategory),
    [regularPosts, activeCategory]
  );

  const filterOptions = ["All", ...categories];

  return (
    <>
      {/* Category filter chips */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
        {filterOptions.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? "bg-navy text-white"
                  : "bg-white text-navy/70 border border-navy/10 hover:bg-navy/5"
              }`}
              aria-pressed={isActive}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Featured Post */}
      {visibleFeatured && (
        <div className="mb-12">
          <Link href={visibleFeatured.permalink} className="group block">
            <article className="card-soft overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/2">
                  <div className="aspect-video md:aspect-auto md:h-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                    {visibleFeatured.image ? (
                      <img
                        src={visibleFeatured.image}
                        alt={visibleFeatured.imageAlt || visibleFeatured.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-6xl">{categoryEmoji[visibleFeatured.category]}</span>
                    )}
                  </div>
                </div>
                <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-medium bg-peach-start/20 text-peach-end px-2.5 py-1 rounded-full">
                      Featured
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[visibleFeatured.category] ?? categoryColors.General}`}
                    >
                      {visibleFeatured.category}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-navy mb-3 group-hover:text-indigo-600 transition-colors">
                    {visibleFeatured.title}
                  </h2>
                  <p className="text-navy/70 mb-4 line-clamp-3">
                    {visibleFeatured.description}
                  </p>
                  <div className="flex items-center text-sm text-navy/50">
                    <Calendar className="w-4 h-4 mr-1.5" />
                    {new Date(visibleFeatured.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </article>
          </Link>
        </div>
      )}

      {/* Post Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleRegular.map((post) => (
          <Link key={post.slug} href={post.permalink} className="group">
            <article className="card-soft overflow-hidden h-full flex flex-col">
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                {post.image ? (
                  <img
                    src={post.image}
                    alt={post.imageAlt || post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl">{categoryEmoji[post.category]}</span>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[post.category] ?? categoryColors.General}`}
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

      {visibleRegular.length === 0 && !visibleFeatured && (
        <div className="text-center py-16">
          <p className="text-navy/50 text-lg">
            No posts in &ldquo;{activeCategory}&rdquo; yet. Try a different category!
          </p>
        </div>
      )}
    </>
  );
}
