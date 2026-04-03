"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookSearch } from "@/components/kid/BookSearch";
import { FreeBookSearch } from "@/components/kid/FreeBookSearch";
import { GenreBrowser } from "@/components/kid/GenreBrowser";
import { ArrowLeft, BookOpen, Sparkles, Headphones } from "lucide-react";
import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";

type SearchTab = "all" | "free" | "audio";

const SEARCH_SUGGESTIONS = [
  { label: "Dragons", emoji: "\uD83D\uDC09" },
  { label: "Space", emoji: "\uD83D\uDE80" },
  { label: "Dinosaurs", emoji: "\uD83E\uDD95" },
  { label: "Pirates", emoji: "\uD83C\uDFF4\u200D\u2620\uFE0F" },
  { label: "Unicorns", emoji: "\uD83E\uDD84" },
  { label: "Dogs", emoji: "\uD83D\uDC36" },
  { label: "Magic", emoji: "\u2728" },
  { label: "Robots", emoji: "\uD83E\uDD16" },
];

export default function KidSearchPage() {
  const router = useRouter();
  const [kidId, setKidId] = useState<Id<"kids"> | null>(null);
  const [activeTab, setActiveTab] = useState<SearchTab>("all");

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

  // Check for tab param in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "free") {
      setActiveTab("free");
    } else if (tab === "audio") {
      setActiveTab("audio");
    }
  }, []);

  if (!kidId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Header with back button */}
      <div className="animate-fade-up mb-5 flex items-center gap-3">
        <Link
          href="/play/home"
          className="kid-touch flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-500 shadow-md ring-1 ring-black/5 transition-all hover:shadow-lg active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">Find Books</h1>
          <p className="text-xs text-gray-400">Search, browse, or discover something new</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-600 shadow-md">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Quick Search Suggestions - horizontal scroll */}
      <div className="animate-fade-up mb-4 flex gap-2 overflow-x-auto overscroll-contain pb-1 scrollbar-none" style={{ animationDelay: "0.05s" }}>
        {SEARCH_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              setActiveTab("all");
            }}
            className="kid-touch flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-gray-600 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md active:scale-95"
          >
            <span>{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Genre Pills (horizontal scroll) */}
      <div className="animate-fade-up mb-4" style={{ animationDelay: "0.1s" }}>
        <GenreBrowser
          layout="pills"
          onGenreSelect={() => {
            setActiveTab("free");
          }}
        />
      </div>

      {/* Tabs — three tabs: All Books, Free Books, Audiobooks */}
      <div className="animate-fade-up mb-4 flex gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5" style={{ animationDelay: "0.15s" }}>
        <button
          onClick={() => setActiveTab("all")}
          className={`kid-touch min-h-[44px] flex-1 rounded-xl py-3 text-sm font-bold transition-all ${
            activeTab === "all"
              ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Sparkles className={`h-3.5 w-3.5 ${activeTab === "all" ? "text-white" : "text-gray-300"}`} />
            All Books
          </span>
        </button>
        <button
          onClick={() => setActiveTab("free")}
          className={`kid-touch min-h-[44px] flex-1 rounded-xl py-3 text-sm font-bold transition-all ${
            activeTab === "free"
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            Free
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              activeTab === "free"
                ? "bg-white/20 text-white"
                : "bg-emerald-100 text-emerald-700"
            }`}>
              FREE
            </span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab("audio")}
          className={`kid-touch min-h-[44px] flex-1 rounded-xl py-3 text-sm font-bold transition-all ${
            activeTab === "audio"
              ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Headphones className={`h-3.5 w-3.5 ${activeTab === "audio" ? "text-white" : "text-gray-300"}`} />
            Audio
          </span>
        </button>
      </div>

      {/* Search Content */}
      {activeTab === "all" ? (
        <BookSearch kidId={kidId} />
      ) : activeTab === "audio" ? (
        <FreeBookSearch kidId={kidId} audioOnly />
      ) : (
        <FreeBookSearch kidId={kidId} />
      )}
    </div>
  );
}
