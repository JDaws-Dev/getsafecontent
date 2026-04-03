"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ArrowLeft, BookOpen, Clock, BookMarked, ExternalLink, ShieldAlert, ShieldCheck, Loader2, Sparkles, Headphones } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BookReader } from "@/components/kid/BookReader";
import { AudioPlayer } from "@/components/kid/AudioPlayer";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function KidReadPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = decodeURIComponent(params.bookId as string);
  const [kidId, setKidId] = useState<Id<"kids"> | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioMatch, setAudioMatch] = useState<{
    rssUrl?: string;
    audioUrl?: string;
    totalTime?: string;
    coverUrl?: string;
  } | null>(null);
  const [audioChapters, setAudioChapters] = useState<Array<{ title: string; url: string; duration?: string }>>([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const updateProgress = useMutation(api.readingProgress.update);
  const findAudioMatch = useAction(api.librivox.findAudioMatch);
  const getLibriVoxChapters = useAction(api.librivox.getLibriVoxChapters);

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

  // Check if this is a pre-approved book
  const isPreApproved = useQuery(
    api.preApprovedBooks.isPreApprovedByGoogleBookId,
    { googleBookId: bookId }
  );

  // Get pre-approved books list for this kid (to check exclusions)
  const preApprovedBooks = useQuery(
    api.preApprovedBooks.getPreApprovedBooks,
    kidId ? { kidId } : "skip"
  );

  // Check for content analysis (for free books that went through request flow)
  const analysis = useQuery(
    api.analyses.getByGoogleBookId,
    { googleBookId: bookId }
  );

  const book = approvedBooks?.find((b) => b.googleBookId === bookId);

  // For pre-approved books, construct a book-like object
  const preApprovedBook = preApprovedBooks?.find((b) => b.googleBookId === bookId);
  const effectiveBook = book || (preApprovedBook ? {
    ...preApprovedBook,
    _id: preApprovedBook.googleBookId,
    _creationTime: 0,
    userId: "" as Id<"users">,
    kidId: kidId!,
    addedAt: Date.now(),
    addedBy: "pre_approved" as const,
  } : null);

  // Check if a LibriVox audiobook is available for this title
  useEffect(() => {
    if (!effectiveBook?.title) return;

    let cancelled = false;
    async function checkAudio() {
      try {
        const match = await findAudioMatch({
          title: effectiveBook!.title,
          author: effectiveBook!.author || undefined,
        });
        if (!cancelled && match) {
          setAudioMatch(match);
        }
      } catch {
        // Audio match is optional, don't fail
      }
    }
    checkAudio();
    return () => { cancelled = true; };
  }, [effectiveBook?.title, effectiveBook?.author, findAudioMatch]);

  // Load chapters when user opens audio player
  const handleListenClick = useCallback(async () => {
    if (!audioMatch?.rssUrl) return;
    setIsListening(true);
    if (audioChapters.length > 0) return; // Already loaded

    setAudioLoading(true);
    try {
      const result = await getLibriVoxChapters({ rssUrl: audioMatch.rssUrl });
      if (result?.chapters) {
        setAudioChapters(result.chapters);
      }
    } catch (err) {
      console.error("Failed to load audio chapters:", err);
    } finally {
      setAudioLoading(false);
    }
  }, [audioMatch?.rssUrl, audioChapters.length, getLibriVoxChapters]);

  const handleStartReading = async () => {
    if (!kidId) return;

    // If it's a free Gutenberg book, open the reader
    if (effectiveBook?.isFreeBook && effectiveBook?.gutenbergId) {
      setIsReading(true);
      return;
    }

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

  if (!kidId || approvedBooks === undefined || isPreApproved === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />
      </div>
    );
  }

  if (!effectiveBook) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="animate-float flex h-20 w-20 items-center justify-center rounded-full bg-purple-50">
          <BookOpen className="h-10 w-10 text-purple-300" />
        </div>
        <p className="mt-5 text-xl font-bold text-gray-700">
          Book not found
        </p>
        <p className="mt-2 text-sm text-gray-500">
          This book may not be on your shelf yet.
        </p>
        <Link
          href="/play/home"
          className="kid-touch mt-5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200"
        >
          Back to Bookshelf
        </Link>
      </div>
    );
  }

  // Content safety gate for non-pre-approved free books
  const isFreeNonPreApproved = effectiveBook.isFreeBook && !isPreApproved;
  if (isFreeNonPreApproved && analysis === undefined) {
    // Still loading analysis status
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
        <p className="mt-4 text-sm font-medium text-gray-500">Checking content review...</p>
      </div>
    );
  }

  if (isFreeNonPreApproved && analysis === null) {
    // No analysis exists -- block reading
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <ShieldAlert className="h-8 w-8 text-amber-400" />
        </div>
        <p className="mt-5 text-lg font-bold text-gray-700">
          This book is being reviewed
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Our AI is analyzing the content. Check back soon!
        </p>
        <Link
          href="/play/home"
          className="kid-touch mt-5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200"
        >
          Back to Bookshelf
        </Link>
      </div>
    );
  }

  // Full-screen reader mode for free books
  if (isReading && effectiveBook.isFreeBook && effectiveBook.gutenbergId && kidId) {
    return (
      <BookReader
        gutenbergId={effectiveBook.gutenbergId}
        bookTitle={effectiveBook.title}
        kidId={kidId}
        googleBookId={bookId}
        onBack={() => setIsReading(false)}
      />
    );
  }

  const currentPercent = progress?.percentComplete || 0;
  const isFreeBook = effectiveBook.isFreeBook && effectiveBook.gutenbergId;

  // Check if parent approved despite a warning verdict
  const approvedDespiteWarning = analysis?.verdict === "warning" && book;

  return (
    <div className="reading-cozy py-6">
      {/* Back */}
      <Link
        href="/play/home"
        className="kid-touch mb-5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-sm transition-all hover:shadow-md active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Book Header */}
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="relative h-52 w-36 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 shadow-xl ring-1 ring-black/5">
          {effectiveBook.coverUrl ? (
            <Image
              src={effectiveBook.coverUrl}
              alt={effectiveBook.title}
              fill
              sizes="144px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-50 to-purple-100 p-3">
              <BookOpen className="h-8 w-8 text-purple-300" />
              <p className="text-center text-xs font-medium text-purple-600">
                {effectiveBook.title}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center text-center sm:text-left">
          <h1 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">{effectiveBook.title}</h1>
          <p className="mt-1.5 text-sm font-medium text-gray-400">{effectiveBook.author}</p>

          {/* Free book badge */}
          {isFreeBook && (
            <span className="mx-auto mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 sm:mx-0">
              <Sparkles className="h-3 w-3" />
              Free to Read
            </span>
          )}

          {/* Progress */}
          {currentPercent > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                {currentPercent >= 100 ? (
                  <span className="text-emerald-600">Finished!</span>
                ) : (
                  `${currentPercent}% complete`
                )}
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="progress-gradient h-full rounded-full transition-all duration-500"
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

      {/* Audio Player (when listening) */}
      {isListening && audioMatch && (
        <div className="mt-6">
          <AudioPlayer
            title={effectiveBook.title}
            author={effectiveBook.author}
            coverUrl={audioMatch.coverUrl || effectiveBook.coverUrl}
            chapters={audioChapters}
            onClose={() => setIsListening(false)}
            embedded
          />
        </div>
      )}

      {/* Read / Action Area */}
      <div className="mt-8">
        {isFreeBook ? (
          /* Free book - read in app */
          <div className="space-y-3">
            <button
              onClick={() => setIsReading(true)}
              className="kid-touch w-full rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-5 text-center text-lg font-bold text-white shadow-lg shadow-purple-200 transition-all hover:from-violet-600 hover:to-purple-700 hover:shadow-xl active:scale-[0.98]"
            >
              {currentPercent > 0 && currentPercent < 100
                ? "Continue Reading"
                : currentPercent >= 100
                  ? "Read Again"
                  : "Start Reading"}
            </button>

            {/* Listen button — shown when LibriVox audio is available */}
            {audioMatch && !isListening && (
              <button
                onClick={handleListenClick}
                disabled={audioLoading}
                className="kid-touch flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-100 to-indigo-100 py-4 text-base font-bold text-violet-700 shadow-sm ring-1 ring-violet-200 transition-all hover:shadow-md active:scale-[0.98]"
              >
                {audioLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Headphones className="h-5 w-5" />
                )}
                {audioLoading ? "Loading Audio..." : "Listen to Audiobook"}
                {audioMatch.totalTime && (
                  <span className="ml-1 text-sm font-medium text-violet-400">
                    ({audioMatch.totalTime})
                  </span>
                )}
              </button>
            )}
          </div>
        ) : (
          /* Non-free book - external links */
          <div className="rounded-3xl bg-gradient-to-b from-violet-50 to-purple-50 p-6 text-center ring-1 ring-purple-100">
            <BookMarked className="mx-auto h-10 w-10 text-purple-300" />
            <h3 className="mt-3 text-lg font-bold text-gray-800">
              Read This Book
            </h3>
            <p className="mt-2 mx-auto max-w-sm text-sm text-gray-500">
              This book is available at your library or online bookstore.
            </p>
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <a
                href={`https://www.amazon.com/s?k=${encodeURIComponent(effectiveBook.title + " " + effectiveBook.author)}&i=digital-text`}
                target="_blank"
                rel="noopener noreferrer"
                className="kid-touch inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Find on Kindle
              </a>
              <a
                href={`https://www.worldcat.org/search?q=${encodeURIComponent(effectiveBook.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="kid-touch inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Find at Library
              </a>
              {/* Listen button for non-free books with available audio */}
              {audioMatch && !isListening && (
                <button
                  onClick={handleListenClick}
                  disabled={audioLoading}
                  className="kid-touch inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
                >
                  {audioLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Headphones className="h-3.5 w-3.5" />
                  )}
                  Listen Free
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Warning notice if parent approved despite concerns */}
      {approvedDespiteWarning && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700">
            Your parent approved this book for you, but noted it has some grown-up content. Talk to them if you have questions about anything you read.
          </p>
        </div>
      )}

      {/* Pre-approved classic badge */}
      {isPreApproved && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
          <p className="text-sm text-emerald-700">
            This is a classic book from our Library Classics collection.
          </p>
        </div>
      )}

      {/* Progress Tracker */}
      <div className="mt-7 rounded-2xl bg-white p-5 shadow-md ring-1 ring-black/5">
        <h3 className="text-base font-bold text-gray-800">Track Your Progress</h3>
        {currentPercent === 0 ? (
          <button
            onClick={handleStartReading}
            className="kid-touch mt-4 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 text-center text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
          >
            {isFreeBook ? "Read This Book" : "Start Reading This Book"}
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-500">
              How far along are you?
            </p>
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => handleUpdateProgress(percent)}
                  className={`kid-touch min-h-[44px] rounded-2xl py-3 text-sm font-bold transition-all duration-200 ${
                    currentPercent >= percent
                      ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md"
                      : "bg-gray-50 text-gray-500 ring-1 ring-gray-200 hover:bg-purple-50 hover:text-purple-600"
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
