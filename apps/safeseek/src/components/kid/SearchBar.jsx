import { useRef } from 'react';
import {
  Search, Clock, Loader2, X, Mic,
  Sparkles, BookOpen, GraduationCap,
  Image as ImageIcon,
} from 'lucide-react';
import { SpeechRecognition } from './utils';

export default function SearchBar({
  query,
  setQuery,
  searching,
  cooldown,
  isListening,
  searchMode,
  selectedProfile,
  showSuggestions,
  filteredSuggestions,
  selectedSuggestionIndex,
  searchInputRef,
  suggestionsRef,
  onSearch,
  onClearSearch,
  onToggleListening,
  onModeToggle,
  onSuggestionClick,
  onInputKeyDown,
  onInputFocus,
}) {
  return (
    <div className="sticky top-[52px] z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md py-3 px-4 border-b border-gray-100/50 dark:border-gray-800/50">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={onSearch} className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              onFocus={onInputFocus}
              placeholder={isListening ? 'Listening...' : 'What do you want to learn about?'}
              className="w-full text-[16px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl pl-12 pr-36 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-200 dark:focus:ring-accent-500/30 focus:border-accent-400 dark:focus:border-accent-500 transition-all duration-200 shadow-sm"
              autoFocus
              autoComplete="off"
            />
            {/* Clear button + mic + submit inside search bar */}
            <div className="absolute right-2 flex items-center gap-1">
              {query && !searching && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {SpeechRecognition && (
                <button
                  type="button"
                  onClick={onToggleListening}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    isListening
                      ? 'text-accent-500 bg-accent-100 dark:bg-accent-900/40 animate-pulse'
                      : 'text-gray-400 dark:text-gray-500 hover:text-accent-500 dark:hover:text-accent-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  aria-label={isListening ? 'Stop listening' : 'Voice search'}
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
              {query && (
                <button
                  type="submit"
                  disabled={searching || cooldown}
                  className="text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : cooldown ? (
                    <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                  ) : 'Search'}
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden"
            >
              {filteredSuggestions.map((item, index) => (
                <button
                  key={`${item.type}-${item.text}`}
                  type="button"
                  onClick={() => onSuggestionClick(item.text)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors text-sm ${
                    index === selectedSuggestionIndex
                      ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-accent-50 dark:hover:bg-accent-900/20'
                  }`}
                >
                  {item.type === 'recent' ? (
                    <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  ) : (
                    <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  )}
                  <span className="truncate">{item.text}</span>
                  {item.type === 'recent' && (
                    <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">Recent</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Mode tabs */}
          <div className="flex items-center gap-4 mt-3 border-b border-gray-200 overflow-x-auto flex-nowrap dark:border-gray-700">
            <button
              type="button"
              onClick={() => onModeToggle('learn')}
              className={`flex items-center gap-1.5 px-1 pb-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                searchMode === 'learn'
                  ? 'border-accent-600 text-accent-600 dark:border-accent-400 dark:text-accent-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Learn
            </button>
            {selectedProfile?.allowImageSearch !== false && (
              <button
                type="button"
                onClick={() => onModeToggle('images')}
                className={`flex items-center gap-1.5 px-1 pb-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                  searchMode === 'images'
                    ? 'border-accent-600 text-accent-600 dark:border-accent-400 dark:text-accent-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Images
              </button>
            )}
            <button
              type="button"
              onClick={() => onModeToggle('research')}
              className={`flex items-center gap-1.5 px-1 pb-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                searchMode === 'research'
                  ? 'border-accent-600 text-accent-600 dark:border-accent-400 dark:text-accent-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Research
            </button>
            <button
              type="button"
              onClick={() => onModeToggle('tutor')}
              className={`flex items-center gap-1.5 px-1 pb-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                searchMode === 'tutor'
                  ? 'border-accent-600 text-accent-600 dark:border-accent-400 dark:text-accent-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Tutor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
