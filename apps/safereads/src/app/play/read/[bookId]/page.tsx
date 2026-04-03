"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ArrowLeft, BookOpen, Clock, BookMarked } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function KidReadPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;
  const [kidId, setKidId] = useState<Id<"kids"> | null>(null);
  const updateProgress = useMutation(api.readingProgress.update);

  useEffect(() => {
    const profileData = localStorage.getItem("safereads_kid_profile");
    if (!profileData) {
      router.replace("/play");
      return;
    }
    try {
      const profile = JSON.parse(profileData);
      setKidId(profile._id as Id<"kids">);
    } catch {
      router.replace("/play");
    }
  }, [router]);

  // Get the approved book info
  const approvedBooks = useQuery(
    api.approvedBooks.listForKid,
    kidId ? { kidId } : "skip"
  );
  const progress = useQuery(
    api.readingProgress.getForBook,
    kidId && bookId ? { kidId, googleBookId: bookId } : "skip"
  );

  const book = approvedBooks?.find((b) => b.googleBookId === bookId);

  const handleStartReading = async () => {
    if (!kidId) return;
    await updateProgress({
      kidId,
      googleBookId: bookId,
      percentComplete: progress ? progress.percentComplete : 1,
    });
  };

  const handleUpdateProgress = async (percent: number) => {
    if (!kidId) return;
    await updateProgress({
      kidId,
      googleBookId: bookId,
      percentComplete: percent,
      finished: percent >= 100,
    });
  };

  if (!kidId || approvedBooks === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <BookOpen className="h-12 w-12 text-gray-300" />
        <p className="mt-4 text-base font-semibold text-gray-700">
          Book not found on your shelf
        </p>
        <p className="mt-1 text-sm text-gray-500">
          This book may not be approved yet.
        </p>
        <Link
          href="/play/home"
          className="mt-4 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Back to Bookshelf
        </Link>
      </div>
    );
  }

  const currentPercent = progress?.percentComplete || 0;

  return (
    <div className="py-6">
      {/* Back */}
      <Link
        href="/play/home"
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Book Header */}
      <div className="flex gap-4">
        <div className="h-48 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-md">
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={book.title}
              width={128}
              height={192}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-50 to-emerald-100 p-3">
              <BookOpen className="h-8 w-8 text-emerald-300" />
              <p className="text-center text-xs text-emerald-600">
                {book.title}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <h1 className="text-xl font-bold text-gray-900">{book.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{book.author}</p>

          {/* Progress */}
          {currentPercent > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                {currentPercent >= 100 ? "Finished!" : `${currentPercent}% complete`}
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(currentPercent, 100)}%` }}
                />
              </div>
            </div>
          )}

          {progress?.startedAt && (
            <p className="mt-2 text-[10px] text-gray-400">
              Started {new Date(progress.startedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Reader Placeholder */}
      <div className="mt-8 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
        <BookMarked className="mx-auto h-12 w-12 text-emerald-300" />
        <h3 className="mt-3 text-lg font-bold text-emerald-800">
          Coming Soon: Read in App
        </h3>
        <p className="mt-2 max-w-sm mx-auto text-sm text-emerald-600">
          Soon you&apos;ll be able to read books right here! For now, grab the physical book or use your e-reader.
        </p>
      </div>

      {/* Progress Tracker */}
      <div className="mt-6">
        <h3 className="text-sm font-bold text-gray-700">Track Your Progress</h3>
        {currentPercent === 0 ? (
          <button
            onClick={handleStartReading}
            className="mt-3 w-full rounded-xl bg-emerald-500 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
          >
            Start Reading This Book
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500">
              How far along are you?
            </p>
            <div className="flex gap-2">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => handleUpdateProgress(percent)}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                    currentPercent >= percent
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-gray-600 shadow-sm hover:bg-emerald-50"
                  }`}
                >
                  {percent === 100 ? "Done!" : `${percent}%`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
