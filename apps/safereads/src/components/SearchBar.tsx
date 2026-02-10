"use client";

import { useState, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  initialQuery?: string;
  placeholder?: string;
}

export function SearchBar({ onSearch, loading, initialQuery = "", placeholder = "Title, author, or ISBN…" }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed) {
        onSearch(trimmed);
      }
    },
    [query, onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-parchment-200 bg-white py-3 pl-10 pr-20 text-sm text-ink-900 placeholder:text-ink-400 focus:border-parchment-400 focus:outline-none focus:ring-2 focus:ring-parchment-300 sm:pr-24 sm:text-base"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-parchment-700 p-2 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800 disabled:opacity-50 sm:px-4 sm:py-1.5"
          aria-label="Search"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Search</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
