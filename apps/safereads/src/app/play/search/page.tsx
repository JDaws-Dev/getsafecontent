"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookSearch } from "@/components/kid/BookSearch";
import { FreeBookSearch } from "@/components/kid/FreeBookSearch";
import { GenreBrowser } from "@/components/kid/GenreBrowser";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";

type SearchTab = "all" | "free";

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
    if (params.get("tab") === "free") {
      setActiveTab("free");
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
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/play/home"
          className="kid-touch flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-500 shadow-md transition-all hover:shadow-lg active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Find Books</h1>
          <p className="text-xs text-gray-400">Search or browse by genre</p>
        </div>
      </div>

      {/* Genre Pills (horizontal scroll) */}
      <div className="mb-4">
        <GenreBrowser
          layout="pills"
          onGenreSelect={(genre) => {
            // Navigate to free tab with genre hint
            setActiveTab("free");
          }}
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5">
        <button
          onClick={() => setActiveTab("all")}
          className={`kid-touch min-h-[44px] flex-1 rounded-xl py-3 text-sm font-bold transition-all ${
            activeTab === "all"
              ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          All Books
        </button>
        <button
          onClick={() => setActiveTab("free")}
          className={`kid-touch min-h-[44px] flex-1 rounded-xl py-3 text-sm font-bold transition-all ${
            activeTab === "free"
              ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            Free Books
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              activeTab === "free"
                ? "bg-white/20 text-white"
                : "bg-emerald-100 text-emerald-700"
            }`}>
              FREE
            </span>
          </span>
        </button>
      </div>

      {/* Search Content */}
      {activeTab === "all" ? (
        <BookSearch kidId={kidId} />
      ) : (
        <FreeBookSearch kidId={kidId} />
      )}
    </div>
  );
}
