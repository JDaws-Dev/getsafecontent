import { useState } from 'react';

// QR Code component using external API
function QRCode({ url, size = 120 }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=ef4444`;

  return (
    <div className="bg-white p-2 rounded-lg shadow-sm border border-accent-200">
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

// Full per-device walkthrough lives on the hub so every app links one place.
export const LOCK_DOWN_GUIDE_URL = 'https://getsafefamily.com/guides/lock-down';

const siteCode = 'bg-yellow-100 px-2 py-0.5 rounded font-mono text-accent-600 break-all';

function WarningIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
    </svg>
  );
}

// Approving youtube.com (often while troubleshooting playback) unlocks ALL of
// YouTube on a Family Link device. SafeTube never needs it.
function NeverApproveYouTube() {
  return (
    <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-4">
      <div className="flex gap-3">
        <WarningIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div className="text-sm text-red-900 space-y-1">
          <p className="font-bold">Never approve youtube.com or m.youtube.com, even if a video won't play.</p>
          <p>One approval unlocks all of YouTube. SafeTube only needs <code className={siteCode}>youtube-nocookie.com</code>, which is just the video player: no search, no browsing.</p>
        </div>
      </div>
    </div>
  );
}

function AllowedSites() {
  const sites = [
    ['getsafefamily.com', 'Safe Family and SafeTube'],
    ['youtube-nocookie.com', 'Video player only (no search, no browsing)'],
  ];
  return (
    <div className="mt-3 space-y-2">
      {sites.map(([site, why]) => (
        <div key={site} className="bg-white border border-accent-200 rounded-lg p-3">
          <p className="text-sm"><code className={siteCode}>{site}</code></p>
          <p className="text-xs text-gray-500 mt-1">{why}</p>
        </div>
      ))}
      <p className="text-xs text-gray-600">That's all SafeTube needs. Add your child's school sites if they use them.</p>
    </div>
  );
}

function BlockedSites() {
  return (
    <div className="mt-3 bg-white border border-red-200 rounded-lg p-3">
      <p className="text-sm font-semibold text-gray-900 mb-1">Then, under <strong>Manage sites</strong> → <strong>Blocked</strong>, add:</p>
      <p className="text-sm"><code className={siteCode}>youtube.com</code> and <code className={siteCode}>m.youtube.com</code></p>
      <p className="text-xs text-gray-500 mt-1">A second lock in case YouTube is ever approved by mistake.</p>
    </div>
  );
}

function FamilyLinkSiteSteps() {
  return (
    <ol className="space-y-2 text-sm text-gray-700">
      <li>1. Open the <strong>Family Link</strong> app on your phone</li>
      <li>2. Select your child's account</li>
      <li>3. Tap <strong>Controls</strong> → <strong>Content restrictions</strong> → <strong>Google Chrome</strong></li>
      <li>4. Select <strong>"Only allow approved sites"</strong></li>
      <li>5. Tap <strong>Manage sites</strong> → <strong>Approved</strong> and add these:</li>
    </ol>
  );
}

function PlayStoreSteps() {
  return (
    <div>
      <h4 className="font-semibold text-gray-900 mb-2 text-sm">Lock down Google Play</h4>
      <ol className="space-y-2 text-sm text-gray-700">
        <li>1. In Family Link: <strong>Controls</strong> → <strong>Content restrictions</strong> → <strong>Google Play</strong> → set <strong>Require approval for</strong> to <strong>All content</strong></li>
        <li>2. In <strong>Controls</strong> → <strong>Apps</strong>, <strong>block</strong> YouTube, YouTube Kids and any other browser apps</li>
      </ol>
    </div>
  );
}

function GuestModeWarning() {
  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
      <div className="flex gap-3">
        <WarningIcon className="w-6 h-6 text-amber-600 flex-shrink-0" />
        <div className="text-sm text-amber-900">
          <p className="font-bold mb-1">Turn off Guest mode</p>
          <p className="mb-2">A guest on a Chromebook gets Chrome with no Family Link at all: no filter, no time limits. Only the owner (the first account ever signed in to this Chromebook) can turn it off:</p>
          <ol className="space-y-1">
            <li>1. Sign in as the owner → <strong>Settings</strong> → <strong>Security and privacy</strong> (older: <strong>Privacy and security</strong>) → <strong>Manage other people</strong></li>
            <li>2. Turn <strong>off</strong> "Enable Guest browsing"</li>
            <li>3. Turn <strong>on</strong> "Restrict sign-in to the following users" and list only your child and you</li>
          </ol>
          <p className="mt-2 text-xs">Check: after signing out, the login screen shows no "Browse as Guest".</p>
        </div>
      </div>
    </div>
  );
}

function FullGuideLink({ anchor }) {
  return (
    <a
      href={`${LOCK_DOWN_GUIDE_URL}#${anchor}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-semibold text-accent-600 hover:underline"
    >
      Full step-by-step guide, plus a 5-minute check
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </a>
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
      <div className="bg-accent-500 rounded-xl p-6 sm:p-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Getting Started with SafeTube</h1>
        <p className="text-accent-100 text-sm sm:text-base">
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
          <div className="bg-accent-50 border-2 border-accent-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-3xl sm:text-4xl font-bold text-accent-600 tracking-widest font-mono">
                {userData.familyCode}
              </div>
              <button
                onClick={copyFamilyCode}
                className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium transition shadow-md"
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
          <div className="w-10 h-10 bg-accent-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
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
                ? 'border-accent-500 bg-accent-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-accent-300'
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
                ? 'border-accent-500 bg-accent-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-accent-300'
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
                ? 'border-accent-500 bg-accent-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-accent-300'
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

        {/* Shown for every device: the one mistake that undoes everything */}
        <NeverApproveYouTube />

        {/* Device Instructions */}
        {selectedDevice === 'ios' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">iPhone/iPad Setup (Screen Time)</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>1. Open <strong>Settings</strong> → <strong>Screen Time</strong></li>
                <li>2. Turn on Screen Time and set a passcode your child doesn't know</li>
                <li>3. Tap <strong>Content & Privacy Restrictions</strong> → Turn ON</li>
                <li>4. Tap <strong>App Store, Media, Web & Games</strong> (older iOS: <strong>Content Restrictions</strong>) → <strong>Web Content</strong></li>
                <li>5. Select <strong>"Allowed Websites Only"</strong></li>
                <li>6. Delete ALL pre-added websites (swipe left to delete)</li>
                <li>7. Tap <strong>"Add Website"</strong> for each of these:</li>
              </ol>
              <AllowedSites />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">Then remove YouTube</h4>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>1. Delete the <strong>YouTube</strong> and <strong>YouTube Kids</strong> apps if they're installed</li>
                <li>2. In <strong>Content & Privacy Restrictions</strong> → <strong>iTunes & App Store Purchases</strong>, set <strong>Installing Apps</strong> to <strong>Don't Allow</strong></li>
              </ol>
            </div>
            <FullGuideLink anchor="ios" />
          </div>
        )}

        {selectedDevice === 'android' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Android Setup (Family Link)</h3>
              <FamilyLinkSiteSteps />
              <AllowedSites />
              <BlockedSites />
            </div>
            <PlayStoreSteps />
            <FullGuideLink anchor="android" />
          </div>
        )}

        {selectedDevice === 'chromebook' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Chromebook Setup (Family Link)</h3>
              <FamilyLinkSiteSteps />
              <AllowedSites />
              <BlockedSites />
            </div>
            <GuestModeWarning />
            <PlayStoreSteps />
            <FullGuideLink anchor="chromebook" />
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
          <div className="w-10 h-10 bg-accent-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
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
                <li>2. Go to: <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono font-bold text-accent-600">getsafefamily.com/play</code></li>
                <li>3. Enter Family Code: <strong className="text-accent-600">{userData?.familyCode || '(loading...)'}</strong></li>
                <li>4. Select their profile and enter their PIN</li>
                <li>5. Start watching approved videos!</li>
              </ol>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center gap-2">
              <QRCode url="https://getsafefamily.com/play" size={100} />
              <p className="text-xs text-green-700 font-medium text-center">
                Scan with kid's device
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-accent-50 border border-accent-200 rounded-xl p-6">
        <h3 className="text-lg font-display font-bold text-accent-900 mb-4">What's Next?</h3>
        <div className="space-y-3">
          <button
            onClick={() => onNavigate?.('account')}
            className="w-full flex items-center gap-3 p-3 bg-white hover:bg-accent-100 rounded-lg border border-accent-200 transition text-left"
          >
            <span className="w-8 h-8 bg-accent-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
            <div>
              <p className="font-semibold text-gray-900">Add Kid Profiles</p>
              <p className="text-sm text-gray-600">Create a profile for each child</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate?.('content')}
            className="w-full flex items-center gap-3 p-3 bg-white hover:bg-accent-100 rounded-lg border border-accent-200 transition text-left"
          >
            <span className="w-8 h-8 bg-accent-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
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
