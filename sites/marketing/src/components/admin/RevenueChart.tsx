"use client";

interface MonthlyData {
  month: string;
  revenue: number;
}

interface RevenueChartProps {
  data: MonthlyData[];
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = parseInt(m, 10) - 1;
  const shortYear = year.slice(2);
  return `${monthNames[monthIndex]} '${shortYear}`;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="flex items-end gap-2 h-48 px-2">
      {data.map((item) => {
        const heightPercent = (item.revenue / maxRevenue) * 100;
        const label = formatMonthLabel(item.month);

        return (
          <div
            key={item.month}
            className="flex-1 flex flex-col items-center gap-1 min-w-0"
          >
            {/* Bar */}
            <div className="w-full flex items-end justify-center" style={{ height: "160px" }}>
              <div
                className="w-full max-w-[40px] bg-gray-900 dark:bg-white rounded-t transition-all duration-300 hover:bg-gray-700 dark:hover:bg-gray-300"
                style={{ height: `${Math.max(heightPercent, 2)}%` }}
                title={`${label}: $${item.revenue.toFixed(2)}`}
              />
            </div>
            {/* Label */}
            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center leading-tight">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
