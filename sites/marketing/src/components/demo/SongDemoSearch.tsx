"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { searchDemoSongs, DemoSong } from "@/data/demoSongs";
import SongDemoResult from "./SongDemoResult";
import { Search, Music, Sparkles } from "lucide-react";

export default function SongDemoSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DemoSong[]>([]);
  const [selectedSong, setSelectedSong] = useState<DemoSong | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setSelectedSong(null);

    if (value.trim().length > 0) {
      setIsSearching(true);
      // Simulate brief search delay for UX
      setTimeout(() => {
        const found = searchDemoSongs(value);
        setResults(found);
        setShowDropdown(true);
        setIsSearching(false);
      }, 150);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, []);

  const handleSelectSong = useCallback((song: DemoSong) => {
    setSelectedSong(song);
    setQuery(song.title);
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
    <section className="py-16 sm:py-24 bg-gradient-to-b from-purple-50 to-indigo-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <Music className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-navy text-lg">SafeTunes Demo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">
            Try It Now — Free
          </h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Search for a song and see what SafeTunes reveals about its content.
            Know before they listen.
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
              placeholder="Try: Shake It Off, Let It Go, Uptown Funk..."
              className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-2 border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white shadow-sm"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
              </div>
            )}
          </div>

          {/* Dropdown results */}
          {showDropdown && results.length > 0 && !selectedSong && (
            <div
              ref={dropdownRef}
              className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
            >
              {results.map((song) => (
                <button
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Album cover thumbnail */}
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={song.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{song.title}</p>
                    <p className="text-sm text-gray-500 truncate">{song.artist}</p>
                  </div>
                  {/* Quick verdict badge */}
                  <span
                    className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                      song.parentVerdict === "approved"
                        ? "bg-green-100 text-green-800"
                        : song.parentVerdict === "review"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {song.parentVerdict === "approved"
                      ? "Safe"
                      : song.parentVerdict === "review"
                        ? "Review"
                        : "Caution"}
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
              <p className="text-gray-600 mb-2">Song not in demo library</p>
              <p className="text-sm text-gray-500">
                Sign up for SafeTunes to analyze any song from Apple Music!
              </p>
              <a
                href="https://getsafetunes.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Try SafeTunes Free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          )}
        </div>

        {/* Selected song result */}
        {selectedSong && <SongDemoResult song={selectedSong} />}

        {/* Prompt when no selection */}
        {!selectedSong && !showDropdown && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Search above to see a sample content analysis</p>
          </div>
        )}
      </div>
    </section>
  );
}
