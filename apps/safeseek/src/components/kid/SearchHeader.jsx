import {
  Search, Clock, Shield, Sun, Moon, Users, ArrowLeft, AlertCircle, LayoutGrid
} from 'lucide-react';
import { getColorClass } from './utils';
import AvatarIcon from './AvatarIcon';
import { SafeFamilyHeaderSwitcher } from '../SafeFamilySwitcher';

export default function SearchHeader({
  selectedProfile,
  familyCode,
  kidToken,
  searchStack,
  isDark,
  hasSearchLimit,
  isSearchLimitLow,
  searchesRemaining,
  showRequestsInbox,
  newApprovedCount,
  searchInputRef,
  onBack,
  onSwitchProfile,
  onOpenApps,
  onToggleDarkMode,
  onToggleRequestsInbox,
}) {
  return (
    <header className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm dark:shadow-gray-950/30">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Left: back button + logo + brand */}
        <div className="flex items-center gap-2">
          {searchStack.length > 0 && (
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition active:scale-95"
              title="Go back to previous search"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-8 h-8 bg-accent-600 rounded-lg flex items-center justify-center">
            <Search className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-semibold text-brand-navy dark:text-white text-base hidden sm:inline">SafeStudy</span>
          <Shield className="w-4 h-4 text-green-500 dark:text-green-400" />
        </div>

        {/* Center: cross-app Safe Family switcher (desktop) */}
        <div className="hidden lg:flex">
          <SafeFamilyHeaderSwitcher current="safestudy" familyCode={familyCode} kidToken={kidToken} />
        </div>

        {/* Right: search count + profile + dark mode + history */}
        <div className="flex items-center gap-3">
          {hasSearchLimit && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
              isSearchLimitLow
                ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
                : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
            }`}>
              <Clock className="w-3 h-3" />
              {searchesRemaining} left
            </span>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center ${getColorClass(selectedProfile.color)}`}
            >
              <AvatarIcon color={selectedProfile.color} className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{selectedProfile.name}</span>
            <button
              onClick={onSwitchProfile}
              className="text-xs text-gray-400 hover:text-accent-500 dark:text-gray-500 dark:hover:text-accent-400 ml-1 transition-colors"
              aria-label="Switch profile"
              title="Switch profile"
            >
              <Users className="w-3.5 h-3.5" />
            </button>
          </div>
          {onOpenApps && (
            <button
              onClick={onOpenApps}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
              aria-label="Other Safe Family apps"
              title="Other Safe Family apps"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Apps</span>
            </button>
          )}
          <button
            onClick={onToggleDarkMode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>
          <button
            onClick={onToggleRequestsInbox}
            className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.98] ${
              showRequestsInbox
                ? 'bg-accent-100 dark:bg-accent-900/40 text-accent-600 dark:text-accent-400'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            aria-label="My requests"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Requests</span>
            {newApprovedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {newApprovedCount}
              </span>
            )}
          </button>
          {/*
            Apr 2026: kid-side History button removed. Showing kids their
            prior queries reinforces the synonym-shuffling loop ("let me try
            one more variation"). Parent dashboard still has full history.
            Component preserved for reference + admin views.
          */}
        </div>
      </div>

      {/* Cross-app Safe Family switcher (mobile row, always visible under lg) */}
      <div className="lg:hidden flex justify-center pb-3 -mt-1">
        <SafeFamilyHeaderSwitcher current="safestudy" familyCode={familyCode} kidToken={kidToken} tile={40} />
      </div>
    </header>
  );
}
