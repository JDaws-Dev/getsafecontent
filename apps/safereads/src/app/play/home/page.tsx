"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { KidBookshelf } from "@/components/kid/KidBookshelf";
import { BookCard } from "@/components/kid/BookCard";
import { BookOpen, Search, Trophy, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";

interface KidProfile {
  _id: string;
  name: string;
  age?: number;
  color: string;
}

const COLOR_MAP: Record<string, string> = {
  red: "from-red-400 to-red-500",
  blue: "from-blue-400 to-blue-500",
  green: "from-green-400 to-green-500",
  purple: "from-purple-400 to-purple-500",
  orange: "from-orange-400 to-orange-500",
  pink: "from-pink-400 to-pink-500",
  teal: "from-teal-400 to-teal-500",
  yellow: "from-yellow-400 to-yellow-500",
};

export default function KidHomePage() {
  const router = useRouter();
  const [kidProfile, setKidProfile] = useState<KidProfile | null>(null);

  useEffect(() => {
    const profileData = localStorage.getItem("safereads_kid_profile");
    if (!profileData) {
      router.replace("/play");
      return;
    }
    try {
      setKidProfile(JSON.parse(profileData));
    } catch {
      router.replace("/play");
    }
  }, [router]);

  const kidId = kidProfile?._id as Id<"kids"> | undefined;

  // Fetch kid's data
  const approvedBooks = useQuery(
    api.approvedBooks.listForKid,
    kidId ? { kidId } : "skip"
  );
  const readingProgress = useQuery(
    api.readingProgress.getForKid,
    kidId ? { kidId } : "skip"
  );
  const currentlyReading = useQuery(
    api.readingProgress.getCurrentlyReading,
    kidId ? { kidId } : "skip"
  );
  const stats = useQuery(
    api.readingProgress.getStats,
    kidId ? { kidId } : "skip"
  );
  const pendingRequests = useQuery(
    api.bookRequests.listByKid,
    kidId ? { kidId } : "skip"
  );

  if (!kidProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  const gradientClass = COLOR_MAP[kidProfile.color] || COLOR_MAP.purple;
  const pendingCount = pendingRequests?.filter((r) => r.status === "pending").length || 0;

  // Match currently reading books with their approved book data
  const currentlyReadingBooks = (currentlyReading || [])
    .map((progress) => {
      const book = (approvedBooks || []).find(
        (b) => b.googleBookId === progress.googleBookId
      );
      return book ? { ...book, progress: progress.percentComplete } : null;
    })
    .filter(Boolean) as Array<{
      _id: string;
      googleBookId: string;
      title: string;
      author: string;
      coverUrl?: string;
      progress: number;
    }>;

  return (
    <div className="py-6">
      {/* Welcome Header */}
      <div className={`rounded-2xl bg-gradient-to-r ${gradientClass} p-5 text-white shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
            {kidProfile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">
              Hey, {kidProfile.name}!
            </h1>
            <p className="text-sm text-white/80">
              What do you want to read today?
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (stats.totalBooks > 0 || stats.finishedBooks > 0) && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center rounded-xl bg-white p-3 shadow-sm">
            <BookOpen className="h-5 w-5 text-emerald-500" />
            <span className="mt-1 text-lg font-bold text-gray-800">
              {stats.currentlyReading}
            </span>
            <span className="text-[10px] text-gray-400">Reading</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-white p-3 shadow-sm">
            <Trophy className="h-5 w-5 text-amber-500" />
            <span className="mt-1 text-lg font-bold text-gray-800">
              {stats.finishedBooks}
            </span>
            <span className="text-[10px] text-gray-400">Finished</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-white p-3 shadow-sm">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <span className="mt-1 text-lg font-bold text-gray-800">
              {stats.totalPages}
            </span>
            <span className="text-[10px] text-gray-400">Pages</span>
          </div>
        </div>
      )}

      {/* Currently Reading */}
      {currentlyReadingBooks.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-bold text-gray-800">
            Keep Reading
          </h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {currentlyReadingBooks.map((book) => (
              <BookCard
                key={book._id}
                title={book.title}
                author={book.author}
                coverUrl={book.coverUrl}
                progress={book.progress}
                onClick={() =>
                  router.push(`/play/read/${book.googleBookId}`)
                }
                size="lg"
              />
            ))}
          </div>
        </section>
      )}

      {/* Pending Requests */}
      {pendingCount > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            You have {pendingCount} book{pendingCount > 1 ? "s" : ""} waiting for parent approval
          </p>
        </div>
      )}

      {/* My Bookshelf */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">My Bookshelf</h2>
          <Link
            href="/play/search"
            className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            <Search className="h-3.5 w-3.5" />
            Find Books
          </Link>
        </div>
        <div className="mt-3">
          {approvedBooks === undefined ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 w-full animate-pulse rounded-lg bg-gray-200"
                />
              ))}
            </div>
          ) : (
            <KidBookshelf
              books={approvedBooks}
              progress={readingProgress || []}
              onBookClick={(book) =>
                router.push(`/play/read/${book.googleBookId}`)
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
