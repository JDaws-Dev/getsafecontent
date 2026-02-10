/**
 * Hook to trigger haptic feedback in the native SafeTunes app
 * Falls back to Vibration API for web, then gracefully to no-op
 */

/**
 * Check if the Vibration API is supported (for web fallback)
 */
function isVibrationSupported() {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Web Vibration API patterns (durations in ms)
 */
const VIBRATION_PATTERNS = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: 50,
  error: [20, 40, 20, 40, 20],
  selection: 10,
};

/**
 * Trigger haptic feedback
 * @param {'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'} style - The haptic style
 */
export function triggerHaptic(style = 'selection') {
  // Prefer native app haptics
  if (window.isInSafeTunesApp && window.triggerHaptic) {
    window.triggerHaptic(style);
    return;
  }

  // Fall back to Vibration API for web
  if (isVibrationSupported()) {
    try {
      navigator.vibrate(VIBRATION_PATTERNS[style] || VIBRATION_PATTERNS.selection);
    } catch (e) {
      // Silently fail - vibration may be blocked by browser policy
    }
  }
}

/**
 * Hook that returns haptic feedback functions
 * Use this in components for cleaner code
 */
export function useHaptic() {
  const isInApp = typeof window !== 'undefined' && window.isInSafeTunesApp;

  return {
    // Light tap - for subtle interactions like selections
    light: () => triggerHaptic('light'),

    // Medium tap - for button presses
    medium: () => triggerHaptic('medium'),

    // Heavy tap - for significant actions
    heavy: () => triggerHaptic('heavy'),

    // Success notification - for completed actions
    success: () => triggerHaptic('success'),

    // Warning notification - for warnings
    warning: () => triggerHaptic('warning'),

    // Error notification - for errors
    error: () => triggerHaptic('error'),

    // Selection change - for tab switches, toggles
    selection: () => triggerHaptic('selection'),

    // Check if haptics are available (native app or web vibration)
    isAvailable: isInApp || isVibrationSupported(),
  };
}
