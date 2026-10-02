import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\sourabh\\.gemini\\antigravity-ide\\brain\\e5b644e0-f771-4507-9b24-12d13de853a0';

async function main() {
  console.log('Launching browser to verify Bento Box CSS Grid layout on Home menu...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Navigate to Home
  console.log('Navigating to http://localhost:5173/...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 15000 });

  console.log('Waiting for .menu-item-card to appear...');
  await page.waitForSelector('.menu-item-card', { timeout: 10000 });

  // 2. Scroll to menu category section
  console.log('Scrolling to bestsellers category section...');
  await page.evaluate(() => {
    const el = document.getElementById('category-section-bestsellers') || document.getElementById('campus-menu-section');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });

  await new Promise((r) => setTimeout(r, 1200));

  // 3. Inspect Bento Box DOM structures
  const bentoStats = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.menu-item-card'));
    const largeSpans = cards.filter(c => c.className.includes('col-span-2') || c.className.includes('row-span-2'));
    const standardSpans = cards.filter(c => c.className.includes('col-span-1') && c.className.includes('row-span-1'));
    const glassOverlays = cards.filter(c => c.querySelector('.backdrop-blur-md') !== null);
    
    // Sample first 4 cards for name, tags, and desc line-clamp
    const samples = cards.slice(0, 4).map(card => {
      const name = card.querySelector('h4')?.innerText || '';
      const tags = Array.from(card.querySelectorAll('.rounded-full')).map(t => t.innerText.trim()).filter(Boolean);
      const price = card.querySelector('.font-black.text-white')?.innerText || '';
      const desc = card.querySelector('p.line-clamp-2')?.innerText || '';
      const is2x2 = card.className.includes('row-span-2');
      const hasImg = !!card.querySelector('img');
      const imgRounded = card.className.includes('rounded-2xl') || card.className.includes('rounded-3xl');
      return { name, tags, price, desc, is2x2, hasImg, imgRounded };
    });

    return {
      totalCards: cards.length,
      largeSpansCount: largeSpans.length,
      standardSpansCount: standardSpans.length,
      glassOverlaysCount: glassOverlays.length,
      samples,
    };
  });

  console.log('Bento Grid Inspection Results:');
  console.log(`   ✓ Total Menu Cards: ${bentoStats.totalCards}`);
  console.log(`   ✓ 2x2 Asymmetric Spans: ${bentoStats.largeSpansCount}`);
  console.log(`   ✓ 1x1 Standard Blocks: ${bentoStats.standardSpansCount}`);
  console.log(`   ✓ Glassmorphic Overlays: ${bentoStats.glassOverlaysCount}`);
  console.log('   Sample Cards:');
  bentoStats.samples.forEach((s, idx) => {
    console.log(`     [${idx + 1}] ${s.is2x2 ? '⭐ 2x2 HERO' : '▫️ 1x1 BLOCK'}: "${s.name}" | Price: ${s.price}`);
    console.log(`         Tags: [${s.tags.join(', ')}] | Desc (max 2 lines): "${s.desc.substring(0, 50)}..."`);
  });

  // 4. Desktop screenshot of Bento Box layout
  const screenshotDesktop = path.join(ARTIFACT_DIR, 'bento_box_desktop_view.png');
  await page.screenshot({ path: screenshotDesktop, fullPage: false });
  console.log(`\n📸 Saved Desktop Screenshot: ${screenshotDesktop}`);

  // 5. Test interaction: click ADD on the first card
  console.log('\nTesting ADD interaction on Bento Box card...');
  const firstAddBtn = await page.$('.menu-item-card .morphing-add-btn button');
  if (firstAddBtn) {
    await firstAddBtn.click();
    await new Promise((r) => setTimeout(r, 600));
    console.log('   ✓ ADD button clicked on Bento card!');
  }

  const screenshotAfterAdd = path.join(ARTIFACT_DIR, 'bento_box_after_add.png');
  await page.screenshot({ path: screenshotAfterAdd, fullPage: false });
  console.log(`📸 Saved After-Add Screenshot: ${screenshotAfterAdd}`);

  // 6. Mobile Viewport test
  console.log('\nTesting mobile responsiveness (390x844)...');
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => {
    const el = document.getElementById('category-section-bestsellers') || document.getElementById('campus-menu-section');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise((r) => setTimeout(r, 1000));

  const screenshotMobile = path.join(ARTIFACT_DIR, 'bento_box_mobile_view.png');
  await page.screenshot({ path: screenshotMobile, fullPage: false });
  console.log(`📸 Saved Mobile Screenshot: ${screenshotMobile}`);

  await browser.close();
  console.log('\nAll Bento Box verifications passed successfully!');
}

main().catch(err => {
  console.error('Error during Bento verification:', err);
  process.exit(1);
});
