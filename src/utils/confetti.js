import confetti from 'canvas-confetti';

/**
 * Fire a rich, multi-tiered celebratory burst of confetti.
 * Used on Order Success and Live Tracking milestone completions.
 */
export function fireCelebratoryConfetti() {
  if (typeof window === 'undefined') return;

  try {
    const brandColors = ['#6b21a8', '#9333ea', '#c084fc', '#10b981', '#34d399', '#f59e0b', '#fbbf24', '#ec4899'];
    const totalCount = 180;

    const fire = (ratio, opts) => {
      confetti({
        origin: { y: 0.62 },
        zIndex: 99999,
        colors: brandColors,
        disableForReducedMotion: false,
        ...opts,
        particleCount: Math.floor(totalCount * ratio),
      });
    };

    // 1. High-velocity center cannon burst
    fire(0.25, {
      spread: 30,
      startVelocity: 55,
      scalar: 1.1,
    });

    // 2. Medium-spread arc
    fire(0.2, {
      spread: 65,
      startVelocity: 40,
    });

    // 3. Wide gentle colorful shower
    fire(0.35, {
      spread: 110,
      decay: 0.91,
      scalar: 0.85,
    });

    // 4. Large sparkling confetti stars & flakes
    fire(0.1, {
      spread: 130,
      startVelocity: 28,
      decay: 0.92,
      scalar: 1.3,
    });

    // 5. Trailing high fountain arc
    fire(0.1, {
      spread: 140,
      startVelocity: 48,
    });

    // Secondary delayed side-cannon pop for extra festival feel
    setTimeout(() => {
      try {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0.1, y: 0.7 },
          colors: brandColors,
          zIndex: 99999,
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 0.9, y: 0.7 },
          colors: brandColors,
          zIndex: 99999,
        });
      } catch (_) {}
    }, 280);
  } catch (err) {
    console.warn('[Confetti] Failed to execute canvas-confetti:', err);
  }
}

// Make globally accessible for browser tests and interactive manual testing
if (typeof window !== 'undefined') {
  window.fireCelebratoryConfetti = fireCelebratoryConfetti;
}
