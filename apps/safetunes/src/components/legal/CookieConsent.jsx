import { useState, useEffect } from 'react';

// Check if running in native iOS app or Android TWA
const isNativeApp = typeof window !== 'undefined' && (
  window.isInSafeTunesApp ||
  window.isSafeTunesApp ||
  /SafeTunesApp/.test(navigator.userAgent) ||
  // Detect TWA (Trusted Web Activity) - runs in standalone mode without browser UI
  (window.matchMedia('(display-mode: standalone)').matches && /Android/.test(navigator.userAgent))
);

/**
 * GDPR-compliant Cookie Consent Banner
 *
 * Manages user consent for:
 * - Essential cookies (always allowed)
 * - Analytics cookies (Facebook Pixel, Sentry)
 * - Marketing cookies (Facebook Pixel for ads)
 *
 * Stores consent in localStorage
 *
 * Note: Hidden in native apps (iOS/Android TWA) where tracking is disabled
 */
export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Don't show cookie banner in native apps - tracking is disabled anyway
    if (isNativeApp) {
      return;
    }

    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Apply saved consent preferences
      const consentData = JSON.parse(consent);
      applyConsent(consentData);
    }
  }, []);

  const applyConsent = (consent) => {
    // Store consent data globally for other components to check
    window.cookieConsent = consent;

    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: consent }));
  };

  const handleAcceptAll = () => {
    const consent = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    applyConsent(consent);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const consent = {
      essential: true, // Essential cookies always allowed
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    applyConsent(consent);
    setShowBanner(false);
  };

  const handleSavePreferences = (analytics, marketing) => {
    const consent = {
      essential: true,
      analytics,
      marketing,
      timestamp: Date.now(),
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    applyConsent(consent);
    setShowBanner(false);
    setShowDetails(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[10000] animate-slide-up">
      <div className="bg-white border-t-2 border-purple-600 shadow-2xl">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {!showDetails ? (
            // Simple Banner View
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🍪 We value your privacy
                </h3>
                <p className="text-sm text-gray-600">
                  We use cookies to improve your experience, analyze site traffic, and for marketing purposes.
                  You can customize your preferences or accept all cookies.{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    className="text-purple-600 hover:text-purple-700 underline"
                  >
                    Learn more
                  </a>
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:ml-4">
                <button
                  onClick={() => setShowDetails(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition whitespace-nowrap"
                >
                  Customize
                </button>
                <button
                  onClick={handleRejectAll}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition whitespace-nowrap"
                >
                  Reject All
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition whitespace-nowrap"
                >
                  Accept All
                </button>
              </div>
            </div>
          ) : (
            // Detailed Preferences View
            <DetailedPreferences
              onSave={handleSavePreferences}
              onBack={() => setShowDetails(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailedPreferences({ onSave, onBack }) {
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Cookie Preferences</h3>
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Essential Cookies */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">Essential Cookies</h4>
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                Always Active
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Required for the website to function properly. These cookies enable core functionality like security, authentication, and basic site operations.
          </p>
        </div>

        {/* Analytics Cookies */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Analytics Cookies</h4>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          <p className="text-sm text-gray-600">
            Help us understand how visitors interact with our website by collecting and reporting information anonymously. Used for error tracking and performance monitoring.
          </p>
        </div>

        {/* Marketing Cookies */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Marketing Cookies</h4>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          <p className="text-sm text-gray-600">
            Track your activity across websites to show you relevant ads and measure the effectiveness of our advertising campaigns.
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(analytics, marketing)}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}

// Helper function to check if consent is given for a specific category
export const hasConsent = (category) => {
  const consent = localStorage.getItem('cookie-consent');
  if (!consent) return false;

  const consentData = JSON.parse(consent);
  return consentData[category] === true;
};

// Export for use in other components
export const getCookieConsent = () => {
  const consent = localStorage.getItem('cookie-consent');
  if (!consent) return null;
  return JSON.parse(consent);
};
