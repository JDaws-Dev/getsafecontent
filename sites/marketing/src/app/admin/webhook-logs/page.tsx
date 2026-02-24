"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { WebhookLogEntry, WebhookEventType, WebhookStatus } from "@/lib/webhook-log";

const EVENT_LABELS: Record<WebhookEventType, string> = {
  "checkout.session.completed": "Checkout Completed",
  "customer.subscription.updated": "Subscription Updated",
  "customer.subscription.deleted": "Subscription Deleted",
  "invoice.payment_failed": "Payment Failed",
  unknown: "Unknown",
};

const STATUS_COLORS: Record<WebhookStatus, string> = {
  success: "bg-green-100 text-green-800",
  partial_failure: "bg-yellow-100 text-yellow-800",
  failure: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<WebhookStatus, string> = {
  success: "Success",
  partial_failure: "Partial Failure",
  failure: "Failed",
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFullDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

interface WebhookStats {
  total: number;
  last24h: number;
  successCount: number;
  failureCount: number;
  partialFailureCount: number;
}

function WebhookLogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") || ""
  );
  const [eventTypeFilter, setEventTypeFilter] = useState(
    searchParams.get("eventType") || ""
  );
  const [emailFilter, setEmailFilter] = useState(
    searchParams.get("email") || ""
  );
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );
  const pageSize = 25;

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/webhook-logs?action=stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", String((page - 1) * pageSize));
    if (statusFilter) params.set("status", statusFilter);
    if (eventTypeFilter) params.set("eventType", eventTypeFilter);
    if (emailFilter) params.set("email", emailFilter);

    try {
      const res = await fetch(`/api/admin/webhook-logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch webhook logs");
      }
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, eventTypeFilter, emailFilter]);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [fetchStats, fetchLogs]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (eventTypeFilter) params.set("eventType", eventTypeFilter);
    if (emailFilter) params.set("email", emailFilter);
    if (page > 1) params.set("page", String(page));
    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : "/admin/webhook-logs", {
      scroll: false,
    });
  }, [statusFilter, eventTypeFilter, emailFilter, page, router]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhook Logs</h1>
          <p className="text-gray-500 text-sm">
            Monitor Stripe webhook processing and failures
          </p>
        </div>
        <button
          onClick={() => {
            fetchStats();
            fetchLogs();
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Last 24 Hours</p>
            <p className="text-2xl font-bold text-gray-900">{stats.last24h}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Successful</p>
            <p className="text-2xl font-bold text-green-600">{stats.successCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Partial Failures</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.partialFailureCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Failures</p>
            <p className="text-2xl font-bold text-red-600">{stats.failureCount}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="partial_failure">Partial Failure</option>
              <option value="failure">Failed</option>
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              value={eventTypeFilter}
              onChange={(e) => {
                setEventTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Events</option>
              {Object.entries(EVENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="text"
              value={emailFilter}
              onChange={(e) => {
                setEmailFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Search by email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {(statusFilter || eventTypeFilter || emailFilter) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter("");
                  setEventTypeFilter("");
                  setEmailFilter("");
                  setPage(1);
                }}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No webhook logs found
            {(statusFilter || eventTypeFilter || emailFilter) && " matching your filters"}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Apps
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Processing
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className={`hover:bg-gray-50 ${
                        log.status === "failure" ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        <span title={formatFullDate(log.timestamp)}>
                          {formatDate(log.timestamp)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {EVENT_LABELS[log.eventType] || log.eventType}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            STATUS_COLORS[log.status]
                          }`}
                        >
                          {STATUS_LABELS[log.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {log.email || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {log.apps.length > 0 ? (
                          <span className="flex items-center gap-1">
                            {log.apps.map((app) => (
                              <span
                                key={app}
                                className={`px-1.5 py-0.5 rounded text-xs ${
                                  log.failedApps.includes(app)
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {app}
                              </span>
                            ))}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {log.amountCents
                          ? `$${(log.amountCents / 100).toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {log.processingTimeMs}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 space-y-2 ${
                    log.status === "failure" ? "bg-red-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        STATUS_COLORS[log.status]
                      }`}
                    >
                      {STATUS_LABELS[log.status]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {EVENT_LABELS[log.eventType] || log.eventType}
                  </p>
                  {log.email && (
                    <p className="text-sm text-gray-600">{log.email}</p>
                  )}
                  {log.apps.length > 0 && (
                    <div className="flex gap-1">
                      {log.apps.map((app) => (
                        <span
                          key={app}
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            log.failedApps.includes(app)
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {app}
                        </span>
                      ))}
                    </div>
                  )}
                  {log.errors.length > 0 && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {log.errors.join("; ")}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * pageSize + 1} to{" "}
                  {Math.min(page * pageSize, total)} of {total} logs
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error Details Section for failures */}
      {logs.some((log) => log.errors.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Errors</h2>
          </div>
          <div className="p-4 space-y-3">
            {logs
              .filter((log) => log.errors.length > 0)
              .slice(0, 5)
              .map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-red-50 border border-red-100 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-red-800">
                      {log.email || "Unknown email"}
                    </span>
                    <span className="text-xs text-red-600">
                      {formatDate(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-red-700">{log.errors.join("; ")}</p>
                  {log.failedApps.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Failed apps: {log.failedApps.join(", ")}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WebhookLogsPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}
    >
      <WebhookLogsContent />
    </Suspense>
  );
}
