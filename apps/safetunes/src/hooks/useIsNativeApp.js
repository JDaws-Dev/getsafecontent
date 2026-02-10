/**
 * Detects if the app is running inside the native iOS SafeTunes wrapper.
 * Used for Apple App Store compliance - hiding payment/subscription UI.
 *
 * Detection methods:
 * 1. window.isInSafeTunesApp - injected by React Native WebView
 * 2. window.isSafeTunesApp - alternative flag name
 * 3. User agent contains "SafeTunesApp" - fallback detection
 *
 * @returns {boolean} true if running in native iOS app wrapper
 */

// Check synchronously so it's available on first render
function checkIsNativeApp() {
  if (typeof window === 'undefined') return false;

  return window.isSafeTunesApp === true ||
         window.isInSafeTunesApp === true ||
         /SafeTunesApp/.test(navigator.userAgent);
}

export function useIsNativeApp() {
  // Return the check result directly - no state needed since this won't change during session
  return checkIsNativeApp();
}

export default useIsNativeApp;
