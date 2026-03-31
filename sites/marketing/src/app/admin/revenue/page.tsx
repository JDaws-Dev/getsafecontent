"use client";

import { useState, useEffect, useCallback } from "react";
import { RevenueChart } from "@/components/admin/RevenueChart";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  email: string;
  date: number;
  status: string;
  description: string;
}

interface Refund {
  id: string;
  amount: number;
  date: number;
  reason: string;
  chargeId: string;
}

interface RevenueData {
  stripeMrr: number;
  activeSubscriptions: number;
  recentPayments: Payment[];
  recentRefunds: Refund[];
  planBreakdown: Record<string, { count: number; mrr: number; name: string }>;
  monthlyTrend: { month: string; revenue: number }[];
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    succeeded: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"}`}>
      {status}
    </span>
  );
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/admin/revenue");
      if (!res.ok) throw new Error("Failed to fetch revenue data");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch revenue data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Live from Stripe</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Live from Stripe</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100">Retry</button>
        </div>
      </div>
    );
  }

  // Calculate total revenue from last 30 days of payments (minus refunds)
  const totalPayments30d = data.recentPayments.reduce((sum, p) => p.status === "succeeded" ? sum + p.amount : sum, 0);
  const totalRefunds = data.recentRefunds.reduce((sum, r) => sum + r.amount, 0);
  const net30d = totalPayments30d - totalRefunds;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Live from Stripe</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">Refresh</button>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Recurring</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.stripeMrr)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{data.activeSubscriptions} active subs</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Projected Annual</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.stripeMrr * 12)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Last 30 Days</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(net30d)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">net of {formatCurrency(totalRefunds)} refunds</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Refunds (30d)</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalRefunds)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{data.recentRefunds.length} refunds</p>
        </div>
      </div>

      {/* Active subscriptions breakdown - from real Stripe data */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Subscriptions</h2>
        <div className="space-y-3">
          {Object.entries(data.planBreakdown).map(([planId, plan]) => (
            <div key={planId} className="flex items-center justify-between py-2 pl-3 border-l-4 border-indigo-500">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">{plan.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{plan.count} sub{plan.count !== 1 ? "s" : ""}</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(plan.mrr)}/mo</span>
            </div>
          ))}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total MRR</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(data.stripeMrr)}/mo</span>
          </div>
        </div>
      </div>

      {/* Monthly trend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Monthly Revenue</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Last 12 months (from charges)</p>
        <RevenueChart data={data.monthlyTrend} />
      </div>

      {/* Recent payments */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Payments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.recentPayments.slice(0, 15).map((p) => (
                <tr key={p.id} className="text-gray-700 dark:text-gray-300">
                  <td className="py-2 whitespace-nowrap">{formatDate(p.date)}</td>
                  <td className="py-2 truncate max-w-[250px]">{p.email || "N/A"}</td>
                  <td className="py-2 whitespace-nowrap font-medium">{formatCurrency(p.amount)}</td>
                  <td className="py-2"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent refunds */}
      {data.recentRefunds.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Refunds</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.recentRefunds.slice(0, 10).map((r) => (
                  <tr key={r.id} className="text-gray-700 dark:text-gray-300">
                    <td className="py-2 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="py-2 whitespace-nowrap font-medium text-red-600 dark:text-red-400">-{formatCurrency(r.amount)}</td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
