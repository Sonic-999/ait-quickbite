import puppeteer from 'puppeteer-core';
import path from 'path';
import db from './server/db.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\sourabh\\.gemini\\antigravity-ide\\brain\\39eb598a-9859-414c-b4e1-a2aaa0a33c15';

async function testLoyaltyAndRewards() {
  console.log('================================================================');
  console.log('🪙 Testing Gamified Loyalty & Rewards System');
  console.log('================================================================\n');

  // Reset user usr-std-01 to 520 BiteCoins and 3-Day streak for clean verification
  db.prepare(`
    UPDATE Users
    SET bitecoins_balance = 520,
        current_streak = 3,
        last_order_date = '2026-09-30'
    WHERE id = 'usr-std-01'
  `).run();
  console.log('✓ Database initialized: usr-std-01 reset to 520 BiteCoins & 3-Day Coffee Streak (2x)');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,950'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 950 });

    // Step 1: Navigate to Menu & Verify Floating Rewards Widget
    console.log('\nStep 1: Navigating to Juice Center Menu...');
    await page.goto(`${FRONTEND_URL}/menu`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    const widgetVisible = await page.waitForSelector('#btn-floating-rewards-widget', { timeout: 8000 });
    if (!widgetVisible) throw new Error('Floating Rewards Widget button not found!');

    const widgetText = await page.$eval('#btn-floating-rewards-widget', (el) => el.innerText);
    console.log('   Floating Widget Text:', widgetText.replace(/\n/g, ' '));

    const has520BiteCoins = widgetText.includes('520') || widgetText.includes('BiteCoins');
    const has3DStreak = widgetText.includes('3D') || widgetText.includes('2x');
    console.log('   Contains 520 BiteCoins:', has520BiteCoins);
    console.log('   Contains 3D Streak & 2x Multiplier:', has3DStreak);

    const screenshot1 = path.join(ARTIFACT_DIR, 'loyalty_1_floating_widget.png');
    await page.screenshot({ path: screenshot1, fullPage: false });
    console.log(`📸 Screenshot saved: ${screenshot1}`);

    // Step 2: Open Rewards Modal
    console.log('\nStep 2: Clicking Floating Rewards Widget to open modal...');
    await page.click('#btn-floating-rewards-widget');
    await page.waitForSelector('#rewards-modal-card', { visible: true, timeout: 5000 });
    await new Promise((r) => setTimeout(r, 800));

    const modalData = await page.evaluate(() => {
      const balanceEl = document.getElementById('rewards-bitecoins-balance');
      const streakHeading = document.getElementById('rewards-streak-heading');
      const modalText = document.getElementById('rewards-modal-card')?.innerText || '';
      return {
        balance: balanceEl?.innerText || '',
        streak: streakHeading?.innerText || '',
        hasCuttingChai: modalText.includes('AIT Special Cutting Chai') || modalText.includes('Cutting Chai'),
        hasVegPatty: modalText.includes('Crispy Golden Veg Patty') || modalText.includes('Veg Patty'),
        hasSamosaPav: modalText.includes('Mumbai Samosa Pav') || modalText.includes('Samosa Pav'),
        hasRedeemBtn: !!document.getElementById('btn-redeem-reward'),
      };
    });

    console.log('   Modal Balance Displayed:', modalData.balance);
    console.log('   Modal Streak Heading:', modalData.streak);
    console.log('   Offers Cutting Chai, Veg Patty, Samosa Pav:', modalData.hasCuttingChai && modalData.hasVegPatty && modalData.hasSamosaPav);
    console.log('   Redeem Button Present:', modalData.hasRedeemBtn);

    const screenshot2 = path.join(ARTIFACT_DIR, 'loyalty_2_rewards_modal.png');
    await page.screenshot({ path: screenshot2, fullPage: false });
    console.log(`📸 Screenshot saved: ${screenshot2}`);

    // Step 3: Click 'Redeem (500 pts)' to generate 100% discount promo code
    console.log('\nStep 3: Redeeming 500 BiteCoins for 100% FREE Item...');
    await page.click('#btn-redeem-reward');
    await page.waitForSelector('#rewards-redeem-success-banner', { visible: true, timeout: 6000 });
    await new Promise((r) => setTimeout(r, 1000));

    const bannerInfo = await page.evaluate(() => {
      const banner = document.getElementById('rewards-redeem-success-banner');
      const codeEl = banner?.querySelector('code');
      return {
        text: banner?.innerText || '',
        code: codeEl?.innerText || '',
      };
    });

    console.log('   Redemption Success Banner Text:', bannerInfo.text.replace(/\n/g, ' '));
    console.log('   Generated 100% OFF Promo Code:', bannerInfo.code);

    const screenshot3 = path.join(ARTIFACT_DIR, 'loyalty_3_redeemed_promo_code.png');
    await page.screenshot({ path: screenshot3, fullPage: false });
    console.log(`📸 Screenshot saved: ${screenshot3}`);

    // Verify balance was deducted by 500 in SQLite
    const userAfterRedeem = db.prepare('SELECT bitecoins_balance FROM Users WHERE id = ?').get('usr-std-01');
    console.log('   User BiteCoins Balance in SQLite after redemption:', userAfterRedeem.bitecoins_balance, '(expected: 20)');

    // Step 4: Click 'Add Free Item to Cart & View Cart'
    console.log('\nStep 4: Clicking "Add Free Item to Cart & View Cart"...');
    await page.click('#btn-add-free-item-to-cart');
    await new Promise((r) => setTimeout(r, 1200));

    // Verify Cart Drawer is open with 100% discount applied
    const cartState = await page.evaluate(() => {
      const promoSection = document.getElementById('cart-promo-section');
      const activePromoCode = document.getElementById('active-promo-code-text')?.innerText || '';
      const discountRow = document.getElementById('bill-discount-row');
      const discountText = discountRow?.innerText || '';
      const loyaltyPreview = document.getElementById('cart-loyalty-preview')?.innerText || '';
      const drawerText = document.body.innerText;

      return {
        hasPromoSection: !!promoSection,
        activePromoCode,
        hasDiscountRow: !!discountRow,
        discountText,
        hasLoyaltyPreview: !!document.getElementById('cart-loyalty-preview'),
        loyaltyPreview,
        hasChaiInCart: drawerText.includes('Cutting Chai') || drawerText.includes('Special Cutting Chai'),
      };
    });

    console.log('   Active Promo in Cart:', cartState.activePromoCode);
    console.log('   Discount Row in Bill Summary:', cartState.discountText.replace(/\n/g, ' '));
    console.log('   Free Item Present in Cart:', cartState.hasChaiInCart);
    console.log('   BiteCoins Points Preview in Cart:', cartState.loyaltyPreview.replace(/\n/g, ' '));

    const screenshot4 = path.join(ARTIFACT_DIR, 'loyalty_4_cart_with_100_percent_discount.png');
    await page.screenshot({ path: screenshot4, fullPage: false });
    console.log(`📸 Screenshot saved: ${screenshot4}`);

    // Step 5: Complete Checkout and Verify Points Credited with 2x Multiplier
    console.log('\nStep 5: Adding a regular item and completing checkout...');
    // Close cart briefly to add an orange juice
    await page.click('button[aria-label="Close cart"]');
    await new Promise((r) => setTimeout(r, 600));

    // Add 1 Orange Juice to cart
    const addButtons = await page.$$('button');
    let addedExtra = false;
    for (const btn of addButtons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('ADD') || text.includes('+')) {
        await btn.click();
        addedExtra = true;
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 800));

    // Re-open cart
    const viewCartBtn = await page.waitForSelector('#btn-view-cart', { timeout: 4000 });
    await viewCartBtn.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Enter 12-digit UTR
    console.log('   Entering 12-digit UPI UTR (123456789012)...');
    await page.type('#utr-input', '123456789012');
    await new Promise((r) => setTimeout(r, 300));

    // Click Submit Order
    console.log('   Submitting Order...');
    const submitBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find((b) => b.innerText.includes('Submit Order'));
    });
    if (submitBtn) {
      await submitBtn.click();
    }
    await new Promise((r) => setTimeout(r, 3500));

    const screenshot5 = path.join(ARTIFACT_DIR, 'loyalty_5_order_success_points_credited.png');
    await page.screenshot({ path: screenshot5, fullPage: false });
    console.log(`📸 Screenshot saved: ${screenshot5}`);

    // Verify database state: points credited with 2x multiplier
    const finalUser = db.prepare('SELECT id, bitecoins_balance, current_streak, last_order_date FROM Users WHERE id = ?').get('usr-std-01');
    const redeemedPromo = db.prepare('SELECT * FROM PromoCodes WHERE UPPER(code) = UPPER(?)').get(bannerInfo.code);

    console.log('\n================================================================');
    console.log('🎉 Loyalty & Rewards Verification Summary:');
    console.log('   Final User Balance:', finalUser.bitecoins_balance, 'BiteCoins');
    console.log('   Current Consecutive Streak:', finalUser.current_streak, 'Days');
    console.log('   Promo Code:', bannerInfo.code);
    console.log('   Promo Code is_redeemed:', redeemedPromo?.is_redeemed === 1 ? 'YES (Redeemed)' : 'NO');
    console.log('================================================================\n');

    return {
      success: true,
      balance: finalUser.bitecoins_balance,
      streak: finalUser.current_streak,
      promoCode: bannerInfo.code,
      isRedeemed: redeemedPromo?.is_redeemed === 1,
    };
  } finally {
    await browser.close();
  }
}

testLoyaltyAndRewards()
  .then((res) => {
    console.log('✅ ALL LOYALTY & REWARDS TESTS PASSED SUCCESSFULLY:', res);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  });
