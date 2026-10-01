import db from '../db.js';

// Lazy cache for prepared statements
let getItemStmt = null;

function getMenuItemStatement() {
  if (!getItemStmt) {
    try {
      getItemStmt = db.prepare(`
        SELECT prep_time_minutes, name, category_id
        FROM MenuItems
        WHERE id = ? OR LOWER(name) = LOWER(?)
        LIMIT 1
      `);
    } catch (err) {
      console.warn('[etaService] Prepared statement init deferred:', err.message);
      return null;
    }
  }
  return getItemStmt;
}

/**
 * Normalizes shop names for accurate matching in SQLite
 */
function normalizeShop(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Returns prep time in minutes for a specific menu item.
 * Default heuristics: Juice = 2 mins, Samosa = 5 mins, Shakes = 4 mins, Sandwiches = 5 mins, Others = 3 mins.
 */
export function getItemPrepTime(itemId, itemName = '') {
  try {
    const stmt = getMenuItemStatement();
    if (stmt) {
      const row = stmt.get(itemId || '', itemName || '');
      if (row && row.prep_time_minutes != null) {
        return Number(row.prep_time_minutes);
      }
    }
  } catch (err) {
    console.warn('[etaService] getItemPrepTime DB lookup warning:', err.message);
  }

  const cleanName = (itemName || '').toLowerCase();
  if (cleanName.includes('juice')) return 2;
  if (cleanName.includes('samosa')) return 5;
  if (cleanName.includes('shake') || cleanName.includes('smoothie')) return 4;
  if (cleanName.includes('sandwich') || cleanName.includes('fries')) return 5;
  if (cleanName.includes('thali') || cleanName.includes('meal') || cleanName.includes('dosa')) return 8;
  if (cleanName.includes('coffee') || cleanName.includes('tea')) return 3;
  return 3;
}

/**
 * Calculates total prep time for the user's current cart items
 */
export function calculateCartPrepTime(cartItems = []) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return 0;
  }

  let totalMinutes = 0;
  for (const item of cartItems) {
    const prepPerItem = getItemPrepTime(item.id, item.name);
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    totalMinutes += prepPerItem * qty;
  }
  return totalMinutes;
}

/**
 * Queries all currently 'Pending' orders for a specific shop
 * and sums up the prep_time_minutes of those active orders.
 */
export function calculateActiveQueuePrepTime(shopNameOrId) {
  try {
    let query = `
      SELECT id, token, shop_name, status, items
      FROM Orders
      WHERE LOWER(status) = 'pending'
    `;
    const params = [];

    if (shopNameOrId && shopNameOrId.toLowerCase() !== 'all' && shopNameOrId !== 'All Shops') {
      const cleanShop = normalizeShop(shopNameOrId);
      query += ` AND LOWER(REPLACE(REPLACE(shop_name, ' ', ''), '-', '')) LIKE ?`;
      params.push(`%${cleanShop}%`);
    }

    const pendingRows = db.prepare(query).all(...params);

    let queuePrepMinutes = 0;
    const pendingOrdersBreakdown = [];

    for (const row of pendingRows) {
      let orderItems = [];
      try {
        orderItems = JSON.parse(row.items || '[]');
      } catch {
        orderItems = [{ name: row.items || 'Item', quantity: 1 }];
      }

      let orderPrepTime = 0;
      if (Array.isArray(orderItems)) {
        for (const it of orderItems) {
          const prep = getItemPrepTime(it.id, it.name);
          const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
          orderPrepTime += prep * qty;
        }
      }

      // Minimum 2 minutes per pending order
      orderPrepTime = Math.max(2, orderPrepTime);
      queuePrepMinutes += orderPrepTime;

      pendingOrdersBreakdown.push({
        id: row.id,
        token: row.token,
        itemsCount: orderItems.length,
        prepMinutes: orderPrepTime,
      });
    }

    return {
      pendingOrdersCount: pendingRows.length,
      queuePrepMinutes,
      pendingOrdersBreakdown,
    };
  } catch (err) {
    console.error('[etaService] calculateActiveQueuePrepTime Error:', err);
    return {
      pendingOrdersCount: 0,
      queuePrepMinutes: 0,
      pendingOrdersBreakdown: [],
    };
  }
}

/**
 * Dynamic ETA Algorithm:
 * - Queries all currently 'Pending' orders for that shop
 * - Sums up the prep_time_minutes of those active orders
 * - Adds the prep time of the user's own cart
 * - Categorizes kitchen load level
 * - Enforces the rule: Disable checkout if the shop's queue exceeds 60 minutes
 */
export function calculateDynamicETA({ shop = 'Juice Center', items = [] }) {
  const activeQueue = calculateActiveQueuePrepTime(shop);
  const cartPrepMinutes = calculateCartPrepTime(items);
  const totalEtaMinutes = activeQueue.queuePrepMinutes + cartPrepMinutes;

  // Determine Kitchen Load Level
  let loadLevel = 'Low';
  let badgeColor = 'emerald';

  if (totalEtaMinutes > 60 || activeQueue.queuePrepMinutes > 60) {
    loadLevel = 'High';
    badgeColor = 'red';
  } else if (totalEtaMinutes >= 20) {
    loadLevel = 'High';
    badgeColor = 'amber';
  } else if (totalEtaMinutes >= 10) {
    loadLevel = 'Moderate';
    badgeColor = 'amber';
  } else {
    loadLevel = 'Low';
    badgeColor = 'emerald';
  }

  // Check if shop queue exceeds 60 minutes limit
  const isQueueFull = totalEtaMinutes > 60 || activeQueue.queuePrepMinutes > 60;
  const canCheckout = !isQueueFull;

  // Calculate target pickup time formatted as 12-hour timestamp
  const targetPickupDate = new Date(Date.now() + Math.max(2, totalEtaMinutes) * 60000);
  const targetPickupTime = targetPickupDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  // Construct UI message
  let displayMessage = '';
  if (isQueueFull) {
    displayMessage = `Current Kitchen Load: High (Queue: ${activeQueue.queuePrepMinutes} mins). Orders temporarily disabled as queue exceeds 60 minutes.`;
  } else {
    displayMessage = `Current Kitchen Load: ${loadLevel}. Your estimated pickup time is ${totalEtaMinutes} minutes.`;
  }

  return {
    success: true,
    shop,
    queueOrdersCount: activeQueue.pendingOrdersCount,
    queuePrepMinutes: activeQueue.queuePrepMinutes,
    cartPrepMinutes,
    totalEtaMinutes,
    loadLevel,
    badgeColor,
    displayMessage,
    targetPickupTime,
    canCheckout,
    isQueueFull,
    maxAllowedMinutes: 60,
  };
}
