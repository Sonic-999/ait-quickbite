import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\sourabh\\.gemini\\antigravity-ide\\brain\\39eb598a-9859-414c-b4e1-a2aaa0a33c15';

async function verifySkeletonScreen() {
  console.log('================================================================');
  console.log('✨ Testing Skeleton Screen Loading State & Swiggy Dimensions');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,850'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });

  // Enable request interception to introduce a realistic 2-second delay on /api/menu
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    if (req.url().includes('/api/menu')) {
      console.log('   [Interception] Intercepted /api/menu. Delaying response by 1800ms to test Skeleton Screen...');
      setTimeout(() => req.continue(), 1800);
    } else {
      req.continue();
    }
  });

  console.log('1. Navigating to Juice Center Menu (http://localhost:5173/menu)...');
  const navPromise = page.goto(`${FRONTEND_URL}/menu`);

  // Wait 400ms into the navigation: The /api/menu request is pending, so Skeleton Screen is actively visible!
  await new Promise((r) => setTimeout(r, 600));

  console.log('2. Inspecting active Skeleton Screen in the DOM...');
  const skeletonStats = await page.evaluate(() => {
    const shimmerElements = Array.from(document.querySelectorAll('.shimmer-skeleton, .shimmer-skeleton-darker, .shimmer-skeleton-subtle'));
    const skeletonCards = Array.from(document.querySelectorAll('[key*="skeleton-card"], div.p-5, div.sm\\:p-6')).filter((el) => {
      return el.querySelector('.shimmer-skeleton') && el.querySelector('.shimmer-skeleton-darker');
    });

    const isAriaBusy = document.querySelector('[aria-busy="true"]') !== null;
    const computedShimmer = shimmerElements[0] ? window.getComputedStyle(shimmerElements[0]).backgroundImage : '';

    return {
      shimmerCount: shimmerElements.length,
      cardCount: skeletonCards.length,
      isAriaBusy,
      computedShimmer,
    };
  });

  console.log(`   Found ${skeletonStats.cardCount} Swiggy-style skeleton cards.`);
  console.log(`   Found ${skeletonStats.shimmerCount} shimmering elements with linear-gradient animation.`);
  console.log(`   Computed Shimmer Background: ${skeletonStats.computedShimmer.slice(0, 80)}...`);

  // Capture screenshot of the Skeleton Loading Screen
  const skeletonScreenshot = path.join(ARTIFACT_DIR, 'menu_skeleton_loading_state.png');
  await page.screenshot({ path: skeletonScreenshot });
  console.log(`   Saved screenshot of Skeleton Screen: menu_skeleton_loading_state.png\n`);

  // Wait for the simulated delay to complete and page navigation to finish
  await navPromise;
  console.log('3. Waiting for SQLite menu data to populate...');
  await page.waitForSelector('#category-section-bestsellers', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 500));

  // Verify that the skeleton is completely swapped out
  const populatedStats = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h4')).map((h) => h.innerText);
    const activeCards = Array.from(document.querySelectorAll('article, .p-5, .sm\\:p-6')).filter((el) =>
      el.querySelector('button')
    );
    const remainingSkeletons = document.querySelectorAll('[aria-busy="true"]').length;
    return {
      headingsCount: headings.length,
      itemSample: headings.slice(0, 3),
      activeCardsCount: activeCards.length,
      remainingSkeletons,
    };
  });

  console.log(`   SQLite data populated successfully!`);
  console.log(`   Loaded ${populatedStats.headingsCount} menu items: ${populatedStats.itemSample.join(', ')}`);
  console.log(`   Remaining skeleton elements: ${populatedStats.remainingSkeletons} (Expected: 0)`);

  // Capture screenshot of the Populated Menu
  const populatedScreenshot = path.join(ARTIFACT_DIR, 'menu_populated_state.png');
  await page.screenshot({ path: populatedScreenshot });
  console.log(`   Saved screenshot of Populated Menu: menu_populated_state.png\n`);

  await browser.close();

  const isSuccess =
    skeletonStats.cardCount >= 4 &&
    skeletonStats.cardCount <= 6 &&
    skeletonStats.computedShimmer.includes('linear-gradient') &&
    populatedStats.remainingSkeletons === 0 &&
    populatedStats.headingsCount > 0;

  console.log('================================================================');
  console.log(`📊 Skeleton Screen Verification: [${isSuccess ? 'PASS' : 'FAIL'}]`);
  console.log('================================================================\n');

  if (!isSuccess) process.exit(1);
}

verifySkeletonScreen().catch((err) => {
  console.error('Skeleton verification failed:', err);
  process.exit(1);
});
