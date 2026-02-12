import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring sample rate (10% to stay within free tier)
  tracesSampleRate: 0.1,

  // Environment tag
  environment: process.env.NODE_ENV,
});
