"use client";

import { useState } from "react";
import { Book, Music, PlaySquare, Search, Sparkles, ChevronRight } from "lucide-react";
import BookDemoCard from "./BookDemoCard";
import SongDemoCard from "./SongDemoCard";
import ChannelDemoCard from "./ChannelDemoCard";

type DemoTab = "books" | "songs" | "channels" | "search";

function SearchDemoCard() {
  return (
    <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-5 text-white">
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-5 w-5" />
        <span className="text-sm font-bold opacity-90">SafeStudy</span>
      </div>
      <div className="bg-white/10 backdrop-blur rounded-lg p-3 mb-3">
        <p className="text-sm font-medium opacity-70 mb-1">Question</p>
        <p className="text-base font-bold">&ldquo;Why is the sky blue?&rdquo;</p>
      </div>
      <div className="bg-white/10 backdrop-blur rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-cyan-300 text-cyan-900 text-[10px] font-bold px-2 py-0.5 rounded-full">Ages 8-10</span>
        </div>
        <p className="text-sm leading-relaxed">
          Sunlight has all the colors of the rainbow mixed together. When it hits the air, blue light bounces around the most because it travels in shorter waves. That&apos;s why when you look up, you see blue!
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs opacity-70">
        <span>✓ Age-appropriate</span>
        <span>✓ No links or ads</span>
        <span>✓ Parent-controlled</span>
      </div>
    </div>
  );
}

export default function DemoSection() {
  const [activeTab, setActiveTab] = useState<DemoTab>("books");

  const tabs = [
    { id: "books" as DemoTab, label: "Books", icon: Book, color: "emerald", app: "SafeReads" },
    { id: "songs" as DemoTab, label: "Songs", icon: Music, color: "purple", app: "SafeTunes" },
    { id: "channels" as DemoTab, label: "Channels", icon: PlaySquare, color: "orange", app: "SafeTube" },
    { id: "search" as DemoTab, label: "Search", icon: Search, color: "cyan", app: "SafeStudy" },
  ];

  return (
    <section id="demo" className="py-12 sm:py-16 bg-cream">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/80 rounded-full px-4 py-1.5 mb-4 border border-cream-dark shadow-sm">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Live Demo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">
            See it in action
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Search any book, song, or YouTube channel and instantly see what parents should know about the content.
          </p>
        </div>

        {/* Mobile Tab Selector */}
        <div className="lg:hidden mb-6">
          <div className="flex bg-white rounded-2xl p-1 border border-cream-dark shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? tab.color === "emerald"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm"
                      : tab.color === "purple"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm"
                      : "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: Three Demo Cards side by side */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* SafeReads Demo Card */}
          <div
            className="bg-white overflow-hidden border border-cream-dark"
            style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}
          >
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Book className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">SafeReads</h3>
                  <p className="text-sm text-white/80">Book Content Analysis</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <BookDemoCard />
            </div>
          </div>

          {/* SafeTunes Demo Card */}
          <div
            className="bg-white overflow-hidden border border-cream-dark"
            style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}
          >
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Music className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">SafeTunes</h3>
                  <p className="text-sm text-white/80">Song Content Analysis</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <SongDemoCard />
            </div>
          </div>

          {/* SafeTube Demo Card */}
          <div
            className="bg-white overflow-hidden border border-cream-dark"
            style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}
          >
            <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <PlaySquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">SafeTube</h3>
                  <p className="text-sm text-white/80">Channel Safety Review</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <ChannelDemoCard />
            </div>
          </div>
        </div>

        {/* Mobile: Single Card with Tabs */}
        <div className="lg:hidden">
          <div
            className="bg-white overflow-hidden border border-cream-dark"
            style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}
          >
            {/* Dynamic Header based on active tab */}
            <div
              className={`px-6 py-4 ${
                activeTab === "books"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : activeTab === "songs"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600"
                  : "bg-gradient-to-r from-red-500 to-orange-500"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  {activeTab === "books" && <Book className="h-5 w-5 text-white" />}
                  {activeTab === "songs" && <Music className="h-5 w-5 text-white" />}
                  {activeTab === "channels" && <PlaySquare className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {activeTab === "books" ? "SafeReads" : activeTab === "songs" ? "SafeTunes" : "SafeTube"}
                  </h3>
                  <p className="text-sm text-white/80">
                    {activeTab === "books"
                      ? "Book Content Analysis"
                      : activeTab === "songs"
                      ? "Song Content Analysis"
                      : "Channel Safety Review"}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {activeTab === "books" && <BookDemoCard />}
              {activeTab === "songs" && <SongDemoCard />}
              {activeTab === "channels" && <ChannelDemoCard />}
              {activeTab === "search" && <SearchDemoCard />}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 text-center">
          <div className="bg-white/80 rounded-3xl p-6 sm:p-8 border border-cream-dark max-w-2xl mx-auto" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h3 className="text-xl sm:text-2xl font-bold text-navy mb-2">
              Ready to take control?
            </h3>
            <p className="text-gray-600 mb-6">
              Get full access to SafeReads, SafeTunes, SafeTube, and SafeStudy with one simple subscription.
            </p>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-8 py-4 bg-navy text-white rounded-full font-semibold hover:bg-navy/90 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Get All 4 Apps for $9.99/month
              <ChevronRight className="h-5 w-5" />
            </a>
            <p className="text-sm text-gray-500 mt-4">
              7-day free trial included. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
