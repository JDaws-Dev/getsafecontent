import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import { posts } from "#site/content";

const convexAuth = convexAuthNextjsMiddleware();

// Blog posts that are live right now (published and not scheduled for later).
// Checked here because a notFound() thrown from the post page arrives after the
// page has already started streaming with a 200 status, so an unknown slug
// showed a "not found" page that search engines saw as a real page.
const livePosts = posts
  .filter((post) => post.published)
  .map((post) => ({ slug: post.slug, publishAt: new Date(post.date).getTime() }));

function isLivePost(slug: string): boolean {
  const now = Date.now();
  return livePosts.some((post) => post.slug === slug && post.publishAt <= now);
}

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/blog/")) {
    const slug = decodeURIComponent(pathname.slice("/blog/".length).replace(/\/$/, ""));
    if (slug && !slug.includes("/") && !isLivePost(slug)) {
      // Rewrite to a path no route matches, so Next serves the site's
      // not-found page with a real 404 status.
      return NextResponse.rewrite(new URL("/_blog-post-not-found", request.url), {
        status: 404,
      });
    }
    return NextResponse.next();
  }

  return convexAuth(request, event);
}

export const config = {
  // /api/auth: the Convex Auth proxy. /blog/:slug: unknown posts get a real 404.
  matcher: ["/api/auth", "/blog/:slug"],
};
