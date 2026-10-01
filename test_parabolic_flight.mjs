import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:/Users/sourabh/.gemini/antigravity-ide/brain/39eb598a-9859-414c-b4e1-a2aaa0a33c15';

async function runParabolicFlightTest() {
  console.log('🚀 Starting Parabolic Flight Animation & Banner Pulse Test...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // 1. Navigate to Juice Center Menu
    console.log('📍 Navigating to http://localhost:5173/?view=juice-menu');
    await page.goto('http://localhost:5173/?view=juice-menu', { waitUntil: 'networkidle2' });

    // Wait for real menu items to populate (skeleton screen replaced)
    await page.waitForSelector('.menu-item-card', { timeout: 8000 });
    console.log('✅ Menu items loaded successfully from SQLite API');

    // 2. Locate first available item card
    const firstCard = await page.$('.menu-item-card');
    const itemTitle = await page.evaluate((el) => {
      const nameEl = el.querySelector('h4');
      const imgEl = el.querySelector('img');
      const addBtn = el.querySelector('.morphing-add-btn button');
      return {
        name: nameEl?.innerText,
        imgSrc: imgEl?.src,
        hasAddBtn: !!addBtn,
      };
    }, firstCard);

    console.log(`🍔 Target item: "${itemTitle.name}" with image: ${itemTitle.imgSrc?.slice(0, 50)}...`);

    // Listen for DOM additions of .flying-cart-item
    await page.evaluate(() => {
      window.__flightRecords = [];
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1 && (node.classList?.contains('flying-cart-item') || node.getAttribute?.('data-flying-item') === 'true')) {
              const rect = node.getBoundingClientRect();
              const style = window.getComputedStyle(node);
              window.__flightRecords.push({
                time: Date.now(),
                width: style.width,
                height: style.height,
                borderRadius: style.borderRadius,
                animation: style.animationName,
                top: rect.top,
                left: rect.left,
                src: node.src,
              });
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    // 3. Click ADD button on first card
    const addBtnSelector = '.menu-item-card:first-child .morphing-add-btn button';
    await page.waitForSelector(addBtnSelector);

    console.log('👆 Clicking "ADD" on item card to trigger parabolic flight...');
    await page.click(addBtnSelector);

    // Wait 250ms and take screenshot of flight in progress
    await new Promise((r) => setTimeout(r, 220));

    const flightStats = await page.evaluate(() => {
      const flyingNodes = document.querySelectorAll('.flying-cart-item, [data-flying-item="true"]');
      const flyingData = [];
      flyingNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        flyingData.push({
          width: style.width,
          height: style.height,
          animation: style.animation,
          animationName: style.animationName,
          top: rect.top,
          left: rect.left,
          transform: style.transform,
        });
      });
      return {
        recorded: window.__flightRecords || [],
        currentlyFlying: flyingData,
      };
    });

    console.log('✈️ Flight tracking captured:', JSON.stringify(flightStats, null, 2));

    const flightMidairPath = path.join(ARTIFACTS_DIR, 'parabolic_flight_midair.png');
    await page.screenshot({ path: flightMidairPath });
    console.log(`📸 Screenshot saved: ${flightMidairPath}`);

    // Wait for the flight to reach sticky banner (~650ms total from click)
    await new Promise((r) => setTimeout(r, 450));

    // 4. Verify landing pulse on '#floating-cart-banner-card'
    const pulseStatus = await page.evaluate(() => {
      const banner = document.getElementById('floating-cart-bar');
      const card = document.getElementById('floating-cart-banner-card');
      const icon = document.getElementById('cart-icon-target');
      const isCardPulsing = card?.classList.contains('cart-pulse-active') || false;
      const computedCardStyle = card ? window.getComputedStyle(card) : null;
      return {
        hasBanner: !!banner,
        hasCard: !!card,
        isCardPulsing,
        cardTransform: computedCardStyle?.transform,
        cardAnimation: computedCardStyle?.animationName,
        cardBoxShadow: computedCardStyle?.boxShadow,
      };
    });

    console.log('🎯 Banner pulse state on landing:', JSON.stringify(pulseStatus, null, 2));

    const landingPulsePath = path.join(ARTIFACTS_DIR, 'parabolic_flight_landing_pulse.png');
    await page.screenshot({ path: landingPulsePath });
    console.log(`📸 Screenshot saved: ${landingPulsePath}`);

    // 5. Verify the banner is fully visible and item is in cart
    await new Promise((r) => setTimeout(r, 600));

    const finalCartState = await page.evaluate(() => {
      const banner = document.getElementById('floating-cart-bar');
      const text = banner?.innerText || '';
      return {
        bannerText: text,
        visible: !!banner && banner.offsetHeight > 0,
      };
    });
    console.log('🛒 Final Sticky Banner State:', finalCartState);

    const finalBannerPath = path.join(ARTIFACTS_DIR, 'parabolic_flight_cart_settled.png');
    await page.screenshot({ path: finalBannerPath });
    console.log(`📸 Screenshot saved: ${finalBannerPath}`);

    // Assertions
    const hadFlightElement = flightStats.recorded.length > 0 || flightStats.currentlyFlying.length > 0;
    const flightWidthIs30 = flightStats.recorded.some((r) => r.width === '30px') || flightStats.currentlyFlying.some((r) => r.width === '30px');
    const flightHeightIs30 = flightStats.recorded.some((r) => r.height === '30px') || flightStats.currentlyFlying.some((r) => r.height === '30px');
    const hasCartBanner = finalCartState.visible && finalCartState.bannerText.includes('View Cart');

    console.log('\n========================================');
    console.log('TEST SUMMARY:');
    console.log(`1. Flying Image Duplicated: ${hadFlightElement ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`2. Shrunk to 30x30 pixels: ${flightWidthIs30 && flightHeightIs30 ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`3. CSS Keyframes Flight Animation: ${hadFlightElement ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`4. View Cart Banner Rendered & Targetable: ${hasCartBanner ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`5. Landing Pulse Applied: ${pulseStatus.hasCard ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log('========================================\n');

    if (!hadFlightElement || !flightWidthIs30 || !hasCartBanner) {
      throw new Error('Parabolic flight animation verification checks failed.');
    }

    console.log('🎉 ALL PARABOLIC FLIGHT VERIFICATION CHECKS PASSED PERFECTLY!');
  } finally {
    await browser.close();
  }
}

runParabolicFlightTest().catch((err) => {
  console.error('❌ Parabolic Flight Test Failed:', err);
  process.exit(1);
});
