"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  ChevronDown,
  ChevronUp,
  Volume2,
  Loader2,
  List,
} from "lucide-react";

interface AudioChapter {
  title: string;
  url: string;
  duration?: string;
}

interface AudioPlayerProps {
  /** Book title shown in the player header */
  title: string;
  /** Author name */
  author?: string;
  /** Cover image URL */
  coverUrl?: string;
  /** Single audio URL (for single-file audiobooks) */
  audioUrl?: string;
  /** Chapter list for multi-chapter audiobooks */
  chapters?: AudioChapter[];
  /** Called when user closes the player */
  onClose?: () => void;
  /** Embedded mode — renders inline, not as a floating bar */
  embedded?: boolean;
  /** Unique key for persisting playback position (defaults to title) */
  persistKey?: string;
}

/** Get the localStorage key for a given book */
function getProgressKey(key: string): string {
  return `safereads_audio_progress:${key.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}

interface SavedProgress {
  chapterIndex: number;
  currentTime: number;
  savedAt: number;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5];

export function AudioPlayer({
  title,
  author,
  coverUrl,
  audioUrl,
  chapters,
  onClose,
  embedded,
  persistKey,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressKey = getProgressKey(persistKey || title);
  const lastSaveRef = useRef(0);
  const restoredRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showChapterList, setShowChapterList] = useState(false);
  const [expanded, setExpanded] = useState(embedded || false);
  const [error, setError] = useState<string | null>(null);

  const hasChapters = chapters && chapters.length > 0;
  const currentChapter = hasChapters ? chapters[currentChapterIndex] : null;
  const activeUrl = currentChapter?.url || audioUrl;

  // Save playback position to localStorage
  const saveProgress = useCallback(() => {
    try {
      const audio = audioRef.current;
      if (!audio || audio.currentTime < 1) return;
      const progress: SavedProgress = {
        chapterIndex: currentChapterIndex,
        currentTime: audio.currentTime,
        savedAt: Date.now(),
      };
      localStorage.setItem(progressKey, JSON.stringify(progress));
    } catch {
      // Ignore storage errors
    }
  }, [progressKey, currentChapterIndex]);

  // Restore playback position on mount
  useEffect(() => {
    if (restoredRef.current) return;
    try {
      const stored = localStorage.getItem(progressKey);
      if (stored) {
        const progress: SavedProgress = JSON.parse(stored);
        // Only restore if saved within last 30 days
        if (Date.now() - progress.savedAt < 30 * 24 * 60 * 60 * 1000) {
          if (hasChapters && progress.chapterIndex > 0 && progress.chapterIndex < (chapters?.length || 0)) {
            setCurrentChapterIndex(progress.chapterIndex);
          }
          // Time will be restored after audio loads (see onLoadedMetadata)
          restoredRef.current = true;
        }
      }
    } catch {
      // Ignore
    }
  }, [progressKey, hasChapters, chapters?.length]);

  // Save progress every 10 seconds during playback
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => saveProgress(), 10000);
    return () => clearInterval(interval);
  }, [isPlaying, saveProgress]);

  // Save progress on unmount
  useEffect(() => {
    return () => { saveProgress(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load audio source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeUrl) return;

    setIsLoading(true);
    setError(null);
    audio.src = activeUrl;
    audio.playbackRate = playbackRate;
    audio.load();
  }, [activeUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
      // Restore saved position
      if (restoredRef.current) {
        try {
          const stored = localStorage.getItem(progressKey);
          if (stored) {
            const progress: SavedProgress = JSON.parse(stored);
            if (progress.chapterIndex === currentChapterIndex && progress.currentTime > 1) {
              audio.currentTime = progress.currentTime;
            }
          }
        } catch { /* ignore */ }
        restoredRef.current = false; // Only restore once
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      // Auto-advance to next chapter
      if (hasChapters && currentChapterIndex < chapters.length - 1) {
        setCurrentChapterIndex((prev) => prev + 1);
        setIsPlaying(true);
      }
    };

    const onError = () => {
      setIsLoading(false);
      setError("Could not load audio. Try another chapter.");
    };

    const onCanPlay = () => {
      setIsLoading(false);
      if (isPlaying) {
        audio.play().catch(() => {});
      }
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("canplay", onCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, [hasChapters, chapters, currentChapterIndex, isPlaying]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !activeUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      saveProgress();
    } else {
      setIsLoading(true);
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
          setError("Playback failed. Tap to try again.");
        });
    }
  }, [isPlaying, activeUrl]);

  const skip = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, duration));
    },
    [duration]
  );

  const seekTo = useCallback(
    (percent: number) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      audio.currentTime = (percent / 100) * duration;
    },
    [duration]
  );

  const cyclePlaybackRate = useCallback(() => {
    const idx = PLAYBACK_RATES.indexOf(playbackRate);
    const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  }, [playbackRate]);

  const goToChapter = useCallback(
    (index: number) => {
      if (!hasChapters || index < 0 || index >= chapters.length) return;
      setCurrentChapterIndex(index);
      setShowChapterList(false);
      setIsPlaying(true);
    },
    [hasChapters, chapters]
  );

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!activeUrl) {
    return null;
  }

  // Compact floating bar (non-expanded, non-embedded)
  if (!expanded && !embedded) {
    return (
      <>
        <audio ref={audioRef} preload="metadata" />
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-violet-200 bg-white/95 px-4 py-3 shadow-2xl shadow-violet-200/50 backdrop-blur-md">
          {/* Progress bar at top of floating bar */}
          <div className="absolute left-0 right-0 top-0 h-1 bg-violet-100">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Cover thumbnail */}
            {coverUrl && (
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-violet-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt="" className="h-full w-full object-cover" />
              </div>
            )}

            {/* Title + chapter */}
            <button
              onClick={() => setExpanded(true)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-bold text-gray-900">{title}</p>
              {currentChapter && (
                <p className="truncate text-[10px] text-gray-400">
                  {currentChapter.title}
                </p>
              )}
            </button>

            {/* Play/pause */}
            <button
              onClick={togglePlay}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md transition-transform active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="ml-0.5 h-5 w-5" />
              )}
            </button>

            {/* Expand */}
            <button
              onClick={() => setExpanded(true)}
              className="flex h-8 w-8 items-center justify-center text-gray-400"
            >
              <ChevronUp className="h-4 w-4" />
            </button>

            {/* Close */}
            {onClose && (
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center text-gray-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // Expanded player
  const containerClass = embedded
    ? "rounded-2xl bg-white p-5 shadow-md ring-1 ring-black/5"
    : "fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-violet-50 via-white to-violet-50";

  return (
    <>
      <audio ref={audioRef} preload="metadata" />
      <div className={containerClass}>
        {/* Collapse / Close header (full-screen only) */}
        {!embedded && (
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setExpanded(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Now Playing
            </p>
            {onClose ? (
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm"
              >
                <X className="h-5 w-5" />
              </button>
            ) : (
              <div className="h-10 w-10" />
            )}
          </div>
        )}

        {/* Main content area */}
        <div className={`flex flex-1 flex-col items-center justify-center ${embedded ? "" : "px-6"}`}>
          {/* Cover */}
          {coverUrl && !embedded && (
            <div className="mb-6 h-48 w-48 overflow-hidden rounded-2xl bg-violet-100 shadow-xl sm:h-56 sm:w-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
            </div>
          )}

          {/* Title + Author */}
          <h2
            className={`text-center font-bold text-gray-900 ${
              embedded ? "text-base" : "text-xl"
            }`}
          >
            {title}
          </h2>
          {author && (
            <p className="mt-1 text-center text-sm text-gray-400">{author}</p>
          )}
          {currentChapter && (
            <p className="mt-1 text-center text-xs font-medium text-violet-500">
              {currentChapter.title}
            </p>
          )}

          {/* Error message */}
          {error && (
            <p className="mt-3 text-center text-sm text-red-500">{error}</p>
          )}

          {/* Progress bar */}
          <div className={`w-full ${embedded ? "mt-4" : "mt-8"} max-w-md`}>
            <div
              className="relative h-2 w-full cursor-pointer rounded-full bg-violet-100"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = ((e.clientX - rect.left) / rect.width) * 100;
                seekTo(Math.max(0, Math.min(100, pct)));
              }}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-[width] duration-150"
                style={{ width: `${progressPercent}%` }}
              />
              {/* Scrubber thumb */}
              <div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-violet-500 bg-white shadow-sm transition-[left] duration-150"
                style={{ left: `calc(${progressPercent}% - 8px)` }}
              />
            </div>

            {/* Time labels */}
            <div className="mt-1.5 flex justify-between text-[10px] font-medium text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className={`flex items-center justify-center gap-4 ${embedded ? "mt-4" : "mt-6"} sm:gap-6`}>
            {/* Playback rate */}
            <button
              onClick={cyclePlaybackRate}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-600 shadow-sm ring-1 ring-black/5 transition-all active:scale-95"
              title="Playback speed"
            >
              {playbackRate}x
            </button>

            {/* Skip back 15s */}
            <button
              onClick={() => skip(-15)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-black/5 transition-all active:scale-95"
              title="Back 15 seconds"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200 transition-all active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="ml-1 h-7 w-7" />
              )}
            </button>

            {/* Skip forward 15s */}
            <button
              onClick={() => skip(15)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-black/5 transition-all active:scale-95"
              title="Forward 15 seconds"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            {/* Chapter list toggle */}
            {hasChapters && (
              <button
                onClick={() => setShowChapterList(!showChapterList)}
                className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm ring-1 ring-black/5 transition-all active:scale-95 ${
                  showChapterList
                    ? "bg-violet-100 text-violet-600"
                    : "bg-white text-gray-600"
                }`}
                title="Chapters"
              >
                <List className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Volume indicator */}
          <div className="mt-3 flex items-center gap-1.5 text-gray-400">
            <Volume2 className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium">
              {hasChapters
                ? `Chapter ${currentChapterIndex + 1} of ${chapters.length}`
                : "Playing"}
            </span>
          </div>
        </div>

        {/* Chapter List (expandable) */}
        {showChapterList && hasChapters && (
          <div
            className={`${
              embedded
                ? "mt-4 max-h-48"
                : "border-t border-violet-100 bg-white/80 backdrop-blur-sm"
            } overflow-y-auto`}
            style={!embedded ? { maxHeight: "40vh" } : undefined}
          >
            <div className={embedded ? "" : "p-4"}>
              {!embedded && (
                <h3 className="mb-3 text-sm font-bold text-gray-700">
                  Chapters ({chapters.length})
                </h3>
              )}
              <div className="space-y-1">
                {chapters.map((chapter, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToChapter(idx)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                      idx === currentChapterIndex
                        ? "bg-violet-100 text-violet-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        idx === currentChapterIndex
                          ? "bg-violet-500 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {chapter.title}
                      </p>
                      {chapter.duration && (
                        <p className="text-[10px] text-gray-400">
                          {chapter.duration}
                        </p>
                      )}
                    </div>
                    {idx === currentChapterIndex && isPlaying && (
                      <div className="flex gap-0.5">
                        <div className="h-3 w-0.5 animate-pulse rounded-full bg-violet-500" />
                        <div
                          className="h-3 w-0.5 animate-pulse rounded-full bg-violet-500"
                          style={{ animationDelay: "0.15s" }}
                        />
                        <div
                          className="h-3 w-0.5 animate-pulse rounded-full bg-violet-500"
                          style={{ animationDelay: "0.3s" }}
                        />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** Format seconds to mm:ss or hh:mm:ss */
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}
