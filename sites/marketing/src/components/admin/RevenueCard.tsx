import type { RevenueStats } from "@/types/admin";

interface RevenueStatsCardProps {
  stats: RevenueStats;
}

export function RevenueCard({ stats }: RevenueStatsCardProps) {
  const { mrr, arr, breakdown, totalPaying, totalFree, trialConversionRate } = stats;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Revenue Dashboard</h2>
        <p className="text-sm text-gray-500">Monthly and annual recurring revenue</p>
      </div>

      <div className="p-5 space-y-6">
        {/* Primary metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
            <p className="text-sm text-green-600 font-medium">MRR</p>
            <p className="text-3xl font-bold text-green-700">${mrr.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-1">Monthly Recurring Revenue</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm text-blue-600 font-medium">ARR</p>
            <p className="text-3xl font-bold text-blue-700">${arr.toFixed(2)}</p>
            <p className="text-xs text-blue-600 mt-1">Annual Recurring Revenue</p>
          </div>
        </div>

        {/* Subscriber breakdown */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Revenue by Plan</h3>
          <div className="space-y-2">
            <BreakdownRow
              label="3-App Bundle (Monthly)"
              count={breakdown.bundleMonthly.count}
              mrr={breakdown.bundleMonthly.mrr}
              color="bg-indigo-500"
            />
            <BreakdownRow
              label="3-App Bundle (Yearly)"
              count={breakdown.bundleYearly.count}
              mrr={breakdown.bundleYearly.mrr}
              color="bg-purple-500"
            />
            <BreakdownRow
              label="2-App Bundle"
              count={breakdown.twoAppBundle.count}
              mrr={breakdown.twoAppBundle.mrr}
              color="bg-violet-500"
            />
            <BreakdownRow
              label="SafeTunes (Single)"
              count={breakdown.singleApp.safetunes.count}
              mrr={breakdown.singleApp.safetunes.mrr}
              color="bg-purple-400"
            />
            <BreakdownRow
              label="SafeTube (Single)"
              count={breakdown.singleApp.safetube.count}
              mrr={breakdown.singleApp.safetube.mrr}
              color="bg-red-400"
            />
            <BreakdownRow
              label="SafeReads (Single)"
              count={breakdown.singleApp.safereads.count}
              mrr={breakdown.singleApp.safereads.mrr}
              color="bg-emerald-400"
            />
          </div>
        </div>

        {/* Non-revenue users */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">User Breakdown</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xl font-bold text-green-600">{totalPaying}</p>
              <p className="text-xs text-gray-500">Paying</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xl font-bold text-purple-600">{breakdown.lifetime}</p>
              <p className="text-xs text-gray-500">Lifetime</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xl font-bold text-blue-600">{breakdown.trial}</p>
              <p className="text-xs text-gray-500">Trial</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">Expired trials</span>
            <span className="font-medium text-red-600">{breakdown.expired}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Trial conversion rate</span>
            <span className="font-medium text-green-600">{trialConversionRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  count,
  mrr,
  color,
}: {
  label: string;
  count: number;
  mrr: number;
  color: string;
}) {
  // Don't show rows with 0 subscribers
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          {count}
        </span>
      </div>
      <span className="text-sm font-medium text-gray-900">
        ${mrr.toFixed(2)}/mo
      </span>
    </div>
  );
}
