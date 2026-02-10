/**
 * useHaptic - Hook for haptic feedback on mobile devices
 *
 * Uses the Navigator Vibration API with graceful degradation.
 * Falls back to no-op on unsupported devices (desktop, older iOS).
 *
 * Note: iOS Safari does not support the Vibration API.
 * Android Chrome/Firefox have good support.
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Check if the Vibration API is supported
 */
function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Vibration patterns (durations in ms)
 */
const VIBRATION_PATTERNS: Record<HapticStyle, number | number[]> = {
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
 */
export function triggerHaptic(style: HapticStyle = 'selection'): void {
  if (isVibrationSupported()) {
    try {
      navigator.vibrate(VIBRATION_PATTERNS[style] || VIBRATION_PATTERNS.selection);
    } catch {
      // Silently fail - vibration may be blocked by browser policy
    }
  }
}

interface HapticFunctions {
  light: () => void;
  medium: () => void;
  heavy: () => void;
  success: () => void;
  warning: () => void;
  error: () => void;
  selection: () => void;
  isAvailable: boolean;
}

/**
 * Hook that returns haptic feedback functions
 */
export function useHaptic(): HapticFunctions {
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

    // Check if haptics are available
    isAvailable: isVibrationSupported(),
  };
}

export default useHaptic;
