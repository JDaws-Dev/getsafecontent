import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Clock, ExternalLink, ChevronDown } from 'lucide-react';

// QR Code component using external API
function QRCode({ url, size = 120 }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=7c3aed`;

  return (
    <div className="bg-white p-2 rounded-lg shadow-sm border border-purple-200">
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

function SupportPage() {
  const [activeGuide, setActiveGuide] = useState('ios');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: 'blocked',
      question: "What if my child tries to access other websites?",
      answer: "With proper whitelisting configured, they'll see a \"blocked\" message and won't be able to access anything except SafeTunes. The parental controls prevent them from changing these settings."
    },
    {
      id: 'multiple-devices',
      question: "Do I need to do this on every device?",
      answer: "Yes, you'll need to configure parental controls on each device your child uses. However, once set up, the SafeTunes account syncs across all devices—approved albums are the same everywhere. All devices use the same Family Code."
    },
    {
      id: 'remove-whitelist',
      question: "Can my child remove SafeTunes from the whitelist?",
      answer: "No. As long as you've set up parental controls with a password they don't know, they cannot modify the whitelist or disable restrictions."
    },
    {
      id: 'apple-music',
      question: "Does my child need an Apple Music subscription?",
      answer: "Yes, you'll need an active Apple Music subscription for your child to play full songs. SafeTunes works by only showing approved music from your Apple Music library through a kid-safe interface."
    },
    {
      id: 'family-code',
      question: "Where do I find my Family Code?",
      answer: "Your Family Code is shown at the top of the Getting Started page in your parent dashboard, and also in Settings → Account section. The code never changes—it's unique to your family."
    },
    {
      id: 'multiple-kids',
      question: "How do I set up multiple kids?",
      answer: "Create a separate profile for each child in Settings → Family Management. Each profile can have different approved music and their own PIN. When kids log in with your Family Code, they'll choose their own profile."
    },
    {
      id: 'logged-out',
      question: "Why does my kid keep getting logged out?",
      answer: "Make sure they're using Safari or Chrome (not private/incognito mode). For the best experience, add SafeTunes to the home screen, or on iPhone, download the native app from the App Store."
    },
    {
      id: 'resent',
      question: "Will my kid resent me for using SafeTunes?",
      answer: "Most kids actually enjoy having their own music player! They can request new music, build playlists, and explore within safe boundaries. The request system teaches them to communicate about what they want to listen to."
    },
    {
      id: 'requests',
      question: "How often will my kid request music?",
      answer: "It varies by family, but most parents see a few requests per week after the initial setup. You can approve or deny requests right from your phone, and kids learn quickly what types of music you'll approve."
    },
    {
      id: 'school',
      question: "Can my kid request music from school?",
      answer: "Yes! If their school device allows access to getsafetunes.com, they can browse and request music. You'll get a notification and can review requests whenever it's convenient for you."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-7 sm:h-7 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
                <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
              </svg>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-gray-900">SafeTunes</span>
          </Link>
          <Link
            to="/"
            className="text-gray-700 hover:text-gray-900 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Setup Guide & Support
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Step-by-step instructions to set up SafeTunes on your child's devices
          </p>
          <div className="flex items-center justify-center gap-2 text-purple-600">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Setup takes about 5-10 minutes</span>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="container mx-auto px-4 sm:px-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 text-white mb-8">
            <h2 className="text-2xl font-bold mb-6">Two Simple Steps</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="bg-white/20 rounded-full w-12 h-12 flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Lock Down Their Device</h3>
                  <p className="text-purple-100">Use parental controls to block all websites except SafeTunes</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-white/20 rounded-full w-12 h-12 flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Kids Log In & Listen</h3>
                  <p className="text-purple-100">They go to getsafetunes.com/play, enter your Family Code, and enjoy!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Kid Login Section with QR Code */}
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mb-8">
            <h3 className="text-xl font-bold text-green-900 mb-4">How Kids Log In</h3>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <ol className="space-y-3 text-gray-700">
                  <li className="flex gap-3">
                    <span className="font-bold text-green-600 flex-shrink-0">1.</span>
                    <span>Open their web browser (Safari, Chrome, etc.)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-green-600 flex-shrink-0">2.</span>
                    <span>Go to: <code className="bg-white px-2 py-1 rounded font-mono font-bold text-purple-700">getsafetunes.com/play</code></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-green-600 flex-shrink-0">3.</span>
                    <span>Enter your Family Code (found in your parent dashboard)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-green-600 flex-shrink-0">4.</span>
                    <span>Select their profile and enter PIN (if set)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-green-600 flex-shrink-0">5.</span>
                    <span>They can now listen to approved music! 🎵</span>
                  </li>
                </ol>

                {/* iPhone App Callout */}
                <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    📱 <strong>iPhone Users:</strong> Download the <strong>SafeTunes app</strong> from the App Store for the best experience!{' '}
                    <a
                      href="https://apps.apple.com/app/safetunes-kids-music-player/id6744387963"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 underline hover:text-purple-700 inline-flex items-center gap-1"
                    >
                      Get it here <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center gap-2">
                <QRCode url="https://getsafetunes.com/play" size={140} />
                <p className="text-sm text-green-700 font-medium text-center">
                  Scan with kid's device
                </p>
              </div>
            </div>
          </div>

          {/* Device Selection */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Step 1: Lock Down Their Device
            </h2>
            <p className="text-center text-gray-600 mb-6">Select their device type to see setup instructions:</p>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {[
                { id: 'ios', icon: '📱', name: 'iPhone/iPad', difficulty: 'Easy' },
                { id: 'android', icon: '📱', name: 'Android', difficulty: 'Easy' },
                { id: 'chromebook', icon: '💻', name: 'Chromebook', difficulty: 'Easy' },
                { id: 'windows', icon: '🖥️', name: 'Windows', difficulty: 'Medium' },
                { id: 'mac', icon: '🍎', name: 'Mac', difficulty: 'Medium' },
                { id: 'kindle', icon: '📚', name: 'Kindle Fire', difficulty: 'Easy' },
              ].map((device) => (
                <button
                  key={device.id}
                  onClick={() => setActiveGuide(device.id)}
                  className={`px-5 py-3 rounded-xl font-semibold transition flex flex-col items-center min-w-[100px] ${
                    activeGuide === device.id
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-400'
                  }`}
                >
                  <span className="text-2xl mb-1">{device.icon}</span>
                  <span className="text-sm">{device.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* iOS Guide */}
          {activeGuide === 'ios' && (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="text-3xl">📱</span> iPhone / iPad Setup
              </h2>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Open Screen Time Settings</h3>
                    <p className="text-gray-600">Go to <strong>Settings</strong> → <strong>Screen Time</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Turn On & Set Passcode</h3>
                    <p className="text-gray-600">Turn on Screen Time and set a passcode (don't share with your child)</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Enable Content Restrictions</h3>
                    <p className="text-gray-600">Tap <strong>Content & Privacy Restrictions</strong> → Turn it <strong>ON</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Restrict Web Content</h3>
                    <p className="text-gray-600">Tap <strong>Content Restrictions</strong> → <strong>Web Content</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">5</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Select "Allowed Websites Only"</h3>
                    <p className="text-gray-600">This blocks all websites except ones you approve</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">6</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Delete ALL Pre-Added Websites</h3>
                    <p className="text-gray-600">
                      <strong className="text-red-600">Important:</strong> Swipe left on each website in the list to delete them (Apple pre-adds sites like Discovery Kids - remove them all)
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">7</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Add SafeTunes</h3>
                    <p className="text-gray-600 mb-2">Tap <strong>"Add Website"</strong> and enter:</p>
                    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                      <p><strong>Title:</strong> SafeTunes</p>
                      <p><strong>URL:</strong> <code className="bg-yellow-100 px-2 py-1 rounded font-mono text-purple-700">getsafetunes.com</code></p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900">
                    <strong>⚠️ Important:</strong> Do NOT include "https://", "www.", or "/play" - just type: <code className="bg-white px-1 py-0.5 rounded">getsafetunes.com</code>
                  </p>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-green-900 mb-1">Setup Complete!</h4>
                      <p className="text-green-800">Your child can now only browse SafeTunes. All other websites will be blocked.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Android Guide */}
          {activeGuide === 'android' && (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="text-3xl">📱</span> Android Setup (Family Link)
              </h2>

              {/* Prerequisite Callout */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-900">
                  <strong>📋 Prerequisite:</strong> Your child needs a supervised Google Family Link account.{' '}
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

              <div className="space-y-6">
                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Open Family Link App</h3>
                    <p className="text-gray-600">Open the Family Link app on your phone</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Select Your Child</h3>
                    <p className="text-gray-600">Select your child's account</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Configure Chrome Restrictions</h3>
                    <p className="text-gray-600">Tap <strong>Controls</strong> → <strong>Content restrictions</strong> → <strong>Google Chrome</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Select "Only allow certain sites"</h3>
                    <p className="text-gray-600">This blocks all sites except approved ones</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">5</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Add SafeTunes</h3>
                    <p className="text-gray-600">Tap <strong>Manage sites</strong> → <strong>Add a website</strong></p>
                    <p className="text-gray-600 mt-1">Type: <code className="bg-purple-50 px-2 py-1 rounded font-mono">getsafetunes.com</code> and tap Add</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">6</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Remove Other Websites</h3>
                    <p className="text-gray-600">Remove any other websites from the "Approved" list</p>
                  </div>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-green-900 mb-1">All Done!</h4>
                      <p className="text-green-800">Your child's Android device is now locked down to SafeTunes only.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chromebook Guide */}
          {activeGuide === 'chromebook' && (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="text-3xl">💻</span> Chromebook Setup
              </h2>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-900">
                  <strong>📋 Prerequisite:</strong> Your child must be signed in with a supervised Google Account (Family Link).
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Open Family Link App</h3>
                    <p className="text-gray-600">On your phone, open the Family Link app</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Select Your Child</h3>
                    <p className="text-gray-600">Select your child's account</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Configure Chrome</h3>
                    <p className="text-gray-600">Tap <strong>Controls</strong> → <strong>Content restrictions</strong> → <strong>Google Chrome</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Select "Only allow certain sites"</h3>
                    <p className="text-gray-600">Under "Permissions," tap <strong>Manage sites</strong> and choose this option</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">5</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Add SafeTunes</h3>
                    <p className="text-gray-600">Under "Approved sites," tap <strong>Add a website</strong></p>
                    <p className="text-gray-600 mt-1">Enter: <code className="bg-purple-50 px-2 py-1 rounded font-mono">getsafetunes.com</code></p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    💡 <strong>Tip:</strong> You can also set SafeTunes as the Chromebook homepage. On the Chromebook, go to Chrome Settings → On startup → Open a specific page → Add <code className="bg-white px-1 py-0.5 rounded">https://getsafetunes.com/play</code>
                  </p>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-green-900 mb-1">You're All Set!</h4>
                      <p className="text-green-800">Your child can now only access SafeTunes on their Chromebook.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Windows Guide */}
          {activeGuide === 'windows' && (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="text-3xl">🖥️</span> Windows Setup (Family Safety)
              </h2>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-900">
                  <strong>📋 Prerequisite:</strong> Your child must have a Microsoft Family account.{' '}
                  <a
                    href="https://family.microsoft.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-700 underline hover:text-amber-800 inline-flex items-center gap-1"
                  >
                    Set up Microsoft Family <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Go to Microsoft Family</h3>
                    <p className="text-gray-600">Go to <strong>family.microsoft.com</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Select Your Child</h3>
                    <p className="text-gray-600">Sign in and select your child's account</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Configure Web Browsing</h3>
                    <p className="text-gray-600">Click <strong>Content Restrictions</strong> → <strong>Web Browsing</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Enable Website Restrictions</h3>
                    <p className="text-gray-600">Turn on <strong>"Only allow these websites"</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">5</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Add SafeTunes</h3>
                    <p className="text-gray-600">Click <strong>Add a website</strong> and type: <code className="bg-purple-50 px-2 py-1 rounded font-mono">getsafetunes.com</code></p>
                  </div>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-green-900 mb-1">Setup Complete!</h4>
                      <p className="text-green-800">Your Windows PC is now restricted to SafeTunes only.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mac Guide */}
          {activeGuide === 'mac' && (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="text-3xl">🍎</span> Mac Setup (Screen Time)
              </h2>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Open Screen Time</h3>
                    <p className="text-gray-600">Open <strong>System Settings</strong> → <strong>Screen Time</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Turn On & Set Passcode</h3>
                    <p className="text-gray-600">Turn on Screen Time and set a passcode</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Configure Content & Privacy</h3>
                    <p className="text-gray-600">Click <strong>Content & Privacy</strong> → <strong>Content</strong> tab</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Limit Web Content</h3>
                    <p className="text-gray-600">Under "Web Content", select <strong>"Limit Adult Websites"</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">5</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Customize Allowed Sites</h3>
                    <p className="text-gray-600">Click <strong>Customize</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">6</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Block Everything</h3>
                    <p className="text-gray-600">In "Never Allow", add: <code className="bg-purple-50 px-2 py-1 rounded font-mono">*</code> (this blocks everything)</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">7</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Allow SafeTunes</h3>
                    <p className="text-gray-600">In "Always Allow", add: <code className="bg-purple-50 px-2 py-1 rounded font-mono">getsafetunes.com</code></p>
                  </div>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-green-900 mb-1">Setup Complete!</h4>
                      <p className="text-green-800">Your Mac is now restricted to SafeTunes only.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Kindle Fire Guide */}
          {activeGuide === 'kindle' && (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="text-3xl">📚</span> Kindle Fire Setup
              </h2>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Set Up Child Profile</h3>
                    <p className="text-gray-600">Swipe down from top → Settings → <strong>Profiles & Family Library</strong> → <strong>Add a Child Profile</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Configure Parental Controls</h3>
                    <p className="text-gray-600">Go to Settings → <strong>Parental Controls</strong> → Turn ON → Create a password</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Block Websites</h3>
                    <p className="text-gray-600">Tap <strong>Web Browser</strong> → Select <strong>"Block websites"</strong></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</span>
                  <div>
                    <h3 className="font-bold text-gray-900">Allow SafeTunes</h3>
                    <p className="text-gray-600">Tap <strong>"Approved websites"</strong> → Enter: <code className="bg-purple-50 px-2 py-1 rounded font-mono">getsafetunes.com</code> → Tap Add</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    💡 <strong>Tip:</strong> Open Silk Browser, go to getsafetunes.com/play, tap menu → "Add to Home" to create a shortcut
                  </p>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-green-900 mb-1">Setup Complete!</h4>
                      <p className="text-green-800">Your Kindle Fire is now restricted to SafeTunes only.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Guided Access Bonus Section */}
      <section className="container mx-auto px-4 sm:px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white">
            <h3 className="text-xl font-bold mb-3">🔒 Bonus: iOS Guided Access (Extra Security)</h3>
            <p className="text-blue-100 mb-4">
              Lock your child into the SafeTunes app so they can't exit to other apps.
            </p>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <ol className="space-y-2 text-sm text-blue-50">
                <li>1. Go to Settings → Accessibility → Guided Access</li>
                <li>2. Turn on Guided Access and set a passcode</li>
                <li>3. Open SafeTunes, then triple-click the side button</li>
                <li>4. Tap "Start" to lock them in</li>
              </ol>
              <p className="text-xs text-blue-100 mt-3">
                Triple-click again and enter your passcode to exit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div key={faq.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition"
                  >
                    <h3 className="font-semibold text-gray-900 pr-4">{faq.question}</h3>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                        expandedFaq === faq.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === faq.id && (
                    <div className="px-5 pb-5">
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Need Help */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Still Need Help?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              We're here to help you get SafeTunes set up perfectly for your family.
            </p>
            <a
              href="mailto:jeremiah@getsafefamily.com"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Support
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex justify-center space-x-6 mb-6">
            <Link to="/" className="text-gray-400 hover:text-white transition">Home</Link>
            <Link to="/login" className="text-gray-400 hover:text-white transition">Parent Login</Link>
            <Link to="/privacy" className="text-gray-400 hover:text-white transition">Privacy</Link>
            <Link to="/terms" className="text-gray-400 hover:text-white transition">Terms</Link>
          </div>
          <p className="text-gray-400">&copy; {new Date().getFullYear()} SafeTunes. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default SupportPage;
