/**
 * KDS Audio Notification Engine
 * High-visibility kitchen chime and looping alarm using Web Audio API.
 * Synthesizes crisp, resonant acoustic bell frequencies that cut through
 * busy kitchen ambient noise without relying on external network MP3 downloads.
 */

let audioCtx = null;
let chimeInterval = null;
let isLooping = false;
let isMuted = false;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Resumes audio context on user interaction to comply with browser autoplay policies
 */
export function unlockAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * Plays a single burst of a loud, resonant 3-tone kitchen order chime
 * Note frequencies: 880 Hz (A5), 1174.66 Hz (D6), 1318.51 Hz (E6)
 */
export function playKitchenChime() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Chime Note 1 (880 Hz)
    playTone(ctx, 880, now, 0.45, 0.7);
    // Chime Note 2 (1174.66 Hz)
    playTone(ctx, 1174.66, now + 0.15, 0.55, 0.85);
    // Chime Note 3 (1567.98 Hz - bright ping)
    playTone(ctx, 1567.98, now + 0.32, 0.75, 0.9);
  } catch (err) {
    console.warn('[KDS Audio] Failed to play chime:', err);
  }
}

/**
 * Plays a distinctive, melodic "Order Ready" chime
 */
export function playOrderReadySound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    playTone(ctx, 523.25, now, 0.25, 0.5); // C5
    playTone(ctx, 659.25, now + 0.12, 0.35, 0.6); // E5
    playTone(ctx, 783.99, now + 0.24, 0.45, 0.7); // G5
    playTone(ctx, 1046.50, now + 0.38, 0.8, 0.85); // C6
  } catch (err) {
    console.warn('[KDS Audio] Failed to play ready sound:', err);
  }
}

function playTone(ctx, freq, startTime, duration, peakGain = 0.8) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Add subtle harmonics for a metallic kitchen bell feel
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);

  // Attack and decay envelope
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/**
 * Starts loud, continuous looping chime when a new order arrives.
 * Repeated every 2.2 seconds until vendor acknowledges or takes action.
 */
export function startLoopingChime(onTick) {
  if (isMuted) return;
  unlockAudioContext();

  if (isLooping) return;
  isLooping = true;

  // Play immediately
  playKitchenChime();
  if (typeof onTick === 'function') onTick();

  if (chimeInterval) clearInterval(chimeInterval);
  chimeInterval = setInterval(() => {
    if (isLooping && !isMuted) {
      playKitchenChime();
      if (typeof onTick === 'function') onTick();
    }
  }, 2200);
}

/**
 * Silences the looping alarm
 */
export function stopLoopingChime() {
  isLooping = false;
  if (chimeInterval) {
    clearInterval(chimeInterval);
    chimeInterval = null;
  }
}

export function isChimeLooping() {
  return isLooping;
}

export function setMuteState(muted) {
  isMuted = Boolean(muted);
  if (isMuted) {
    stopLoopingChime();
  }
}

export function getMuteState() {
  return isMuted;
}
