import db from './server/db.js';
import { calculateDynamicETA } from './server/services/etaService.js';

console.log('=== TEST 1: Check Current Pending Orders ===');
const pending = db.prepare("SELECT id, token, shop_name, status, items FROM Orders WHERE LOWER(status) = 'pending'").all();
console.log(`Found ${pending.length} pending orders in database:`);
pending.forEach(p => console.log(` - #${p.token} [${p.shop_name}]: ${p.items}`));

console.log('\n=== TEST 2: Calculate ETA with Empty Cart ===');
const etaEmpty = calculateDynamicETA({ shop: 'Juice Center', items: [] });
console.log(etaEmpty);

console.log('\n=== TEST 3: Calculate ETA with Juice (2m) + Samosa (5m) ===');
const etaCart = calculateDynamicETA({
  shop: 'Juice Center',
  items: [
    { name: 'Fresh Orange Juice', quantity: 1 },
    { name: 'Crispy Punjabi Samosa (2 pcs)', quantity: 1 }
  ]
});
console.log(etaCart);
console.log(`Display Message: "${etaCart.displayMessage}"`);

console.log('\n=== TEST 4: Calculate ETA Over 60 Minutes (Over Capacity) ===');
const etaOverload = calculateDynamicETA({
  shop: 'Juice Center',
  items: [
    { name: 'Thali Special Meal', quantity: 10 } // 10 x 8m = 80m
  ]
});
console.log({
  totalEtaMinutes: etaOverload.totalEtaMinutes,
  loadLevel: etaOverload.loadLevel,
  canCheckout: etaOverload.canCheckout,
  isQueueFull: etaOverload.isQueueFull,
  displayMessage: etaOverload.displayMessage,
});
