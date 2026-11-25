import { MetadataRoute } from "next";
import { posts } from "#site/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_URL || "https://getsafefamily.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/refund`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // The three apps sold to new families are served under the hub
  // (getsafefamily.com/<app>), plus the parent setup guide, the device
  // lock-down guide and the free guide. SafeReads and SafeSpark still run for
  // existing families but are no longer offered, so they stay out.
  const hubPages: MetadataRoute.Sitemap = [
    ...["tunes", "tube", "study"].map((app) => ({
      url: `${siteUrl}/${app}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...["setup", "guides/lock-down", "guides/keeping-kids-safe-online"].map((path) => ({
      url: `${siteUrl}/${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  // Blog posts
  const blogPosts: MetadataRoute.Sitemap = posts
    .filter((post) => post.published)
    .map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated || post.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...staticPages, ...hubPages, ...blogPosts];
}
