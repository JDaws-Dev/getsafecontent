import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useToast } from '../common/Toast';
import { Check, ExternalLink, Clock } from 'lucide-react';

// ============================================================
// ICONS (inline SVGs — no emoji in the UI)
// ============================================================
const PhoneIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const LaptopIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 16V6a1 1 0 011-1h12a1 1 0 011 1v10M3 19h18" />
  </svg>
);

const WindowIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm0 4h16M11 10v10" />
  </svg>
);

const DesktopIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LightbulbIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const ArrowUpIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
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

function GettingStarted({ user, onNavigateToTab }) {
  const { showToast, ToastContainer } = useToast();
  const fullUser = useQuery(api.users.getUser, user ? { userId: user._id } : 'skip');
  const [selectedDevice, setSelectedDevice] = useState(null);
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
              Use your device's parental controls to block all websites except SafeTunes.
            </p>
          </div>
        </div>

        <p className="text-sm font-semibold text-gray-700 mb-3">Select their device type:</p>

        {/* Device Selection Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {[
            { id: 'ios', icon: <PhoneIcon className="w-8 h-8" />, name: 'iPhone/iPad', difficulty: 'Easy' },
            { id: 'android', icon: <PhoneIcon className="w-8 h-8" />, name: 'Android', difficulty: 'Easy' },
            { id: 'chromebook', icon: <LaptopIcon className="w-8 h-8" />, name: 'Chromebook', difficulty: 'Easy' },
            { id: 'windows', icon: <WindowIcon className="w-8 h-8" />, name: 'Windows', difficulty: 'Medium' },
            { id: 'mac', icon: <DesktopIcon className="w-8 h-8" />, name: 'Mac', difficulty: 'Medium' },
          ].map((device) => (
            <button
              key={device.id}
              onClick={() => setSelectedDevice(device.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedDevice === device.id
                  ? 'border-accent-600 bg-accent-50 shadow-lg'
                  : 'border-gray-300 bg-white hover:border-accent-400'
              }`}
            >
              <div className="flex justify-center mb-2 text-accent-600">{device.icon}</div>
              <div className="font-bold text-sm">{device.name}</div>
              <div className="text-xs text-gray-600">{device.difficulty}</div>
            </button>
          ))}
        </div>

        {/* Device Instructions */}
        {selectedDevice === 'ios' && (
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-6">
            <h3 className="font-display font-bold text-brand-navy mb-4 flex items-center gap-2">
              <PhoneIcon className="w-5 h-5 text-accent-600 flex-shrink-0" />iPhone/iPad Setup
            </h3>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">1.</span>
                <span>Open <strong>Settings</strong> → <strong>Screen Time</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">2.</span>
                <span>Turn on Screen Time and set a passcode (don't share with your child)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">3.</span>
                <span>Tap <strong>Content & Privacy Restrictions</strong> → Turn it ON</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">4.</span>
                <span>Tap <strong>Content Restrictions</strong> → <strong>Web Content</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">5.</span>
                <span>Select <strong>"Allowed Websites Only"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">6.</span>
                <span>Delete ALL websites in the list by swiping left on each one (Apple pre-adds sites like Discovery Kids - remove them all)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">7.</span>
                <span>Tap <strong>"Add Website"</strong> and enter:</span>
              </li>
            </ol>
            <div className="mt-3 ml-8 bg-white border-2 border-accent-300 rounded-lg p-4">
              <p className="text-sm"><strong>Title:</strong> SafeTunes</p>
              <p className="text-sm"><strong>URL:</strong> <code className="bg-yellow-100 px-2 py-1 rounded font-mono text-accent-700">getsafetunes.com</code></p>
            </div>
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-900">
                <strong>Important:</strong> Do NOT include "https://", "www.", or "/play" - just type: <code className="bg-white px-1 py-0.5 rounded">getsafetunes.com</code>
              </p>
            </div>
          </div>
        )}

        {selectedDevice === 'android' && (
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-6">
            <h3 className="font-display font-bold text-brand-navy mb-4 flex items-center gap-2">
              <PhoneIcon className="w-5 h-5 text-accent-600 flex-shrink-0" />Android Setup (Family Link)
            </h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-900">
                <strong>Prerequisite:</strong> Your child needs a supervised Google Family Link account.{' '}
                <a
                  href="https://families.google.com/familylink/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 underline hover:text-amber-800 inline-flex items-center gap-1"
                >
                  Set up Family Link <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">1.</span>
                <span>Open the <strong>Family Link</strong> app on your phone</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">2.</span>
                <span>Select your child's account</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">3.</span>
                <span>Tap <strong>Controls</strong> → <strong>Content restrictions</strong> → <strong>Google Chrome</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">4.</span>
                <span>Select <strong>"Only allow certain sites"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">5.</span>
                <span>Tap <strong>Manage sites</strong> → <strong>Add a website</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">6.</span>
                <span>Type: <code className="bg-white px-2 py-1 rounded font-mono">getsafetunes.com</code> and tap Add</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">7.</span>
                <span>Remove any other websites from the "Approved" list</span>
              </li>
            </ol>
          </div>
        )}

        {selectedDevice === 'chromebook' && (
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-6">
            <h3 className="font-display font-bold text-brand-navy mb-4 flex items-center gap-2">
              <LaptopIcon className="w-5 h-5 text-accent-600 flex-shrink-0" />Chromebook Setup
            </h3>
            <p className="text-xs text-gray-600 mb-4 italic">
              Prerequisite: Your child must be signed in with a supervised Google Account (Family Link).
            </p>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">1.</span>
                <span>Open <strong>Settings</strong> on the Chromebook</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">2.</span>
                <span>Go to <strong>People</strong> → <strong>Parental Controls</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">3.</span>
                <span>Select your child's account → <strong>Permissions</strong> → <strong>Sites</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">4.</span>
                <span>Select <strong>"Block all sites"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">5.</span>
                <span>Under "Allowed", click <strong>Add</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">6.</span>
                <span>Type: <code className="bg-white px-2 py-1 rounded font-mono">getsafetunes.com</code></span>
              </li>
            </ol>
          </div>
        )}

        {selectedDevice === 'windows' && (
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-6">
            <h3 className="font-display font-bold text-brand-navy mb-4 flex items-center gap-2">
              <WindowIcon className="w-5 h-5 text-accent-600 flex-shrink-0" />Windows Setup (Family Safety)
            </h3>
            <p className="text-xs text-gray-600 mb-4 italic">
              Prerequisite: Your child must have a Microsoft Family account.
            </p>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">1.</span>
                <span>Go to <strong>family.microsoft.com</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">2.</span>
                <span>Sign in and select your child's account</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">3.</span>
                <span>Click <strong>Content Restrictions</strong> → <strong>Web Browsing</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">4.</span>
                <span>Turn on <strong>"Only allow these websites"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">5.</span>
                <span>Click <strong>Add a website</strong> and type: <code className="bg-white px-2 py-1 rounded font-mono">getsafetunes.com</code></span>
              </li>
            </ol>
          </div>
        )}

        {selectedDevice === 'mac' && (
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-6">
            <h3 className="font-display font-bold text-brand-navy mb-4 flex items-center gap-2">
              <DesktopIcon className="w-5 h-5 text-accent-600 flex-shrink-0" />Mac Setup (Screen Time)
            </h3>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">1.</span>
                <span>Open <strong>System Settings</strong> → <strong>Screen Time</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">2.</span>
                <span>Turn on Screen Time and set a passcode</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">3.</span>
                <span>Click <strong>Content & Privacy</strong> → <strong>Content</strong> tab</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">4.</span>
                <span>Under "Web Content", select <strong>"Limit Adult Websites"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">5.</span>
                <span>Click <strong>Customize</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">6.</span>
                <span>In "Never Allow", add: <code className="bg-white px-2 py-1 rounded font-mono">*</code> (blocks everything)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-accent-600 flex-shrink-0">7.</span>
                <span>In "Always Allow", add: <code className="bg-white px-2 py-1 rounded font-mono">getsafetunes.com</code></span>
              </li>
            </ol>
          </div>
        )}

        {!selectedDevice && (
          <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-xl">
            <p className="text-lg flex items-center justify-center gap-2"><ArrowUpIcon className="w-5 h-5 flex-shrink-0" />Select a device above to see instructions</p>
          </div>
        )}
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
                  <span>Go to: <code className="bg-white px-2 py-1 rounded font-mono font-bold">getsafetunes.com/play</code></span>
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
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center gap-2">
              <QRCode url="https://getsafetunes.com/play" size={120} />
              <p className="text-xs text-green-700 font-medium text-center">
                Scan with kid's device
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {/* iPhone App Option */}
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>iPhone Users:</strong> Download the <strong>SafeTunes app</strong> from the App Store for the best experience!{' '}
              <a
                href="https://apps.apple.com/app/safetunes-kids-music-player/id6744387963"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-600 underline hover:text-accent-700 inline-flex items-center gap-1"
              >
                Get it here <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Home Screen Tip */}
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>No App Store?</strong> On any device, they can add SafeTunes to their home screen for easy access (Share → Add to Home Screen)
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
                Lock your child into the SafeTunes app so they can't exit to other apps.
              </p>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <ol className="space-y-2 text-sm text-accent-50">
                  <li>1. Go to Settings → Accessibility → Guided Access</li>
                  <li>2. Turn on Guided Access and set a passcode</li>
                  <li>3. Open SafeTunes, then triple-click the side button</li>
                  <li>4. Tap "Start" to lock them in</li>
                </ol>
                <p className="text-xs text-accent-100 mt-3">
                  Triple-click again and enter your passcode to exit.
                </p>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="space-y-3">
              <h4 className="font-display font-bold text-brand-navy">Common Issues:</h4>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-display font-semibold text-brand-navy mb-1 flex items-center gap-2"><XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />Kid can't access SafeTunes</h5>
                <p className="text-sm text-gray-600">
                  • Make sure you whitelisted <code className="bg-white px-1 rounded">getsafetunes.com</code> (not safetunesapp.com)<br/>
                  • Verify all other websites are blocked/removed<br/>
                  • Try visiting in an incognito/private window to test
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-display font-semibold text-brand-navy mb-1 flex items-center gap-2"><MusicNoteIcon className="w-4 h-4 text-accent-600 flex-shrink-0" />Music won't play</h5>
                <p className="text-sm text-gray-600">
                  • Check that you have an active Apple Music subscription<br/>
                  • Go to Settings → Apple Music and authorize your account<br/>
                  • Make sure you've approved some albums in your library
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-display font-semibold text-brand-navy mb-1 flex items-center gap-2"><GlobeIcon className="w-4 h-4 text-accent-600 flex-shrink-0" />Kid accessed other websites</h5>
                <p className="text-sm text-gray-600">
                  • Double-check your parental control settings<br/>
                  • Make sure you selected "Only allow these sites" or "Block all sites"<br/>
                  • Remove ALL pre-approved websites from the allowed list
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-display font-semibold text-brand-navy mb-1 flex items-center gap-2"><KeyIcon className="w-4 h-4 text-accent-600 flex-shrink-0" />Where's my Family Code?</h5>
                <p className="text-sm text-gray-600">
                  • Your Family Code is shown at the top of this page<br/>
                  • It's also in Settings → Account section<br/>
                  • The code never changes - it's unique to your family
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
                  • Create a separate profile for each child in Settings<br/>
                  • Each profile can have different approved music<br/>
                  • Kids choose their profile when they log in
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-display font-semibold text-brand-navy mb-1 flex items-center gap-2"><RefreshIcon className="w-4 h-4 text-accent-600 flex-shrink-0" />Kid keeps getting logged out</h5>
                <p className="text-sm text-gray-600">
                  • Make sure they're using Safari or Chrome (not private/incognito mode)<br/>
                  • Add SafeTunes to the home screen for best results<br/>
                  • On iPhone, download the native app from the App Store
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
            onClick={() => onNavigateToTab?.('settings')}
            className="w-full flex items-center gap-3 p-3 bg-white hover:bg-green-100 rounded-lg border border-green-200 transition text-left group"
          >
            <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">Add Kid Profiles</p>
              <p className="text-sm text-gray-600">Create a profile for each child with their own PIN</p>
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
              <p className="text-sm text-gray-600">Authorize your Apple Music subscription</p>
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
