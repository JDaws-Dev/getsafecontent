import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-parchment-400" />
      </div>
    </div>
  );
}
