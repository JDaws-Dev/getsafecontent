import * as Sentry from "@sentry/nextjs";

/**
 * Captures an error in Sentry with payment context.
 * Used for critical payment-related errors that need alerting.
 */
export function capturePaymentError(
  error: Error | unknown,
  context: {
    email?: string | null;
    customerId?: string | null;
    sessionId?: string | null;
    subscriptionId?: string | null;
    eventType?: string;
    apps?: string[];
    amount?: number;
  }
) {
  const err = error instanceof Error ? error : new Error(String(error));

  Sentry.withScope((scope) => {
    // Set severity to error (will trigger alerts)
    scope.setLevel("error");

    // Tag for filtering
    scope.setTag("payment_error", "true");
    if (context.eventType) {
      scope.setTag("stripe_event", context.eventType);
    }
    if (context.apps?.length) {
      scope.setTag("apps", context.apps.join(","));
    }

    // Add context (visible in Sentry UI but not indexed)
    scope.setContext("payment", {
      email: context.email ? "[REDACTED]" : null,
      customerId: context.customerId,
      sessionId: context.sessionId,
      subscriptionId: context.subscriptionId,
      eventType: context.eventType,
      apps: context.apps,
      amount: context.amount,
      timestamp: new Date().toISOString(),
    });

    // User identification (hashed for privacy)
    if (context.email) {
      scope.setUser({
        id: hashEmail(context.email),
        // Don't store actual email in Sentry
      });
    }

    Sentry.captureException(err);
  });
}

/**
 * Captures a webhook processing error with full context.
 */
export function captureWebhookError(
  error: Error | unknown,
  context: {
    eventType: string;
    eventId?: string;
    email?: string | null;
    customerId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const err = error instanceof Error ? error : new Error(String(error));

  Sentry.withScope((scope) => {
    scope.setLevel("error");
    scope.setTag("webhook_error", "true");
    scope.setTag("stripe_event", context.eventType);

    scope.setContext("webhook", {
      eventType: context.eventType,
      eventId: context.eventId,
      email: context.email ? "[REDACTED]" : null,
      customerId: context.customerId,
      metadata: context.metadata,
      timestamp: new Date().toISOString(),
    });

    if (context.email) {
      scope.setUser({
        id: hashEmail(context.email),
      });
    }

    Sentry.captureException(err);
  });
}

/**
 * Captures a provisioning failure (customer paid but didn't get access).
 * This is critical and should alert immediately.
 */
export function captureProvisioningFailure(context: {
  email: string;
  apps: string[];
  failedApps: string[];
  errors: string[];
  sessionId?: string;
  amount?: number;
}) {
  Sentry.withScope((scope) => {
    // Critical severity for immediate attention
    scope.setLevel("fatal");
    scope.setTag("provisioning_failure", "true");
    scope.setTag("failed_apps", context.failedApps.join(","));

    scope.setContext("provisioning", {
      email: "[REDACTED]",
      apps: context.apps,
      failedApps: context.failedApps,
      errors: context.errors,
      sessionId: context.sessionId,
      amount: context.amount,
      timestamp: new Date().toISOString(),
    });

    scope.setUser({
      id: hashEmail(context.email),
    });

    Sentry.captureMessage(
      `Provisioning failed: ${context.failedApps.join(", ")} (customer charged $${((context.amount || 0) / 100).toFixed(2)})`,
      "fatal"
    );
  });
}

/**
 * Captures a general API error with request context.
 */
export function captureApiError(
  error: Error | unknown,
  context: {
    route: string;
    method: string;
    userId?: string;
    extra?: Record<string, unknown>;
  }
) {
  const err = error instanceof Error ? error : new Error(String(error));

  Sentry.withScope((scope) => {
    scope.setTag("api_route", context.route);
    scope.setTag("http_method", context.method);

    scope.setContext("api", {
      route: context.route,
      method: context.method,
      ...context.extra,
    });

    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    Sentry.captureException(err);
  });
}

/**
 * Hash email for user identification without storing PII.
 */
function hashEmail(email: string): string {
  // Simple hash function for user identification
  // In production, consider using crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `user_${Math.abs(hash).toString(16)}`;
}
