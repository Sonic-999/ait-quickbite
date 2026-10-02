import db from './db.js';
import { notifyNewOrder, notifyStockUpdated } from './socket.js';
import { calculateDynamicETA } from './services/etaService.js';

/**
 * In-memory Group Cart Session Store
 * Keyed by unique sessionId (e.g. 'xyz123')
 */
const groupSessions = new Map();

// Helper to generate a friendly room code like AIT-4921
export function generateSessionId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  const code = `AIT-${num}`;
  if (groupSessions.has(code.toUpperCase()) || groupSessions.has(code.toLowerCase())) {
    return generateSessionId();
  }
  return code;
}

// Pre-create demo sessions so tests and users can use them immediately!
const DEMO_HOST = {
  id: 'usr-std-01',
  name: 'Aarav Sharma',
  avatar: '👨‍🎓',
  color: '#6b21a8',
  isHost: true,
  hasPaid: false,
};

createGroupSession(DEMO_HOST, 'Juice Center', 'xyz123');
createGroupSession(DEMO_HOST, 'Juice Center', 'AIT-4921');

/**
 * Create a new group cart session
 */
export function createGroupSession(hostUser, shopName = 'Juice Center', customId = null) {
  const sessionId = customId ? customId.trim() : generateSessionId();
  
  const host = {
    id: hostUser?.id || `user-${Date.now()}`,
    name: hostUser?.name || 'Aarav Sharma',
    avatar: hostUser?.avatar || '👨‍🎓',
    color: hostUser?.color || '#6b21a8',
    isHost: true,
    hasPaid: false,
    paidAt: null,
    utr: null,
    cursor: { x: 0, y: 0, visible: false },
  };

  const session = {
    id: sessionId,
    shopName: shopName || 'Juice Center',
    hostId: host.id,
    createdAt: Date.now(),
    participants: [host],
    cartItems: [],
    activities: [
      {
        id: `act-${Date.now()}`,
        text: `${host.name} created the group cart.`,
        userName: host.name,
        avatar: host.avatar,
        timestamp: Date.now(),
      },
    ],
    splitBill: {
      totalAmount: 0,
      totalCount: 0,
      perPersonAmount: 0,
      allPaid: false,
    },
    dispatchedOrder: null,
  };

  groupSessions.set(sessionId, session);
  groupSessions.set(sessionId.toLowerCase(), session);
  groupSessions.set(sessionId.toUpperCase(), session);
  console.log(`[GroupOrderService] Created group session: ${sessionId} for ${host.name} (${shopName})`);
  return session;
}

/**
 * Get a group session by ID
 */
export function getGroupSession(sessionId) {
  if (!sessionId) return null;
  const clean = String(sessionId).trim();
  return groupSessions.get(clean) || groupSessions.get(clean.toLowerCase()) || groupSessions.get(clean.toUpperCase()) || null;
}

/**
 * Join an existing group session
 */
export function joinGroupSession(sessionId, user, socketId = null) {
  const session = getGroupSession(sessionId);
  if (!session) return null;

  const existingIndex = session.participants.findIndex(
    (p) => p.id === user.id || (user.name && p.name.toLowerCase() === user.name.toLowerCase())
  );

  let participant = null;
  const avatarList = ['👩‍🎓', '🧑‍💻', '👨‍🎓', '🦊', '🦁', '🐼', '🚀', '⚡', '🌟'];
  const colorList = ['#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#06b6d4'];

  if (existingIndex >= 0) {
    // Update existing participant
    session.participants[existingIndex].socketId = socketId || session.participants[existingIndex].socketId;
    if (user.avatar) session.participants[existingIndex].avatar = user.avatar;
    if (user.color) session.participants[existingIndex].color = user.color;
    participant = session.participants[existingIndex];
  } else {
    // Add new participant
    const defaultAvatar = avatarList[session.participants.length % avatarList.length];
    const defaultColor = colorList[session.participants.length % colorList.length];

    participant = {
      id: user.id || `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      socketId,
      name: user.name || `Friend #${session.participants.length + 1}`,
      avatar: user.avatar || defaultAvatar,
      color: user.color || defaultColor,
      isHost: session.participants.length === 0,
      hasPaid: false,
      paidAt: null,
      utr: null,
      cursor: { x: 0, y: 0, visible: false },
    };
    session.participants.push(participant);

    session.activities.unshift({
      id: `act-${Date.now()}`,
      text: `${participant.name} joined the cart!`,
      userName: participant.name,
      avatar: participant.avatar,
      timestamp: Date.now(),
    });
  }

  recalculateSplitBill(session);
  return { session, participant };
}

/**
 * Update an item in the shared group cart (add, update qty, remove)
 */
export function updateGroupCartItem(sessionId, { item, delta, user }) {
  const session = getGroupSession(sessionId);
  if (!session) return null;

  const existing = session.cartItems.find((it) => it.id === item.id);
  let actionText = '';

  if (existing) {
    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      session.cartItems = session.cartItems.filter((it) => it.id !== item.id);
      actionText = `${user?.name || 'Someone'} removed ${item.name} from the cart.`;
    } else {
      existing.quantity = newQty;
      actionText = delta > 0
        ? `${user?.name || 'Someone'} added another ${item.name} (Qty: ${newQty}).`
        : `${user?.name || 'Someone'} decreased ${item.name} (Qty: ${newQty}).`;
    }
  } else if (delta > 0) {
    session.cartItems.push({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: delta,
      image: item.image || item.fallbackImage,
      shopName: item.shopName || session.shopName,
      prepTimeMinutes: item.prepTimeMinutes || item.prep_time_minutes || 4,
      inStockQuantity: item.inStockQuantity,
      addedBy: item.addedBy || {
        id: user?.id || 'unknown',
        name: user?.name || 'Friend',
        avatar: user?.avatar || '🍕',
      },
    });
    actionText = `${user?.name || 'Someone'} added ${item.name} to the cart!`;
  }

  // Record activity
  if (actionText) {
    session.activities.unshift({
      id: `act-${Date.now()}`,
      text: actionText,
      userName: user?.name || 'Friend',
      avatar: user?.avatar || '🍕',
      timestamp: Date.now(),
    });
    // Keep max 20 activities
    if (session.activities.length > 20) session.activities.pop();
  }

  recalculateSplitBill(session);
  return session;
}

/**
 * Recalculate auto-split bill for the session with exact individual breakdown
 */
export function recalculateSplitBill(session) {
  if (!session) return;

  const totalAmount = session.cartItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const totalCount = session.cartItems.reduce((sum, it) => sum + it.quantity, 0);
  const numParticipants = Math.max(1, session.participants.length);
  const perPersonAmount = Math.ceil(totalAmount / numParticipants);

  // Calculate exact itemized breakdown for each person
  const personBreakdown = session.participants.map((p) => {
    const myItems = session.cartItems.filter((it) => {
      if (it.addedBy?.id && it.addedBy.id === p.id) return true;
      if (it.addedBy?.name && p.name && it.addedBy.name.toLowerCase() === p.name.toLowerCase()) return true;
      return false;
    });

    const exactAmount = myItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);

    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: Boolean(p.isHost),
      hasPaid: Boolean(p.hasPaid),
      paidAt: p.paidAt,
      utr: p.utr,
      items: myItems,
      exactAmount,
    };
  });

  // Assign any unassigned items (items added before join or missing attribution) to host
  const assignedItemIds = new Set(personBreakdown.flatMap((pb) => pb.items.map((it) => it.id)));
  const unassignedItems = session.cartItems.filter((it) => !assignedItemIds.has(it.id));
  if (unassignedItems.length > 0 && personBreakdown.length > 0) {
    const hostIdx = personBreakdown.findIndex((pb) => pb.isHost);
    const targetIdx = hostIdx >= 0 ? hostIdx : 0;
    personBreakdown[targetIdx].items.push(...unassignedItems);
    personBreakdown[targetIdx].exactAmount += unassignedItems.reduce(
      (sum, it) => sum + (it.price * it.quantity),
      0
    );
  }

  const allPaid = session.participants.length > 0 && session.participants.every((p) => p.hasPaid);

  session.splitBill = {
    totalAmount,
    totalCount,
    perPersonAmount,
    numParticipants,
    allPaid,
    personBreakdown,
  };
}

/**
 * Pay individual share for a participant
 */
export function payParticipantShare(sessionId, participantId, utr = null) {
  const session = getGroupSession(sessionId);
  if (!session) return null;

  const participant = session.participants.find((p) => p.id === participantId);
  if (!participant) return null;

  participant.hasPaid = true;
  participant.paidAt = Date.now();
  participant.utr = utr || Math.floor(100000000000 + Math.random() * 900000000000).toString();

  recalculateSplitBill(session);

  const exactShare = session.splitBill.personBreakdown?.find((pb) => pb.id === participant.id)?.exactAmount ?? session.splitBill.perPersonAmount;

  session.activities.unshift({
    id: `act-${Date.now()}`,
    text: `🎉 ${participant.name} paid their share of ₹${exactShare}!`,
    userName: participant.name,
    avatar: participant.avatar,
    timestamp: Date.now(),
  });

  return { session, participant };
}

/**
 * Update live cursor for a participant
 */
export function updateParticipantCursor(sessionId, userId, cursor) {
  const session = getGroupSession(sessionId);
  if (!session) return null;

  const participant = session.participants.find((p) => p.id === userId);
  if (participant) {
    participant.cursor = cursor;
  }
  return session;
}

/**
 * Dispatch group order to the kitchen using ACID transaction
 */
export function dispatchGroupOrder(sessionId, orderDetails = {}) {
  const session = getGroupSession(sessionId);
  if (!session) {
    throw new Error('Group cart session not found.');
  }

  if (session.cartItems.length === 0) {
    throw new Error('Cannot dispatch an empty cart to the kitchen.');
  }

  // 1. Calculate dynamic ETA
  const etaData = calculateDynamicETA({
    shop: session.shopName,
    items: session.cartItems,
  });

  if (etaData.totalEtaMinutes > 120 || etaData.queuePrepMinutes > 120) {
    throw new Error(`Kitchen Over Capacity: The active order queue exceeds 120 minutes (${etaData.totalEtaMinutes} mins).`);
  }

  // 2. Perform ACID Transaction in SQLite
  const orderToken = Math.floor(10 + Math.random() * 89).toString();
  const orderId = `ord-group-${Date.now()}`;
  const generatedUtr = orderDetails.utr || Math.floor(100000000000 + Math.random() * 900000000000).toString();
  const host = session.participants.find((p) => p.isHost) || session.participants[0];
  const participantNames = session.participants.map((p) => p.name).join(', ');

  const checkoutTx = db.transaction(() => {
    // Check and deduct stock for each menu item
    for (const item of session.cartItems) {
      let row = db.prepare('SELECT id, name, in_stock_quantity, is_available FROM MenuItems WHERE id = ?').get(item.id);
      if (!row && item.name) {
        row = db.prepare('SELECT id, name, in_stock_quantity, is_available FROM MenuItems WHERE name = ?').get(item.name);
      }
      if (!row) {
        continue; // Fallback for custom or client-specified test items
      }
      if (row.is_available === 0 || row.in_stock_quantity <= 0) {
        throw new Error(`Item just sold out: ${item.name}`);
      }
      if (row.in_stock_quantity < item.quantity) {
        throw new Error(`Only ${row.in_stock_quantity} left in stock for ${item.name}.`);
      }

      const updateResult = db.prepare(`
        UPDATE MenuItems
        SET in_stock_quantity = in_stock_quantity - ?,
            is_available = CASE WHEN (in_stock_quantity - ?) <= 0 THEN 0 ELSE 1 END
        WHERE id = ? AND in_stock_quantity >= ?
      `).run(item.quantity, item.quantity, row.id, item.quantity);

      if (updateResult.changes === 0) {
        throw new Error(`Item just sold out: ${item.name}`);
      }
    }

    // Insert Order into SQLite Orders table
    const insertStmt = db.prepare(`
      INSERT INTO Orders (
        id, token, user_id, user_name, shop_name, status,
        pickup_time, due_time, estimated_time, total, utr, items, upi_string
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let validUserId = 'usr-std-01';
    if (host && host.id) {
      const uRow = db.prepare('SELECT id FROM Users WHERE id = ?').get(host.id);
      if (uRow) validUserId = uRow.id;
    }

    insertStmt.run(
      orderId,
      orderToken,
      validUserId,
      `Group: ${participantNames}`,
      session.shopName,
      'Pending',
      orderDetails.pickupTime || `In ${etaData.totalEtaMinutes} Minutes`,
      etaData.targetPickupTime || 'In 15 mins',
      etaData.displayMessage,
      session.splitBill.totalAmount,
      generatedUtr,
      JSON.stringify(session.cartItems),
      `upi://pay?pa=kashishsangwan1105@okicici&pn=AIT%20QuickBite&am=${session.splitBill.totalAmount}&cu=INR&tn=GroupOrder-${sessionId}`
    );

    return db.prepare('SELECT * FROM Orders WHERE id = ?').get(orderId);
  });

  const createdRow = checkoutTx();

  const createdOrder = {
    id: createdRow.id,
    token: createdRow.token,
    userId: createdRow.user_id,
    userName: createdRow.user_name,
    shopName: createdRow.shop_name,
    status: createdRow.status,
    pickupTime: createdRow.pickup_time,
    dueTime: createdRow.due_time,
    estimatedTime: createdRow.estimated_time,
    total: createdRow.total,
    utr: createdRow.utr,
    items: session.cartItems,
    isGroupOrder: true,
    groupSessionId: sessionId,
    participants: session.participants,
    splitBill: session.splitBill,
  };

  // 3. Notify Vendor KDS via WebSockets Room
  notifyNewOrder(createdOrder);

  // 4. Notify all clients of new stock levels
  const updatedStockList = session.cartItems.map((ci) => {
    const r = db.prepare('SELECT id, name, in_stock_quantity, is_available FROM MenuItems WHERE id = ?').get(ci.id);
    return {
      id: r.id,
      name: r.name,
      inStockQuantity: r.in_stock_quantity,
      isAvailable: Boolean(r.is_available),
    };
  });
  notifyStockUpdated(updatedStockList);

  session.dispatchedOrder = createdOrder;
  session.activities.unshift({
    id: `act-${Date.now()}`,
    text: `🚀 Order #AIT-${orderToken} dispatched to the kitchen!`,
    userName: 'Kitchen Dispatcher',
    avatar: '👨‍🍳',
    timestamp: Date.now(),
  });

  return { session, order: createdOrder };
}
