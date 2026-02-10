import React, { useState } from 'react';
import { SplashScreen } from '../components/SplashScreen';

export default function SplashPreview() {
  const [showSplash, setShowSplash] = useState(true);
  const [duration, setDuration] = useState(5000);

  const handleReplay = () => {
    setShowSplash(false);
    setTimeout(() => setShowSplash(true), 100);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {showSplash && (
        <SplashScreen
          minDuration={duration}
          onComplete={() => setShowSplash(false)}
        />
      )}

      {!showSplash && (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <h1 className="text-3xl font-bold mb-4">Splash Screen Preview</h1>
          <p className="text-gray-400 mb-8">The splash screen has completed!</p>

          <div className="flex flex-col gap-4 items-center">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-400">Duration:</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2"
              >
                <option value={2500}>2.5 seconds</option>
                <option value={5000}>5 seconds</option>
                <option value={8000}>8 seconds</option>
                <option value={15000}>15 seconds (demo)</option>
              </select>
            </div>

            <button
              onClick={handleReplay}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:opacity-90 transition"
            >
              Replay Splash Screen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
