import { Pause } from 'lucide-react';

/**
 * Shown INSTEAD of the search box when a parent has paused this kid from the
 * Safe Family hub (kidProfiles.accessPaused, synced by convex/familySync.ts).
 * The server refuses searches too (timeLimits.canSearch) — this just keeps the
 * kid from staring at a box that won't work.
 */
export default function PausedNotice({ profileName, onSwitchProfile }) {
  return (
    <div className="min-h-screen bg-brand-cream dark:bg-gray-900 flex items-center justify-center px-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-orange-100 dark:bg-orange-900/40">
          <Pause className="w-8 h-8 text-orange-500" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {profileName ? `Paused for ${profileName}` : 'Paused'}
        </h2>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Search is paused right now. Ask your parent.
        </p>

        <button
          onClick={onSwitchProfile}
          className="w-full bg-accent-600 hover:bg-accent-700 text-white py-3 rounded-lg font-medium text-lg transition-all duration-200 active:scale-[0.98]"
        >
          Switch profile
        </button>
      </div>
    </div>
  );
}
