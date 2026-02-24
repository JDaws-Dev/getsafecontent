import { Redis } from "@upstash/redis";

// Webhook event types
export type WebhookEventType =
  | "checkout.session.completed"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.payment_failed"
  | "unknown";

export type WebhookStatus = "success" | "partial_failure" | "failure";

export interface WebhookLogEntry {
  id: string;
  timestamp: number;
  eventId: string;
  eventType: WebhookEventType;
  status: WebhookStatus;
  email: string | null;
  customerName: string | null;
  amountCents: number | null;
  apps: string[];
  failedApps: string[];
  errors: string[];
  metadata: Record<string, unknown>;
  processingTimeMs: number;
}

// Redis key for webhook logs (sorted set by timestamp)
const WEBHOOK_LOG_KEY = "webhook:logs";
const MAX_LOGS = 500; // Keep last 500 webhook events

// Lazy initialization
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

/**
 * Log a webhook event
 */
export async function logWebhookEvent(params: {
  eventId: string;
  eventType: WebhookEventType;
  status: WebhookStatus;
  email?: string | null;
  customerName?: string | null;
  amountCents?: number | null;
  apps?: string[];
  failedApps?: string[];
  errors?: string[];
  metadata?: Record<string, unknown>;
  processingTimeMs: number;
}): Promise<void> {
  const r = getRedis();
  if (!r) {
    // Graceful degradation - just log to console if Redis not available
    console.log("[WEBHOOK_LOG]", JSON.stringify(params));
    return;
  }

  const entry: WebhookLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    eventId: params.eventId,
    eventType: params.eventType,
    status: params.status,
    email: params.email || null,
    customerName: params.customerName || null,
    amountCents: params.amountCents || null,
    apps: params.apps || [],
    failedApps: params.failedApps || [],
    errors: params.errors || [],
    metadata: params.metadata || {},
    processingTimeMs: params.processingTimeMs,
  };

  try {
    // Add to sorted set with timestamp as score
    await r.zadd(WEBHOOK_LOG_KEY, {
      score: entry.timestamp,
      member: JSON.stringify(entry),
    });

    // Trim to keep only last MAX_LOGS entries
    const count = await r.zcard(WEBHOOK_LOG_KEY);
    if (count > MAX_LOGS) {
      // Remove oldest entries
      await r.zremrangebyrank(WEBHOOK_LOG_KEY, 0, count - MAX_LOGS - 1);
    }

    // Also log to console for debugging
    console.log(
      "[WEBHOOK_LOG]",
      entry.eventType,
      entry.status,
      entry.email,
      entry.apps.join(","),
      entry.errors.length > 0 ? `errors: ${entry.errors.join("; ")}` : ""
    );
  } catch (error) {
    console.error("Failed to write webhook log:", error);
    // Don't throw - logging should not break webhook processing
  }
}

/**
 * Get webhook logs with pagination and filtering
 */
export async function getWebhookLogs(params?: {
  limit?: number;
  offset?: number;
  status?: WebhookStatus;
  eventType?: WebhookEventType;
  email?: string;
  startDate?: number;
  endDate?: number;
}): Promise<{ logs: WebhookLogEntry[]; total: number }> {
  const r = getRedis();
  if (!r) {
    return { logs: [], total: 0 };
  }

  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  try {
    // Get total count
    const total = await r.zcard(WEBHOOK_LOG_KEY);

    // Get logs in reverse chronological order (newest first)
    const rawLogs = await r.zrange(WEBHOOK_LOG_KEY, -offset - limit, -offset - 1, {
      rev: true,
    });

    // Parse and filter logs
    let logs: WebhookLogEntry[] = rawLogs
      .map((raw) => {
        try {
          return typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
          return null;
        }
      })
      .filter((log): log is WebhookLogEntry => log !== null);

    // Apply filters
    if (params?.status) {
      logs = logs.filter((log) => log.status === params.status);
    }
    if (params?.eventType) {
      logs = logs.filter((log) => log.eventType === params.eventType);
    }
    if (params?.email) {
      logs = logs.filter((log) =>
        log.email?.toLowerCase().includes(params.email!.toLowerCase())
      );
    }
    if (params?.startDate) {
      logs = logs.filter((log) => log.timestamp >= params.startDate!);
    }
    if (params?.endDate) {
      logs = logs.filter((log) => log.timestamp <= params.endDate!);
    }

    return { logs, total };
  } catch (error) {
    console.error("Failed to read webhook logs:", error);
    return { logs: [], total: 0 };
  }
}

/**
 * Get summary statistics for webhook logs
 */
export async function getWebhookStats(): Promise<{
  total: number;
  last24h: number;
  successCount: number;
  failureCount: number;
  partialFailureCount: number;
}> {
  const r = getRedis();
  if (!r) {
    return {
      total: 0,
      last24h: 0,
      successCount: 0,
      failureCount: 0,
      partialFailureCount: 0,
    };
  }

  try {
    const total = await r.zcard(WEBHOOK_LOG_KEY);

    // Get logs from last 24 hours
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentLogs = await r.zrange(WEBHOOK_LOG_KEY, twentyFourHoursAgo, "+inf", { byScore: true });

    let successCount = 0;
    let failureCount = 0;
    let partialFailureCount = 0;

    for (const raw of recentLogs) {
      try {
        const log: WebhookLogEntry = typeof raw === "string" ? JSON.parse(raw) : raw;
        switch (log.status) {
          case "success":
            successCount++;
            break;
          case "failure":
            failureCount++;
            break;
          case "partial_failure":
            partialFailureCount++;
            break;
        }
      } catch {
        // Skip malformed entries
      }
    }

    return {
      total,
      last24h: recentLogs.length,
      successCount,
      failureCount,
      partialFailureCount,
    };
  } catch (error) {
    console.error("Failed to get webhook stats:", error);
    return {
      total: 0,
      last24h: 0,
      successCount: 0,
      failureCount: 0,
      partialFailureCount: 0,
    };
  }
}
