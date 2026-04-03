"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Sun,
  Moon,
  Type,
  GraduationCap,
  X,
  Lightbulb,
  HelpCircle,
  Sparkles,
  Heart,
} from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

// ============================================================================
// Types
// ============================================================================

type ThemeMode = "light" | "dark" | "sepia";

interface BibleBook {
  bookid: number;
  name: string;
  chapters: number;
}

interface BibleVerse {
  verse: number;
  text: string;
}

interface TranslationInfo {
  code: string;
  name: string;
  description: string;
  copyright: string;
}

interface StudyNotes {
  summary: string;
  keyVerses: string[];
  whatItMeans: string;
  forYourLife: string;
  funFact: string;
  questionToThink: string;
}

type ViewState =
  | { view: "books" }
  | { view: "chapters"; book: BibleBook }
  | { view: "reading"; book: BibleBook; chapter: number };

// ============================================================================
// Constants
// ============================================================================

const OT_BOOKS = 39; // Genesis through Malachi

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

// ============================================================================
// Component
// ============================================================================

export default function BiblePage() {
  const router = useRouter();
  const [kidId, setKidId] = useState<Id<"kids"> | null>(null);
  const [translation, setTranslation] = useState("ESV");
  const [viewState, setViewState] = useState<ViewState>({ view: "books" });
  const [books, setBooks] = useState<BibleBook[] | null>(null);
  const [verses, setVerses] = useState<BibleVerse[] | null>(null);
  const [booksLoading, setBooksLoading] = useState(false);
  const [versesLoading, setVersesLoading] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [theme, setTheme] = useState<ThemeMode>("sepia");
  const [showControls, setShowControls] = useState(true);
  const [showStudyNotes, setShowStudyNotes] = useState(false);
  const [studyNotes, setStudyNotes] = useState<StudyNotes | null>(null);
  const [studyNotesLoading, setStudyNotesLoading] = useState(false);
  const [kidAge, setKidAge] = useState<number | undefined>(undefined);

  const scrollRef = useRef<HTMLDivElement>(null);

  const getBooks = useAction(api.bible.getBooks);
  const getChapter = useAction(api.bible.getChapter);
  const getStudyNotes = useAction(api.bible.getStudyNotes);
  const updateProgress = useMutation(api.bible.updateProgress);
  const translations = useQuery(api.bible.getTranslations) as TranslationInfo[] | undefined;
  const saveVerse = useMutation(api.bible.saveVerse);
  const unsaveVerseByRef = useMutation(api.bible.unsaveVerseByRef);
  const bibleProgress = useQuery(
    api.bible.getProgress,
    kidId ? { kidId } : "skip"
  );

  // Get saved verses for current chapter (for highlighting)
  const currentBookId = viewState.view === "reading" ? viewState.book.bookid : 0;
  const currentChapter = viewState.view === "reading" ? viewState.chapter : 0;
  const savedVersesForChapter = useQuery(
    api.bible.getSavedVersesForChapter,
    kidId && viewState.view === "reading"
      ? { kidId, translation, bookId: currentBookId, chapter: currentChapter }
      : "skip"
  ) as Record<number, { color: string; note?: string; _id: string }> | undefined;

  const [selectedVerse, setSelectedVerse] = useState<{ verse: number; text: string } | null>(null);

  // Load kid profile
  useEffect(() => {
    const profileData = localStorage.getItem("safereads_kid_profile");
    if (!profileData) {
      router.replace("/play");
      return;
    }
    try {
      const profile = JSON.parse(profileData);
      setKidId(profile._id as Id<"kids">);
      if (profile.age) setKidAge(profile.age);
    } catch {
      router.replace("/play");
    }
  }, [router]);

  // Load saved preferences
  useEffect(() => {
    try {
      const savedFontSize = localStorage.getItem("safereads_bible_fontSize");
      const savedTheme = localStorage.getItem("safereads_bible_theme");
      const savedTranslation = localStorage.getItem("safereads_bible_translation");
      if (savedFontSize) setFontSize(Number(savedFontSize));
      if (savedTheme) setTheme(savedTheme as ThemeMode);
      if (savedTranslation) setTranslation(savedTranslation);
    } catch { /* ignore */ }
  }, []);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem("safereads_bible_fontSize", String(fontSize));
      localStorage.setItem("safereads_bible_theme", theme);
      localStorage.setItem("safereads_bible_translation", translation);
    } catch { /* ignore */ }
  }, [fontSize, theme, translation]);

  // Load books when translation changes
  useEffect(() => {
    let cancelled = false;
    async function loadBooks() {
      setBooksLoading(true);
      try {
        const result = await getBooks({ translation });
        if (!cancelled) setBooks(result);
      } catch (err) {
        console.error("Failed to load Bible books:", err);
      } finally {
        if (!cancelled) setBooksLoading(false);
      }
    }
    loadBooks();
    return () => { cancelled = true; };
  }, [translation, getBooks]);

  // Load chapter text
  const loadChapter = useCallback(async (book: BibleBook, chapter: number) => {
    setVersesLoading(true);
    setVerses(null);
    setViewState({ view: "reading", book, chapter });
    try {
      const result = await getChapter({
        translation,
        bookId: book.bookid,
        chapter,
      });
      setVerses(result);

      // Track progress
      if (kidId) {
        await updateProgress({
          kidId,
          translation,
          bookId: book.bookid,
          bookName: book.name,
          chapter,
        });
      }
    } catch (err) {
      console.error("Failed to load chapter:", err);
    } finally {
      setVersesLoading(false);
    }
  }, [translation, kidId, getChapter, updateProgress]);

  // Load study notes
  const loadStudyNotes = useCallback(async (book: BibleBook, chapter: number) => {
    setStudyNotesLoading(true);
    try {
      const notes = await getStudyNotes({
        translation,
        bookName: book.name,
        bookId: book.bookid,
        chapter,
        kidAge,
      });
      setStudyNotes(notes);
      setShowStudyNotes(true);
    } catch (err) {
      console.error("Failed to load study notes:", err);
    } finally {
      setStudyNotesLoading(false);
    }
  }, [translation, kidAge, getStudyNotes]);

  // Navigate chapters
  const goToChapter = useCallback((delta: number) => {
    if (viewState.view !== "reading") return;
    const { book, chapter } = viewState;
    const newChapter = chapter + delta;
    if (newChapter < 1 || newChapter > book.chapters) return;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setStudyNotes(null);
    setShowStudyNotes(false);
    loadChapter(book, newChapter);
  }, [viewState, loadChapter]);

  const handleBack = () => {
    if (viewState.view === "reading") {
      setViewState({ view: "chapters", book: viewState.book });
      setVerses(null);
    } else if (viewState.view === "chapters") {
      setViewState({ view: "books" });
    } else {
      router.push("/play/home");
    }
  };

  // Get last read info for continue reading feature
  type BibleProgressEntry = { bookId: number; bookName: string; chapter: number; translation: string; lastReadAt: number };
  const lastRead = (bibleProgress as BibleProgressEntry[] | undefined)?.sort((a: BibleProgressEntry, b: BibleProgressEntry) => b.lastReadAt - a.lastReadAt)[0];

  // ============================================================================
  // Render: Reading View
  // ============================================================================
  if (viewState.view === "reading") {
    const { book, chapter } = viewState;
    const themeStyle = THEME_STYLES[theme];
    const hasPrev = chapter > 1;
    const hasNext = chapter < book.chapters;

    return (
      <div className={`fixed inset-0 z-50 flex flex-col ${themeStyle.bg} ${themeStyle.text}`}>
        {/* Top bar */}
        {showControls && (
          <div className={`flex items-center justify-between border-b px-4 py-3 ${
            theme === "dark" ? "border-gray-700 bg-gray-800" : theme === "sepia" ? "border-amber-200 bg-[#ede4cc]" : "border-gray-200 bg-gray-50"
          }`}>
            <button onClick={handleBack} className="flex items-center gap-1 text-sm font-medium opacity-70 hover:opacity-100">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="text-center">
              <p className="text-xs font-medium opacity-60">{translation}</p>
              <p className="text-sm font-bold">{book.name} {chapter}</p>
            </div>
            <div className="w-12" />
          </div>
        )}

        {/* Reader controls */}
        {showControls && (
          <div className={`flex items-center justify-center gap-4 border-b px-4 py-2 ${
            theme === "dark" ? "border-gray-700 bg-gray-800" : theme === "sepia" ? "border-amber-200 bg-[#ede4cc]" : "border-gray-200 bg-gray-50"
          }`}>
            {/* Font size */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFontSize((s) => Math.max(MIN_FONT_SIZE, s - 2))}
                className="rounded-full p-1.5 opacity-60 hover:opacity-100"
                disabled={fontSize <= MIN_FONT_SIZE}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-medium opacity-60">{fontSize}px</span>
              <button
                onClick={() => setFontSize((s) => Math.min(MAX_FONT_SIZE, s + 2))}
                className="rounded-full p-1.5 opacity-60 hover:opacity-100"
                disabled={fontSize >= MAX_FONT_SIZE}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="h-4 w-px bg-current opacity-20" />

            {/* Theme */}
            <div className="flex items-center gap-1">
              {(Object.keys(THEME_STYLES) as ThemeMode[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-full p-1.5 transition-all ${
                    theme === t ? "scale-110 opacity-100" : "opacity-40 hover:opacity-70"
                  }`}
                >
                  {THEME_STYLES[t].icon}
                </button>
              ))}
            </div>

            {/* Translation quick switch */}
            <div className="h-4 w-px bg-current opacity-20" />
            <select
              value={translation}
              onChange={(e) => {
                setTranslation(e.target.value);
                // Reload current chapter in new translation
                loadChapter(book, chapter);
              }}
              className={`rounded-md border-0 bg-transparent px-1 py-0.5 text-xs font-bold opacity-70 outline-none ${
                theme === "dark" ? "text-gray-100" : theme === "sepia" ? "text-[#5b4636]" : "text-gray-900"
              }`}
            >
              {(translations || []).map((t) => (
                <option key={t.code} value={t.code}>{t.code}</option>
              ))}
            </select>

            {/* Study Notes toggle */}
            <div className="h-4 w-px bg-current opacity-20" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (studyNotes) {
                  setShowStudyNotes((v) => !v);
                } else {
                  loadStudyNotes(book, chapter);
                }
              }}
              disabled={studyNotesLoading}
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold transition-all ${
                showStudyNotes
                  ? "bg-amber-200 text-amber-900"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {studyNotesLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <GraduationCap className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Study</span>
            </button>
          </div>
        )}

        {/* Chapter content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-8"
          onClick={() => setShowControls((v) => !v)}
        >
          <div className="mx-auto max-w-2xl">
            {versesLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin opacity-40" />
              </div>
            ) : verses ? (
              <div
                className="leading-relaxed"
                style={{ fontSize: `${fontSize}px`, fontFamily: "'Libre Baskerville', 'Georgia', serif" }}
              >
                <h2 className="mb-6 text-center font-serif text-xl font-bold opacity-80" style={{ fontSize: `${fontSize + 4}px` }}>
                  {book.name} {chapter}
                </h2>
                {verses.map((v) => {
                  const saved = savedVersesForChapter?.[v.verse];
                  const highlightColors: Record<string, string> = {
                    yellow: theme === "dark" ? "bg-yellow-500/20" : "bg-yellow-100",
                    green: theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-100",
                    blue: theme === "dark" ? "bg-blue-500/20" : "bg-blue-100",
                    pink: theme === "dark" ? "bg-pink-500/20" : "bg-pink-100",
                  };
                  const highlightClass = saved ? highlightColors[saved.color] || highlightColors.yellow : "";

                  return (
                    <span
                      key={v.verse}
                      className={`inline cursor-pointer rounded-sm transition-colors ${highlightClass} ${
                        selectedVerse?.verse === v.verse ? (theme === "dark" ? "ring-1 ring-amber-500" : "ring-1 ring-amber-400") : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVerse(selectedVerse?.verse === v.verse ? null : { verse: v.verse, text: v.text });
                      }}
                    >
                      <sup className="mr-1 text-xs font-bold opacity-30" style={{ fontSize: `${Math.max(10, fontSize - 6)}px` }}>
                        {v.verse}
                      </sup>
                      <span>{v.text} </span>
                      {saved && (
                        <span className="inline-block h-2 w-2 translate-y-[-2px] rounded-full bg-amber-400 opacity-60" />
                      )}
                    </span>
                  );
                })}

                {/* Verse action toolbar */}
                {selectedVerse && viewState.view === "reading" && (
                  <div
                    className={`mt-4 flex items-center gap-2 rounded-xl p-3 ${
                      theme === "dark" ? "bg-gray-800 ring-1 ring-gray-700" : theme === "sepia" ? "bg-[#ede4cc] ring-1 ring-amber-200" : "bg-gray-50 ring-1 ring-gray-200"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="mr-1 text-xs font-bold opacity-50">v{selectedVerse.verse}</span>

                    {/* Save/Unsave */}
                    {savedVersesForChapter?.[selectedVerse.verse] ? (
                      <button
                        onClick={async () => {
                          if (!kidId) return;
                          await unsaveVerseByRef({
                            kidId,
                            translation,
                            bookId: viewState.view === "reading" ? viewState.book.bookid : 0,
                            chapter: viewState.view === "reading" ? viewState.chapter : 0,
                            verse: selectedVerse.verse,
                          });
                          setSelectedVerse(null);
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          theme === "dark" ? "bg-red-900/50 text-red-300" : "bg-red-50 text-red-600"
                        }`}
                      >
                        Unsave
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!kidId || viewState.view !== "reading") return;
                          await saveVerse({
                            kidId,
                            translation,
                            bookName: viewState.book.name,
                            bookId: viewState.book.bookid,
                            chapter: viewState.chapter,
                            verse: selectedVerse.verse,
                            verseText: selectedVerse.text,
                            color: "yellow",
                          });
                          setSelectedVerse(null);
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          theme === "dark" ? "bg-amber-900/50 text-amber-300" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        Save
                      </button>
                    )}

                    {/* Highlight color picker */}
                    {[
                      { color: "yellow", bg: "bg-yellow-300" },
                      { color: "green", bg: "bg-emerald-300" },
                      { color: "blue", bg: "bg-blue-300" },
                      { color: "pink", bg: "bg-pink-300" },
                    ].map((c) => (
                      <button
                        key={c.color}
                        onClick={async () => {
                          if (!kidId || viewState.view !== "reading") return;
                          await saveVerse({
                            kidId,
                            translation,
                            bookName: viewState.book.name,
                            bookId: viewState.book.bookid,
                            chapter: viewState.chapter,
                            verse: selectedVerse.verse,
                            verseText: selectedVerse.text,
                            color: c.color,
                          });
                          setSelectedVerse(null);
                        }}
                        className={`h-6 w-6 rounded-full ${c.bg} ring-1 ring-black/10 transition-transform hover:scale-110 ${
                          savedVersesForChapter?.[selectedVerse.verse]?.color === c.color ? "ring-2 ring-black/30 scale-110" : ""
                        }`}
                        title={`Highlight ${c.color}`}
                      />
                    ))}

                    {/* Close */}
                    <button
                      onClick={() => setSelectedVerse(null)}
                      className="ml-auto rounded-full p-1 opacity-50 hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm opacity-50">Could not load chapter. Tap to retry.</p>
              </div>
            )}
          </div>

          {/* Study Notes Panel */}
          {showStudyNotes && studyNotes && verses && (
            <div className="mx-auto mt-8 max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className={`rounded-2xl ${
                theme === "dark" ? "bg-amber-900/30 ring-1 ring-amber-700/50" : "bg-gradient-to-b from-amber-50 to-orange-50 ring-1 ring-amber-200/60"
              } p-5`}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className={`h-5 w-5 ${theme === "dark" ? "text-amber-400" : "text-amber-700"}`} />
                    <h3 className={`text-base font-bold ${theme === "dark" ? "text-amber-200" : "text-amber-900"}`}>
                      Study Notes
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowStudyNotes(false)}
                    className="rounded-full p-1 opacity-50 hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Summary */}
                <div className={`mb-4 rounded-xl p-4 ${
                  theme === "dark" ? "bg-amber-900/40" : "bg-white/80"
                }`}>
                  <p className={`text-sm leading-relaxed ${theme === "dark" ? "text-amber-100" : "text-amber-900"}`}>
                    {studyNotes.summary}
                  </p>
                </div>

                {/* What It Means */}
                <div className="mb-4">
                  <h4 className={`mb-2 flex items-center gap-1.5 text-sm font-bold ${
                    theme === "dark" ? "text-amber-300" : "text-amber-800"
                  }`}>
                    <Sparkles className="h-3.5 w-3.5" />
                    What It Means
                  </h4>
                  <p className={`text-sm leading-relaxed ${
                    theme === "dark" ? "text-amber-100/80" : "text-amber-900/80"
                  }`}>
                    {studyNotes.whatItMeans}
                  </p>
                </div>

                {/* For Your Life */}
                <div className="mb-4">
                  <h4 className={`mb-2 flex items-center gap-1.5 text-sm font-bold ${
                    theme === "dark" ? "text-amber-300" : "text-amber-800"
                  }`}>
                    <Lightbulb className="h-3.5 w-3.5" />
                    For Your Life
                  </h4>
                  <p className={`text-sm leading-relaxed ${
                    theme === "dark" ? "text-amber-100/80" : "text-amber-900/80"
                  }`}>
                    {studyNotes.forYourLife}
                  </p>
                </div>

                {/* Key Verses */}
                {studyNotes.keyVerses.length > 0 && (
                  <div className="mb-4">
                    <h4 className={`mb-2 text-sm font-bold ${
                      theme === "dark" ? "text-amber-300" : "text-amber-800"
                    }`}>
                      Key Verses
                    </h4>
                    <div className="space-y-1.5">
                      {studyNotes.keyVerses.map((verse, i) => (
                        <div
                          key={i}
                          className={`rounded-lg border-l-4 py-2 pl-3 pr-2 text-xs italic leading-relaxed ${
                            theme === "dark"
                              ? "border-amber-500 bg-amber-900/30 text-amber-200"
                              : "border-amber-400 bg-white/60 text-amber-800"
                          }`}
                        >
                          {verse}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fun Fact */}
                <div className={`mb-4 rounded-xl p-3 ${
                  theme === "dark" ? "bg-blue-900/30 ring-1 ring-blue-700/30" : "bg-blue-50 ring-1 ring-blue-200/60"
                }`}>
                  <p className={`text-xs font-bold ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
                    Did You Know?
                  </p>
                  <p className={`mt-1 text-xs leading-relaxed ${
                    theme === "dark" ? "text-blue-200/80" : "text-blue-800/80"
                  }`}>
                    {studyNotes.funFact}
                  </p>
                </div>

                {/* Discussion Question */}
                <div className={`rounded-xl p-3 ${
                  theme === "dark" ? "bg-purple-900/30 ring-1 ring-purple-700/30" : "bg-purple-50 ring-1 ring-purple-200/60"
                }`}>
                  <p className={`flex items-center gap-1 text-xs font-bold ${
                    theme === "dark" ? "text-purple-300" : "text-purple-700"
                  }`}>
                    <HelpCircle className="h-3.5 w-3.5" />
                    Think About This
                  </p>
                  <p className={`mt-1 text-xs leading-relaxed ${
                    theme === "dark" ? "text-purple-200/80" : "text-purple-800/80"
                  }`}>
                    {studyNotes.questionToThink}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Study Notes Loading */}
          {studyNotesLoading && (
            <div className="mx-auto mt-8 max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className={`rounded-2xl p-5 ${
                theme === "dark" ? "bg-amber-900/30" : "bg-gradient-to-b from-amber-50 to-orange-50"
              }`}>
                <div className="flex items-center gap-3">
                  <Loader2 className={`h-5 w-5 animate-spin ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
                  <p className={`text-sm font-medium ${theme === "dark" ? "text-amber-300" : "text-amber-700"}`}>
                    Preparing study notes...
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  <div className={`h-4 rounded-full ${theme === "dark" ? "bg-amber-800/50" : "bg-amber-200/50"} animate-pulse`} style={{ width: "90%" }} />
                  <div className={`h-4 rounded-full ${theme === "dark" ? "bg-amber-800/50" : "bg-amber-200/50"} animate-pulse`} style={{ width: "75%" }} />
                  <div className={`h-4 rounded-full ${theme === "dark" ? "bg-amber-800/50" : "bg-amber-200/50"} animate-pulse`} style={{ width: "60%" }} />
                </div>
              </div>
            </div>
          )}

          {/* Copyright notice */}
          {verses && !versesLoading && (
            <div className="mx-auto mt-8 max-w-2xl border-t border-current/10 pt-4">
              <p className="text-center text-[10px] leading-relaxed opacity-30">
                {(translations || []).find((t) => t.code === translation)?.copyright}
              </p>
            </div>
          )}

          {/* Chapter navigation */}
          {verses && !versesLoading && (
            <div className="mx-auto mt-6 flex max-w-2xl items-center justify-between pb-6">
              <button
                onClick={(e) => { e.stopPropagation(); goToChapter(-1); }}
                disabled={!hasPrev}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                  hasPrev
                    ? theme === "dark" ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : theme === "sepia" ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "opacity-30"
                }`}
              >
                Previous Chapter
              </button>
              <span className="text-xs font-medium opacity-40">
                {chapter} of {book.chapters}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); goToChapter(1); }}
                disabled={!hasNext}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                  hasNext
                    ? theme === "dark" ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : theme === "sepia" ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "opacity-30"
                }`}
              >
                Next Chapter
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render: Chapter Selector
  // ============================================================================
  if (viewState.view === "chapters") {
    const { book } = viewState;
    const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);

    // Find read chapters for this book
    const readChapters = new Set(
      ((bibleProgress || []) as BibleProgressEntry[])
        .filter((p: BibleProgressEntry) => p.translation === translation && p.bookId === book.bookid)
        .map((p: BibleProgressEntry) => p.chapter)
    );

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 py-6">
        <div className="mx-auto max-w-2xl px-4">
          {/* Header */}
          <button onClick={handleBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900">
            <ArrowLeft className="h-4 w-4" />
            All Books
          </button>

          <div className="mb-6">
            <h1 className="font-serif text-2xl font-bold text-gray-900">{book.name}</h1>
            <p className="mt-1 text-sm text-amber-700">{book.chapters} chapters</p>
          </div>

          {/* Chapter grid */}
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {chapters.map((ch) => {
              const isRead = readChapters.has(ch);
              return (
                <button
                  key={ch}
                  onClick={() => loadChapter(book, ch)}
                  className={`flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    isRead
                      ? "bg-amber-200 text-amber-900 shadow-sm ring-1 ring-amber-300"
                      : "bg-white text-gray-700 shadow-sm ring-1 ring-black/5 hover:bg-amber-50 hover:ring-amber-200"
                  }`}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render: Book List
  // ============================================================================
  const otBooks = books?.filter((b) => b.bookid <= OT_BOOKS) || [];
  const ntBooks = books?.filter((b) => b.bookid > OT_BOOKS) || [];

  // Find books with reading progress
  const readBookIds = new Set(
    ((bibleProgress || []) as BibleProgressEntry[])
      .filter((p: BibleProgressEntry) => p.translation === translation)
      .map((p: BibleProgressEntry) => p.bookId)
  );

  return (
    <div className="py-6">
      {/* Header */}
      <button onClick={() => router.push("/play/home")} className="mb-4 flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900">
        <ArrowLeft className="h-4 w-4" />
        Home
      </button>

      {/* Hero */}
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 p-5 text-white shadow-xl sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur-sm">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Read the Bible</h1>
            <p className="mt-0.5 text-sm text-white/80">
              Choose a translation and start reading
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => router.push("/play/bible/saved")}
          className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-amber-700 shadow-sm ring-1 ring-amber-200 transition-all hover:bg-amber-50 active:scale-95"
        >
          <Heart className="h-3.5 w-3.5" />
          My Saved Verses
        </button>
      </div>

      {/* Translation Selector */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(translations || []).map((t) => (
          <button
            key={t.code}
            onClick={() => setTranslation(t.code)}
            className={`flex flex-shrink-0 flex-col items-start rounded-xl px-3.5 py-2.5 text-left transition-all active:scale-95 ${
              translation === t.code
                ? "bg-amber-700 text-white shadow-md"
                : "bg-white text-gray-700 shadow-sm ring-1 ring-black/5 hover:bg-amber-50"
            }`}
          >
            <span className="text-sm font-bold">{t.code}</span>
            <span className={`text-[10px] ${translation === t.code ? "text-white/70" : "text-gray-400"}`}>
              {t.description}
            </span>
          </button>
        ))}
      </div>

      {/* Continue Reading */}
      {lastRead && books && (
        <button
          onClick={() => {
            const book = books.find((b) => b.bookid === lastRead.bookId);
            if (book) loadChapter(book, lastRead.chapter);
          }}
          className="mb-5 flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-md ring-1 ring-amber-200/60 transition-all hover:shadow-lg active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-medium text-amber-600">Continue Reading</p>
            <p className="text-sm font-bold text-gray-900">
              {lastRead.bookName} {lastRead.chapter}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-amber-400" />
        </button>
      )}

      {/* Book List */}
      {booksLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : (
        <>
          {/* Old Testament */}
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-800">
              <span className="h-px flex-1 bg-amber-200" />
              Old Testament
              <span className="h-px flex-1 bg-amber-200" />
            </h2>
            <div className="space-y-1">
              {otBooks.map((book) => {
                const hasProgress = readBookIds.has(book.bookid);
                return (
                  <button
                    key={book.bookid}
                    onClick={() => setViewState({ view: "chapters", book })}
                    className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-black/5 transition-all hover:bg-amber-50 hover:ring-amber-200 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      {hasProgress && (
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                      )}
                      <span className="text-sm font-semibold text-gray-900">{book.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{book.chapters} ch</span>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* New Testament */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-800">
              <span className="h-px flex-1 bg-amber-200" />
              New Testament
              <span className="h-px flex-1 bg-amber-200" />
            </h2>
            <div className="space-y-1">
              {ntBooks.map((book) => {
                const hasProgress = readBookIds.has(book.bookid);
                return (
                  <button
                    key={book.bookid}
                    onClick={() => setViewState({ view: "chapters", book })}
                    className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-black/5 transition-all hover:bg-amber-50 hover:ring-amber-200 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      {hasProgress && (
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                      )}
                      <span className="text-sm font-semibold text-gray-900">{book.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{book.chapters} ch</span>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
