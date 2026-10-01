import fs from 'fs';
import path from 'path';

async function runPWAAudit() {
  console.log('===============================================================');
  console.log('📱 AIT QuickBite - Progressive Web App (PWA) Audit Suite');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function check(condition, title, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${title} ${details ? `(${details})` : ''}`);
    } else {
      console.error(`❌ [FAIL] ${title} ${details ? `(${details})` : ''}`);
    }
  }

  // 1. Manifest Checks
  console.log('--- 1. Web App Manifest Verification ---');
  const manifestPath = path.resolve('public', 'manifest.json');
  check(fs.existsSync(manifestPath), 'manifest.json exists in public directory');

  let manifest = {};
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    check(true, 'manifest.json is valid JSON');
  } catch (e) {
    check(false, 'manifest.json is valid JSON', e.message);
  }

  check(Boolean(manifest.name), 'Manifest contains "name"', manifest.name);
  check(Boolean(manifest.short_name), 'Manifest contains "short_name"', manifest.short_name);
  check(manifest.display === 'standalone', 'Display mode is "standalone" (hides browser URL bar)', manifest.display);
  check(manifest.theme_color?.toLowerCase() === '#6b21a8', 'Theme color is "#6b21a8"', manifest.theme_color);
  check(Boolean(manifest.background_color), 'Background color specified', manifest.background_color);
  check(manifest.start_url === '/?source=pwa' || manifest.start_url === '/', 'Valid start_url', manifest.start_url);
  check(manifest.scope === '/', 'Scope set to "/"', manifest.scope);

  // Check icons
  const icons = manifest.icons || [];
  check(icons.length >= 2, 'Manifest contains multiple standard icons', `found: ${icons.length}`);
  const has192 = icons.some(i => i.sizes === '192x192' && i.type === 'image/png');
  const has512 = icons.some(i => i.sizes === '512x512' && i.type === 'image/png');
  const hasMaskable = icons.some(i => (i.purpose || '').includes('maskable'));
  check(has192, 'Manifest has 192x192 PNG icon');
  check(has512, 'Manifest has 512x512 PNG icon');
  check(hasMaskable, 'Manifest has maskable icon for Android adaptive icons');

  // Verify physical icon files exist
  for (const icon of icons) {
    const iconFile = path.resolve('public', icon.src.replace(/^\//, ''));
    check(fs.existsSync(iconFile), `Icon file exists: ${icon.src}`);
  }

  // Check screenshots
  const screenshots = manifest.screenshots || [];
  check(screenshots.length >= 2, 'Manifest contains desktop and mobile screenshots for rich install UI');

  // Check shortcuts
  const shortcuts = manifest.shortcuts || [];
  check(shortcuts.length >= 2, 'Manifest contains shortcuts for quick actions', `count: ${shortcuts.length}`);

  // 2. HTML Meta Tags in index.html
  console.log('\n--- 2. HTML Document Meta Tags & PWA Links ---');
  const htmlContent = fs.readFileSync(path.resolve('index.html'), 'utf8');
  check(htmlContent.includes('<link rel="manifest" href="/manifest.json"'), '<link rel="manifest"> linked in index.html');
  check(htmlContent.includes('<meta name="theme-color" content="#6b21a8"'), '<meta name="theme-color" content="#6b21a8"> present in index.html');
  check(htmlContent.includes('viewport') && htmlContent.includes('width=device-width'), '<meta name="viewport"> configured properly');
  check(htmlContent.includes('apple-touch-icon'), '<link rel="apple-touch-icon"> present for iOS');
  check(htmlContent.includes('apple-mobile-web-app-capable'), 'iOS standalone capability meta tags configured');

  // 3. Service Worker Verification
  console.log('\n--- 3. Service Worker Verification ---');
  const swPath = path.resolve('public', 'sw.js');
  check(fs.existsSync(swPath), 'sw.js exists in public directory');

  const swContent = fs.readFileSync(swPath, 'utf8');
  check(swContent.includes("addEventListener('install'"), 'Service Worker handles "install" event (pre-caching)');
  check(swContent.includes("addEventListener('activate'"), 'Service Worker handles "activate" event (cache cleanup)');
  check(swContent.includes("addEventListener('fetch'"), 'Service Worker handles "fetch" event (request interception)');
  check(swContent.includes('caches.match(request)') && swContent.includes('fetch(request)'), 'Service Worker implements Cache First with Network Fallback');
  check(swContent.includes('navigate'), 'Service Worker supports offline SPA navigation fallback');

  // Check Service Worker registration in code
  const regPath = path.resolve('src', 'registerServiceWorker.js');
  check(fs.existsSync(regPath), 'src/registerServiceWorker.js exists');
  const regContent = fs.readFileSync(regPath, 'utf8');
  check(regContent.includes("navigator.serviceWorker.register('/sw.js'"), 'Service worker registered at root scope');
  check(regContent.includes('beforeinstallprompt'), 'A2HS beforeinstallprompt event captured and managed');

  // 4. A2HS Custom Prompt UI Component
  console.log('\n--- 4. Add to Home Screen (A2HS) Custom Prompt UI ---');
  const a2hsPath = path.resolve('src', 'components', 'A2HSInstallPrompt.jsx');
  check(fs.existsSync(a2hsPath), 'A2HSInstallPrompt.jsx component exists');
  const a2hsContent = fs.readFileSync(a2hsPath, 'utf8');
  check(a2hsContent.includes('Install AIT QuickBite App'), 'A2HS UI contains clear title and benefits');
  check(a2hsContent.includes('triggerInstallPrompt'), 'A2HS UI triggers install prompt');

  const appContent = fs.readFileSync(path.resolve('src', 'App.jsx'), 'utf8');
  check(appContent.includes('A2HSInstallPrompt'), 'A2HSInstallPrompt imported and rendered in App.jsx');
  check(appContent.includes('showA2hsPrompt'), 'A2HS prompt state managed in App.jsx');
  check(appContent.includes('setShowA2hsPrompt(true)'), 'A2HS prompt triggered automatically after successful order');

  // 5. Live Server Endpoint Responses
  console.log('\n--- 5. Live HTTP Responses from Vite Dev Server ---');
  try {
    const manifestRes = await fetch('http://localhost:5173/manifest.json');
    check(manifestRes.status === 200, 'GET /manifest.json returns HTTP 200');
    check(manifestRes.headers.get('content-type')?.includes('application/json'), 'manifest.json content-type is application/json');

    const swRes = await fetch('http://localhost:5173/sw.js');
    check(swRes.status === 200, 'GET /sw.js returns HTTP 200');
    check(swRes.headers.get('content-type')?.includes('javascript'), 'sw.js content-type is javascript');

    const iconRes = await fetch('http://localhost:5173/icons/icon-192x192.png');
    check(iconRes.status === 200, 'GET /icons/icon-192x192.png returns HTTP 200');
    check(iconRes.headers.get('content-type')?.includes('image/png'), 'icon-192x192.png is valid image/png');
  } catch (err) {
    check(false, 'Live HTTP checks', err.message);
  }

  console.log('\n===============================================================');
  console.log(`🏆 Audit Score: ${passed}/${total} PWA Criteria Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('===============================================================\n');

  return { passed, total, score: Math.round((passed / total) * 100) };
}

runPWAAudit();
