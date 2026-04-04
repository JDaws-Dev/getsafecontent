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

  const getChapters = useAction(api.librivox.getLibriVoxChapters);

  // Load book metadata from localStorage (set by the home page before navigating)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("safereads_listen_book");
      if (stored) {
        const meta = JSON.parse(stored);
        setBookMeta(meta);
      }
    } catch {
      // Ignore
    }
  }, []);

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
        const result = await getChapters({ rssUrl: bookMeta!.rssUrl! });
        if (cancelled) return;
        if (result.chapters && result.chapters.length > 0) {
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
  }, [bookMeta, getChapters]);

  // Check kid session
  useEffect(() => {
    const profileData = localStorage.getItem("safereads_kid_profile");
    if (!profileData) {
      router.replace("/read");
    }
  }, [router]);

  if (!bookMeta) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="animate-float flex h-20 w-20 items-center justify-center rounded-full bg-violet-50">
          <Headphones className="h-10 w-10 text-violet-300" />
        </div>
        <p className="mt-5 text-xl font-bold text-gray-700">Audiobook not found</p>
        <p className="mt-2 text-sm text-gray-500">
          Try finding the audiobook from the home page.
        </p>
        <Link
          href="/read/home"
          className="kid-touch mt-5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200"
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
        <div className="relative h-52 w-36 flex-shrink-0 overflow-hidden rounded-2xl bg-violet-50 shadow-xl ring-1 ring-violet-200">
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
          <div className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 shadow-md">
            <Headphones className="h-4 w-4 text-white" />
          </div>
        </div>

        <div className="flex flex-col justify-center text-center sm:text-left">
          <h1 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
            {bookMeta.title}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-gray-400">
            {bookMeta.author}
          </p>
          {bookMeta.totalTime && (
            <p className="mt-2 text-xs text-violet-600">
              Total: {bookMeta.totalTime}
            </p>
          )}
          <span className="mx-auto mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-50 to-purple-50 px-3 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-violet-200 sm:mx-0">
            <Headphones className="h-3 w-3" />
            Free Audiobook
          </span>
        </div>
      </div>

      {/* Audio Player */}
      <div className="mt-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-violet-50 py-12 ring-1 ring-violet-200">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            <p className="mt-3 text-sm text-violet-600">Loading audiobook...</p>
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
