import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring sample rate (10% to stay within free tier)
  tracesSampleRate: 0.1,

  // Replay for error sessions only (saves quota)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    "chrome-extension://",
    "moz-extension://",
    // Network errors (user's connection issues)
    "Network Error",
    "Failed to fetch",
    "Load failed",
    // Cancellation errors
    "AbortError",
    "cancelled",
  ],

  // Environment tag
  environment: process.env.NODE_ENV,

  // Redact sensitive data from breadcrumbs
  beforeBreadcrumb(breadcrumb) {
    // Don't log auth-related breadcrumbs with sensitive data
    if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
      const url = breadcrumb.data?.url as string | undefined;
      if (url?.includes("/api/auth") || url?.includes("stripe")) {
        breadcrumb.data = { url: "[REDACTED]" };
      }
    }
    return breadcrumb;
  },

  // Scrub PII from events
  beforeSend(event) {
    // Scrub email addresses from error messages
    if (event.message) {
      event.message = event.message.replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        "[EMAIL]"
      );
    }
    return event;
  },
});
