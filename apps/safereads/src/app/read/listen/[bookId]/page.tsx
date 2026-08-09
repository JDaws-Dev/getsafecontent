"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ArrowLeft, BookOpen, Headphones, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AudioPlayer } from "@/components/kid/AudioPlayer";
import { StylizedCover } from "@/components/kid/StylizedCover";
import { ReadingTimeUp } from "@/components/kid/ReadingTimeUp";
import { useReadingTime } from "@/hooks/useReadingTime";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface AudioChapter {
  title: string;
  url: string;
  duration?: string;
}

export default function ListenPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = decodeURIComponent(params.bookId as string);

  // Parse the bookId — format is "librivox:{id}" or just the LibriVox ID
  // We also receive title, author, coverUrl, rssUrl as query params
  const [bookMeta, setBookMeta] = useState<{
    title: string;
    author: string;
    coverUrl?: string;
    rssUrl?: string;
    totalTime?: string;
  } | null>(null);

  const [chapters, setChapters] = useState<AudioChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kidId, setKidId] = useState<Id<"kids"> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Listening counts towards the daily limit only while audio is genuinely
  // playing — no interaction required (you don't touch the screen while
  // listening) and it keeps counting in the background, because it's still
  // being consumed.
  const limitStatus = useReadingTime({
    kidId,
    enabled: isPlaying,
    requireInteraction: false,
  });
  const outOfTime = limitStatus?.canRead === false;

  const getChapters = useAction(api.librivox.getLibriVoxChapters);

  const searchLibriVox = useAction(api.librivox.searchLibriVox);

  // Load book metadata from localStorage, or fetch from LibriVox if missing
  useEffect(() => {
    try {
      const stored = localStorage.getItem("safereads_listen_book");
      if (stored) {
        const meta = JSON.parse(stored);
        if (meta.rssUrl) {
          setBookMeta(meta);
          return;
        }
      }
    } catch {
      // Fall through to fetch
    }

    // If no localStorage data or missing rssUrl, try to fetch from LibriVox
    const librivoxId = bookId.replace(/^librivox:/, "");
    async function fetchMeta() {
      try {
        // Search by the ID or a broad query
        const results = await searchLibriVox({ query: librivoxId });
        if (results && results.length > 0) {
          const book = results[0] as { title: string; authors?: string[]; coverUrl?: string; rssUrl?: string; totalTime?: string };
          const meta = {
            title: book.title || "Audiobook",
            author: book.authors?.join(", ") || "Unknown",
            coverUrl: book.coverUrl,
            rssUrl: book.rssUrl,
            totalTime: book.totalTime,
          };
          setBookMeta(meta);
          localStorage.setItem("safereads_listen_book", JSON.stringify(meta));
        }
      } catch {
        // Will show "not found" state
      }
    }
    fetchMeta();
  }, [bookId, searchLibriVox]);

  // Load chapters from RSS feed
  useEffect(() => {
    if (!bookMeta?.rssUrl) {
      // If no RSS URL, we can't load chapters
      if (bookMeta) {
        setError("Unable to load audiobook chapters.");
        setIsLoading(false);
      }
      return;
    }

    let cancelled = false;

    async function loadChapters() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getChapters({
          rssUrl: bookMeta!.rssUrl!,
          kidId: kidId ?? undefined,
        });
        if (cancelled) return;
        if (result.limitReached) {
          // Server withheld the audio — out of daily time. The limit screen
          // below is what the child sees; no error message needed.
          setError(null);
        } else if (result.chapters && result.chapters.length > 0) {
          setChapters(result.chapters);
        } else {
          setError("No chapters found for this audiobook.");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load chapters:", err);
        setError("Failed to load audiobook. Please try again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadChapters();
    return () => { cancelled = true; };
  }, [bookMeta, kidId, getChapters]);

  // Check kid session
  useEffect(() => {
    const profileData = localStorage.getItem("safereads_kid_profile");
    if (!profileData) {
      router.replace("/read");
      return;
    }
    try {
      setKidId(JSON.parse(profileData)._id as Id<"kids">);
    } catch {
      router.replace("/read");
    }
  }, [router]);

  // Out of daily time — the chapters were withheld server-side, so this screen
  // is the whole page rather than a banner over a dead player.
  if (outOfTime) {
    return <ReadingTimeUp status={limitStatus} />;
  }

  if (!bookMeta) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="animate-float flex h-20 w-20 items-center justify-center rounded-full bg-accent-50">
          <Headphones className="h-10 w-10 text-accent-300" />
        </div>
        <p className="mt-5 text-xl font-bold text-gray-700">Audiobook not found</p>
        <p className="mt-2 text-sm text-gray-500">
          Try finding the audiobook from the home page.
        </p>
        <Link
          href="/read/home"
          className="kid-touch mt-5 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-accent-200"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6">
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
        <div className="relative h-52 w-36 flex-shrink-0 overflow-hidden rounded-2xl bg-accent-50 shadow-xl ring-1 ring-accent-200">
          {bookMeta.coverUrl ? (
            <Image
              src={bookMeta.coverUrl}
              alt={bookMeta.title}
              fill
              sizes="144px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <StylizedCover
              title={bookMeta.title}
              author={bookMeta.author}
              size="lg"
            />
          )}
          {/* Headphones badge */}
          <div className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 shadow-md">
            <Headphones className="h-4 w-4 text-white" />
          </div>
        </div>

        <div className="flex flex-col justify-center text-center sm:text-left">
          <h1 className="font-display text-xl font-bold leading-tight text-brand-navy sm:text-2xl">
            {bookMeta.title}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-gray-400">
            {bookMeta.author}
          </p>
          {bookMeta.totalTime && (
            <p className="mt-2 text-xs text-accent-600">
              Total: {bookMeta.totalTime}
            </p>
          )}
          <span className="mx-auto mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-accent-50 to-accent-50 px-3 py-1.5 text-xs font-bold text-accent-700 ring-1 ring-accent-200 sm:mx-0">
            <Headphones className="h-3 w-3" />
            Free Audiobook
          </span>
        </div>
      </div>

      {/* Audio Player */}
      <div className="mt-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-accent-50 py-12 ring-1 ring-accent-200">
            <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
            <p className="mt-3 text-sm text-accent-600">Loading audiobook...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-red-50 py-12 ring-1 ring-red-200">
            <BookOpen className="h-8 w-8 text-red-300" />
            <p className="mt-3 text-sm text-red-600">{error}</p>
          </div>
        ) : (
          <AudioPlayer
            title={bookMeta.title}
            author={bookMeta.author}
            coverUrl={bookMeta.coverUrl}
            chapters={chapters}
            embedded
            onPlayingChange={setIsPlaying}
          />
        )}
      </div>

      {/* Chapter count */}
      {chapters.length > 0 && (
        <p className="mt-4 text-center text-xs text-gray-400">
          {chapters.length} chapter{chapters.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
