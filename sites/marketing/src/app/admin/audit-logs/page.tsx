"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { AuditLogEntry, AuditAction } from "@/lib/audit-log";

const ACTION_LABELS: Record<AuditAction, string> = {
  grant_lifetime: "Grant Lifetime",
  revoke_access: "Revoke Access",
  delete_user: "Delete User",
  send_email: "Send Email",
  view_user_data: "View User Data",
  retry_provision: "Retry Provision",
  login: "Login",
};

const ACTION_COLORS: Record<AuditAction, string> = {
  grant_lifetime: "bg-green-100 text-green-800",
  revoke_access: "bg-orange-100 text-orange-800",
  delete_user: "bg-red-100 text-red-800",
  send_email: "bg-blue-100 text-blue-800",
  view_user_data: "bg-gray-100 text-gray-800",
  retry_provision: "bg-purple-100 text-purple-800",
  login: "bg-indigo-100 text-indigo-800",
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

function AuditLogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>(
    searchParams.get("action") || ""
  );
  const [targetFilter, setTargetFilter] = useState(
    searchParams.get("target") || ""
  );
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );
  const pageSize = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", String((page - 1) * pageSize));
    if (actionFilter) params.set("action", actionFilter);
    if (targetFilter) params.set("targetEmail", targetFilter);

    try {
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch audit logs");
      }
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, targetFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (targetFilter) params.set("target", targetFilter);
    if (page > 1) params.set("page", String(page));
    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : "/admin/audit-logs", {
      scroll: false,
    });
  }, [actionFilter, targetFilter, page, router]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 text-sm">
            Track all admin actions for accountability
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Actions</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Email
            </label>
            <input
              type="text"
              value={targetFilter}
              onChange={(e) => {
                setTargetFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Search by email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {(actionFilter || targetFilter) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setActionFilter("");
                  setTargetFilter("");
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
            No audit logs found
            {(actionFilter || targetFilter) && " matching your filters"}
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
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        <span title={formatFullDate(log.timestamp)}>
                          {formatDate(log.timestamp)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {log.adminEmail}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {log.targetEmail || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        <DetailsCell details={log.details} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(log.timestamp)}
                    </span>
                  </div>
                  {log.targetEmail && (
                    <p className="text-sm text-gray-900">
                      Target: <span className="font-medium">{log.targetEmail}</span>
                    </p>
                  )}
                  <DetailsCell details={log.details} />
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
    </div>
  );
}

function DetailsCell({ details }: { details: Record<string, unknown> }) {
  if (!details || Object.keys(details).length === 0) {
    return <span className="text-gray-400">—</span>;
  }

  // Format details for display
  const formatted: string[] = [];

  if (details.apps && Array.isArray(details.apps)) {
    formatted.push(`Apps: ${(details.apps as string[]).join(", ")}`);
  }

  if (details.template) {
    formatted.push(`Template: ${details.template}`);
  }

  if (details.recipientCount) {
    formatted.push(`${details.recipientCount} recipient(s)`);
  }

  if (details.success !== undefined) {
    formatted.push(details.success ? "✓ Success" : "✗ Failed");
  }

  if (formatted.length === 0) {
    // Just show raw JSON for unhandled details
    return (
      <span className="text-xs font-mono text-gray-500">
        {JSON.stringify(details).slice(0, 100)}
      </span>
    );
  }

  return <span>{formatted.join(" · ")}</span>;
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <AuditLogsContent />
    </Suspense>
  );
}
