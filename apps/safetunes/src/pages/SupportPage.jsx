import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Clock, ExternalLink, ChevronDown } from 'lucide-react';

// QR Code component using external API
function QRCode({ url, size = 120 }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=7c3aed`;

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

function SupportPage() {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: 'blocked',
      question: "What if my child tries to access other websites?",
      answer: "Once the device allows only getsafefamily.com and youtube-nocookie.com, other websites show a \"blocked\" page. With a parental-controls passcode they don't know, they can't change it."
    },
    {
      id: 'multiple-devices',
      question: "Do I need to do this on every device?",
      answer: "Yes, set up parental controls on each device your child uses. Approved music is the same on every device, and every device uses the same family code."
    },
    {
      id: 'remove-whitelist',
      question: "Can my child change the allowed websites?",
      answer: "No. As long as your parental-controls passcode is one they don't know, they can't change the list or turn the restrictions off."
    },
    {
      id: 'apple-music',
      question: "Does my child need an Apple Music subscription?",
      answer: "Your child doesn't need their own. You connect your Apple Music subscription (individual or family plan) once in SafeTunes, and your kids play the music you've approved through it."
    },
    {
      id: 'family-code',
      question: "Where do I find my Family Code?",
      answer: "Your family code is at the top of your dashboard at getsafefamily.com. The same code opens every Safe Family app."
    },
    {
      id: 'multiple-kids',
      question: "How do I set up multiple kids?",
      answer: "Add each child once in Family at getsafefamily.com/dashboard/family, with their own optional PIN. Each child can have different approved music. After entering your family code, kids pick their own name."
    },
    {
      id: 'logged-out',
      question: "Why does my kid keep getting logged out?",
      answer: "Make sure they're not in a private or incognito window. The SafeTunes home-screen icon (above) remembers your family code."
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
      answer: "Yes! If their school device allows access to getsafefamily.com/play, they can browse and request music. You'll get a notification and can review requests whenever it's convenient for you."
    }
  ];

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent-500 rounded-xl flex items-center justify-center">
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
          <div className="flex items-center justify-center gap-2 text-accent-600">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Setup takes about 5-10 minutes</span>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="container mx-auto px-4 sm:px-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-accent-500 rounded-2xl p-8 text-white mb-8">
            <h2 className="text-2xl font-bold mb-6">Two Simple Steps</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="bg-white/20 rounded-full w-12 h-12 flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Lock Down Their Device</h3>
                  <p className="text-accent-100">Use parental controls so the device only opens Safe Family</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-white/20 rounded-full w-12 h-12 flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Kids Log In & Listen</h3>
                  <p className="text-accent-100">They go to getsafefamily.com/play, enter your family code, and tap Music.</p>
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
                    <span>Go to: <code className="bg-white px-2 py-1 rounded font-mono font-bold text-accent-700">getsafefamily.com/play</code></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-green-600 flex-shrink-0">3.</span>
                    <span>Enter your family code (at the top of your dashboard), then tap <strong>Music</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-green-600 flex-shrink-0">4.</span>
                    <span>Pick their name and enter their PIN (if you set one)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-green-600 flex-shrink-0">5.</span>
                    <span>They can now listen to approved music.</span>
                  </li>
                </ol>

              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center gap-2">
                <QRCode url="https://getsafefamily.com/play" size={140} />
                <p className="text-sm text-green-700 font-medium text-center">
                  Scan with kid's device
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: lock down the device (full walkthrough lives on the hub) */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 1: Lock Down Their Device</h2>
            <p className="text-gray-600 mb-4">
              In Family Link (Android, Chromebook), Screen Time (iPhone, iPad, Mac) or Microsoft Family (Windows),
              choose <strong>allowed websites only</strong> and add these two sites:
            </p>
            <div className="space-y-2">
              {ALLOWED_SITES.map(([site, why]) => (
                <div key={site} className="bg-accent-50 border border-accent-200 rounded-lg p-3">
                  <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono text-accent-700 break-all">{site}</code>
                  <p className="text-xs text-gray-500 mt-1">{why}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Type just the name, with no &quot;https://&quot;, &quot;www.&quot; or &quot;/play&quot;.
            </p>
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900">
                <strong>Never approve youtube.com or m.youtube.com</strong>, even if a video won&apos;t play. One approval unlocks all of YouTube.
              </p>
            </div>
            <a
              href={LOCK_DOWN_GUIDE_URL}
              className="mt-5 inline-flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white px-5 py-3 rounded-xl font-semibold transition"
            >
              Step-by-step for each device <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Home-screen icon */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-gray-200 mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Give SafeTunes Its Own Icon</h2>
            <ol className="space-y-2 text-gray-700 list-decimal pl-5">
              <li>On your kid&apos;s iPhone or iPad, open <strong>getsafefamily.com/play/tunes</strong> in Safari.</li>
              <li>Tap Share, then <strong>Add to Home Screen</strong>.</li>
              <li>Open the new icon and enter your family code once. It opens straight into SafeTunes.</li>
            </ol>
            <p className="text-sm text-gray-600 mt-3">
              On Android or a Chromebook, open the same page in Chrome and use the menu, then Add to Home screen. There is nothing to download from an app store. The old SafeTunes iPhone app no longer works; delete it and use this icon instead.
            </p>
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
              className="inline-flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition shadow-lg hover:shadow-xl"
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
