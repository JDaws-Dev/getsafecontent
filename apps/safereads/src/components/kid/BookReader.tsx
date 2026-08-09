"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  ArrowLeft,
  Minus,
  Plus,
  Sun,
  Moon,
  Loader2,
  Type,
} from "lucide-react";
import { WordDefinition } from "./WordDefinition";
import { ReadingTimeUp } from "./ReadingTimeUp";
import { useReadingTime } from "@/hooks/useReadingTime";
import type { Id } from "../../../convex/_generated/dataModel";

type ThemeMode = "light" | "dark" | "sepia";

interface BookReaderProps {
  gutenbergId: string;
  bookTitle: string;
  kidId: Id<"kids">;
  googleBookId: string;
  onBack: () => void;
}

const THEME_STYLES: Record<ThemeMode, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  light: {
    bg: "bg-white",
    text: "text-gray-900",
    label: "Light",
    icon: <Sun className="h-4 w-4" />,
  },
  sepia: {
    bg: "bg-[#f4ecd8]",
    text: "text-[#5b4636]",
    label: "Sepia",
    icon: <Type className="h-4 w-4" />,
  },
  dark: {
    bg: "bg-gray-900",
    text: "text-gray-100",
    label: "Dark",
    icon: <Moon className="h-4 w-4" />,
  },
};

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 28;
const DEFAULT_FONT_SIZE = 18;

export function BookReader({
  gutenbergId,
  bookTitle,
  kidId,
  googleBookId,
  onBack,
}: BookReaderProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [showControls, setShowControls] = useState(true);
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    position: { x: number; y: number };
  } | null>(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [showTapHint, setShowTapHint] = useState(() => {
    try {
      return !localStorage.getItem("safereads_tap_hint_seen");
    } catch {
      return true;
    }
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastProgressSave = useRef(0);

  const getBookContent = useAction(api.freeBooks.getFreeBookContent);
  const updateProgress = useMutation(api.readingProgress.update);
  const recordReadingTime = useMutation(api.readingStreaks.recordReadingTime);
  const recordBookFinished = useMutation(api.readingStreaks.recordBookFinished);
  const checkAndAwardBadges = useMutation(api.readingStreaks.checkAndAwardBadges);

  // Track reading time: count seconds the reader is open
  const readingStartTime = useRef(Date.now());
  const lastTimeRecord = useRef(Date.now());
  const hasRecordedFinish = useRef(false);

  // Daily screen-time limit. Accrues active reading seconds (idle time doesn't
  // count) and reports them to the family-wide cross-app limit. `limitStatus`
  // updates live, so a child who runs out mid-chapter is eased out rather than
  // reading on past the cap.
  const limitStatus = useReadingTime({ kidId, enabled: !limitReached });
  const outOfTime = limitReached || limitStatus?.canRead === false;

  // Load saved preferences
  useEffect(() => {
    try {
      const savedFontSize = localStorage.getItem("safereads_reader_fontSize");
      const savedTheme = localStorage.getItem("safereads_reader_theme");
      if (savedFontSize) setFontSize(Number(savedFontSize));
      if (savedTheme) setTheme(savedTheme as ThemeMode);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem("safereads_reader_fontSize", String(fontSize));
      localStorage.setItem("safereads_reader_theme", theme);
    } catch {
      // Ignore
    }
  }, [fontSize, theme]);

  // Auto-dismiss tap hint after 5 seconds
  useEffect(() => {
    if (!showTapHint) return;
    const timer = setTimeout(() => {
      setShowTapHint(false);
      try {
        localStorage.setItem("safereads_tap_hint_seen", "1");
      } catch {
        // Ignore
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [showTapHint]);

  // Reading focus mode: auto-hide chrome after a brief idle window.
  // Any scroll, tap, or mouse move inside the reader re-shows controls
  // and resets the timer. Reveal-on-activity matches Kindle / Apple Books.
  useEffect(() => {
    if (!showControls) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const IDLE_MS = 3000;

    const scheduleHide = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setShowControls(false), IDLE_MS);
    };
    const onActivity = () => {
      scheduleHide();
    };

    scheduleHide();
    scrollEl.addEventListener("scroll", onActivity, { passive: true });
    scrollEl.addEventListener("touchstart", onActivity, { passive: true });
    scrollEl.addEventListener("mousemove", onActivity);

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      scrollEl.removeEventListener("scroll", onActivity);
      scrollEl.removeEventListener("touchstart", onActivity);
      scrollEl.removeEventListener("mousemove", onActivity);
    };
  }, [showControls]);

  // Fetch book content
  useEffect(() => {
    let cancelled = false;

    async function loadContent() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getBookContent({ gutenbergId, kidId });
        if (cancelled) return;
        if (result.limitReached) {
          // The server refused to serve the book — out of daily reading time.
          setLimitReached(true);
        } else if (result.error || !result.content) {
          setError(result.error || "Could not load book content.");
        } else {
          setContent(result.content);
          // Restore scroll position after content renders
          requestAnimationFrame(() => {
            setTimeout(() => {
              try {
                const savedPercent = localStorage.getItem(`safereads_book_scroll:${gutenbergId}`);
                if (savedPercent && scrollRef.current) {
                  const percent = parseFloat(savedPercent);
                  if (percent > 1) {
                    const scrollHeight = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
                    scrollRef.current.scrollTop = (percent / 100) * scrollHeight;
                  }
                }
              } catch { /* ignore */ }
            }, 200); // Small delay for content to fully render
          });
        }
      } catch (err) {
        if (cancelled) return;
        setError("Failed to load book. Please try again.");
        console.error("Failed to load book content:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadContent();
    return () => { cancelled = true; };
  }, [gutenbergId, kidId, getBookContent]);

  // Track reading time — record incremental minutes every 30 seconds
  useEffect(() => {
    readingStartTime.current = Date.now();
    lastTimeRecord.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - lastTimeRecord.current;
      const elapsedMinutes = elapsedMs / (1000 * 60);

      if (elapsedMinutes >= 0.5) {
        // Record the time and check for badges
        recordReadingTime({ kidId, minutesRead: elapsedMinutes }).catch(() => {});
        checkAndAwardBadges({ kidId }).catch(() => {});
        lastTimeRecord.current = now;
      }
    }, 30000); // every 30 seconds

    return () => {
      clearInterval(interval);
      // Record remaining time on unmount
      const now = Date.now();
      const remaining = (now - lastTimeRecord.current) / (1000 * 60);
      if (remaining >= 0.1) {
        recordReadingTime({ kidId, minutesRead: remaining }).catch(() => {});
        checkAndAwardBadges({ kidId }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidId]);

  // Track scroll progress and save periodically
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    const percent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;

    // Update visual progress bar
    setScrollPercent(Math.min(percent, 100));

    // Only save progress every 10 seconds and if percent changed meaningfully
    const now = Date.now();
    if (now - lastProgressSave.current > 10000 && percent > 0) {
      lastProgressSave.current = now;
      // Save scroll position to localStorage for instant restore
      try {
        localStorage.setItem(`safereads_book_scroll:${gutenbergId}`, String(percent));
      } catch { /* ignore */ }
      const isFinished = percent >= 98;
      updateProgress({
        kidId,
        googleBookId,
        percentComplete: Math.min(percent, 100),
        finished: isFinished,
      }).catch(() => {});
      // Record book completion once
      if (isFinished && !hasRecordedFinish.current) {
        hasRecordedFinish.current = true;
        recordBookFinished({ kidId }).catch(() => {});
        checkAndAwardBadges({ kidId }).catch(() => {});
      }
    }
  }, [kidId, googleBookId, updateProgress, recordBookFinished, checkAndAwardBadges]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Save progress when leaving
  useEffect(() => {
    return () => {
      const el = scrollRef.current;
      if (!el) return;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const percent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;
      if (percent > 0) {
        updateProgress({
          kidId,
          googleBookId,
          percentComplete: Math.min(percent, 100),
          finished: percent >= 98,
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tap-to-define: handle text selection / word clicks
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Don't trigger on links or buttons
    if (target.tagName === "A" || target.tagName === "BUTTON") return;

    // Try to get selected text first
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length > 0 && selectedText.length < 30) {
      // Use selected text
      const word = selectedText.split(/\s+/)[0]; // Take first word if multiple selected
      if (word && word.length >= 2) {
        setSelectedWord({
          word,
          position: { x: e.clientX, y: e.clientY },
        });
        return;
      }
    }

    // If no selection, try to figure out which word was clicked
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const node = range.startContainer;

      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const text = node.textContent;
        const offset = range.startOffset;

        // Find word boundaries
        let start = offset;
        let end = offset;

        while (start > 0 && /[a-zA-Z'-]/.test(text[start - 1])) start--;
        while (end < text.length && /[a-zA-Z'-]/.test(text[end])) end++;

        const word = text.slice(start, end).trim();

        if (word && word.length >= 2) {
          setSelectedWord({
            word,
            position: { x: e.clientX, y: e.clientY },
          });
          return;
        }
      }
    }

    // Toggle controls on tap (only if no word was tapped)
    setShowControls((prev) => !prev);
    setSelectedWord(null);
  }, []);

  const changeFontSize = (delta: number) => {
    setFontSize((prev) =>
      Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, prev + delta))
    );
  };

  const cycleTheme = () => {
    const themes: ThemeMode[] = ["light", "sepia", "dark"];
    const idx = themes.indexOf(theme);
    setTheme(themes[(idx + 1) % themes.length]);
  };

  const currentTheme = THEME_STYLES[theme];

  // Out of daily reading time — checked before loading/error so a child who
  // runs out mid-book is taken here rather than left staring at the page.
  if (outOfTime) {
    return <ReadingTimeUp status={limitStatus} onBack={onBack} fullScreen />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="mt-4 text-sm text-gray-500">Loading book...</p>
        <p className="mt-1 text-xs text-gray-400">{bookTitle}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-semibold text-gray-700">{error}</p>
        <p className="mt-2 text-sm text-gray-500">
          This book might not be available for online reading.
        </p>
        <button
          onClick={onBack}
          className="mt-6 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Back to Bookshelf
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col ${currentTheme.bg}`}>
      {/* Reading progress bar — always visible at the very top */}
      <div
        className="h-[3px] w-full flex-shrink-0"
        style={{
          background:
            theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="h-full transition-[width] duration-300 ease-out"
          style={{
            width: `${scrollPercent}%`,
            background:
              theme === "dark"
                ? "#6ee7b7"
                : theme === "sepia"
                  ? "#92400e"
                  : "#10b981",
          }}
        />
      </div>

      {/* Top Controls Bar */}
      {showControls && (
        <div
          className={`flex items-center justify-between border-b px-4 py-3 ${
            theme === "dark"
              ? "border-gray-700 bg-gray-800"
              : theme === "sepia"
                ? "border-[#d4c5a9] bg-[#ece3cc]"
                : "border-gray-200 bg-white"
          }`}
        >
          {/* Back button */}
          <button
            onClick={onBack}
            className={`flex min-h-[44px] min-w-[44px] items-center gap-1.5 text-sm font-medium ${
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Title */}
          <h2
            className={`mx-4 flex-1 truncate text-center font-display text-sm font-semibold ${
              theme === "dark" ? "text-gray-200" : "text-gray-800"
            }`}
          >
            {bookTitle}
          </h2>

          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              theme === "dark"
                ? "bg-gray-700 text-gray-300"
                : theme === "sepia"
                  ? "bg-[#d4c5a9] text-[#5b4636]"
                  : "bg-gray-100 text-gray-600"
            }`}
            title={`Theme: ${currentTheme.label}`}
          >
            {currentTheme.icon}
          </button>
        </div>
      )}

      {/* Book Content */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto ${currentTheme.bg}`}
        onClick={handleContentClick}
      >
        <div
          ref={contentRef}
          className={`book-reader-content mx-auto max-w-[680px] px-4 py-8 sm:px-8 ${currentTheme.text}`}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: "1.8",
            fontFamily: "'Libre Baskerville', 'Georgia', serif",
          }}
          dangerouslySetInnerHTML={{ __html: content || "" }}
        />
      </div>

      {/* Bottom Controls Bar */}
      {showControls && (
        <div
          className={`flex items-center justify-center gap-6 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
            theme === "dark"
              ? "border-gray-700 bg-gray-800"
              : theme === "sepia"
                ? "border-[#d4c5a9] bg-[#ece3cc]"
                : "border-gray-200 bg-white"
          }`}
        >
          {/* Font size controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeFontSize(-2)}
              disabled={fontSize <= MIN_FONT_SIZE}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
                theme === "dark"
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title="Decrease font size"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span
              className={`w-10 text-center text-sm font-bold ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              {fontSize}
            </span>
            <button
              onClick={() => changeFontSize(2)}
              disabled={fontSize >= MAX_FONT_SIZE}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
                theme === "dark"
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title="Increase font size"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Tap hint — fades out after 5s, then hidden permanently */}
          {showTapHint && (
            <span
              className={`text-xs transition-opacity duration-1000 ${
                theme === "dark" ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Tap a word for its definition
            </span>
          )}
        </div>
      )}

      {/* Word Definition Popup */}
      {selectedWord && (
        <WordDefinition
          word={selectedWord.word}
          position={selectedWord.position}
          onClose={() => setSelectedWord(null)}
        />
      )}

      {/* Reader CSS overrides for Gutenberg HTML */}
      <style jsx global>{`
        .book-reader-content img {
          max-width: 100%;
          height: auto;
          margin: 1em auto;
          display: block;
          border-radius: 8px;
        }
        .book-reader-content h1,
        .book-reader-content h2,
        .book-reader-content h3,
        .book-reader-content h4 {
          font-family: 'Libre Baskerville', 'Georgia', serif;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          line-height: 1.3;
        }
        .book-reader-content h1 { font-size: 1.5em; }
        .book-reader-content h2 { font-size: 1.3em; }
        .book-reader-content h3 { font-size: 1.15em; }
        .book-reader-content p {
          margin-bottom: 1em;
          text-indent: 1.5em;
        }
        .book-reader-content p:first-child,
        .book-reader-content h1 + p,
        .book-reader-content h2 + p,
        .book-reader-content h3 + p {
          text-indent: 0;
        }
        .book-reader-content blockquote {
          border-left: 3px solid #10b981;
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
          opacity: 0.9;
        }
        .book-reader-content pre {
          white-space: pre-wrap;
          font-family: inherit;
        }
        .book-reader-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }
        .book-reader-content td,
        .book-reader-content th {
          padding: 0.5em;
          text-align: left;
        }
        .book-reader-content a {
          color: #10b981;
          text-decoration: underline;
          pointer-events: none;
        }
        .book-reader-content hr {
          border: none;
          border-top: 1px solid currentColor;
          opacity: 0.2;
          margin: 2em 0;
        }
        .book-reader-content .chapter,
        .book-reader-content .section {
          margin-top: 3em;
        }
      `}</style>
    </div>
  );
}
