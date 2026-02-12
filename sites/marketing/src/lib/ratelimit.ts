import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Lazy initialization to avoid build-time errors when env vars missing
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

// Rate limiters for different endpoint types
// Using sliding window algorithm for smooth rate limiting
let checkoutLimiter: Ratelimit | null = null;
let demoLimiter: Ratelimit | null = null;
let newsletterLimiter: Ratelimit | null = null;

function getCheckoutLimiter(): Ratelimit | null {
  if (!checkoutLimiter) {
    const r = getRedis();
    if (r) {
      // 10 requests per minute for checkout (creates Stripe sessions)
      checkoutLimiter = new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        prefix: "ratelimit:checkout:",
        analytics: true,
      });
    }
  }
  return checkoutLimiter;
}

function getDemoLimiter(): Ratelimit | null {
  if (!demoLimiter) {
    const r = getRedis();
    if (r) {
      // 30 requests per minute for demo endpoints (iTunes, Google Books, YouTube)
      demoLimiter = new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        prefix: "ratelimit:demo:",
        analytics: true,
      });
    }
  }
  return demoLimiter;
}

function getNewsletterLimiter(): Ratelimit | null {
  if (!newsletterLimiter) {
    const r = getRedis();
    if (r) {
      // 5 requests per minute for newsletter (Resend API)
      newsletterLimiter = new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        prefix: "ratelimit:newsletter:",
        analytics: true,
      });
    }
  }
  return newsletterLimiter;
}

export type RateLimitType = "checkout" | "demo" | "newsletter";

/**
 * Check rate limit for a request
 * @param type - The type of rate limiter to use
 * @param request - The incoming request (used to extract IP)
 * @returns { success: true } if allowed, or a NextResponse with 429 if rate limited
 */
export async function checkRateLimit(
  type: RateLimitType,
  request: Request
): Promise<{ success: true } | NextResponse> {
  // Get the appropriate limiter
  let limiter: Ratelimit | null;
  switch (type) {
    case "checkout":
      limiter = getCheckoutLimiter();
      break;
    case "demo":
      limiter = getDemoLimiter();
      break;
    case "newsletter":
      limiter = getNewsletterLimiter();
      break;
  }

  // If no limiter configured, allow the request (graceful degradation)
  if (!limiter) {
    return { success: true };
  }

  // Extract IP address
  // Vercel passes the real IP in x-forwarded-for header
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "127.0.0.1";

  // Check rate limit
  const result = await limiter.limit(ip);

  if (!result.success) {
    // Calculate when the limit resets
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.reset),
        },
      }
    );
  }

  return { success: true };
}

/**
 * Get rate limit info headers for successful responses
 * This is optional but helps clients understand their quota
 */
export async function getRateLimitHeaders(
  type: RateLimitType,
  request: Request
): Promise<Record<string, string>> {
  let limiter: Ratelimit | null;
  switch (type) {
    case "checkout":
      limiter = getCheckoutLimiter();
      break;
    case "demo":
      limiter = getDemoLimiter();
      break;
    case "newsletter":
      limiter = getNewsletterLimiter();
      break;
  }

  if (!limiter) {
    return {};
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "127.0.0.1";

  // Use getRemaining to check without consuming
  const result = await limiter.getRemaining(ip);

  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}
