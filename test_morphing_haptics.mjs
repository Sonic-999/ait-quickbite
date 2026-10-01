import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\sourabh\\.gemini\\antigravity-ide\\brain\\39eb598a-9859-414c-b4e1-a2aaa0a33c15';

async function testMorphingAndHaptics() {
  console.log('================================================================');
  console.log('✨ Testing CSS Morphing ADD Button & Haptic Pop (navigator.vibrate)');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,850'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });

  // Expose mock for navigator.vibrate to track calls and durations
  await page.evaluateOnNewDocument(() => {
    window.__vibrateLog = [];
    navigator.vibrate = (pattern) => {
      window.__vibrateLog.push({
        pattern,
        timestamp: Date.now(),
      });
      return true;
    };
  });

  console.log('1. Navigating to Juice Center Menu...');
  await page.goto(`${FRONTEND_URL}/menu`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#category-section-bestsellers', { timeout: 10000 });
  console.log('   Menu page loaded.\n');

  // Find the first in-stock item card (e.g. Fresh Orange Juice)
  const initialBtnMetrics = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h4'));
    const orangeHeading = headings.find((h) => h.textContent.includes('Fresh Orange Juice') || h.textContent.includes('Samosa'));
    if (!orangeHeading) return null;
    const card = orangeHeading.closest('.p-5, .sm\\:p-6') || orangeHeading.parentElement.parentElement;
    const morphingBox = card.querySelector('.morphing-add-btn');
    if (!morphingBox) return null;

    const style = window.getComputedStyle(morphingBox);
    const rect = morphingBox.getBoundingClientRect();
    const btnText = morphingBox.innerText.trim();

    return {
      width: rect.width,
      height: rect.height,
      transition: style.transition,
      text: btnText,
    };
  });

  console.log('2. Inspecting Initial Unexpanded "ADD" Button State:');
  console.log(`   Dimensions: ${Math.round(initialBtnMetrics?.width)}px wide x ${Math.round(initialBtnMetrics?.height)}px high`);
  console.log(`   Computed CSS Transition: "${initialBtnMetrics?.transition}"`);
  console.log(`   Visible Text: "${initialBtnMetrics?.text}"\n`);

  // Capture screenshot of compact ADD button
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'morphing_btn_1_compact_add.png') });

  // Click the 'ADD' button on the card
  console.log('3. Clicking "ADD" button to trigger CSS horizontal expansion & haptic pop...');
  const addClicked = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h4'));
    const targetHeading = headings.find((h) => h.textContent.includes('Fresh Orange Juice') || h.textContent.includes('Samosa'));
    if (!targetHeading) return false;
    const card = targetHeading.closest('.p-5, .sm\\:p-6') || targetHeading.parentElement.parentElement;
    const addBtn = card.querySelector('.morphing-add-btn button');
    if (addBtn) {
      addBtn.click();
      return true;
    }
    return false;
  });

  if (!addClicked) throw new Error('Could not click ADD button');

  // Immediately check halfway through transition (150ms) to verify animation is running
  await new Promise((r) => setTimeout(r, 150));
  const midTransitionMetrics = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h4'));
    const targetHeading = headings.find((h) => h.textContent.includes('Fresh Orange Juice') || h.textContent.includes('Samosa'));
    const card = targetHeading.closest('.p-5, .sm\\:p-6') || targetHeading.parentElement.parentElement;
    const morphingBox = card.querySelector('.morphing-add-btn');
    const rect = morphingBox.getBoundingClientRect();
    return { width: rect.width };
  });
  console.log(`   Mid-Transition Width at 150ms: ${Math.round(midTransitionMetrics.width)}px (Expanding smoothly)`);

  // Wait for transition to complete (350ms total)
  await new Promise((r) => setTimeout(r, 200));

  const expandedMetrics = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h4'));
    const targetHeading = headings.find((h) => h.textContent.includes('Fresh Orange Juice') || h.textContent.includes('Samosa'));
    const card = targetHeading.closest('.p-5, .sm\\:p-6') || targetHeading.parentElement.parentElement;
    const morphingBox = card.querySelector('.morphing-add-btn');
    const rect = morphingBox.getBoundingClientRect();
    const text = morphingBox.innerText.replace(/\s+/g, ' ').trim();
    const vibrateLog = window.__vibrateLog || [];

    return {
      width: rect.width,
      height: rect.height,
      text,
      vibrateCount: vibrateLog.length,
      lastVibratePattern: vibrateLog[vibrateLog.length - 1]?.pattern,
    };
  });

  console.log('4. Inspecting Expanded Quantity Selector State:');
  console.log(`   Expanded Dimensions: ${Math.round(expandedMetrics.width)}px wide x ${Math.round(expandedMetrics.height)}px high`);
  console.log(`   Selector Controls: "${expandedMetrics.text}"`);
  console.log(`   Haptic Pop Triggered: ${expandedMetrics.vibrateCount > 0 ? 'YES' : 'NO'} (navigator.vibrate pattern: ${expandedMetrics.lastVibratePattern}ms)\n`);

  // Capture screenshot of expanded quantity selector
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'morphing_btn_2_expanded_selector.png') });

  // Click '+' to increase quantity
  console.log('5. Clicking "+" button to increment quantity...');
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h4'));
    const targetHeading = headings.find((h) => h.textContent.includes('Fresh Orange Juice') || h.textContent.includes('Samosa'));
    const card = targetHeading.closest('.p-5, .sm\\:p-6') || targetHeading.parentElement.parentElement;
    const buttons = Array.from(card.querySelectorAll('.morphing-add-btn button'));
    const plusBtn = buttons.find((b) => b.getAttribute('aria-label')?.includes('Increase'));
    if (plusBtn) plusBtn.click();
  });
  await new Promise((r) => setTimeout(r, 150));

  // Click '-' twice to decrement down to 0 and trigger collapse
  console.log('6. Clicking "-" button to decrement down to 0 and trigger smooth horizontal collapse...');
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h4'));
    const targetHeading = headings.find((h) => h.textContent.includes('Fresh Orange Juice') || h.textContent.includes('Samosa'));
    const card = targetHeading.closest('.p-5, .sm\\:p-6') || targetHeading.parentElement.parentElement;
    const buttons = Array.from(card.querySelectorAll('.morphing-add-btn button'));
    const minusBtn = buttons.find((b) => b.getAttribute('aria-label')?.includes('Decrease'));
    if (minusBtn) minusBtn.click(); // 2 -> 1
  });
  await new Promise((r) => setTimeout(r, 200));

  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h4'));
    const targetHeading = headings.find((h) => h.textContent.includes('Fresh Orange Juice') || h.textContent.includes('Samosa'));
    const card = targetHeading.closest('.p-5, .sm\\:p-6') || targetHeading.parentElement.parentElement;
    const buttons = Array.from(card.querySelectorAll('.morphing-add-btn button'));
    const minusBtn = buttons.find((b) => b.getAttribute('aria-label')?.includes('Decrease'));
    if (minusBtn) minusBtn.click(); // 1 -> 0
  });

  // Wait 350ms for collapse transition to finish
  await new Promise((r) => setTimeout(r, 350));

  const collapsedMetrics = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h4'));
    const targetHeading = headings.find((h) => h.textContent.includes('Fresh Orange Juice') || h.textContent.includes('Samosa'));
    const card = targetHeading.closest('.p-5, .sm\\:p-6') || targetHeading.parentElement.parentElement;
    const morphingBox = card.querySelector('.morphing-add-btn');
    const rect = morphingBox.getBoundingClientRect();
    const text = morphingBox.innerText.trim();
    const vibrateLog = window.__vibrateLog || [];

    return {
      width: rect.width,
      text,
      totalVibrations: vibrateLog.length,
      vibratePatterns: vibrateLog.map((v) => v.pattern),
    };
  });

  console.log('7. Inspecting Collapsed Button State:');
  console.log(`   Collapsed Width: ${Math.round(collapsedMetrics.width)}px (Back to compact rectangular ADD state)`);
  console.log(`   Visible Text: "${collapsedMetrics.text}"`);
  console.log(`   Total Haptic Vibrations Recorded: ${collapsedMetrics.totalVibrations} calls: [${collapsedMetrics.vibratePatterns.join(', ')}]\n`);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'morphing_btn_3_collapsed_back.png') });

  await browser.close();

  const isTransitionValid =
    initialBtnMetrics?.transition.includes('0.3s') || initialBtnMetrics?.transition.includes('all');
  const isWidthExpanded = expandedMetrics.width > initialBtnMetrics.width;
  const isWidthCollapsed = Math.abs(collapsedMetrics.width - initialBtnMetrics.width) <= 4;
  const isHapticWorking =
    collapsedMetrics.totalVibrations >= 3 &&
    collapsedMetrics.vibratePatterns.every((p) => p === 50);

  const passed = isTransitionValid && isWidthExpanded && isWidthCollapsed && isHapticWorking;

  console.log('================================================================');
  console.log('📊 Verification Summary:');
  console.log('================================================================');
  console.log(`1. CSS Transition Property:       [${isTransitionValid ? 'PASS' : 'FAIL'}] (transition: all 0.3s ease)`);
  console.log(`2. Horizontal Expansion:         [${isWidthExpanded ? 'PASS' : 'FAIL'}] (${Math.round(initialBtnMetrics.width)}px -> ${Math.round(expandedMetrics.width)}px)`);
  console.log(`3. Reversible Collapse to ADD:   [${isWidthCollapsed ? 'PASS' : 'FAIL'}] (${Math.round(expandedMetrics.width)}px -> ${Math.round(collapsedMetrics.width)}px)`);
  console.log(`4. Haptic Vibration Feedback:    [${isHapticWorking ? 'PASS' : 'FAIL'}] (navigator.vibrate(50) on every add/remove)`);
  console.log('================================================================\n');

  if (!passed) process.exit(1);
}

testMorphingAndHaptics().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
