import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for SafeReads
 *
 * Note: JWT authentication is handled client-side via AuthContext.
 * The JWT is stored in localStorage and verified against the central
 * Marketing auth system (adamant-crow-705.convex.site/verifyToken).
 *
 * Protected routes (/dashboard, /onboarding, /admin) check authentication
 * via the useAuth() hook and redirect to login if not authenticated.
 *
 * This middleware handles other concerns like security headers.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
