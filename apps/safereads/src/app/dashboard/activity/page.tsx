"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  BookOpen,
  Search,
  Check,
  X,
  Clock,
  BookMarked,
  Sparkles,
  Users,
} from "lucide-react";

const COLOR_MAP: Record<string, string> = {
  red: "bg-red-400",
  blue: "bg-blue-400",
  green: "bg-green-400",
  purple: "bg-purple-400",
  orange: "bg-orange-400",
  pink: "bg-pink-400",
  teal: "bg-teal-400",
  yellow: "bg-yellow-400",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGES: { label: string; days: number | null }[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "All time", days: null },
];

interface Kid {
  _id: string;
  name: string;
  age?: number;
  color?: string;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function ActivityPage() {
  const { user: authUser, token } = useAuth();

  const userId = useQuery(
    api.users.currentUserId,
    authUser?.email ? { email: authUser.email, userToken: token ?? undefined } : "skip"
  );

  const kids = useQuery(
    api.kids.listByUser,
    userId ? { userId, userToken: token ?? undefined } : "skip"
  ) as Kid[] | undefined;

  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const [rangeIdx, setRangeIdx] = useState(0);

  // Default to the first kid once the list loads.
  const activeKidId = selectedKidId ?? kids?.[0]?._id ?? null;
  const activeKid = kids?.find((k) => k._id === activeKidId) ?? null;

  const range = RANGES[rangeIdx];
  const sinceMs = range.days === null ? 0 : Date.now() - range.days * DAY_MS;

  const activity = useQuery(
    api.activity.getForKid,
    activeKidId
      ? {
          kidId: activeKidId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          sinceMs,
          userToken: token ?? undefined,
        }
      : "skip"
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-brand-cream-2 hover:text-ink-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-navy">
            Activity
          </h1>
          <p className="text-sm text-ink-500">
            Everything your kids have been reading, searching, and requesting
          </p>
        </div>
      </div>

      {/* No kids yet */}
      {kids !== undefined && kids.length === 0 && (
        <div className="rounded-2xl border border-brand-cream-2 bg-white p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-accent-300" />
          <p className="mt-3 text-sm text-ink-500">
            Add a child to start seeing their reading activity here.
          </p>
          <Link
            href="/dashboard/kids"
            className="mt-4 inline-block rounded-lg border border-accent-300 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-brand-cream-2"
          >
            Add Kids
          </Link>
        </div>
      )}

      {/* Kid picker */}
      {kids && kids.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {kids.map((kid) => {
            const isActive = kid._id === activeKidId;
            const colorClass = COLOR_MAP[kid.color || "purple"] || COLOR_MAP.purple;
            return (
              <button
                key={kid._id}
                onClick={() => setSelectedKidId(kid._id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-accent-500 bg-accent-50 text-accent-800"
                    : "border-brand-cream-2 bg-white text-ink-600 hover:bg-brand-cream-2"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ${colorClass}`}
                >
                  {kid.name.charAt(0).toUpperCase()}
                </span>
                {kid.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Date range control */}
      {kids && kids.length > 0 && (
        <div className="mb-6 flex gap-1.5">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                i === rangeIdx
                  ? "bg-brand-navy text-white"
                  : "bg-brand-cream-2 text-ink-500 hover:text-ink-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* Stats summary */}
      {activeKid && activity && (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Minutes read" value={activity.stats.minutesRead} />
          <StatTile label="Books finished" value={activity.stats.booksFinished} />
          <StatTile label="Searches" value={activity.stats.searches} />
          <StatTile
            label="Requests"
            value={activity.stats.requests}
            hint={
              activity.stats.requestsDenied > 0
                ? `${activity.stats.requestsDenied} denied`
                : undefined
            }
          />
        </div>
      )}

      {/* Timeline */}
      {activeKidId && activity === undefined && (
        <div className="py-12 text-center text-ink-500">Loading activity...</div>
      )}

      {activeKid && activity && activity.events.length === 0 && (
        <div className="rounded-2xl border border-brand-cream-2 bg-white p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-accent-300" />
          <p className="mt-3 text-sm text-ink-500">
            No activity recorded for {activeKid.name} in this period. As your
            child reads, searches, and requests books, everything they do will
            appear here.
          </p>
        </div>
      )}

      {activeKid && activity && activity.events.length > 0 && (
        <div className="space-y-2">
          {activity.events.map((event, i) => (
            <ActivityRow key={i} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-cream-2 bg-white p-3">
      <p className="font-display text-2xl font-bold text-brand-navy">{value}</p>
      <p className="text-[11px] text-ink-400">{label}</p>
      {hint && <p className="text-[10px] font-medium text-red-500">{hint}</p>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActivityRow({ event }: { event: any }) {
  const at: number = event.at;

  if (event.type === "reading") {
    return (
      <Row
        icon={<BookOpen className="h-4 w-4" />}
        iconBg="bg-accent-100 text-accent-700"
        cover={event.coverUrl}
        at={at}
      >
        <p className="text-sm font-medium text-brand-navy line-clamp-1">
          {event.finished ? "Finished reading" : "Read"} {event.bookTitle}
        </p>
        <p className="text-xs text-ink-400">
          {event.author ? `${event.author} · ` : ""}
          {event.finished ? "Completed" : `${event.percentComplete}% through`}
        </p>
      </Row>
    );
  }

  if (event.type === "search") {
    return (
      <Row
        icon={<Search className="h-4 w-4" />}
        iconBg="bg-blue-100 text-blue-600"
        at={at}
      >
        <p className="text-sm font-medium text-brand-navy line-clamp-1">
          Searched for &ldquo;{event.query}&rdquo;
        </p>
        <p className="text-xs text-ink-400">
          {event.resultCount} result{event.resultCount === 1 ? "" : "s"}
        </p>
      </Row>
    );
  }

  if (event.type === "request") {
    const denied = event.status === "denied";
    const approved = event.status === "approved";
    return (
      <Row
        icon={
          denied ? (
            <X className="h-4 w-4" />
          ) : approved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )
        }
        iconBg={
          denied
            ? "bg-red-100 text-red-500"
            : approved
              ? "bg-emerald-100 text-emerald-600"
              : "bg-amber-100 text-amber-600"
        }
        cover={event.coverUrl}
        at={at}
      >
        <p className="text-sm font-medium text-brand-navy line-clamp-1">
          {approved
            ? "You approved"
            : denied
              ? "You denied"
              : "Requested"}{" "}
          {event.bookTitle}
        </p>
        <p className="text-xs text-ink-400">
          {event.author ? `${event.author}` : ""}
          {denied && event.denyReason ? ` · "${event.denyReason}"` : ""}
          {event.status === "pending" ? " · awaiting your review" : ""}
        </p>
      </Row>
    );
  }

  if (event.type === "bible") {
    return (
      <Row
        icon={<BookMarked className="h-4 w-4" />}
        iconBg="bg-indigo-100 text-indigo-600"
        at={at}
      >
        <p className="text-sm font-medium text-brand-navy line-clamp-1">
          Read {event.bookName} {event.chapter}
        </p>
        <p className="text-xs text-ink-400">Bible · {event.translation}</p>
      </Row>
    );
  }

  if (event.type === "verse") {
    return (
      <Row
        icon={<Sparkles className="h-4 w-4" />}
        iconBg="bg-amber-100 text-amber-600"
        at={at}
      >
        <p className="text-sm font-medium text-brand-navy line-clamp-1">
          Saved {event.bookName} {event.chapter}:{event.verse}
        </p>
        <p className="text-xs text-ink-500 line-clamp-2">
          &ldquo;{event.verseText}&rdquo;
        </p>
      </Row>
    );
  }

  return null;
}

function Row({
  icon,
  iconBg,
  cover,
  at,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  cover?: string;
  at: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-cream-2 bg-white px-3 py-2.5">
      {cover ? (
        <div className="relative h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-brand-cream-2">
          <Image
            src={cover}
            alt=""
            fill
            sizes="36px"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${iconBg}`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">{children}</div>
      <span className="flex-shrink-0 text-[10px] text-ink-300">{timeAgo(at)}</span>
    </div>
  );
}
