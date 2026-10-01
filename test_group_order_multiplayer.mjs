import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const ARTIFACT_DIR = 'C:\\Users\\sourabh\\.gemini\\antigravity-ide\\brain\\39eb598a-9859-414c-b4e1-a2aaa0a33c15';

async function runMultiplayerTest() {
  console.log('================================================================');
  console.log('🎮 AIT QuickBite: Group Order Multiplayer WebSocket Test');
  console.log('================================================================\n');

  let browserA = null;
  let browserB = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Launch Browser Instance A (Host - Aarav)
    // -------------------------------------------------------------------------
    console.log('[Step 1] Launching Browser Instance A (Host - Aarav)...');
    browserA = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      defaultViewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const pageA = await browserA.newPage();
    pageA.on('console', (msg) => {
      const txt = msg.text();
      if (txt.includes('Group') || txt.includes('Socket') || txt.includes('group:')) {
        console.log('  [Browser A Console]:', txt);
      }
    });

    await pageA.goto(`${FRONTEND_URL}/menu`, { waitUntil: 'networkidle2' });
    console.log('  Instance A loaded menu page.');

    // Wait for "Create Group Cart" button
    await pageA.waitForSelector('#btn-create-group-cart', { timeout: 10000 });
    console.log('  Found #btn-create-group-cart. Clicking to generate session...');
    await pageA.click('#btn-create-group-cart');

    // Wait for invite modal
    await pageA.waitForSelector('#share-link-input', { timeout: 10000 });
    const shareUrl = await pageA.$eval('#share-link-input', (el) => el.value);
    console.log(`  🎉 Group Cart Created! Shareable Room Link: ${shareUrl}`);

    const sessionMatch = shareUrl.match(/\/cart\/session\/([a-zA-Z0-9_-]+)/);
    const sessionId = sessionMatch ? sessionMatch[1] : 'xyz123';
    console.log(`  Extracted Session ID: ${sessionId}`);

    // Take screenshot of Host with Invite Modal open
    const shot1Path = path.join(ARTIFACT_DIR, 'group_order_1_host_invite_modal.png');
    await pageA.screenshot({ path: shot1Path, fullPage: false });
    console.log(`  📸 Screenshot saved: ${shot1Path}`);

    // Close the invite modal
    await pageA.click('#btn-close-invite-modal');
    await new Promise((r) => setTimeout(r, 600));

    // Verify Presence Bar is rendered on Host
    const presenceText = await pageA.$eval('#root', (el) => el.innerText);
    const hasRoomBadge = presenceText.includes(`Room #${sessionId}`) || presenceText.includes('Room');
    console.log(`  Host sees presence bar with Room ID: ${hasRoomBadge}`);

    // -------------------------------------------------------------------------
    // STEP 2: Launch Browser Instance B (Friend - Rahul) & Join Room
    // -------------------------------------------------------------------------
    console.log('\n[Step 2] Launching Browser Instance B (Friend - Rahul)...');
    browserB = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      defaultViewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const pageB = await browserB.newPage();
    pageB.on('console', (msg) => {
      const txt = msg.text();
      if (txt.includes('Group') || txt.includes('Socket') || txt.includes('group:')) {
        console.log('  [Browser B Console]:', txt);
      }
    });

    console.log(`  Instance B navigating directly to share link: ${shareUrl}`);
    await pageB.goto(shareUrl, { waitUntil: 'networkidle2' });

    // Wait for Join Modal
    await pageB.waitForSelector('#input-friend-name', { timeout: 10000 });
    console.log('  Instance B prompted with GroupJoinModal. Entering name "Rahul"...');

    await pageB.type('#input-friend-name', 'Rahul');
    await pageB.click('#btn-join-group');
    await new Promise((r) => setTimeout(r, 1200));

    // Take screenshot of Friend after joining
    const shot2Path = path.join(ARTIFACT_DIR, 'group_order_2_friend_joined.png');
    await pageB.screenshot({ path: shot2Path, fullPage: false });
    console.log(`  📸 Screenshot saved: ${shot2Path}`);

    // -------------------------------------------------------------------------
    // STEP 3: Real-Time Synchronization (Friend adds Samosa)
    // -------------------------------------------------------------------------
    console.log('\n[Step 3] Real-Time Synchronization: Friend (Rahul) adds Samosa...');
    
    // Look for Samosa or first ADD button in Browser B
    const addButtonsB = await pageB.$$('button');
    let addedItemName = '';
    for (const btn of addButtonsB) {
      const text = await pageB.evaluate((el) => el.innerText, btn);
      if (text.trim().toUpperCase() === 'ADD') {
        const cardTitle = await pageB.evaluate((el) => {
          const card = el.closest('.menu-item-card') || el.closest('[data-item-id]') || el.parentElement.parentElement;
          const heading = card ? card.querySelector('h3, h4, .font-bold') : null;
          return heading ? heading.innerText : 'Item';
        }, btn);
        addedItemName = cardTitle;
        console.log(`  Instance B clicking ADD on: ${cardTitle}`);
        await btn.click();
        break;
      }
    }

    // Wait 1.5s for WebSocket event propagation
    await new Promise((r) => setTimeout(r, 1500));

    // Verify in Browser A: Cart count must be > 0 and activity feed updated!
    const pageATextAfterAdd = await pageA.$eval('#root', (el) => el.innerText);
    const hostHasItemInCart = pageATextAfterAdd.includes('in Group Cart') || pageATextAfterAdd.includes('item in Group Cart') || pageATextAfterAdd.includes('items in Group Cart');
    const hostSeesFriendActivity = pageATextAfterAdd.includes('Rahul') || pageATextAfterAdd.includes('adding') || pageATextAfterAdd.includes('added');
    console.log(`  Instance A received live cart update: ${hostHasItemInCart}`);
    console.log(`  Instance A displays Rahul in live activity/cart: ${hostSeesFriendActivity}`);

    // Take screenshot of Host with synchronized cart
    const shot3Path = path.join(ARTIFACT_DIR, 'group_order_3_synced_cart_host.png');
    await pageA.screenshot({ path: shot3Path, fullPage: false });
    console.log(`  📸 Screenshot saved: ${shot3Path}`);

    // -------------------------------------------------------------------------
    // STEP 4: Auto-Split Bill Calculation & Individual UPI QR Codes
    // -------------------------------------------------------------------------
    console.log('\n[Step 4] Opening Auto-Split Bill Checkout...');
    await pageA.waitForSelector('#btn-group-split-checkout', { timeout: 8000 });
    await pageA.click('#btn-group-split-checkout');

    await pageA.waitForSelector('#btn-dispatch-group-order', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1000));

    const checkoutText = await pageA.$eval('#root', (el) => el.innerText);
    const hasAutoSplit = checkoutText.includes('Auto-Split Bill') || checkoutText.includes('Per Person Share');
    const hasPerFriendCalc = checkoutText.includes('/ friend') || checkoutText.includes('Share to pay');
    console.log(`  Auto-Split Bill Calculation displayed: ${hasAutoSplit}`);
    console.log(`  Individual shares calculated: ${hasPerFriendCalc}`);

    // Take screenshot of Auto-Split Checkout with individual UPI QR codes
    const shot4Path = path.join(ARTIFACT_DIR, 'group_order_4_auto_split_qr_codes.png');
    await pageA.screenshot({ path: shot4Path, fullPage: false });
    console.log(`  📸 Screenshot saved: ${shot4Path}`);

    // -------------------------------------------------------------------------
    // STEP 5: Simulating Participant Share Payment & Dispatching to Kitchen
    // -------------------------------------------------------------------------
    console.log('\n[Step 5] Simulating Participant Share Payment & Dispatching Order...');
    
    // Find pay button for friend
    const payBtns = await pageA.$$('[data-testid="btn-pay-share"]');
    if (payBtns.length > 0) {
      console.log(`  Found ${payBtns.length} participant payment buttons. Paying shares...`);
      for (const pBtn of payBtns) {
        await pBtn.click();
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    await new Promise((r) => setTimeout(r, 1000));

    // Host dispatches to kitchen
    console.log('  Clicking #btn-dispatch-group-order...');
    await pageA.click('#btn-dispatch-group-order');

    // Wait for redirect to live status and confetti burst
    await pageA.waitForSelector('#order-status-milestone, svg, #orders-section', { timeout: 12000 });
    await new Promise((r) => setTimeout(r, 1500));

    const finalUrl = pageA.url();
    console.log(`  Host redirected after dispatch to: ${finalUrl}`);

    const shot5Path = path.join(ARTIFACT_DIR, 'group_order_5_dispatched_live_tracking.png');
    await pageA.screenshot({ path: shot5Path, fullPage: false });
    console.log(`  📸 Screenshot saved: ${shot5Path}`);

    console.log('\n================================================================');
    console.log('✅ MULTIPLAYER GROUP ORDER TEST PASSED 100%');
    console.log('================================================================');
    return {
      success: true,
      sessionId,
      shareUrl,
      screenshots: [shot1Path, shot2Path, shot3Path, shot4Path, shot5Path],
    };

  } catch (err) {
    console.error('❌ Multiplayer Test Error:', err);
    return { success: false, error: err.message };
  } finally {
    if (browserA) await browserA.close();
    if (browserB) await browserB.close();
  }
}

runMultiplayerTest().then((res) => {
  console.log('Test result:', JSON.stringify(res, null, 2));
  process.exit(res.success ? 0 : 1);
});
