"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ROADMAP,
  APP_META,
  PRIORITY_META,
  type RoadmapItem,
  type App,
  type Priority,
  type Status,
} from "@/data/roadmap";
import { ChevronDown, ChevronRight, Circle, CircleDot, CheckCircle2, Ban, ExternalLink } from "lucide-react";

/**
 * /admin/roadmap — consolidated work board across the 5 apps + marketing.
 *
 * Single source of truth lives in src/data/roadmap.ts. Edit that file
 * to add/update items; this page just renders.
 *
 * Filterable by app + priority + status. Click any row to expand
 * description, beads link, source files, and notes.
 */
export default function RoadmapPage() {
  const [appFilter, setAppFilter] = useState<App | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [hideDone, setHideDone] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return ROADMAP.filter((item) => {
      if (appFilter !== "all" && item.app !== appFilter) return false;
      if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (hideDone && item.status === "done" && statusFilter !== "done") return false;
      return true;
    });
  }, [appFilter, priorityFilter, statusFilter, hideDone]);

  const counts = useMemo(() => {
    const result = {
      total: ROADMAP.length,
      open: 0,
      inProgress: 0,
      blocked: 0,
      done: 0,
      byPriority: { P0: 0, P1: 0, P2: 0, P3: 0 } as Record<Priority, number>,
    };
    for (const item of ROADMAP) {
      if (item.status === "open") result.open++;
      else if (item.status === "in-progress") result.inProgress++;
      else if (item.status === "blocked") result.blocked++;
      else if (item.status === "done") result.done++;
      if (item.status !== "done") result.byPriority[item.priority]++;
    }
    return result;
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Roadmap
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Consolidated work board across the 5 apps + marketing. Single source:{" "}
          <code className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
            sites/marketing/src/data/roadmap.ts
          </code>
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Open" value={counts.open} tone="slate" />
        <StatCard label="In progress" value={counts.inProgress} tone="amber" />
        <StatCard label="Blocked" value={counts.blocked} tone="red" />
        <StatCard label="Done" value={counts.done} tone="emerald" />
        <StatCard
          label="P0 open"
          value={counts.byPriority.P0}
          tone={counts.byPriority.P0 > 0 ? "red" : "emerald"}
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <FilterSelect<App | "all">
            label="App"
            value={appFilter}
            onChange={setAppFilter}
            options={[
              { value: "all", label: `All (${ROADMAP.length})` },
              ...(Object.keys(APP_META) as App[]).map((app) => ({
                value: app,
                label: `${APP_META[app].name} (${ROADMAP.filter((r) => r.app === app).length})`,
              })),
            ]}
          />
          <FilterSelect<Priority | "all">
            label="Priority"
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: "all", label: "All" },
              ...(Object.keys(PRIORITY_META) as Priority[]).map((p) => ({
                value: p,
                label: `${p} (${ROADMAP.filter((r) => r.priority === p && r.status !== "done").length} open)`,
              })),
            ]}
          />
          <FilterSelect<Status | "all">
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All" },
              { value: "open", label: `Open (${counts.open})` },
              { value: "in-progress", label: `In progress (${counts.inProgress})` },
              { value: "blocked", label: `Blocked (${counts.blocked})` },
              { value: "done", label: `Done (${counts.done})` },
            ]}
          />
          <label className="flex items-end gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={hideDone}
              onChange={(e) => setHideDone(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="pb-1.5">Hide done</span>
          </label>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Showing {filtered.length} of {ROADMAP.length} items
        </p>
      </div>

      {/* Item list */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No items match those filters.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.map((item) => (
              <RoadmapRow
                key={item.id}
                item={item}
                expanded={expandedIds.has(item.id)}
                onToggle={() => toggleExpand(item.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="mt-6 text-xs text-slate-500">
        <p>
          To edit: open{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
            sites/marketing/src/data/roadmap.ts
          </code>
          , update an item's <code>status</code> or add a new entry to the
          appropriate priority array, commit, push, redeploy. Both Claude
          Code and Codex have read/write access.
        </p>
      </footer>
    </div>
  );
}

// =============================================================================
// Row + helpers
// =============================================================================

function RoadmapRow({
  item,
  expanded,
  onToggle,
}: {
  item: RoadmapItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const appMeta = APP_META[item.app];
  const hasDetails = !!(
    item.description ||
    item.bead ||
    item.refs?.length ||
    item.notes ||
    item.blockedBy
  );

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={!hasDetails}
        className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:hover:bg-transparent disabled:cursor-default"
      >
        <div className="pt-0.5 text-slate-400">
          {hasDetails ? (
            expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>
        <StatusIcon status={item.status} />
        <PriorityBadge priority={item.priority} />
        <AppBadge app={item.app} />
        <span className="flex-1 text-sm text-slate-800 dark:text-slate-100 font-medium">
          {item.title}
        </span>
        {item.bead && (
          <code className="text-[10px] font-mono text-slate-400 mt-0.5 hidden sm:inline">
            {item.bead}
          </code>
        )}
      </button>

      {expanded && hasDetails && (
        <div className="px-12 pb-4 -mt-1 space-y-3">
          {item.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {item.description}
            </p>
          )}
          {item.blockedBy && (
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 border border-red-100 dark:border-red-900/30">
              <strong>Blocked by:</strong> {item.blockedBy}
            </div>
          )}
          {item.refs && item.refs.length > 0 && (
            <div className="text-xs">
              <p className="text-slate-500 mb-1 font-medium uppercase tracking-wider">
                Files / refs
              </p>
              <ul className="space-y-0.5">
                {item.refs.map((ref) => (
                  <li key={ref}>
                    <code className="text-xs text-slate-600 dark:text-slate-400">
                      {ref}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.notes && (
            <div className="text-xs text-slate-500 italic border-l-2 border-slate-200 dark:border-slate-700 pl-3">
              {item.notes}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>id: <code className="text-slate-600 dark:text-slate-300">{item.id}</code></span>
            <span>·</span>
            <span>source: <code className="text-slate-600 dark:text-slate-300">{item.source}</code></span>
            {item.bead && (
              <>
                <span>·</span>
                <span>bead: <code className="text-slate-600 dark:text-slate-300">{item.bead}</code></span>
              </>
            )}
            {appMeta.domain && (
              <>
                <span>·</span>
                <a
                  href={`https://${appMeta.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  {appMeta.domain}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
            {item.updatedAt && (
              <>
                <span>·</span>
                <span>updated: {item.updatedAt}</span>
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function StatusIcon({ status }: { status: Status }) {
  const props = "w-4 h-4 flex-shrink-0 mt-0.5";
  if (status === "done") return <CheckCircle2 className={`${props} text-emerald-500`} />;
  if (status === "in-progress") return <CircleDot className={`${props} text-amber-500`} />;
  if (status === "blocked") return <Ban className={`${props} text-red-500`} />;
  return <Circle className={`${props} text-slate-300`} />;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const color =
    priority === "P0"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : priority === "P1"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : priority === "P2"
          ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          : "bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500";
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${color}`}
    >
      {priority}
    </span>
  );
}

// Static class map so Tailwind JIT picks up every color. Template-literal
// interpolation (`bg-${color}-100`) doesn't work — Tailwind only generates
// classes it sees as complete literals in source.
const APP_BADGE_CLASSES: Record<App, string> = {
  platform: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  monorepo: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  marketing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  safetunes: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  safetube: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  safereads: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  safestudy: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  safespark: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

function AppBadge({ app }: { app: App }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${APP_BADGE_CLASSES[app]}`}
    >
      {APP_META[app].name}
    </span>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "amber" | "red" | "emerald";
}) {
  const colors = {
    slate: "text-slate-900 dark:text-slate-100",
    amber: "text-amber-700 dark:text-amber-300",
    red: "text-red-700 dark:text-red-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
  };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${colors[tone]}`}>{value}</p>
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
