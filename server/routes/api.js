import express from 'express';
import db from '../db.js';
import { notifyNewOrder, notifyOrderStatus, notifyStockUpdated } from '../socket.js';
import { calculateDynamicETA } from '../services/etaService.js';
import { creditUserBitecoins, getUserRewardsStatus, redeemBitecoinsReward } from '../services/loyaltyService.js';
import { getTrendingItems, broadcastTrendingUpdates } from '../services/trendingService.js';

const router = express.Router();

/**
 * Helper to normalize shop names for filtering
 * e.g., 'JuiceCenter' -> 'juicecenter', 'Juice Center' -> 'juicecenter'
 */
function normalizeShop(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * ----------------------------------------------------------------------
 * 1. GET /menu (and /api/menu)
 * Query options: ?shop=..., ?category=..., ?search=..., ?format=grouped|flat
 * Returns Swiggy-style categorized menu with Unsplash Source food images
 * ----------------------------------------------------------------------
 */
router.get(['/menu', '/api/menu'], (req, res) => {
  try {
    const { shop, category, search, format } = req.query;

    let query = `
      SELECT id, shop_id, shop_name, category, category_id, name, desc,
             price, badge, is_veg, image, alt, fallback_image, is_available,
             display_order, prep_time_minutes, in_stock_quantity
      FROM MenuItems
      WHERE 1=1
    `;
    const params = [];

    if (shop && shop.trim() !== '' && shop.toLowerCase() !== 'all') {
      const cleanShop = normalizeShop(shop);
      // Compare normalized shop name or shop_id
      query += ` AND (
        LOWER(REPLACE(REPLACE(shop_name, ' ', ''), '-', '')) LIKE ?
        OR LOWER(REPLACE(REPLACE(shop_id, ' ', ''), '-', '')) LIKE ?
      )`;
      params.push(`%${cleanShop}%`, `%${cleanShop}%`);
    }

    if (category && category.trim() !== '') {
      query += ` AND (LOWER(category_id) = ? OR LOWER(category) = ?)`;
      params.push(category.toLowerCase(), category.toLowerCase());
    }

    if (search && search.trim() !== '') {
      query += ` AND (name LIKE ? OR desc LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY display_order ASC, name ASC`;

    const rows = db.prepare(query).all(...params);

    // Map rows to camelCase JS objects
    const items = rows.map((r) => ({
      id: r.id,
      shopId: r.shop_id,
      shopName: r.shop_name,
      category: r.category,
      categoryId: r.category_id,
      name: r.name,
      desc: r.desc,
      price: r.price,
      badge: r.badge,
      isVeg: Boolean(r.is_veg),
      image: r.image,
      alt: r.alt,
      fallbackImage: r.fallback_image,
      displayOrder: r.display_order,
      prepTimeMinutes: r.prep_time_minutes != null ? r.prep_time_minutes : 3,
      inStockQuantity: r.in_stock_quantity != null ? r.in_stock_quantity : 0,
      isAvailable: Boolean(r.is_available) && (r.in_stock_quantity == null || r.in_stock_quantity > 0),
    }));

    // If flat format requested, return array of items
    if (format === 'flat') {
      return res.json({ success: true, count: items.length, items });
    }

    // Default: Group items by category (ideal for Swiggy/Blinkit UI)
    const categoryDescriptions = {
      bestsellers: 'Most loved juices, shakes, and quick bites ordered across campus',
      juices: 'Fresh cold-pressed and whole-fruit juices with zero added artificial preservatives',
      shakes: 'Thick, creamy dairy and protein shakes made with premium ice cream and natural milk',
      snacks: 'Quick-served hot samosas, sandwiches, crisp fries, and nutritious salads',
      meals: 'Wholesome student thalis and filling lunch specials',
      beverages: 'Chilled coffees and energizing campus drinks',
      'south-indian': 'Crispy dosas and authentic South Indian specials',
      'north-indian': 'Rich gravies, chole bhature, and freshly baked breads',
      'hot-food': 'Quick warm comfort noodles and treats',
    };

    const categoryMap = new Map();
    for (const item of items) {
      if (!categoryMap.has(item.categoryId)) {
        categoryMap.set(item.categoryId, {
          category: item.category,
          categoryId: item.categoryId,
          description: categoryDescriptions[item.categoryId] || `${item.category} selections`,
          items: [],
        });
      }
      categoryMap.get(item.categoryId).items.push(item);
    }

    const categories = Array.from(categoryMap.values());

    return res.json({
      success: true,
      shop: shop || 'All Shops',
      count: items.length,
      categories,
      items,
    });
  } catch (err) {
    console.error('[API /menu Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 1.5 GET & POST /checkout/eta (and /api/checkout/eta)
 * Calculates dynamic ETA based on active pending queue + cart prep time.
 * Returns loadLevel, totalEtaMinutes, displayMessage, canCheckout, isQueueFull
 * ----------------------------------------------------------------------
 */
router.all(['/checkout/eta', '/api/checkout/eta'], (req, res) => {
  try {
    const shop = req.body?.shopName || req.body?.shop || req.query?.shopName || req.query?.shop || 'Juice Center';
    let items = req.body?.items || req.body?.cartItems || [];

    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    } else if ((!items || items.length === 0) && req.query?.items) {
      try {
        items = JSON.parse(req.query.items);
      } catch {
        items = [];
      }
    }

    const etaData = calculateDynamicETA({ shop, items });
    return res.json(etaData);
  } catch (err) {
    console.error('[API /checkout/eta Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 1.8 POST /menu/stock (and /api/menu/stock)
 * Updates item stock quantity directly (useful for testing & vendor inventory)
 * Emits real-time 'menu:stock_updated' event to all connected clients.
 * ----------------------------------------------------------------------
 */
router.post(['/menu/stock', '/api/menu/stock'], (req, res) => {
  try {
    const { itemId, itemName, quantity, inStockQuantity } = req.body;
    const targetQty = inStockQuantity != null ? inStockQuantity : quantity;
    if (targetQty == null) {
      return res.status(400).json({ success: false, error: 'inStockQuantity is required' });
    }

    let item = null;
    if (itemId) {
      item = db.prepare('SELECT id, name, shop_name FROM MenuItems WHERE id = ?').get(itemId);
    }
    if (!item && itemName) {
      item = db.prepare('SELECT id, name, shop_name FROM MenuItems WHERE LOWER(name) = LOWER(?) LIMIT 1').get(itemName);
    }

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found in menu' });
    }

    const newStock = Math.max(0, parseInt(targetQty, 10));
    const isAvail = newStock > 0 ? 1 : 0;

    // Update all matching items with same name in same shop (e.g. bestsellers + snacks)
    db.prepare(`
      UPDATE MenuItems
      SET in_stock_quantity = ?, is_available = ?
      WHERE id = ? OR (shop_name = ? AND LOWER(name) = LOWER(?))
    `).run(newStock, isAvail, item.id, item.shop_name, item.name);

    const updatedRows = db.prepare(`
      SELECT id, name, shop_name, in_stock_quantity, is_available
      FROM MenuItems
      WHERE id = ? OR (shop_name = ? AND LOWER(name) = LOWER(?))
    `).all(item.id, item.shop_name, item.name);

    const updatedPayload = updatedRows.map((r) => ({
      id: r.id,
      name: r.name,
      inStockQuantity: r.in_stock_quantity,
      isAvailable: Boolean(r.is_available),
    }));

    notifyStockUpdated(updatedPayload);

    return res.json({
      success: true,
      message: `Stock for "${item.name}" updated to ${newStock}`,
      items: updatedPayload,
    });
  } catch (err) {
    console.error('[API /menu/stock Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 2. POST /checkout (and /api/checkout)
 * Rewritten to use SQL Database Transactions (ACID Compliance)
 * - Uses BEGIN IMMEDIATE to lock rows and prevent race conditions.
 * - Checks if requested quantity is still available.
 * - If stock is 0 or less than requested, rolls back safely and returns 'Item just sold out'.
 * - Deducts stock and creates verified pre-order atomically.
 * - Enforces queue load limit: disables checkout if shop queue > 60 mins.
 * ----------------------------------------------------------------------
 */
router.post(['/checkout', '/api/checkout'], (req, res) => {
  try {
    const {
      items,
      total,
      pickupTime,
      utr,
      shopName,
      userName,
      userId,
      upiString,
      studentSocketId: directStudentSocketId,
    } = req.body;

    if (!items || (Array.isArray(items) && items.length === 0)) {
      return res.status(400).json({ success: false, error: 'Cart items cannot be empty.' });
    }

    // Determine target shop name
    let targetShopName = shopName;
    if (!targetShopName && Array.isArray(items) && items.length > 0) {
      targetShopName = items[0].shopName || 'Juice Center';
    }
    if (!targetShopName) targetShopName = 'Juice Center';

    // Parse items to compute dynamic ETA and check queue capacity limit (60 mins)
    let parsedItems = [];
    try {
      parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    } catch {
      parsedItems = [];
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid cart items.' });
    }

    // Calculate Dynamic ETA for active queue and cart items
    const etaData = calculateDynamicETA({ shop: targetShopName, items: parsedItems });

    // Enforce rule: Disable checkout if the shop's queue exceeds 60 minutes
    if (!etaData.canCheckout || etaData.isQueueFull || etaData.totalEtaMinutes > 60 || etaData.queuePrepMinutes > 60) {
      return res.status(400).json({
        success: false,
        error: `Kitchen Over Capacity: The active order queue for ${targetShopName} exceeds 60 minutes (${etaData.totalEtaMinutes} mins). Checkout is temporarily paused. Please try again shortly.`,
        eta: etaData,
      });
    }

    // Clean and validate 12-digit UTR
    const cleanUtr = (utr || '').toString().trim();
    if (!cleanUtr || cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
      return res.status(400).json({
        success: false,
        error: 'A valid 12-digit numeric UTR transaction ID is required for verification.',
      });
    }

    // Generate unique token number (2-3 digit number)
    const token = Math.floor(10 + Math.random() * 89).toString();
    const orderId = `ord-${Date.now()}`;
    const parsedTotal = parseFloat(total) || 0;
    const finalPickupTime = pickupTime || `In ${etaData.totalEtaMinutes} Minutes`;
    const dueTime = etaData.targetPickupTime || 'In 15 mins';
    const estimatedTime = etaData.displayMessage;
    const studentSocketId = directStudentSocketId || req.body.studentSocketId || req.headers['x-socket-id'] || null;

    const newOrderRecord = {
      id: orderId,
      token,
      user_id: userId || 'usr-std-01',
      user_name: userName || 'Student',
      shop_name: targetShopName,
      status: 'Pending',
      pickup_time: finalPickupTime,
      due_time: dueTime,
      estimated_time: estimatedTime,
      total: parsedTotal,
      utr: cleanUtr,
      items: typeof items === 'string' ? items : JSON.stringify(items),
      upi_string: upiString || null,
      student_socket_id: studentSocketId,
    };

    /**
     * -------------------------------------------------------------
     * ACID Database Transaction with Row Locking (BEGIN IMMEDIATE)
     * Concurrency Control:
     * 1. Locks the items in SQLite using BEGIN IMMEDIATE
     * 2. Checks available stock for each requested item
     * 3. If quantity exceeds stock or item is 0 -> throws 'Item just sold out'
     *    which rolls back the transaction safely!
     * 4. Deducts stock and inserts the order record atomically.
     * -------------------------------------------------------------
     */
    const executeCheckoutTransaction = db.transaction((txOrderData) => {
      const stockUpdates = [];

      for (const cartItem of txOrderData.items) {
        const requestedQty = Math.max(1, parseInt(cartItem.quantity, 10) || 1);
        const cleanItemName = (cartItem.name || '').replace(/^\d+x\s*/i, '').trim();

        // Query row lock on item in MenuItems table
        let itemRow = null;
        if (cartItem.id) {
          itemRow = db.prepare(`
            SELECT id, name, shop_name, in_stock_quantity, is_available
            FROM MenuItems
            WHERE id = ?
          `).get(cartItem.id);
        }

        if (!itemRow && cleanItemName) {
          itemRow = db.prepare(`
            SELECT id, name, shop_name, in_stock_quantity, is_available
            FROM MenuItems
            WHERE LOWER(name) = LOWER(?)
            LIMIT 1
          `).get(cleanItemName);
        }

        if (!itemRow && cleanItemName) {
          itemRow = db.prepare(`
            SELECT id, name, shop_name, in_stock_quantity, is_available
            FROM MenuItems
            WHERE LOWER(name) LIKE ?
            LIMIT 1
          `).get(`%${cleanItemName.toLowerCase()}%`);
        }

        if (!itemRow) {
          console.warn(`[Checkout Transaction] Menu item not found for: "${cartItem.name}" (id: ${cartItem.id})`);
          continue;
        }

        const currentStock = itemRow.in_stock_quantity != null ? itemRow.in_stock_quantity : 0;

        // Check if the requested quantity is still available
        if (currentStock <= 0 || currentStock < requestedQty) {
          console.warn(`[Checkout Transaction] Concurrency conflict: "${itemRow.name}" available=${currentStock}, requested=${requestedQty}`);
          const soldOutError = new Error('Item just sold out');
          soldOutError.code = 'ERR_ITEM_SOLD_OUT';
          soldOutError.itemName = itemRow.name;
          soldOutError.itemId = itemRow.id;
          soldOutError.availableStock = currentStock;
          soldOutError.requestedQty = requestedQty;
          // Throwing inside db.transaction() triggers an immediate, safe ACID ROLLBACK
          throw soldOutError;
        }

        // Deduct the stock
        const newStock = currentStock - requestedQty;
        const newIsAvailable = newStock > 0 ? 1 : 0;

        // Update in MenuItems table (syncing identical items in same shop e.g. bestsellers + snacks)
        db.prepare(`
          UPDATE MenuItems
          SET in_stock_quantity = ?,
              is_available = ?
          WHERE id = ? OR (shop_name = ? AND LOWER(name) = LOWER(?))
        `).run(newStock, newIsAvailable, itemRow.id, itemRow.shop_name, itemRow.name);

        stockUpdates.push({
          id: itemRow.id,
          name: itemRow.name,
          inStockQuantity: newStock,
          isAvailable: Boolean(newIsAvailable),
        });
      }

      // Insert order into SQLite database
      const insertStmt = db.prepare(`
        INSERT INTO Orders (
          id, token, user_id, user_name, shop_name, status, pickup_time,
          due_time, estimated_time, total, utr, items, upi_string, student_socket_id
        ) VALUES (
          @id, @token, @user_id, @user_name, @shop_name, @status, @pickup_time,
          @due_time, @estimated_time, @total, @utr, @items, @upi_string, @student_socket_id
        )
      `);

      insertStmt.run(txOrderData.orderRecord);

      return {
        stockUpdates,
        orderRecord: txOrderData.orderRecord,
      };
    });

    // Execute ACID transaction with BEGIN IMMEDIATE
    let txResult;
    try {
      txResult = executeCheckoutTransaction.immediate({
        items: parsedItems,
        orderRecord: newOrderRecord,
      });
    } catch (txErr) {
      if (txErr.code === 'ERR_ITEM_SOLD_OUT' || txErr.message === 'Item just sold out') {
        console.warn(`[Checkout Transaction] Rollback executed: ${txErr.message} for "${txErr.itemName}"`);
        return res.status(409).json({
          success: false,
          error: 'Item just sold out',
          message: 'Item just sold out',
          item: txErr.itemName,
          itemId: txErr.itemId,
          availableStock: txErr.availableStock,
          requestedQty: txErr.requestedQty,
          code: 'ERR_ITEM_SOLD_OUT',
        });
      }
      throw txErr;
    }

    const savedOrder = {
      ...newOrderRecord,
      items: parsedItems,
      studentSocketId,
      eta: etaData,
    };

    console.log(`[API /checkout] ACID Transaction committed! Order #${token} (${orderId}) for ${targetShopName}, stock deducted for ${txResult.stockUpdates.length} items`);

    // Emit live real-time stock update to all connected clients
    if (txResult.stockUpdates.length > 0) {
      notifyStockUpdated(txResult.stockUpdates);
    }

    // Emit live WebSocket notification directly to vendor KDS room
    notifyNewOrder(savedOrder);

    // Credit loyalty BiteCoins & calculate streak multiplier
    let loyaltyReward = null;
    try {
      loyaltyReward = creditUserBitecoins(userId || 'usr-std-01', total, new Date().toISOString());
      console.log(`[Loyalty Rewards] Credited ${loyaltyReward.earnedPoints} BiteCoins to ${loyaltyReward.userId} (Streak: ${loyaltyReward.currentStreak}x, Balance: ${loyaltyReward.newBalance})`);
    } catch (loyaltyErr) {
      console.error('[Loyalty Rewards Error]', loyaltyErr);
    }

    if (req.body?.promoCode) {
      try {
        db.prepare('UPDATE PromoCodes SET is_redeemed = 1 WHERE UPPER(code) = UPPER(?)').run(req.body.promoCode.trim());
      } catch (e) {}
    }

    // Recalculate campus trends and broadcast 'trending:updated' via WebSockets
    try {
      broadcastTrendingUpdates();
    } catch (trendErr) {
      console.error('[Trending Broadcast Error on Checkout]', trendErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Order created successfully and stock deducted',
      order: savedOrder,
      eta: etaData,
      stockUpdates: txResult.stockUpdates,
      rewards: loyaltyReward,
    });
  } catch (err) {
    console.error('[API /checkout Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 3. GET /vendor/orders (and /api/vendor/orders)
 * Fetches vendor orders filtered by shop and status with items parsed
 * ----------------------------------------------------------------------
 */
router.get(['/vendor/orders', '/api/vendor/orders'], (req, res) => {
  try {
    const { shop, status } = req.query;

    let query = `
      SELECT id, token, user_id, user_name, shop_name, status, pickup_time,
             due_time, estimated_time, total, utr, items, upi_string,
             created_at, updated_at
      FROM Orders
      WHERE 1=1
    `;
    const params = [];

    if (shop && shop.trim() !== '' && shop.toLowerCase() !== 'all') {
      const cleanShop = normalizeShop(shop);
      query += ` AND LOWER(REPLACE(REPLACE(shop_name, ' ', ''), '-', '')) LIKE ?`;
      params.push(`%${cleanShop}%`);
    }

    if (status && status.trim() !== '' && status.toLowerCase() !== 'all') {
      query += ` AND LOWER(status) = ?`;
      params.push(status.toLowerCase());
    }

    // Orders sorted newest first, with Pending before Ready/Completed
    query += ` ORDER BY CASE WHEN status = 'Pending' THEN 0 ELSE 1 END, created_at DESC`;

    const rows = db.prepare(query).all(...params);

    const orders = rows.map((r) => {
      let parsedItems = [];
      try {
        parsedItems = JSON.parse(r.items || '[]');
      } catch (e) {
        parsedItems = [{ name: r.items || 'Order item', price: r.total }];
      }

      return {
        id: r.id,
        token: r.token,
        userId: r.user_id,
        userName: r.user_name,
        shopName: r.shop_name,
        status: r.status,
        pickupTime: r.pickup_time,
        dueTime: r.due_time,
        estimatedTime: r.estimated_time,
        total: r.total,
        utr: r.utr,
        items: parsedItems,
        upiString: r.upi_string,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    return res.json(orders);
  } catch (err) {
    console.error('[API /vendor/orders Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 4. POST /vendor/orders (and /api/vendor/orders)
 * Updates order status (e.g. 'Mark as Ready') or handles sample order creation
 * ----------------------------------------------------------------------
 */
router.post(['/vendor/orders', '/api/vendor/orders'], (req, res) => {
  try {
    const { orderId, status, action, order } = req.body;

    // Handle manual/sample order creation
    if (action === 'create' && order) {
      const orderId = order.id || `ord-${Date.now()}`;
      const token = order.token || Math.floor(10 + Math.random() * 89).toString();
      const insertStmt = db.prepare(`
        INSERT INTO Orders (
          id, token, user_id, user_name, shop_name, status, pickup_time,
          due_time, estimated_time, total, utr, items, upi_string
        ) VALUES (
          @id, @token, @user_id, @user_name, @shop_name, @status, @pickup_time,
          @due_time, @estimated_time, @total, @utr, @items, @upi_string
        )
      `);

      const newRecord = {
        id: orderId,
        token,
        user_id: order.userId || 'usr-std-01',
        user_name: order.userName || 'Student',
        shop_name: order.shopName || 'Juice Center',
        status: order.status || 'Pending',
        pickup_time: order.pickupTime || 'In 10 Minutes',
        due_time: order.dueTime || '2:30 PM',
        estimated_time: order.estimatedTime || 'In 10 mins',
        total: parseFloat(order.total) || 0,
        utr: order.utr || '123456789012',
        items: typeof order.items === 'string' ? order.items : JSON.stringify(order.items || []),
        upi_string: order.upiString || null,
      };

      insertStmt.run(newRecord);

      const savedOrder = {
        ...newRecord,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []),
      };

      // Notify vendor KDS room via WebSockets
      notifyNewOrder(savedOrder);

      return res.status(201).json({ success: true, order: savedOrder });
    }

    // Handle status update (e.g. 'Mark as Ready')
    if (orderId) {
      const targetStatus = status || 'Ready';
      const updateStmt = db.prepare(`
        UPDATE Orders
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      const result = updateStmt.run(targetStatus, orderId);

      if (result.changes === 0) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      console.log(`[API /vendor/orders] Order ${orderId} status updated to: ${targetStatus}`);

      // Emit live WebSockets event to shop room and student's socket ID
      notifyOrderStatus(orderId, targetStatus);

      return res.json({
        success: true,
        orderId,
        status: targetStatus,
        message: `Order status updated to ${targetStatus}`,
      });
    }

    return res.status(400).json({ success: false, error: 'Missing orderId or order data' });
  } catch (err) {
    console.error('[API /vendor/orders POST Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 5. GET /orders/:id (and /api/orders/:id)
 * Fetches real-time status of a specific order for student live tracking
 * ----------------------------------------------------------------------
 */
router.get(['/orders/:id', '/api/orders/:id'], (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare(`SELECT * FROM Orders WHERE id = ? OR token = ?`).get(id, id);

    if (!row) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    let parsedItems = [];
    try {
      parsedItems = JSON.parse(row.items || '[]');
    } catch (e) {
      parsedItems = [];
    }

    return res.json({
      success: true,
      order: {
        id: row.id,
        token: row.token,
        userId: row.user_id,
        userName: row.user_name,
        shopName: row.shop_name,
        status: row.status,
        pickupTime: row.pickup_time,
        dueTime: row.due_time,
        estimatedTime: row.estimated_time,
        total: row.total,
        utr: row.utr,
        items: parsedItems,
        upiString: row.upi_string,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error('[API /orders/:id Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 6. GET /orders (and /api/orders)
 * Fetches all orders or student order history
 * ----------------------------------------------------------------------
 */
router.get(['/orders', '/api/orders'], (req, res) => {
  try {
    const { userId } = req.query;
    let query = `SELECT * FROM Orders`;
    const params = [];

    if (userId) {
      query += ` WHERE user_id = ?`;
      params.push(userId);
    }
    query += ` ORDER BY created_at DESC`;

    const rows = db.prepare(query).all(...params);
    const orders = rows.map((r) => {
      let parsedItems = [];
      try {
        parsedItems = JSON.parse(r.items || '[]');
      } catch (e) {
        parsedItems = [];
      }
      return {
        id: r.id,
        token: r.token,
        userId: r.user_id,
        userName: r.user_name,
        shopName: r.shop_name,
        status: r.status,
        pickupTime: r.pickup_time,
        dueTime: r.due_time,
        estimatedTime: r.estimated_time,
        total: r.total,
        utr: r.utr,
        items: parsedItems,
        upiString: r.upi_string,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    return res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error('[API /orders Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 7. GET /users & POST /users/login
 * User accounts and authentication
 * ----------------------------------------------------------------------
 */
router.get(['/users', '/api/users'], (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, phone, role, shop_name, created_at FROM Users').all();
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post(['/users/login', '/api/users/login'], (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const user = db.prepare('SELECT id, name, email, phone, role, shop_name FROM Users WHERE LOWER(email) = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, error: 'No account found with this email.' });
    }

    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 8. GET /health (and /api/health)
 * System health and database status
 * ----------------------------------------------------------------------
 */
router.get(['/health', '/api/health'], (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as c FROM Users').get().c;
    const itemCount = db.prepare('SELECT COUNT(*) as c FROM MenuItems').get().c;
    const orderCount = db.prepare('SELECT COUNT(*) as c FROM Orders').get().c;

    return res.json({
      status: 'ok',
      service: 'AIT QuickBite Full-Stack Server',
      database: 'SQLite (WAL Mode)',
      stats: {
        users: userCount,
        menuItems: itemCount,
        orders: orderCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 9. MULTIPLAYER GROUP CART REST ENDPOINTS
 * ----------------------------------------------------------------------
 */

// POST /api/group-cart/create
router.post(['/group-cart/create', '/api/group-cart/create'], async (req, res) => {
  try {
    const { hostUser, shopName, customId } = req.body;
    const { createGroupSession } = await import('../groupOrderService.js');
    const session = createGroupSession(hostUser, shopName || 'Juice Center', customId);
    const host = req.get('host') || 'localhost:5173';
    const protocol = req.protocol || 'http';
    const shareUrl = `${protocol}://${host}/cart/session/${session.id}`;

    return res.json({
      success: true,
      sessionId: session.id,
      shareUrl,
      session,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/group-cart/:sessionId
router.get(['/group-cart/:sessionId', '/api/group-cart/:sessionId', '/cart/session/:sessionId/data'], async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { getGroupSession, createGroupSession } = await import('../groupOrderService.js');
    let session = getGroupSession(sessionId);
    if (!session) {
      // Auto-create for friendly access
      session = createGroupSession(null, 'Juice Center', sessionId);
    }
    return res.json({ success: true, session });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/group-cart/:sessionId/join
router.post(['/group-cart/:sessionId/join', '/api/group-cart/:sessionId/join'], async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { user } = req.body;
    const { joinGroupSession } = await import('../groupOrderService.js');
    const result = joinGroupSession(sessionId, user || {});
    if (!result) {
      return res.status(404).json({ success: false, error: 'Group cart session not found.' });
    }
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/group-cart/:sessionId/cart
router.post(['/group-cart/:sessionId/cart', '/api/group-cart/:sessionId/cart'], async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { item, delta, user } = req.body;
    const { updateGroupCartItem } = await import('../groupOrderService.js');
    const session = updateGroupCartItem(sessionId, { item, delta, user });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Group cart session not found.' });
    }
    return res.json({ success: true, session });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/group-cart/:sessionId/pay
router.post(['/group-cart/:sessionId/pay', '/api/group-cart/:sessionId/pay'], async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { participantId, utr } = req.body;
    const { payParticipantShare } = await import('../groupOrderService.js');
    const result = payParticipantShare(sessionId, participantId, utr);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Participant or session not found.' });
    }
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/group-cart/:sessionId/dispatch
router.post(['/group-cart/:sessionId/dispatch', '/api/group-cart/:sessionId/dispatch'], async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { utr, pickupTime } = req.body;
    const { dispatchGroupOrder } = await import('../groupOrderService.js');
    const { session, order } = dispatchGroupOrder(sessionId, { utr, pickupTime });
    return res.json({ success: true, session, order });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 10. MY WALLET & ANALYTICS ENDPOINTS
 * ----------------------------------------------------------------------
 */

function categorizeItem(item) {
  const cat = (item.category || item.categoryId || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  if (
    cat.includes('juice') ||
    name.includes('juice') ||
    name.includes('cooler') ||
    name.includes('punch') ||
    name.includes('anaar') ||
    name.includes('orange') ||
    name.includes('lime') ||
    name.includes('watermelon') ||
    name.includes('dragonfruit')
  ) {
    return 'Juices';
  }
  if (
    cat.includes('meal') ||
    cat.includes('south-indian') ||
    cat.includes('north-indian') ||
    name.includes('thali') ||
    name.includes('dosa') ||
    name.includes('biryani') ||
    name.includes('rice') ||
    name.includes('paratha') ||
    name.includes('meal') ||
    name.includes('chole') ||
    name.includes('paneer')
  ) {
    return 'Meals';
  }
  if (
    cat.includes('shake') ||
    name.includes('shake') ||
    name.includes('smoothie')
  ) {
    return 'Shakes';
  }
  if (
    cat.includes('beverage') ||
    name.includes('coffee') ||
    name.includes('cappuccino') ||
    name.includes('tea') ||
    name.includes('chai')
  ) {
    return 'Beverages';
  }
  return 'Snacks';
}

// GET /api/user/wallet-analytics
router.get(['/user/wallet-analytics', '/api/user/wallet-analytics'], (req, res) => {
  try {
    const rawUserId = req.query.userId;
    const userId = (!rawUserId || rawUserId.startsWith('user_')) ? 'usr-std-01' : rawUserId;

    // 1. Fetch user budget
    let budgetRow = db.prepare('SELECT budget FROM UserBudget WHERE user_id = ?').get(userId);
    if (!budgetRow) {
      db.prepare('INSERT OR IGNORE INTO UserBudget (user_id, budget) VALUES (?, 2000)').run(userId);
      budgetRow = { budget: 2000 };
    }
    const monthlyBudget = Number(budgetRow.budget) || 2000;

    // 2. Fetch all orders for this user
    const orders = db.prepare(`
      SELECT id, token, user_id, user_name, shop_name, status, total, items, created_at
      FROM Orders
      WHERE user_id = ? OR user_id = 'usr-std-01' OR ? = 'all' OR user_id IS NULL
      ORDER BY created_at DESC
    `).all(userId, userId);

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let monthlySpend = 0;
    const categoryBreakdown = {
      'Snacks': 0,
      'Juices': 0,
      'Meals': 0,
      'Shakes': 0,
      'Beverages': 0,
    };

    const parsedOrders = orders.map((ord) => {
      let items = [];
      try {
        items = typeof ord.items === 'string' ? JSON.parse(ord.items) : ord.items || [];
      } catch (e) {
        items = [];
      }

      // Check if order falls in current month or last 30 days
      const orderDate = ord.created_at ? new Date(ord.created_at) : now;
      const isCurrentMonth = (ord.created_at && ord.created_at.startsWith(currentYearMonth)) || orderDate >= thirtyDaysAgo;

      let primaryCategory = 'Snacks';
      items.forEach((it) => {
        const cat = categorizeItem(it);
        primaryCategory = cat;
        const itemSpend = (Number(it.price) || 0) * (Number(it.quantity) || 1);
        if (categoryBreakdown[cat] !== undefined) {
          categoryBreakdown[cat] += itemSpend;
        } else {
          categoryBreakdown['Snacks'] += itemSpend;
        }
      });

      if (isCurrentMonth) {
        monthlySpend += Number(ord.total) || 0;
      }

      return {
        id: ord.id,
        token: ord.token,
        shopName: ord.shop_name,
        total: Number(ord.total) || 0,
        status: ord.status,
        date: ord.created_at,
        itemsCount: items.length,
        primaryCategory,
        itemsSummary: items.map((i) => i.name || `${i.quantity || 1}x item`).join(', '),
      };
    });

    // If all-time total is larger and covers this current session, ensure monthlySpend captures it
    if (monthlySpend === 0 && orders.length > 0) {
      monthlySpend = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    }

    const budgetPercent = monthlyBudget > 0 ? Math.round((monthlySpend / monthlyBudget) * 100) : 0;
    const isNearBudget = budgetPercent >= 90;
    const remainingBudget = Math.max(0, monthlyBudget - monthlySpend);

    return res.json({
      success: true,
      userId,
      monthlySpend,
      monthlyBudget,
      remainingBudget,
      isNearBudget,
      budgetPercent,
      categoryBreakdown,
      totalOrdersCount: orders.length,
      recentOrders: parsedOrders.slice(0, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[API /user/wallet-analytics Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/user/budget
router.get(['/user/budget', '/api/user/budget'], (req, res) => {
  try {
    const rawUserId = req.query.userId;
    const userId = (!rawUserId || rawUserId.startsWith('user_')) ? 'usr-std-01' : rawUserId;
    let row = db.prepare('SELECT budget FROM UserBudget WHERE user_id = ?').get(userId);
    const budget = row ? Number(row.budget) : 2000;
    return res.json({ success: true, userId, budget });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/user/budget
router.post(['/user/budget', '/api/user/budget'], (req, res) => {
  try {
    const rawUserId = req.body?.userId;
    const userId = (!rawUserId || rawUserId.startsWith('user_')) ? 'usr-std-01' : rawUserId;
    const budget = req.body?.budget;
    const numBudget = Number(budget);
    if (!numBudget || numBudget <= 0) {
      return res.status(400).json({ success: false, error: 'Budget must be a positive number.' });
    }

    db.prepare(`
      INSERT INTO UserBudget (user_id, budget, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET budget = excluded.budget, updated_at = CURRENT_TIMESTAMP
    `).run(userId, numBudget);

    return res.json({
      success: true,
      userId,
      budget: numBudget,
      message: `Monthly budget updated to ₹${numBudget}`,
    });
  } catch (err) {
    console.error('[API /user/budget Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 11. GAMIFIED LOYALTY & REWARDS ENDPOINTS
 * ----------------------------------------------------------------------
 */

// GET /api/user/rewards
router.get(['/user/rewards', '/api/user/rewards'], (req, res) => {
  try {
    const rawUserId = req.query.userId;
    const userId = (!rawUserId || rawUserId.startsWith('user_')) ? 'usr-std-01' : rawUserId;
    const status = getUserRewardsStatus(userId);
    return res.json(status);
  } catch (err) {
    console.error('[API /user/rewards Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/rewards/redeem
router.post(['/rewards/redeem', '/api/rewards/redeem'], (req, res) => {
  try {
    const rawUserId = req.body?.userId;
    const userId = (!rawUserId || rawUserId.startsWith('user_')) ? 'usr-std-01' : rawUserId;
    const rewardId = req.body?.rewardId || 'reward-tea';
    const result = redeemBitecoinsReward(userId, rewardId);
    return res.json(result);
  } catch (err) {
    console.error('[API /rewards/redeem Error]', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/rewards/apply-promo
router.post(['/rewards/apply-promo', '/api/rewards/apply-promo'], (req, res) => {
  try {
    const { code, userId = 'usr-std-01' } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Promo code is required.' });
    }

    const promo = db.prepare(`
      SELECT id, code, user_id, item_id, item_name, item_price, discount_percent, is_redeemed
      FROM PromoCodes
      WHERE UPPER(code) = UPPER(?) AND (user_id = ? OR user_id = 'usr-std-01')
    `).get(code.trim(), userId);

    if (!promo) {
      return res.status(404).json({ success: false, error: 'Invalid or unrecognized promo code.' });
    }

    if (promo.is_redeemed) {
      return res.status(400).json({ success: false, error: 'This promo code has already been redeemed.' });
    }

    return res.json({
      success: true,
      promoCode: promo.code,
      freeItem: {
        id: promo.item_id,
        name: promo.item_name,
        price: promo.item_price,
      },
      discountPercent: promo.discount_percent,
      message: `Promo code ${promo.code} applied! 100% OFF on ${promo.item_name}.`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ----------------------------------------------------------------------
 * 12. TRENDING RECOMMENDATION ENGINE ENDPOINTS
 * ----------------------------------------------------------------------
 */

// GET /api/trending (and /api/menu/trending)
router.get(['/trending', '/api/trending', '/api/menu/trending'], (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes, 10) || 60;
    const trending = getTrendingItems(minutes);
    return res.json({
      success: true,
      timeframe: `last ${minutes} minutes`,
      trending,
    });
  } catch (err) {
    console.error('[API /trending Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
