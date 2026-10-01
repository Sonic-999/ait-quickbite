import db from './server/db.js';
import { calculateDynamicETA } from './server/services/etaService.js';

async function runComprehensiveVerification() {
  console.log('===============================================================');
  console.log('🔬 AIT QuickBite - Dynamic ETA End-to-End Verification Suite');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName} ${details ? `(${details})` : ''}`);
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
    }
  }

  // 1. MenuItems Table Schema & Prep Times
  console.log('--- Step 1: MenuItems Table Schema & prep_time_minutes ---');
  const tableColumns = db.prepare("PRAGMA table_info(MenuItems)").all();
  const prepTimeCol = tableColumns.find(c => c.name === 'prep_time_minutes');
  assert(Boolean(prepTimeCol), 'Column prep_time_minutes exists in MenuItems table');
  assert(prepTimeCol?.type === 'INTEGER', 'prep_time_minutes is type INTEGER', prepTimeCol?.type);

  const sampleItems = db.prepare(`
    SELECT name, category, prep_time_minutes
    FROM MenuItems
    WHERE LOWER(name) LIKE '%juice%' OR LOWER(name) LIKE '%samosa%'
    LIMIT 5
  `).all();
  console.log('Sample Items with Prep Times:');
  console.table(sampleItems);

  const juiceItem = sampleItems.find(i => i.name.toLowerCase().includes('juice'));
  const samosaItem = sampleItems.find(i => i.name.toLowerCase().includes('samosa'));
  assert(juiceItem && juiceItem.prep_time_minutes === 2, 'Juice prep_time_minutes is 2 mins', `actual: ${juiceItem?.prep_time_minutes}`);
  assert(samosaItem && samosaItem.prep_time_minutes === 5, 'Samosa prep_time_minutes is 5 mins', `actual: ${samosaItem?.prep_time_minutes}`);

  // 2. Active Pending Orders & ETA Service Calculation
  console.log('\n--- Step 2: Active Queue & Dynamic ETA Service ---');
  const pendingOrders = db.prepare("SELECT id, token, shop_name, status, items FROM Orders WHERE LOWER(status) = 'pending'").all();
  console.log(`Currently ${pendingOrders.length} pending orders in database across all shops.`);

  const etaCart = calculateDynamicETA({
    shop: 'Juice Center',
    items: [
      { name: 'Fresh Orange Juice', quantity: 2 },        // 2 x 2m = 4m
      { name: 'Crispy Punjabi Samosa (2 pcs)', quantity: 2 } // 2 x 5m = 10m
    ] // Total Cart = 14m
  });

  assert(etaCart.success === true, 'calculateDynamicETA returns success');
  assert(etaCart.cartPrepMinutes === 14, 'Cart prep time is 14 minutes (4m Juice + 10m Samosa)', `actual: ${etaCart.cartPrepMinutes}`);
  assert(etaCart.totalEtaMinutes === etaCart.queuePrepMinutes + etaCart.cartPrepMinutes, 'totalEtaMinutes = queuePrepMinutes + cartPrepMinutes');
  assert(typeof etaCart.displayMessage === 'string' && etaCart.displayMessage.includes('Current Kitchen Load:'), 'Display message has required format', etaCart.displayMessage);
  console.log(`Generated Dynamic Message: "${etaCart.displayMessage}"`);

  // 3. API Route POST /api/checkout/eta
  console.log('\n--- Step 3: API Route /api/checkout/eta ---');
  try {
    const apiRes = await fetch('http://localhost:3001/api/checkout/eta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop: 'Juice Center',
        items: [
          { name: 'Fresh Orange Juice', quantity: 1 },
          { name: 'Crispy Punjabi Samosa (2 pcs)', quantity: 1 }
        ]
      })
    });
    const apiData = await apiRes.json();
    assert(apiRes.ok, 'POST /api/checkout/eta returns HTTP 200');
    assert(apiData.totalEtaMinutes > 0, `ETA total minutes returned (${apiData.totalEtaMinutes}m)`);
    assert(apiData.displayMessage.startsWith('Current Kitchen Load:'), 'Display message follows exact standard');
  } catch (err) {
    assert(false, 'POST /api/checkout/eta reachable', err.message);
  }

  // 4. Over 60 Minutes Queue Limiter Enforcement
  console.log('\n--- Step 4: Over 60 Minutes Queue Limiter Enforcement ---');
  const overloadETA = calculateDynamicETA({
    shop: 'Juice Center',
    items: [
      { name: 'Thali Special Meal', quantity: 10 } // 10 x 8m = 80m
    ]
  });
  assert(overloadETA.totalEtaMinutes > 60, 'Total ETA exceeds 60 minutes', `actual: ${overloadETA.totalEtaMinutes}m`);
  assert(overloadETA.canCheckout === false, 'canCheckout is false when queue > 60m');
  assert(overloadETA.isQueueFull === true, 'isQueueFull is true when queue > 60m');

  // Verify that POST /api/checkout actually blocks checkout when ETA > 60m
  try {
    const blockedRes = await fetch('http://localhost:3001/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopName: 'Juice Center',
        total: 800,
        utr: '999999999999',
        items: [
          { name: 'Thali Special Meal', quantity: 10, price: 80 }
        ]
      })
    });
    const blockedData = await blockedRes.json();
    assert(blockedRes.status === 400, 'POST /api/checkout responds with 400 Bad Request when queue > 60m', `status: ${blockedRes.status}`);
    assert(blockedData.error.includes('Kitchen Over Capacity'), 'Error explicitly mentions Kitchen Over Capacity', blockedData.error);
  } catch (err) {
    assert(false, 'Over 60m checkout block test', err.message);
  }

  // 5. Valid Checkout Under 60 Minutes
  console.log('\n--- Step 5: Valid Checkout Under 60 Minutes ---');
  try {
    const validUtr = `${Math.floor(100000000000 + Math.random() * 899999999999)}`;
    const checkoutRes = await fetch('http://localhost:3001/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopName: 'Juice Center',
        total: 70,
        utr: validUtr,
        items: [
          { id: 'jc-j-orange', name: 'Fresh Orange Juice', price: 40, quantity: 1, shopName: 'Juice Center' },
          { id: 'jc-sn-samosa', name: 'Crispy Punjabi Samosa (2 pcs)', price: 30, quantity: 1, shopName: 'Juice Center' }
        ]
      })
    });
    const checkoutData = await checkoutRes.json();
    assert(checkoutRes.status === 201, 'POST /api/checkout returns 201 Created for valid checkout');
    assert(checkoutData.order?.eta?.totalEtaMinutes > 0, `Order created with dynamic ETA: ${checkoutData.order?.eta?.totalEtaMinutes}m`);
    assert(Boolean(checkoutData.order?.due_time), `Order assigned target pickup time: ${checkoutData.order?.due_time}`);
  } catch (err) {
    assert(false, 'Valid checkout test', err.message);
  }

  console.log('\n===============================================================');
  console.log(`📊 Summary: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('===============================================================\n');
}

runComprehensiveVerification();
