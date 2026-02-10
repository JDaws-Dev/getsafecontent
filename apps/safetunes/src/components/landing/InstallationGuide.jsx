import React from 'react';
import { Smartphone, Share2, Home, Lock } from 'lucide-react';

function InstallationGuide() {
  return (
    <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Works on Any Device—Install in Seconds
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            No app store required. Install SafeTunes directly to your child's device like a native app.
          </p>
          <p className="text-sm text-purple-600 font-semibold mt-4">
            ✨ Native iOS app coming Q1 2026
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Installation Steps */}
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 md:p-12 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              How to Install on iPhone/iPad
            </h3>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
                <div className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold mb-3">
                  Step 1
                </div>
                <h4 className="font-bold text-lg text-gray-900 mb-2">
                  Open in Safari
                </h4>
                <p className="text-gray-600">
                  Visit getsafetunes.com in Safari (not Chrome or other browsers)
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <div className="relative">
                    <Share2 className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold mb-3">
                  Step 2
                </div>
                <h4 className="font-bold text-lg text-gray-900 mb-2">
                  Tap Share → Add to Home Screen
                </h4>
                <p className="text-gray-600">
                  Tap the share icon, then select "Add to Home Screen"
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Home className="w-10 h-10 text-white" />
                </div>
                <div className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold mb-3">
                  Step 3
                </div>
                <h4 className="font-bold text-lg text-gray-900 mb-2">
                  Launch Like an App
                </h4>
                <p className="text-gray-600">
                  The SafeTunes icon appears on their home screen. Tap to open!
                </p>
              </div>
            </div>
          </div>

          {/* Guided Access Section */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 md:p-12 text-white">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">
                  🔒 Pro Tip: Lock Them In (Optional)
                </h3>
                <p className="text-blue-100 mb-4 text-lg">
                  Want to make absolutely sure they can't exit the app? Use iOS <strong>Guided Access</strong> mode.
                </p>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <p className="font-semibold mb-2">How to enable:</p>
                  <ol className="space-y-2 text-blue-50">
                    <li>1. Go to Settings → Accessibility → Guided Access</li>
                    <li>2. Turn on Guided Access and set a passcode</li>
                    <li>3. Open SafeTunes, then triple-click the side button</li>
                    <li>4. Tap "Start" to lock them in the app</li>
                  </ol>
                </div>
                <p className="text-sm text-blue-100 mt-4">
                  Triple-click again and enter your passcode to exit Guided Access.
                </p>
              </div>
            </div>
          </div>

          {/* Why Web App Section */}
          <div className="mt-8 bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
            <h4 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              Why start with a web app?
            </h4>
            <div className="grid md:grid-cols-2 gap-4 text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <p>Works on <strong>any device</strong> (iPhone, iPad, Mac, Android)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <p>No waiting for App Store approval for updates</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <p>Instant access—no download required</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <p>Same great features as a native app</p>
              </div>
            </div>
            <p className="text-purple-600 font-semibold mt-4">
              Native iOS app launching Q1 2026 for those who prefer it!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default InstallationGuide;
