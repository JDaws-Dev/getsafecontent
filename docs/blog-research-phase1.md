# Phase 1 Research: SEO Blog for GetSafeFamily.com

**Date:** February 10, 2026
**Bead:** safecontent-pym.5

---

## 1. Current Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16.1.6 |
| React | 19.2.3 |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel |
| Auth | next-auth + Convex |
| Payments | Stripe |
| Fonts | Inter (sans), Geist Mono |

### Design System
- **Background:** Cream (#FDF8F3)
- **Text:** Navy (#1a1a2e)
- **Accent:** Peach gradient (F5A962 → E88B6A)
- **Cards:** White with 24px radius, soft shadows
- **Buttons:** Pill-shaped (9999px radius)

### Existing SEO Infrastructure
- `sitemap.ts` - Static sitemap generation
- `robots.ts` - Robots.txt with disallow for /api/, /admin/
- `layout.tsx` - Full metadata with OG tags, Twitter cards
- Static pages use Next.js Metadata API

---

## 2. Blog Implementation Options Identified

### Option A: MDX Files in Repository (with Velite)
**How it works:** Markdown files with frontmatter stored in `/content/blog/` folder. Velite compiles them to type-safe JSON at build time.

**Pros:**
- Zero ongoing cost
- Full Git version control
- Type-safe with Zod schemas
- Actively maintained (unlike Contentlayer)
- Works great with Next.js 15/16 and React 19
- Fastest page loads (fully static)
- Full control over design

**Cons:**
- Requires Git push to publish (slightly technical)
- No visual editor
- Need basic markdown knowledge

**Publishing workflow:** Write `.mdx` file → commit → push → Vercel auto-deploys

---

### Option B: Notion as CMS
**How it works:** Write posts in Notion database. Next.js fetches via Notion API at build time.

**Pros:**
- Beautiful writing experience (WYSIWYG)
- Already familiar if you use Notion
- Easy to add/edit posts
- Images handled automatically
- No code knowledge needed

**Cons:**
- API rate limits
- Slower builds (fetches from API)
- Notion formatting limitations
- Dependent on Notion uptime
- Custom components harder to implement

**Publishing workflow:** Create row in Notion database → mark as "Published" → trigger rebuild

---

### Option C: Headless CMS (Sanity/Contentful)
**How it works:** Full CMS dashboard for content management. Fetches via API.

**Pros:**
- Professional CMS interface
- Rich text editor
- Media library
- Content scheduling
- Team collaboration

**Cons:**
- **Cost:** Free tier limits, then $15-99/mo
- Learning curve for CMS
- API dependency
- More complex setup
- Overkill for a single blog

**Publishing workflow:** Write in CMS dashboard → click publish

---

## 3. Non-Developer Publishing Assessment

| Option | Ease of Publishing | Learning Curve |
|--------|-------------------|----------------|
| MDX + Velite | Medium (needs Git) | Learn markdown + Git basics |
| Notion CMS | Easy (familiar UI) | None if you know Notion |
| Headless CMS | Easy (built-in editor) | Learn CMS interface |

**For a non-developer who wants simplicity:** Notion is the easiest if you're already a Notion user. Otherwise, MDX with a simple Git workflow (GitHub web editor) is learnable in 30 minutes.

---

## 4. SEO Best Practices Research

### URL Structure
- Use `/blog/[slug]` pattern (subdirectory, not subdomain)
- Slugs should be keyword-rich, lowercase, hyphenated
- Example: `/blog/how-to-block-explicit-songs-apple-music`

### Required Meta Tags
```typescript
export const metadata: Metadata = {
  title: "How to Block Explicit Songs on Apple Music | Safe Family",
  description: "Learn how to filter explicit content...",
  openGraph: {
    title: "...",
    description: "...",
    type: "article",
    publishedTime: "2026-02-10T00:00:00Z",
    authors: ["Jeremiah Daws"],
    images: [{ url: "/blog/og/slug.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    ...
  }
};
```

### Structured Data (JSON-LD)
Critical for 2026 SEO. Use `BlogPosting` schema:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "How to Block Explicit Songs on Apple Music",
  "image": "https://getsafefamily.com/blog/images/apple-music-controls.jpg",
  "datePublished": "2026-02-10",
  "dateModified": "2026-02-10",
  "author": {
    "@type": "Person",
    "name": "Jeremiah Daws"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Safe Family",
    "logo": {
      "@type": "ImageObject",
      "url": "https://getsafefamily.com/logo.png"
    }
  },
  "description": "Learn how to filter explicit content..."
}
```

### Sitemap
Update `sitemap.ts` to dynamically include all blog posts with:
- `lastModified` date
- `changeFrequency: "weekly"` for index, "monthly" for posts
- `priority: 0.7` for posts

### Key 2026 SEO Insights
- Schema markup is now **critical** for AI Overviews and rich results
- Properly structured data = 20-30% CTR improvement
- Google prefers JSON-LD format
- Test with Google Rich Results Test before publishing

---

## 5. Recommendation Preview (for Phase 2)

**My recommendation will be: MDX + Velite**

Reasons:
1. Zero cost
2. Best performance (fully static)
3. Full control over CTA components
4. Type-safe content
5. Already fits your Next.js setup perfectly
6. GitHub web editor makes publishing accessible

I'll provide full details and comparison in Phase 2.

---

## Sources

### MDX/Contentlayer Alternatives
- [Refactoring ContentLayer to Velite](https://www.mikevpeeren.nl/blog/refactoring-contentlayer-to-velite)
- [ContentLayer Abandoned - Alternatives](https://www.wisp.blog/blog/contentlayer-has-been-abandoned-what-are-the-alternatives)
- [Velite with Next.js](https://velite.js.org/examples/nextjs)
- [Native MDX over Contentlayer](https://hackernoon.com/how-i-built-a-simple-mdx-blog-in-nextjs-and-why-i-chose-native-mdx-over-contentlayer)

### Notion as CMS
- [Next.js Blog with Notion CMS - Bejamas](https://bejamas.com/hub/guides/how-to-create-next-js-blog-using-notion-as-a-cms)
- [Notion-Powered Next.js Blog - Vercel](https://vercel.com/templates/next.js/notion-powered-blog)
- [How to Use Notion for Next.js Blog](https://neat.run/blog/notion-cms)

### SEO & Structured Data
- [Structured Data for SEO 2026](https://comms.thisisdefinition.com/insights/ultimate-guide-to-structured-data-for-seo)
- [Schema Markup Critical for SERP 2026](https://almcorp.com/blog/schema-markup-detailed-guide-2026-serp-visibility/)
- [Google Article Schema Documentation](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Schema Markup for Blogs Guide](https://www.pageoptimizer.pro/blog/schema-markup-for-blogs-a-complete-guide-to-boosting-seo-and-visibility)
