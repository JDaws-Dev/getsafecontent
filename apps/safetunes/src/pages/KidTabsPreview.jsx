import { KidPlayerTabsDemo } from '../components/child/KidPlayerTabs';

/**
 * Preview page for the refactored Kid Player Tabs (Home, Discover, Playlists).
 * Access this at /preview/kid-tabs to review the new design.
 *
 * Design System:
 * - White background, black text
 * - Purple/Pink brand gradient for accents
 * - Rounded corners (xl/2xl), subtle shadows
 * - No permanent play button overlays (clean artwork)
 * - Native-style H1 headers
 *
 * Tabs:
 * 1. Home: Greeting, Recently Played (100x100), Freshly Approved (with "NEW" badge), On Repeat (160x160)
 * 2. Discover: Featured carousel, Mood cards grid (Worship, Disney, Dance Party, etc.)
 * 3. Playlists: Header with + button, Liked Songs row (gradient), 2-column playlist grid
 */
function KidTabsPreview() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 px-4 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold">UI Preview: Kid Tabs</h1>
            <p className="text-xs text-white/80">Home, Discover, Playlists</p>
          </div>
          <a
            href="/preview/kid-player"
            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition"
          >
            Old Preview
          </a>
        </div>
      </div>

      {/* Demo Component */}
      <KidPlayerTabsDemo />

      {/* Info Footer */}
      <div className="fixed bottom-16 left-0 right-0 bg-yellow-50 border-t border-yellow-200 py-2 px-4 text-center z-[200]">
        <p className="text-xs text-yellow-800">
          <strong>Preview Mode:</strong> This is a design demo with dummy data. Switch tabs at the bottom.
        </p>
      </div>
    </div>
  );
}

export default KidTabsPreview;
