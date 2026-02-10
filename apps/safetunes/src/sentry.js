import * as Sentry from "@sentry/react";

export function initSentry() {
  // Only initialize in production
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0, // Capture 100% of transactions in production (adjust as needed)
      // Session Replay
      replaysSessionSampleRate: 0.1, // Sample 10% of sessions
      replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors

      // Environment
      environment: import.meta.env.MODE,

      // Filter out sensitive data
      beforeSend(event, hint) {
        // Don't send events if user is in development
        if (window.location.hostname === 'localhost') {
          return null;
        }

        // Filter out sensitive user data
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
        }

        return event;
      },
    });
  }
}

// Error Boundary component
export const SentryErrorBoundary = Sentry.ErrorBoundary;
