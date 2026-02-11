"use client";

import { useState, useEffect } from "react";

interface Subscriber {
  id: string;
  email: string;
  firstName: string | null;
  createdAt: string;
  unsubscribed: boolean;
}

export function NewsletterCard() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscribers() {
      try {
        // Get admin key from cookie or localStorage
        const adminKey = document.cookie
          .split("; ")
          .find((row) => row.startsWith("admin_key="))
          ?.split("=")[1];

        if (!adminKey) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/admin/newsletter?key=${encodeURIComponent(adminKey)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to fetch");
          return;
        }

        setSubscribers(data.subscribers);
        setTotal(data.total);
      } catch (err) {
        setError("Failed to fetch subscribers");
      } finally {
        setLoading(false);
      }
    }

    fetchSubscribers();
  }, []);

  const activeSubscribers = subscribers.filter((s) => !s.unsubscribed);
  const recentSubscribers = [...subscribers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Newsletter Subscribers</h2>
        <a
          href="https://resend.com/audiences"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          Manage in Resend →
        </a>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">{error}</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-indigo-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">{activeSubscribers.length}</p>
                <p className="text-sm text-indigo-600/70">Active Subscribers</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-600">{total}</p>
                <p className="text-sm text-gray-500">Total Signups</p>
              </div>
            </div>

            {/* Recent Subscribers */}
            {recentSubscribers.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Recent Signups</p>
                <div className="space-y-2">
                  {recentSubscribers.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {sub.firstName || "—"}{" "}
                          <span className="text-gray-500 font-normal">{sub.email}</span>
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {subscribers.length === 0 && (
              <p className="text-center text-gray-500 py-4">No subscribers yet</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
