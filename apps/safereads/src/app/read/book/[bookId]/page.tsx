"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ArrowLeft, BookOpen, Clock, BookMarked, ExternalLink, ShieldAlert, ShieldCheck, Loader2, Sparkles, Headphones, Send, CheckCircle2 } from "lucide-react";
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
  const [kidAge, setKidAge] = useState<number | undefined>(undefined);
  const [parentUserId, setParentUserId] = useState<Id<"users"> | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [bookMeta, setBookMeta] = useState<{ title: string; author: string; coverUrl?: string } | null>(null);
  const [audioMatch, setAudioMatch] = useState<{
    rssUrl?: string;
    audioUrl?: string;
    totalTime?: string;
    coverUrl?: string;
  } | null>(null);
  const [audioChapters, setAudioChapters] = useState<Array<{ title: string; url: string; duration?: string }>>([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const updateProgress = useMutation(api.readingProgress.update);
  const createBookRequest = useMutation(api.bookRequests.create);
  const addToShelf = useMutation(api.approvedBooks.addForKid);
  const [addedToShelf, setAddedToShelf] = useState(false);
  const findAudioMatch = useAction(api.librivox.findAudioMatch);
  const getLibriVoxChapters = useAction(api.librivox.getLibriVoxChapters);

  useEffect(() => {
    const profileData = localStorage.getItem("safereads_kid_profile");
    if (!profileData) {
      router.replace("/read");
      return;
    }
    try {
      const profile = JSON.parse(profileData);
      setKidId(profile._id as Id<"kids">);
      setKidAge(profile.age);
      if (profile.userId) setParentUserId(profile.userId as Id<"users">);
      // Read book metadata stored by Library page for request flow
      try {
        const meta = localStorage.getItem("safereads_book_meta");
        if (meta) setBookMeta(JSON.parse(meta));
      } catch { /* ignore */ }
    } catch {
      router.replace("/read");
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

  // Get pre-approved books list for this kid (to check exclusions and age filtering)
  const preApprovedBooks = useQuery(
    api.preApprovedBooks.getPreApprovedBooks,
    kidId ? { kidId, age: kidAge } : "skip"
  );

  // Check if kid already has a pending request for this book
  const requestStatus = useQuery(
    api.bookRequests.getRequestStatus,
    kidId ? { kidId, googleBookId: bookId } : "skip"
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-200 border-t-accent-600" />
      </div>
    );
  }

  if (!effectiveBook) {
    // Book is not on their shelf and not pre-approved -- show request flow
    const alreadyRequested = requestSent || requestStatus?.status === "pending";
    const wasDenied = requestStatus?.status === "denied";
    const metaTitle = bookMeta?.title || "This Book";
    const metaAuthor = bookMeta?.author || "";
    const metaCover = bookMeta?.coverUrl;

    // Extract gutenberg ID for the request
    const gutenbergIdForRequest = bookId.startsWith("gutenberg:")
      ? bookId.replace("gutenberg:", "")
      : undefined;

    const handleRequestBook = async () => {
      if (!kidId || requestLoading) return;
      setRequestLoading(true);
      try {
        await createBookRequest({
          kidId,
          googleBookId: bookId,
          title: metaTitle,
          author: metaAuthor,
          coverUrl: metaCover,
          gutenbergId: gutenbergIdForRequest,
          isFreeBook: bookId.startsWith("gutenberg:"),
        });
        setRequestSent(true);
      } catch (err) {
        console.error("Failed to request book:", err);
      } finally {
        setRequestLoading(false);
      }
    };

    // If we have no metadata at all, show a minimal fallback
    if (!bookMeta && !bookId.startsWith("gutenberg:")) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <div className="animate-float flex h-20 w-20 items-center justify-center rounded-full bg-accent-50">
            <BookOpen className="h-10 w-10 text-accent-300" />
          </div>
          <p className="mt-5 text-xl font-bold text-gray-700">
            Book not found
          </p>
          <p className="mt-2 text-sm text-gray-500">
            This book may not be on your shelf yet.
          </p>
          <Link
            href="/read/home"
            className="kid-touch mt-5 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-accent-200"
          >
            Back to Bookshelf
          </Link>
        </div>
      );
    }

    return (
      <div className="reading-cozy py-6">
        {/* Back */}
        <Link
          href="/read/library"
          className="kid-touch mb-5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-sm transition-all hover:shadow-md active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>

        {/* Book Header */}
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="relative h-52 w-36 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 shadow-xl ring-1 ring-black/5">
            {metaCover ? (
              <Image
                src={metaCover}
                alt={metaTitle}
                fill
                sizes="144px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-accent-50 to-accent-100 p-3">
                <BookOpen className="h-8 w-8 text-accent-300" />
                <p className="text-center text-xs font-medium text-accent-600">
                  {metaTitle}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center text-center sm:text-left">
            <h1 className="font-display text-xl font-bold leading-tight text-brand-navy sm:text-2xl">{metaTitle}</h1>
            {metaAuthor && <p className="mt-1.5 text-sm font-medium text-gray-400">{metaAuthor}</p>}
          </div>
        </div>

        {/* Request Flow */}
        <div className="mt-8">
          {alreadyRequested ? (
            <div className="flex flex-col items-center rounded-3xl bg-gradient-to-b from-amber-50 to-orange-50 p-8 text-center ring-1 ring-amber-200">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <CheckCircle2 className="h-8 w-8 text-amber-500" />
              </div>
              <p className="mt-4 text-lg font-bold text-gray-800">
                Requested!
              </p>
              <p className="mt-2 max-w-xs text-sm text-gray-500">
                Your parent will review this book soon. Check back later!
              </p>
              <Link
                href="/read/library"
                className="kid-touch mt-5 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-accent-200 transition-all active:scale-95"
              >
                Browse More Books
              </Link>
            </div>
          ) : wasDenied ? (
            <div className="flex flex-col items-center rounded-3xl bg-gradient-to-b from-gray-50 to-gray-100 p-8 text-center ring-1 ring-gray-200">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <ShieldAlert className="h-8 w-8 text-gray-400" />
              </div>
              <p className="mt-4 text-lg font-bold text-gray-700">
                Not Available
              </p>
              <p className="mt-2 max-w-xs text-sm text-gray-500">
                Your parent reviewed this book and decided it&apos;s not right for you yet.
                {requestStatus?.denyReason && (
                  <span className="mt-1 block text-xs italic text-gray-400">
                    &quot;{requestStatus.denyReason}&quot;
                  </span>
                )}
              </p>
              <Link
                href="/read/library"
                className="kid-touch mt-5 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-accent-200 transition-all active:scale-95"
              >
                Browse More Books
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-3xl bg-gradient-to-b from-accent-50 to-accent-50 p-8 text-center ring-1 ring-accent-100">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
                <Send className="h-8 w-8 text-accent-500" />
              </div>
              <p className="mt-4 text-lg font-bold text-gray-800">
                Want to read this book?
              </p>
              <p className="mt-2 max-w-xs text-sm text-gray-500">
                Ask your parent to add it to your bookshelf. They&apos;ll review it first.
              </p>
              <button
                onClick={handleRequestBook}
                disabled={requestLoading}
                className="kid-touch mt-5 flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent-200 transition-all hover:shadow-xl active:scale-95 disabled:opacity-60"
              >
                {requestLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {requestLoading ? "Sending..." : "Ask Parent to Approve"}
              </button>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>
    );
  }

  // Content safety gate for non-pre-approved free books
  const isFreeNonPreApproved = effectiveBook.isFreeBook && !isPreApproved;
  if (isFreeNonPreApproved && analysis === undefined) {
    // Still loading analysis status
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-50">
          <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
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
          href="/read/home"
          className="kid-touch mt-5 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-accent-200"
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
        href="/read/home"
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
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-accent-50 to-accent-100 p-3">
              <BookOpen className="h-8 w-8 text-accent-300" />
              <p className="text-center text-xs font-medium text-accent-600">
                {effectiveBook.title}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center text-center sm:text-left">
          <h1 className="font-display text-xl font-bold leading-tight text-brand-navy sm:text-2xl">{effectiveBook.title}</h1>
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
              className="kid-touch w-full rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 py-5 text-center text-lg font-bold text-white shadow-lg shadow-accent-200 transition-all hover:from-accent-600 hover:to-accent-700 hover:shadow-xl active:scale-[0.98]"
            >
              {currentPercent > 0 && currentPercent < 100
                ? "Continue Reading"
                : currentPercent >= 100
                  ? "Read Again"
                  : "Start Reading"}
            </button>

            {/* Add to My Books — for pre-approved books not yet on kid's shelf */}
            {!book && preApprovedBook && kidId && parentUserId && !addedToShelf && (
              <button
                onClick={async () => {
                  if (!kidId || !effectiveBook || !parentUserId) return;
                  try {
                    await addToShelf({
                      userId: parentUserId,
                      kidId,
                      googleBookId: bookId,
                      title: effectiveBook.title,
                      author: effectiveBook.author,
                      coverUrl: effectiveBook.coverUrl,
                      gutenbergId: effectiveBook.gutenbergId,
                      isFreeBook: true,
                      addedBy: "pre_approved",
                    });
                    setAddedToShelf(true);
                  } catch (err) {
                    console.error("Failed to add to shelf:", err);
                  }
                }}
                className="kid-touch flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 py-4 text-base font-bold text-emerald-700 shadow-sm ring-1 ring-emerald-200 transition-all hover:shadow-md active:scale-[0.98]"
              >
                <BookMarked className="h-5 w-5" />
                Add to My Books
              </button>
            )}
            {addedToShelf && (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-4 text-base font-bold text-emerald-600 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-5 w-5" />
                Added to My Books!
              </div>
            )}

            {/* Listen button — shown when LibriVox audio is available */}
            {audioMatch && !isListening && (
              <button
                onClick={handleListenClick}
                disabled={audioLoading}
                className="kid-touch flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent-100 to-accent-100 py-4 text-base font-bold text-accent-700 shadow-sm ring-1 ring-accent-200 transition-all hover:shadow-md active:scale-[0.98]"
              >
                {audioLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Headphones className="h-5 w-5" />
                )}
                {audioLoading ? "Loading Audio..." : "Listen to Audiobook"}
                {audioMatch.totalTime && (
                  <span className="ml-1 text-sm font-medium text-accent-400">
                    ({audioMatch.totalTime})
                  </span>
                )}
              </button>
            )}
          </div>
        ) : (
          /* Non-free book - external links */
          <div className="rounded-3xl bg-gradient-to-b from-accent-50 to-accent-50 p-6 text-center ring-1 ring-accent-100">
            <BookMarked className="mx-auto h-10 w-10 text-accent-300" />
            <h3 className="mt-3 font-display text-lg font-bold text-brand-navy">
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
                className="kid-touch inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-blue-400 to-accent-500 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Find at Library
              </a>
              {/* Listen button for non-free books with available audio */}
              {audioMatch && !isListening && (
                <button
                  onClick={handleListenClick}
                  disabled={audioLoading}
                  className="kid-touch inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-accent-400 to-accent-500 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
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

      {/* Progress Tracker — only show when there's actual reading progress */}
      {currentPercent > 0 && (
        <div className="mt-7 rounded-2xl bg-white p-5 shadow-md ring-1 ring-black/5">
          <h3 className="font-display text-base font-bold text-brand-navy">Track Your Progress</h3>
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
                      ? "bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-md"
                      : "bg-gray-50 text-gray-500 ring-1 ring-gray-200 hover:bg-accent-50 hover:text-accent-600"
                  }`}
                >
                  {percent === 100 ? "Done!" : `${percent}%`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
