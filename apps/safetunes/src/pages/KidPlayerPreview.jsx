import { KidPlayerDemo } from '../components/child/KidPlayerComponents';

/**
 * Preview page for the refactored Kid Player UI components.
 * Access this at /preview/kid-player to review the new design.
 *
 * This is for design review only - no functionality is connected yet.
 * The components shown here will be integrated into ChildDashboard.jsx
 * once approved.
 */
function KidPlayerPreview() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white py-4 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold">UI Preview Mode</h1>
          <p className="text-sm text-white/80">Review the new Kid Player design</p>
        </div>
      </div>

      {/* Demo Component */}
      <KidPlayerDemo />

      {/* Info Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-yellow-50 border-t border-yellow-200 py-2 px-4 text-center z-[200]">
        <p className="text-xs text-yellow-800">
          <strong>Preview Mode:</strong> This is a design demo. Click the mini player to see the full-screen player.
        </p>
      </div>
    </div>
  );
}

export default KidPlayerPreview;
