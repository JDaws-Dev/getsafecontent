/**
 * In-memory rate limiting for HTTP actions.
 *
 * IMPORTANT: This is a simple in-memory rate limiter suitable for defense-in-depth
 * on admin endpoints that already require authentication. For public endpoints
 * requiring distributed rate limiting across multiple workers, use Redis (Upstash).
 *
 * Since Convex HTTP actions run in isolated workers, this provides per-worker
 * rate limiting. In practice, this still provides protection because:
 * 1. Rapid requests from the same IP typically hit the same worker
 * 2. Even if spread across workers, it reduces attack surface significantly
 * 3. The endpoints already require ADMIN_KEY authentication
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically (every 60 seconds)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60 * 1000; // 60 seconds

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check if a request should be rate limited.
 *
 * @param identifier - Unique identifier for the client (typically IP address)
 * @param maxRequests - Maximum requests allowed in the time window
 * @param windowMs - Time window in milliseconds
 * @returns Object with limited (boolean) and retryAfter (seconds until reset)
 */
export function checkHttpRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000 // 1 minute default
): { limited: boolean; retryAfter: number; remaining: number } {
  cleanupExpiredEntries();

  const now = Date.now();
  const key = identifier;

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      limited: false,
      retryAfter: 0,
      remaining: maxRequests - 1,
    };
  }

  // Increment count
  entry.count++;

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      limited: true,
      retryAfter,
      remaining: 0,
    };
  }

  return {
    limited: false,
    retryAfter: 0,
    remaining: maxRequests - entry.count,
  };
}

/**
 * Get client IP from a Convex HTTP request.
 * Convex provides the x-forwarded-for header for the original client IP.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, first is the client
    return forwardedFor.split(",")[0].trim();
  }

  // Fallback - use a generic identifier if no IP available
  return "unknown-client";
}

/**
 * Create a rate-limited response (HTTP 429).
 */
export function rateLimitedResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
