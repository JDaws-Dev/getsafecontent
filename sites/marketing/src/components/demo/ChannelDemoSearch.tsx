"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { searchDemoChannels, DemoChannel } from "@/data/demoChannels";
import ChannelDemoResult from "./ChannelDemoResult";
import { Search, PlaySquare, Sparkles, CheckCircle2 } from "lucide-react";

export default function ChannelDemoSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DemoChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<DemoChannel | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setSelectedChannel(null);

    if (value.trim().length > 0) {
      setIsSearching(true);
      // Simulate brief search delay for UX
      setTimeout(() => {
        const found = searchDemoChannels(value);
        setResults(found);
        setShowDropdown(true);
        setIsSearching(false);
      }, 150);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, []);

  const handleSelectChannel = useCallback((channel: DemoChannel) => {
    setSelectedChannel(channel);
    setQuery(channel.name);
    setShowDropdown(false);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-red-50 to-orange-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <PlaySquare className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-navy text-lg">SafeTube Demo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">
            Try It Now — Free
          </h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Search for a YouTube channel and see what SafeTube reveals about its safety for kids.
            Know before they watch.
          </p>
        </div>

        {/* Search input */}
        <div className="relative mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
              placeholder="Try: Mark Rober, Blippi, MrBeast, Sesame Street..."
              className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-2 border-gray-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none transition-all bg-white shadow-sm"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Sparkles className="h-5 w-5 text-orange-500 animate-pulse" />
              </div>
            )}
          </div>

          {/* Dropdown results */}
          {showDropdown && results.length > 0 && !selectedChannel && (
            <div
              ref={dropdownRef}
              className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
            >
              {results.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleSelectChannel(channel)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Channel thumbnail */}
                  <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={channel.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-gray-900 truncate">{channel.name}</p>
                      {channel.isVerified && (
                        <CheckCircle2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{channel.subscriberCount} subscribers</p>
                  </div>
                  {/* Quick verdict badge */}
                  <span
                    className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                      channel.safetyRating === "safe"
                        ? "bg-green-100 text-green-800"
                        : channel.safetyRating === "caution"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {channel.safetyRating === "safe"
                      ? "Safe"
                      : channel.safetyRating === "caution"
                        ? "Caution"
                        : "Not Rec."}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {showDropdown && query.trim().length > 0 && results.length === 0 && !isSearching && (
            <div
              ref={dropdownRef}
              className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center"
            >
              <p className="text-gray-600 mb-2">Channel not in demo library</p>
              <p className="text-sm text-gray-500">
                Sign up for SafeTube to review any YouTube channel!
              </p>
              <a
                href="https://getsafetube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Try SafeTube Free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          )}
        </div>

        {/* Selected channel result */}
        {selectedChannel && <ChannelDemoResult channel={selectedChannel} />}

        {/* Prompt when no selection */}
        {!selectedChannel && !showDropdown && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Search above to see a sample channel safety review</p>
          </div>
        )}
      </div>
    </section>
  );
}
