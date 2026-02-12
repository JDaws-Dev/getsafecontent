import { Redis } from "@upstash/redis";

// Audit log entry types
export type AuditAction =
  | "grant_lifetime"
  | "revoke_access"
  | "delete_user"
  | "send_email"
  | "view_user_data"
  | "retry_provision"
  | "login";

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  adminEmail: string;
  action: AuditAction;
  targetEmail: string | null;
  details: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
}

// Redis key for audit logs (sorted set by timestamp)
const AUDIT_LOG_KEY = "audit:logs";
const MAX_LOGS = 1000; // Keep last 1000 logs

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
 * Log an admin action
 */
export async function logAdminAction(params: {
  adminEmail: string;
  action: AuditAction;
  targetEmail?: string | null;
  details?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  const r = getRedis();
  if (!r) {
    // Graceful degradation - just log to console if Redis not available
    console.log("[AUDIT]", JSON.stringify(params));
    return;
  }

  const entry: AuditLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    adminEmail: params.adminEmail,
    action: params.action,
    targetEmail: params.targetEmail || null,
    details: params.details || {},
    ip: params.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: params.request?.headers.get("user-agent") || null,
  };

  try {
    // Add to sorted set with timestamp as score
    await r.zadd(AUDIT_LOG_KEY, {
      score: entry.timestamp,
      member: JSON.stringify(entry),
    });

    // Trim to keep only last MAX_LOGS entries
    const count = await r.zcard(AUDIT_LOG_KEY);
    if (count > MAX_LOGS) {
      // Remove oldest entries
      await r.zremrangebyrank(AUDIT_LOG_KEY, 0, count - MAX_LOGS - 1);
    }

    // Also log to console for debugging
    console.log("[AUDIT]", entry.action, entry.adminEmail, "->", entry.targetEmail, entry.details);
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Don't throw - audit logging should not break admin actions
  }
}

/**
 * Get audit logs with pagination
 */
export async function getAuditLogs(params?: {
  limit?: number;
  offset?: number;
  action?: AuditAction;
  adminEmail?: string;
  targetEmail?: string;
  startDate?: number;
  endDate?: number;
}): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const r = getRedis();
  if (!r) {
    return { logs: [], total: 0 };
  }

  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  try {
    // Get total count
    const total = await r.zcard(AUDIT_LOG_KEY);

    // Get logs in reverse chronological order (newest first)
    const rawLogs = await r.zrange(AUDIT_LOG_KEY, -offset - limit, -offset - 1, {
      rev: true,
    });

    // Parse and filter logs
    let logs: AuditLogEntry[] = rawLogs
      .map((raw) => {
        try {
          return typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
          return null;
        }
      })
      .filter((log): log is AuditLogEntry => log !== null);

    // Apply filters
    if (params?.action) {
      logs = logs.filter((log) => log.action === params.action);
    }
    if (params?.adminEmail) {
      logs = logs.filter((log) =>
        log.adminEmail.toLowerCase().includes(params.adminEmail!.toLowerCase())
      );
    }
    if (params?.targetEmail) {
      logs = logs.filter((log) =>
        log.targetEmail?.toLowerCase().includes(params.targetEmail!.toLowerCase())
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
    console.error("Failed to read audit logs:", error);
    return { logs: [], total: 0 };
  }
}

/**
 * Get human-readable description of an action
 */
export function getActionDescription(entry: AuditLogEntry): string {
  switch (entry.action) {
    case "grant_lifetime":
      const apps = (entry.details.apps as string[])?.join(", ") || "unknown apps";
      return `Granted lifetime access to ${entry.targetEmail} on ${apps}`;
    case "revoke_access":
      return `Revoked access for ${entry.targetEmail}`;
    case "delete_user":
      const deletedApps = (entry.details.apps as string[])?.join(", ") || "all apps";
      return `Deleted user ${entry.targetEmail} from ${deletedApps}`;
    case "send_email":
      const template = entry.details.template || "custom";
      const recipients = Array.isArray(entry.details.to)
        ? `${(entry.details.to as string[]).length} recipients`
        : entry.targetEmail;
      return `Sent ${template} email to ${recipients}`;
    case "view_user_data":
      return `Viewed user data for ${entry.targetEmail}`;
    case "retry_provision":
      const provisionApps = (entry.details.apps as string[])?.join(", ") || "unknown apps";
      return `Retried provisioning for ${entry.targetEmail} on ${provisionApps}`;
    case "login":
      return "Admin logged in";
    default:
      return `${entry.action} on ${entry.targetEmail}`;
  }
}
