"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Trash2,
  Search,
  Heart,
  Filter,
} from "lucide-react";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface SavedVerse {
  _id: Id<"savedVerses">;
  kidId: Id<"kids">;
  translation: string;
  bookName: string;
  bookId: number;
  chapter: number;
  verse: number;
  verseText: string;
  savedAt: number;
  note?: string;
  color?: string;
}

const HIGHLIGHT_STYLES: Record<string, { bg: string; border: string }> = {
  yellow: { bg: "bg-yellow-50", border: "border-l-yellow-400" },
  green: { bg: "bg-emerald-50", border: "border-l-emerald-400" },
  blue: { bg: "bg-blue-50", border: "border-l-blue-400" },
  pink: { bg: "bg-pink-50", border: "border-l-pink-400" },
};

export default function SavedVersesPage() {
  const router = useRouter();
  const [kidId, setKidId] = useState<Id<"kids"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [filterBook, setFilterBook] = useState<string | null>(null);

  const savedVerses = useQuery(
    api.bible.getSavedVerses,
    kidId ? { kidId } : "skip"
  ) as SavedVerse[] | undefined;

  const unsaveVerse = useMutation(api.bible.unsaveVerse);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    const profileData = localStorage.getItem("safereads_kid_profile");
    if (!profileData) {
      router.replace("/read");
      return;
    }
    try {
      const profile = JSON.parse(profileData);
      setKidId(profile._id as Id<"kids">);
    } catch {
      router.replace("/read");
    }
  }, [router]);

  // Get unique book names for filtering
  const bookNames = useMemo(() => {
    if (!savedVerses) return [];
    return [...new Set(savedVerses.map((v) => v.bookName))].sort();
  }, [savedVerses]);

  // Filter verses
  const filteredVerses = useMemo(() => {
    if (!savedVerses) return [];
    return savedVerses.filter((v) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !v.verseText.toLowerCase().includes(q) &&
          !v.bookName.toLowerCase().includes(q) &&
          !(v.note || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (filterColor && v.color !== filterColor) return false;
      if (filterBook && v.bookName !== filterBook) return false;
      return true;
    });
  }, [savedVerses, searchQuery, filterColor, filterBook]);

  async function handleRemove(id: Id<"savedVerses">) {
    setRemoving(id);
    try {
      await unsaveVerse({ savedVerseId: id });
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="py-6">
      {/* Header */}
      <button
        onClick={() => router.push("/read/bible")}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Bible
      </button>

      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Heart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">My Saved Verses</h1>
            <p className="mt-0.5 text-sm text-white/80">
              {savedVerses?.length || 0} verse{savedVerses?.length !== 1 ? "s" : ""} saved
            </p>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      {savedVerses && savedVerses.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved verses..."
              className="w-full rounded-xl border border-amber-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Color filters */}
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              {["yellow", "green", "blue", "pink"].map((color) => (
                <button
                  key={color}
                  onClick={() => setFilterColor(filterColor === color ? null : color)}
                  className={`h-6 w-6 rounded-full ring-1 ring-black/10 transition-transform ${
                    color === "yellow" ? "bg-yellow-300" : color === "green" ? "bg-emerald-300" : color === "blue" ? "bg-blue-300" : "bg-pink-300"
                  } ${filterColor === color ? "scale-110 ring-2 ring-black/30" : "hover:scale-105"}`}
                />
              ))}
            </div>

            {/* Book filter */}
            {bookNames.length > 1 && (
              <select
                value={filterBook || ""}
                onChange={(e) => setFilterBook(e.target.value || null)}
                className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none"
              >
                <option value="">All Books</option>
                {bookNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}

            {(filterColor || filterBook || searchQuery) && (
              <button
                onClick={() => { setFilterColor(null); setFilterBook(null); setSearchQuery(""); }}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Verses list */}
      {savedVerses === undefined ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : filteredVerses.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
          <Heart className="mx-auto mb-3 h-10 w-10 text-amber-200" />
          <p className="text-sm font-medium text-gray-600">
            {savedVerses.length === 0
              ? "No saved verses yet. Tap on any verse while reading to save it."
              : "No verses match your filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVerses.map((verse) => {
            const style = HIGHLIGHT_STYLES[verse.color || "yellow"] || HIGHLIGHT_STYLES.yellow;
            const isRemoving = removing === verse._id;
            const dateStr = new Date(verse.savedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={verse._id}
                className={`rounded-xl border-l-4 ${style.border} ${style.bg} p-4 shadow-sm transition-opacity ${
                  isRemoving ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => {
                      // Navigate to this verse in the Bible reader
                      localStorage.setItem("safereads_bible_translation", verse.translation);
                      router.push("/read/bible");
                      // We can't deep-link perfectly, but at least set the translation
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-xs font-bold text-amber-700">
                      {verse.bookName} {verse.chapter}:{verse.verse}
                      <span className="ml-1.5 font-normal text-gray-400">{verse.translation}</span>
                    </p>
                    <p className="mt-1.5 font-serif text-sm leading-relaxed text-gray-800 italic">
                      &ldquo;{verse.verseText}&rdquo;
                    </p>
                    {verse.note && (
                      <p className="mt-2 text-xs text-gray-500">
                        Note: {verse.note}
                      </p>
                    )}
                    <p className="mt-2 text-[10px] text-gray-400">{dateStr}</p>
                  </button>
                  <button
                    onClick={() => handleRemove(verse._id)}
                    disabled={isRemoving}
                    className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-white/50 hover:text-red-500"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
