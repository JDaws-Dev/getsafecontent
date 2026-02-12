import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring sample rate (10% to stay within free tier)
  tracesSampleRate: 0.1,

  // Environment tag
  environment: process.env.NODE_ENV,

  // Scrub PII from events
  beforeSend(event) {
    // Scrub email addresses from error messages
    if (event.message) {
      event.message = event.message.replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        "[EMAIL]"
      );
    }

    // Scrub sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["stripe-signature"];
    }

    return event;
  },
});
