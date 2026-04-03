"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  X,
  BookOpen,
  ArrowLeft,
  Loader2,
  Clock,
  AlertCircle,
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

export default function RequestsPage() {
  const { user: authUser } = useAuth();
  const currentUser = useQuery(
    api.users.currentUser,
    authUser?.email ? { email: authUser.email } : "skip"
  );
  const userId = currentUser?._id;

  const pendingRequests = useQuery(
    api.bookRequests.listPendingByUser,
    userId ? { userId } : "skip"
  );
  const allRequests = useQuery(
    api.bookRequests.listByUser,
    userId ? { userId } : "skip"
  );

  const approveRequest = useMutation(api.bookRequests.approve);
  const denyRequest = useMutation(api.bookRequests.deny);

  const [processing, setProcessing] = useState<string | null>(null);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await approveRequest({
        requestId: requestId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    } catch (err) {
      console.error("Failed to approve:", err);
    } finally {
      setProcessing(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await denyRequest({
        requestId: requestId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        denyReason: denyReason || undefined,
      });
      setDenyingId(null);
      setDenyReason("");
    } catch (err) {
      console.error("Failed to deny:", err);
    } finally {
      setProcessing(null);
    }
  };

  const recentHistory = (allRequests || [])
    .filter((r) => r.status !== "pending")
    .sort((a, b) => (b.respondedAt || 0) - (a.respondedAt || 0))
    .slice(0, 10);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-parchment-100 hover:text-ink-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink-900">
            Book Requests
          </h1>
          <p className="text-sm text-ink-500">
            Review books your kids want to read
          </p>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests === undefined ? (
        <div className="py-12 text-center text-ink-500">Loading...</div>
      ) : pendingRequests.length === 0 ? (
        <div className="rounded-lg border border-parchment-200 bg-white p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-parchment-300" />
          <p className="mt-3 text-sm text-ink-500">
            No pending requests. When your kids find books they want to read, their requests will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((request) => {
            const colorClass = COLOR_MAP[request.kidColor || "purple"] || COLOR_MAP.purple;
            const isProcessing = processing === request._id;
            const isDenying = denyingId === request._id;

            return (
              <div
                key={request._id}
                className="rounded-xl border border-parchment-200 bg-white p-4"
              >
                <div className="flex gap-3">
                  {/* Cover */}
                  <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-parchment-100">
                    {request.coverUrl ? (
                      <Image
                        src={request.coverUrl}
                        alt={request.title}
                        width={56}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="h-5 w-5 text-parchment-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="text-sm font-semibold text-ink-900 line-clamp-1">
                      {request.title}
                    </h3>
                    <p className="text-xs text-ink-500">{request.author}</p>

                    {/* Kid info */}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${colorClass} text-[10px] font-bold text-white`}
                      >
                        {request.kidName.charAt(0)}
                      </div>
                      <span className="text-xs text-ink-400">
                        {request.kidName} wants this book
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[10px] text-ink-300">
                      <Clock className="h-3 w-3" />
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {isDenying ? (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      placeholder="Reason (optional, kid will see this)"
                      className="w-full rounded-lg border border-parchment-300 bg-white px-3 py-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-parchment-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDenyingId(null);
                          setDenyReason("");
                        }}
                        className="flex-1 rounded-lg border border-parchment-200 py-2 text-xs font-medium text-ink-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeny(request._id)}
                        disabled={isProcessing}
                        className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {isProcessing ? "Denying..." : "Deny Request"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/dashboard/search?q=${encodeURIComponent(request.title)}`}
                      className="flex items-center gap-1 rounded-lg border border-parchment-200 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:bg-parchment-50"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      Review
                    </Link>
                    <button
                      onClick={() => setDenyingId(request._id)}
                      disabled={isProcessing}
                      className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Deny
                    </button>
                    <button
                      onClick={() => handleApprove(request._id)}
                      disabled={isProcessing}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recent History */}
      {recentHistory.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-bold text-ink-900">
            Recent Decisions
          </h2>
          <div className="mt-3 space-y-2">
            {recentHistory.map((request) => (
              <div
                key={request._id}
                className="flex items-center gap-3 rounded-lg border border-parchment-100 bg-white px-3 py-2.5"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    request.status === "approved"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-red-100 text-red-500"
                  }`}
                >
                  {request.status === "approved" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-ink-800 truncate">
                    {request.title}
                  </p>
                  <p className="text-[10px] text-ink-400">
                    {request.kidName} &middot;{" "}
                    {request.respondedAt
                      ? new Date(request.respondedAt).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
