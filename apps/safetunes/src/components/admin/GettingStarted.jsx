import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useToast } from '../common/Toast';
import { Check, ExternalLink, Clock } from 'lucide-react';
import { topNavigate } from '../../lib/embed';

// ============================================================
// ICONS (inline SVGs — no emoji in the UI)
// ============================================================
const PhoneIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const LightbulbIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const XCircleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MusicNoteIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
  </svg>
);

const GlobeIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const KeyIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l6.964-6.964A6 6 0 1121 9z" />
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const RefreshIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// QR Code component using external API
function QRCode({ url, size = 120 }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=7C4DE0`;

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

// The full per-device walkthrough lives on the hub so every app links one place.
const LOCK_DOWN_GUIDE_URL = 'https://getsafefamily.com/guides/lock-down';
const ALLOWED_SITES = [
  ['getsafefamily.com', 'Safe Family (every app)'],
  ['youtube-nocookie.com', "SafeTube's video player only (no search, no browsing)"],
];

function GettingStarted({ user, onNavigateToTab }) {
  const { showToast, ToastContainer } = useToast();
  const fullUser = useQuery(api.users.getUser, user ? { userId: user._id } : 'skip');
    const [showAdvancedTips, setShowAdvancedTips] = useState(false);

  // Progress tracking state - persisted in localStorage
  const [completedSteps, setCompletedSteps] = useState(() => {
    try {
      const saved = localStorage.getItem('safetunes_setup_progress');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist progress to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('safetunes_setup_progress', JSON.stringify(completedSteps));
    } catch {
      // Ignore storage errors
    }
  }, [completedSteps]);

  const toggleStep = (stepId) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-accent-500 rounded-2xl p-8 text-white">
        <h1 className="font-display text-3xl font-bold mb-3">Getting Started with SafeTunes</h1>
        <p className="text-accent-100 text-lg mb-3">
          Two simple steps to give your kids access to safe music on any device.
        </p>
        <div className="flex items-center gap-2 text-accent-200">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Setup takes about 5-10 minutes</span>
        </div>
      </div>

      {/* Family Code Card */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h2 className="font-display text-xl font-semibold text-brand-navy mb-3">Your Family Code</h2>
        <p className="text-gray-600 mb-4">
          Your kids will use this code to log in on their device.
        </p>

        {fullUser?.familyCode ? (
          <div className="bg-accent-50 border-2 border-accent-300 rounded-lg p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-5xl font-bold text-accent-600 tracking-widest font-mono">
                {fullUser.familyCode}
              </div>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(fullUser.familyCode);
                    showToast('Family code copied!', 'success');
                  } catch {
                    showToast(`Your family code is: ${fullUser.familyCode}`, 'info');
                  }
                }}
                className="px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-semibold transition shadow-md hover:shadow-lg"
              >
                Copy Code
              </button>
            </div>
          </div>
        ) : (
          <div className="text-2xl text-gray-400">Loading...</div>
        )}
      </div>

      {/* Step 1: Lock Down Device */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-start gap-4 mb-6">
          <button
            onClick={() => toggleStep('step1')}
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0 transition-all ${
              completedSteps.step1
                ? 'bg-green-500 text-white'
                : 'bg-accent-600 text-white hover:bg-accent-700'
            }`}
          >
            {completedSteps.step1 ? <Check className="w-6 h-6" /> : '1'}
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-bold text-brand-navy">Lock Down Their Device</h2>
              {completedSteps.step1 && (
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Completed
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              Use the device's parental controls so it only opens Safe Family.
            </p>
          </div>
        </div>

        <div className="bg-accent-50 border border-accent-200 rounded-lg p-6">
          <p className="text-sm text-gray-700 mb-3">
            In Family Link (Android, Chromebook), Screen Time (iPhone, iPad, Mac) or Microsoft Family (Windows),
            choose <strong>allowed websites only</strong> and add these two sites:
          </p>
          <div className="space-y-2">
            {ALLOWED_SITES.map(([site, why]) => (
              <div key={site} className="bg-white border border-accent-200 rounded-lg p-3">
                <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono text-accent-700 break-all">{site}</code>
                <p className="text-xs text-gray-500 mt-1">{why}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Type just the name, with no &quot;https://&quot;, &quot;www.&quot; or &quot;/play&quot;.
          </p>
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-900">
              <strong>Never approve youtube.com or m.youtube.com</strong>, even if a video won&apos;t play. One approval unlocks all of YouTube.
            </p>
          </div>
          <a
            href={LOCK_DOWN_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-700 hover:underline"
          >
            Step-by-step for each device, plus a 5-minute check <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Step 2: Kids Log In */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-start gap-4 mb-6">
          <button
            onClick={() => toggleStep('step2')}
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0 transition-all ${
              completedSteps.step2
                ? 'bg-green-500 text-white'
                : 'bg-accent-600 text-white hover:bg-accent-700'
            }`}
          >
            {completedSteps.step2 ? <Check className="w-6 h-6" /> : '2'}
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-bold text-brand-navy">Kids Can Now Log In</h2>
              {completedSteps.step2 && (
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Completed
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              Once you've locked down their device, they can access SafeTunes.
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Instructions */}
            <div className="flex-1">
              <h3 className="font-display font-bold text-green-900 mb-4">How Kids Log In:</h3>
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <span className="font-bold text-green-600 flex-shrink-0">1.</span>
                  <span>Open their web browser (Safari, Chrome, etc.)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-green-600 flex-shrink-0">2.</span>
                  <span>Go to: <code className="bg-white px-2 py-1 rounded font-mono font-bold">getsafefamily.com/play</code></span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-green-600 flex-shrink-0">3.</span>
                  <span>Enter your Family Code: <strong className="text-accent-600">{fullUser?.familyCode || '(see above)'}</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-green-600 flex-shrink-0">4.</span>
                  <span>Select their profile and enter their PIN (if you set one)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-green-600 flex-shrink-0">5.</span>
                  <span>They can now listen to all the music you've approved!</span>
                </li>
              </ol>
              <p className="text-xs text-green-700 mt-3">One family code opens all your family's apps.</p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center gap-2">
              <QRCode url="https://getsafefamily.com/play" size={120} />
              <p className="text-xs text-green-700 font-medium text-center">
                Scan with kid's device
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {/* Home Screen Tip */}
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Give SafeTunes its own icon:</strong> On your kid's iPhone or iPad, open <strong>getsafefamily.com/play/tunes</strong> in Safari, tap Share, then Add to Home Screen. The icon opens straight into SafeTunes; enter your family code once inside it. On Android or a Chromebook, use Chrome's menu, then Add to Home screen. There is nothing to download from an app store.
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Tips */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <button
          onClick={() => setShowAdvancedTips(!showAdvancedTips)}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <LightbulbIcon className="w-5 h-5 text-accent-600" />
            <div className="text-left">
              <h3 className="font-display text-lg font-bold text-brand-navy">Advanced Tips & Troubleshooting</h3>
              <p className="text-sm text-gray-600">Guided Access, multiple devices, common issues</p>
            </div>
          </div>
          <svg
            className={`w-6 h-6 text-gray-600 transition-transform ${showAdvancedTips ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvancedTips && (
          <div className="px-6 pb-6 space-y-4">
            {/* Guided Access */}
            <div className="bg-accent-600 rounded-2xl p-6 text-white">
              <h4 className="font-display text-xl font-bold mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                iOS Guided Access (Extra Security)
              </h4>
              <p className="text-accent-100 mb-4">
                Keep your child in SafeTunes so they can't switch to other apps.
              </p>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <ol className="space-y-2 text-sm text-accent-50">
                  <li>1. Go to Settings → Accessibility → Guided Access</li>
                  <li>2. Turn on Guided Access and set a passcode</li>
                  <li>3. Open SafeTunes (the home-screen icon), then triple-click the side button</li>
                  <li>4. Tap "Start" to lock them in</li>
                </ol>
                <p className="text-xs text-accent-100 mt-3">
                  Works with the SafeTunes home-screen icon or Safari. Triple-click again and enter your passcode to exit.
                </p>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="space-y-3">
              <h4 className="font-display font-bold text-brand-navy">Common Issues:</h4>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-display font-semibold text-brand-navy mb-1 flex items-center gap-2"><XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />Kid can't access SafeTunes</h5>
                <p className="text-sm text-gray-600">
                  • Make sure <code className="bg-white px-1 rounded">getsafefamily.com</code> is on the allowed list<br/>
                  • Check the spelling: no "https://", "www." or "/play"<br/>
                  • Had the old SafeTunes iPhone app? It no longer works. Delete it and add the home-screen icon (above)
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-display font-semibold text-brand-navy mb-1 flex items-center gap-2"><MusicNoteIcon className="w-4 h-4 text-accent-600 flex-shrink-0" />Music won't play</h5>
                <p className="text-sm text-gray-600">
                  • Check that your Apple Music subscription is active<br/>
                  • Connect Apple Music in SafeTunes (in Safari or Chrome, not from a home-screen icon)<br/>
                  • Make sure you've approved some albums for that kid<br/>
                  • Using Circle, Bark or a router filter? See the background services in the lock-down guide
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-display font-semibold text-brand-navy mb-1 flex items-center gap-2"><GlobeIcon className="w-4 h-4 text-accent-600 flex-shrink-0" />Kid accessed other websites</h5>
                <p className="text-sm text-gray-600">
                  • Double-check your parental control settings<br/>
                  • Make sure you chose "Only allow approved sites" (Family Link) or "Allowed Websites Only" (Screen Time)<br/>
                  • Remove ALL pre-approved websites from the allowed list
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-display font-semibold text-brand-navy mb-1 flex items-center gap-2"><KeyIcon className="w-4 h-4 text-accent-600 flex-shrink-0" />Where's my Family Code?</h5>
                <p className="text-sm text-gray-600">
                  • Your Family Code is shown at the top of this page<br/>
                  • It's also at the top of your dashboard at getsafefamily.com<br/>
                  • The same code opens every Safe Family app
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-display font-semibold text-brand-navy mb-1 flex items-center gap-2"><PhoneIcon className="w-4 h-4 text-accent-600 flex-shrink-0" />Setting up multiple devices</h5>
                <p className="text-sm text-gray-600">
                  • Repeat Step 1 on each child's device<br/>
                  • All devices use the same Family Code<br/>
                  • Each child selects their own profile after logging in
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-display font-semibold text-brand-navy mb-1 flex items-center gap-2"><UsersIcon className="w-4 h-4 text-accent-600 flex-shrink-0" />Multiple kids in the family</h5>
                <p className="text-sm text-gray-600">
                  • Add each child once in Family at getsafefamily.com/dashboard/family<br/>
                  • Each profile can have different approved music<br/>
                  • Kids choose their profile when they log in
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-display font-semibold text-brand-navy mb-1 flex items-center gap-2"><RefreshIcon className="w-4 h-4 text-accent-600 flex-shrink-0" />Kid keeps getting logged out</h5>
                <p className="text-sm text-gray-600">
                  • Make sure they're using Safari or Chrome (not private/incognito mode)<br/>
                  • Use the SafeTunes home-screen icon (above) so the family code is remembered
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* What's Next */}
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
        <h3 className="font-display text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />What's Next?
        </h3>
        <div className="space-y-3">
          <button
            onClick={() => topNavigate('/dashboard/family')}
            className="w-full flex items-center gap-3 p-3 bg-white hover:bg-green-100 rounded-lg border border-green-200 transition text-left group"
          >
            <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">Add Your Kids</p>
              <p className="text-sm text-gray-600">Add each child once in Family; every app uses the same profiles</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-600 flex-shrink-0" />
          </button>

          <button
            onClick={() => onNavigateToTab?.('settings')}
            className="w-full flex items-center gap-3 p-3 bg-white hover:bg-green-100 rounded-lg border border-green-200 transition text-left group"
          >
            <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">Connect Apple Music</p>
              <p className="text-sm text-gray-600">Connect your Apple Music once; your kids play through it</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-600 flex-shrink-0" />
          </button>

          <button
            onClick={() => onNavigateToTab?.('add')}
            className="w-full flex items-center gap-3 p-3 bg-white hover:bg-green-100 rounded-lg border border-green-200 transition text-left group"
          >
            <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">Start Approving Music</p>
              <p className="text-sm text-gray-600">Search for albums and songs to add to your library</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-600 flex-shrink-0" />
          </button>
        </div>
      </div>

      {ToastContainer}
    </div>
  );
}

export default GettingStarted;
