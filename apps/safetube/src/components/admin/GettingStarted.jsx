import { useState } from 'react';

// QR Code component using external API
function QRCode({ url, size = 120 }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=ef4444`;

  return (
    <div className="bg-white p-2 rounded-lg shadow-sm border border-red-200">
      <img
        src={qrUrl}
        alt={`QR code for ${url}`}
        width={size}
        height={size}
        className="block"
      />
    </div>
  );
}

export default function GettingStarted({ userData, onNavigate }) {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyFamilyCode = async () => {
    if (userData?.familyCode) {
      try {
        await navigator.clipboard.writeText(userData.familyCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch {
        // Fallback - just show the code
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-xl p-6 sm:p-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Getting Started with SafeTube</h1>
        <p className="text-red-100 text-sm sm:text-base">
          Two simple steps to give your kids access to safe YouTube videos.
        </p>
      </div>

      {/* Family Code Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Family Code</h2>
        <p className="text-gray-600 text-sm mb-4">
          Your kids will use this code to log in on their device.
        </p>

        {userData?.familyCode ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-3xl sm:text-4xl font-bold text-red-600 tracking-widest font-mono">
                {userData.familyCode}
              </div>
              <button
                onClick={copyFamilyCode}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-medium transition shadow-md"
              >
                {copiedCode ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xl text-gray-400">Loading...</div>
        )}
      </div>

      {/* Step 1: Lock Down Device */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
            1
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Lock Down Their Device</h2>
            <p className="text-gray-600 text-sm mt-1">
              Use your device's parental controls to block all websites except SafeTube.
            </p>
          </div>
        </div>

        <p className="text-sm font-medium text-gray-700 mb-3">Select their device type:</p>

        {/* Device Selection Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {/* iPhone/iPad */}
          <button
            onClick={() => setSelectedDevice('ios')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedDevice === 'ios'
                ? 'border-red-500 bg-red-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-red-300'
            }`}
          >
            <div className="flex justify-center mb-2">
              <svg className="w-10 h-10 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </div>
            <div className="font-semibold text-sm text-gray-900">iPhone/iPad</div>
          </button>

          {/* Android */}
          <button
            onClick={() => setSelectedDevice('android')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedDevice === 'android'
                ? 'border-red-500 bg-red-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-red-300'
            }`}
          >
            <div className="flex justify-center mb-2">
              <svg className="w-10 h-10 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 2.592a.5.5 0 0 0-.867-.5l-1.48 2.56a7.502 7.502 0 0 0-6.352 0l-1.48-2.56a.5.5 0 0 0-.867.5l1.432 2.482a7.528 7.528 0 0 0-3.91 6.576H20a7.528 7.528 0 0 0-3.91-6.576l1.433-2.482zM7 9.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm8 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM5.5 12v7a1 1 0 0 0 1 1H8v2.5a1.5 1.5 0 1 0 3 0V20h2v2.5a1.5 1.5 0 1 0 3 0V20h1.5a1 1 0 0 0 1-1v-7h-13zm-2 0a1.5 1.5 0 0 0-1.5 1.5v4a1.5 1.5 0 1 0 3 0v-4A1.5 1.5 0 0 0 3.5 12zm17 0a1.5 1.5 0 0 0-1.5 1.5v4a1.5 1.5 0 1 0 3 0v-4a1.5 1.5 0 0 0-1.5-1.5z"/>
              </svg>
            </div>
            <div className="font-semibold text-sm text-gray-900">Android</div>
          </button>

          {/* Chromebook */}
          <button
            onClick={() => setSelectedDevice('chromebook')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedDevice === 'chromebook'
                ? 'border-red-500 bg-red-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-red-300'
            }`}
          >
            <div className="flex justify-center mb-2">
              <svg className="w-10 h-10 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v10h16V6H4zm4 12h8v2H8v-2z"/>
              </svg>
            </div>
            <div className="font-semibold text-sm text-gray-900">Chromebook</div>
          </button>
        </div>

        {/* Device Instructions */}
        {selectedDevice === 'ios' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
            <h3 className="font-bold text-gray-900 mb-3">iPhone/iPad Setup</h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li>1. Open <strong>Settings</strong> → <strong>Screen Time</strong></li>
              <li>2. Turn on Screen Time and set a passcode</li>
              <li>3. Tap <strong>Content & Privacy Restrictions</strong> → Turn ON</li>
              <li>4. Tap <strong>Content Restrictions</strong> → <strong>Web Content</strong></li>
              <li>5. Select <strong>"Allowed Websites Only"</strong></li>
              <li>6. Delete ALL pre-added websites (swipe left to delete)</li>
              <li>7. Tap <strong>"Add Website"</strong> and add:</li>
            </ol>
            <div className="mt-3 bg-white border border-red-200 rounded-lg p-3">
              <p className="text-sm"><strong>Title:</strong> SafeTube</p>
              <p className="text-sm"><strong>URL:</strong> <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono text-red-600">getsafetube.com</code></p>
            </div>
          </div>
        )}

        {selectedDevice === 'android' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
            <h3 className="font-bold text-gray-900 mb-3">Android Setup (Family Link)</h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li>1. Open the <strong>Family Link</strong> app on your phone</li>
              <li>2. Select your child's account</li>
              <li>3. Tap <strong>Controls</strong> → <strong>Content restrictions</strong> → <strong>Google Chrome</strong></li>
              <li>4. Select <strong>"Only allow certain sites"</strong></li>
              <li>5. Tap <strong>Manage sites</strong> → <strong>Add a website</strong></li>
              <li>6. Add <strong>both</strong> of these websites:</li>
            </ol>
            <div className="mt-3 space-y-2">
              <div className="bg-white border border-red-200 rounded-lg p-3">
                <p className="text-sm"><strong>Site 1:</strong> <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono text-red-600">getsafetube.com</code></p>
                <p className="text-xs text-gray-500 mt-1">SafeTube app (parental controls)</p>
              </div>
              <div className="bg-white border border-red-200 rounded-lg p-3">
                <p className="text-sm"><strong>Site 2:</strong> <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono text-red-600">youtube-nocookie.com</code></p>
                <p className="text-xs text-gray-500 mt-1">Video playback (embed-only, no browsing)</p>
              </div>
            </div>
            <div className="mt-4 bg-green-100 border border-green-300 rounded-lg p-3">
              <p className="text-xs text-green-800">
                <strong>Why two sites?</strong> youtube-nocookie.com is YouTube's privacy-enhanced embed domain.
                It <em>only</em> plays videos embedded in SafeTube — your child <strong>cannot</strong> browse or search YouTube directly with this domain.
              </p>
            </div>
          </div>
        )}

        {selectedDevice === 'chromebook' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
            <h3 className="font-bold text-gray-900 mb-3">Chromebook Setup (Family Link)</h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li>1. Open the <strong>Family Link</strong> app on your phone</li>
              <li>2. Select your child's account</li>
              <li>3. Tap <strong>Controls</strong> → <strong>Content restrictions</strong> → <strong>Google Chrome</strong></li>
              <li>4. Select <strong>"Only allow certain sites"</strong></li>
              <li>5. Tap <strong>Manage sites</strong> → <strong>Add a website</strong></li>
              <li>6. Add <strong>both</strong> of these websites:</li>
            </ol>
            <div className="mt-3 space-y-2">
              <div className="bg-white border border-red-200 rounded-lg p-3">
                <p className="text-sm"><strong>Site 1:</strong> <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono text-red-600">getsafetube.com</code></p>
                <p className="text-xs text-gray-500 mt-1">SafeTube app (parental controls)</p>
              </div>
              <div className="bg-white border border-red-200 rounded-lg p-3">
                <p className="text-sm"><strong>Site 2:</strong> <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono text-red-600">youtube-nocookie.com</code></p>
                <p className="text-xs text-gray-500 mt-1">Video playback (embed-only, no browsing)</p>
              </div>
            </div>
            <div className="mt-4 bg-green-100 border border-green-300 rounded-lg p-3">
              <p className="text-xs text-green-800">
                <strong>Why two sites?</strong> youtube-nocookie.com is YouTube's privacy-enhanced embed domain.
                It <em>only</em> plays videos embedded in SafeTube — your child <strong>cannot</strong> browse or search YouTube directly with this domain.
              </p>
            </div>
          </div>
        )}

        {!selectedDevice && (
          <div className="text-center text-gray-400 py-6 border-2 border-dashed border-gray-200 rounded-xl">
            <p>Select a device above to see instructions</p>
          </div>
        )}
      </div>

      {/* Step 2: Kids Log In */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
            2
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Kids Log In</h2>
            <p className="text-gray-600 text-sm mt-1">
              Once you've locked down their device, they can access SafeTube.
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Instructions */}
            <div className="flex-1">
              <h3 className="font-bold text-green-900 mb-3">How Kids Log In:</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>1. Open their web browser</li>
                <li>2. Go to: <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono font-bold text-red-600">getsafetube.com/play</code></li>
                <li>3. Enter Family Code: <strong className="text-red-600">{userData?.familyCode || '(loading...)'}</strong></li>
                <li>4. Select their profile</li>
                <li>5. Start watching approved videos!</li>
              </ol>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center gap-2">
              <QRCode url="https://getsafetube.com/play" size={100} />
              <p className="text-xs text-green-700 font-medium text-center">
                Scan with kid's device
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-orange-900 mb-4">What's Next?</h3>
        <div className="space-y-3">
          <button
            onClick={() => onNavigate?.('account')}
            className="w-full flex items-center gap-3 p-3 bg-white hover:bg-orange-100 rounded-lg border border-orange-200 transition text-left"
          >
            <span className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
            <div>
              <p className="font-semibold text-gray-900">Add Kid Profiles</p>
              <p className="text-sm text-gray-600">Create a profile for each child</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate?.('content')}
            className="w-full flex items-center gap-3 p-3 bg-white hover:bg-orange-100 rounded-lg border border-orange-200 transition text-left"
          >
            <span className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
            <div>
              <p className="font-semibold text-gray-900">Add YouTube Channels</p>
              <p className="text-sm text-gray-600">Search and approve safe channels</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
