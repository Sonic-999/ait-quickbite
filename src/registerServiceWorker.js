/**
 * Service Worker Registration & PWA Install Prompt Manager
 * AIT QuickBite PWA
 */

let deferredInstallPrompt = null;
const installListeners = new Set();

/**
 * Register the Service Worker for offline resilience and fast loads
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker not supported in this browser environment');
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registered successfully with scope:', registration.scope);

        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[PWA] New QuickBite update available. Ready for instant reload.');
              } else {
                console.log('[PWA] QuickBite content cached for instant offline usage!');
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });
  });

  // Capture the native 'beforeinstallprompt' event for custom A2HS modal
  window.addEventListener('beforeinstallprompt', (event) => {
    console.log('[PWA] beforeinstallprompt event captured');
    // Prevent default mini-infobar from appearing on mobile
    event.preventDefault();
    deferredInstallPrompt = event;
    notifyInstallListeners(true);
  });

  // Track when app has been installed
  window.addEventListener('appinstalled', (event) => {
    console.log('[PWA] AIT QuickBite successfully installed as standalone PWA!');
    deferredInstallPrompt = null;
    notifyInstallListeners(false);
  });
}

function notifyInstallListeners(canInstall) {
  for (const listener of installListeners) {
    try {
      listener(canInstall);
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Subscribe to install prompt availability changes
 */
export function subscribeToInstallPrompt(callback) {
  installListeners.add(callback);
  callback(Boolean(deferredInstallPrompt));
  return () => installListeners.delete(callback);
}

/**
 * Trigger the native Add to Home Screen install prompt
 */
export async function triggerInstallPrompt() {
  if (!deferredInstallPrompt) {
    console.warn('[PWA] No deferred install prompt available');
    return { outcome: 'unavailable' };
  }

  try {
    await deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    console.log('[PWA] User install choice:', choiceResult.outcome);
    deferredInstallPrompt = null;
    notifyInstallListeners(false);
    return choiceResult;
  } catch (err) {
    console.error('[PWA] Error triggering install prompt:', err);
    return { outcome: 'error', error: err.message };
  }
}

/**
 * Checks if the current browser window is running in standalone PWA mode
 */
export function isRunningStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}
