import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { hasConsent } from '../legal/CookieConsent';

// Check if running in native iOS app or Android TWA
const isNativeApp = typeof window !== 'undefined' && (
  window.isInSafeTunesApp ||
  window.isSafeTunesApp ||
  /SafeTunesApp/.test(navigator.userAgent) ||
  // Detect TWA (Trusted Web Activity) - runs in standalone mode without browser UI
  (window.matchMedia('(display-mode: standalone)').matches && /Android/.test(navigator.userAgent))
);

// Google Ads Global Site Tag Component
export function GoogleAds() {
  const location = useLocation();
  const conversionId = import.meta.env.VITE_GOOGLE_ADS_ID;
  const [consentGiven, setConsentGiven] = useState(false);

  // Don't run any tracking in iOS app (no ATT permission)
  if (isNativeApp) {
    return null;
  }

  // Listen for consent changes
  useEffect(() => {
    const checkConsent = () => {
      setConsentGiven(hasConsent('marketing'));
    };

    // Check initial consent
    checkConsent();

    // Listen for consent changes
    window.addEventListener('cookieConsentChanged', checkConsent);
    return () => window.removeEventListener('cookieConsentChanged', checkConsent);
  }, []);

  useEffect(() => {
    // Only load Google Ads if:
    // 1. ID is configured
    // 2. Not in dev mode
    // 3. User has given marketing consent
    if (!conversionId || import.meta.env.DEV || !consentGiven) {
      return;
    }

    // Check if gtag is already loaded
    if (window.gtag) {
      return;
    }

    // Load Google Ads gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', conversionId);
  }, [conversionId, consentGiven]);

  // Track page views on route change
  useEffect(() => {
    if (conversionId && !import.meta.env.DEV && consentGiven && window.gtag) {
      window.gtag('config', conversionId, {
        page_path: location.pathname,
      });
    }
  }, [location.pathname, conversionId, consentGiven]);

  return null;
}

// Track signup conversion
// conversionLabel comes from Google Ads when you create a conversion action
export const trackGoogleAdsSignup = () => {
  // Skip tracking in iOS app (no ATT permission)
  if (isNativeApp) return;

  const conversionId = import.meta.env.VITE_GOOGLE_ADS_ID;
  const conversionLabel = import.meta.env.VITE_GOOGLE_ADS_SIGNUP_LABEL;

  if (window.gtag && conversionId && conversionLabel && !import.meta.env.DEV) {
    window.gtag('event', 'conversion', {
      send_to: `${conversionId}/${conversionLabel}`,
    });
  }
};

// Track purchase/subscription conversion
export const trackGoogleAdsPurchase = (value, currency = 'USD') => {
  // Skip tracking in iOS app (no ATT permission)
  if (isNativeApp) return;

  const conversionId = import.meta.env.VITE_GOOGLE_ADS_ID;
  const conversionLabel = import.meta.env.VITE_GOOGLE_ADS_PURCHASE_LABEL;

  if (window.gtag && conversionId && conversionLabel && !import.meta.env.DEV) {
    window.gtag('event', 'conversion', {
      send_to: `${conversionId}/${conversionLabel}`,
      value: value,
      currency: currency,
    });
  }
};
