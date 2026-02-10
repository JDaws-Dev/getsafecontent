"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { searchDemoBooks, DemoBook } from "@/data/demoBooks";
import BookDemoResult from "./BookDemoResult";
import { Search, Book, Sparkles } from "lucide-react";

export default function BookDemoSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DemoBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<DemoBook | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setSelectedBook(null);

    if (value.trim().length > 0) {
      setIsSearching(true);
      // Simulate brief search delay for UX
      setTimeout(() => {
        const found = searchDemoBooks(value);
        setResults(found);
        setShowDropdown(true);
        setIsSearching(false);
      }, 150);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, []);

  const handleSelectBook = useCallback((book: DemoBook) => {
    setSelectedBook(book);
    setQuery(book.title);
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
    <section className="py-16 sm:py-24 bg-gradient-to-b from-emerald-50 to-teal-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
              <Book className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-navy text-lg">SafeReads Demo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">
            Try It Now — Free
          </h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Search for a book and see what SafeReads reveals about its content.
            Know before they read.
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
              placeholder="Try: Harry Potter, Percy Jackson, Wimpy Kid..."
              className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-2 border-gray-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 outline-none transition-all bg-white shadow-sm"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
              </div>
            )}
          </div>

          {/* Dropdown results */}
          {showDropdown && results.length > 0 && !selectedBook && (
            <div
              ref={dropdownRef}
              className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
            >
              {results.map((book) => (
                <button
                  key={book.id}
                  onClick={() => handleSelectBook(book)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Book cover thumbnail */}
                  <div className="w-10 h-14 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={book.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{book.title}</p>
                    <p className="text-sm text-gray-500 truncate">{book.author}</p>
                  </div>
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
              <p className="text-gray-600 mb-2">Book not in demo library</p>
              <p className="text-sm text-gray-500">
                Sign up for SafeReads to analyze any book!
              </p>
              <a
                href="https://getsafereads.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Try SafeReads Free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          )}
        </div>

        {/* Selected book result */}
        {selectedBook && <BookDemoResult book={selectedBook} />}

        {/* Prompt when no selection */}
        {!selectedBook && !showDropdown && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Search above to see a sample content report</p>
          </div>
        )}
      </div>
    </section>
  );
}
