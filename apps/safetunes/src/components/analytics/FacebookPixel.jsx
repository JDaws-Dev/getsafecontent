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

// Facebook Pixel Component
export function FacebookPixel() {
  const location = useLocation();
  const pixelId = import.meta.env.VITE_FACEBOOK_PIXEL_ID;
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
    // Only load Facebook Pixel if:
    // 1. ID is configured
    // 2. Not in dev mode
    // 3. User has given marketing consent
    if (!pixelId || import.meta.env.DEV || !consentGiven) {
      return;
    }

    // Initialize Facebook Pixel
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }, [pixelId, consentGiven]);

  // Track page views on route change
  useEffect(() => {
    if (pixelId && !import.meta.env.DEV && consentGiven && window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [location.pathname, pixelId, consentGiven]);

  return null;
}

// Helper functions for tracking events
export const trackEvent = (eventName, data = {}) => {
  // Skip tracking in iOS app (no ATT permission)
  if (isNativeApp) return;
  if (window.fbq && !import.meta.env.DEV) {
    window.fbq('track', eventName, data);
  }
};

// Specific tracking helpers
export const trackSignup = (method = 'email') => {
  trackEvent('CompleteRegistration', { method });
};

export const trackPurchase = (value, currency = 'USD') => {
  trackEvent('Purchase', {
    value: value,
    currency: currency,
  });
};

export const trackAddPaymentInfo = () => {
  trackEvent('AddPaymentInfo');
};

export const trackStartTrial = (value = 0) => {
  trackEvent('StartTrial', {
    value: value,
    currency: 'USD',
    predicted_ltv: 4.99, // Monthly subscription value
  });
};

export const trackSearch = (searchString) => {
  trackEvent('Search', {
    search_string: searchString,
  });
};

export const trackViewContent = (contentName, contentType = 'product') => {
  trackEvent('ViewContent', {
    content_name: contentName,
    content_type: contentType,
  });
};

export const trackLead = () => {
  trackEvent('Lead');
};
