/**
 * Haptic Feedback Utility (HTML5 Vibration API)
 * Triggers subtle physical 'pop' feedback on mobile devices when items are added or removed.
 */
export function triggerHaptic(duration = 50) {
  if (
    typeof window !== 'undefined' &&
    'navigator' in window &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      navigator.vibrate(duration);
    } catch {
      // Safe fallback if vibrations are blocked by OS permissions or power saver
    }
  }
}

export default triggerHaptic;
