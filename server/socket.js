import { Server as SocketIOServer } from 'socket.io';
import db from './db.js';

let io = null;

/**
 * Normalizes shop names and IDs to canonical room identifiers
 * e.g., 'Juice Center', 'JuiceCenter', 'juice-center' -> 'room_juice_center'
 */
export function getShopRoom(shopNameOrId) {
  if (!shopNameOrId || shopNameOrId === 'all' || shopNameOrId === 'All Shops') {
    return 'room_all_vendors';
  }
  const clean = String(shopNameOrId).toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '').replace(/__+/g, '_');
  if (clean.includes('juice')) return 'room_juice_center';
  if (clean.includes('canteen')) return 'room_main_canteen';
  if (clean.includes('nescafe')) return 'room_nescafe_booth';
  if (clean.includes('bakery')) return 'room_campus_bakery';
  return `room_${clean}`;
}

/**
 * Helper to fetch orders for a specific shop from SQLite
 */
export function getOrdersForShopFromDb(shopNameOrId) {
  try {
    let query = `
      SELECT id, token, user_id, user_name, shop_name, status, pickup_time,
             due_time, estimated_time, total, utr, items, upi_string,
             student_socket_id, created_at, updated_at
      FROM Orders
      WHERE 1=1
    `;
    const params = [];

    if (shopNameOrId && shopNameOrId !== 'all' && shopNameOrId !== 'All Shops') {
      const clean = String(shopNameOrId).toLowerCase().replace(/[^a-z0-9]/g, '');
      query += ` AND LOWER(REPLACE(REPLACE(shop_name, ' ', ''), '-', '')) LIKE ?`;
      params.push(`%${clean}%`);
    }

    query += ` ORDER BY CASE WHEN status = 'Pending' THEN 0 ELSE 1 END, created_at DESC`;

    const rows = db.prepare(query).all(...params);
    return rows.map((r) => {
      let parsedItems = [];
      try {
        parsedItems = JSON.parse(r.items || '[]');
      } catch {
        parsedItems = [{ name: r.items || 'Order Item', price: r.total }];
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
        studentSocketId: r.student_socket_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  } catch (err) {
    console.error('[Socket getOrdersForShopFromDb Error]', err);
    return [];
  }
}

/**
 * Initializes Socket.IO with WebSockets room architecture
 */
export function initSocketServer(httpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Track state on socket instance
    socket.currentShopRoom = null;
    socket.currentShopName = null;

    // Send connection handshake acknowledgment
    socket.emit('connection:ack', {
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    /**
     * VENDOR: Join Shop Room
     * Triggered when vendor logs in or switches shop in the vendor portal
     */
    socket.on('vendor:join_room', ({ shop, vendorId }) => {
      const targetRoom = getShopRoom(shop);

      // Leave previously joined shop rooms if switching shops
      if (socket.currentShopRoom && socket.currentShopRoom !== targetRoom) {
        socket.leave(socket.currentShopRoom);
        console.log(`[Socket.IO] Vendor ${socket.id} left room: ${socket.currentShopRoom}`);
      }

      socket.join(targetRoom);
      socket.currentShopRoom = targetRoom;
      socket.currentShopName = shop;

      console.log(`[Socket.IO] Vendor (${vendorId || socket.id}) joined room: ${targetRoom} (Shop: ${shop})`);

      socket.emit('vendor:room_joined', {
        success: true,
        room: targetRoom,
        shop,
        socketId: socket.id,
      });

      // Synchronize order state immediately from SQLite database (prevents loss of state on reconnections)
      const currentOrders = getOrdersForShopFromDb(shop);
      socket.emit('orders:sync', {
        shop,
        room: targetRoom,
        orders: currentOrders,
      });
    });

    /**
     * STUDENT: Join order live tracking room
     */
    socket.on('order:join_tracking', ({ orderId, token }) => {
      if (!orderId && !token) return;
      const orderRoom = `room_order_${orderId || token}`;
      socket.join(orderRoom);
      console.log(`[Socket.IO] Student ${socket.id} joined live tracking for order room: ${orderRoom}`);

      socket.emit('order:tracking_joined', {
        success: true,
        orderRoom,
        orderId,
      });

      // Fetch and sync current order status
      try {
        const row = db.prepare('SELECT * FROM Orders WHERE id = ? OR token = ?').get(orderId, token || '');
        if (row) {
          let parsedItems = [];
          try { parsedItems = JSON.parse(row.items || '[]'); } catch { parsedItems = []; }
          socket.emit('order:sync_single', {
            order: {
              id: row.id,
              token: row.token,
              status: row.status,
              shopName: row.shop_name,
              dueTime: row.due_time,
              total: row.total,
              utr: row.utr,
              items: parsedItems,
              studentSocketId: row.student_socket_id,
            },
          });
        }
      } catch (err) {
        console.error('[Socket order:join_tracking Error]', err);
      }
    });

    /**
     * VENDOR ACTION: Mark order as Ready
     * Can be invoked directly via socket event as an alternative to REST POST
     */
    socket.on('order:mark_ready', ({ orderId }) => {
      if (!orderId) return;
      try {
        const updateStmt = db.prepare(`
          UPDATE Orders
          SET status = 'Ready', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        const result = updateStmt.run(orderId);

        if (result.changes > 0) {
          notifyOrderStatus(orderId, 'Ready');
        }
      } catch (err) {
        console.error('[Socket order:mark_ready Error]', err);
      }
    });

    /**
     * =======================================================================
     * MULTIPLAYER GROUP CART WEBSOCKET EVENTS
     * =======================================================================
     */
    socket.on('group:join', async ({ sessionId, user }) => {
      if (!sessionId) return;
      const cleanId = sessionId.toLowerCase().trim();
      const room = `room_group_${cleanId}`;
      socket.join(room);
      socket.currentGroupRoom = room;
      socket.currentGroupId = cleanId;

      try {
        const { getGroupSession, joinGroupSession } = await import('./groupOrderService.js');
        let session = getGroupSession(cleanId);
        if (!session) {
          // Auto-create if doesn't exist yet
          const { createGroupSession } = await import('./groupOrderService.js');
          session = createGroupSession(user, 'Juice Center', cleanId);
        }

        const result = joinGroupSession(cleanId, user || {}, socket.id);
        if (result) {
          console.log(`[Socket.IO Group] User "${result.participant.name}" joined group room: ${room}`);

          // Emit state to joiner
          socket.emit('group:state_sync', {
            session: result.session,
            you: result.participant,
          });

          // Broadcast to other peers
          socket.to(room).emit('group:user_joined', {
            participant: result.participant,
            session: result.session,
          });

          // Broadcast state sync to entire room
          io.to(room).emit('group:state_sync', {
            session: result.session,
          });
        }
      } catch (err) {
        console.error('[Socket group:join error]', err);
      }
    });

    socket.on('group:cart_update', async ({ sessionId, item, delta, user }) => {
      const cleanId = (sessionId || socket.currentGroupId || '').toLowerCase().trim();
      if (!cleanId || !item) return;

      try {
        const { updateGroupCartItem } = await import('./groupOrderService.js');
        const session = updateGroupCartItem(cleanId, { item, delta, user });
        if (session) {
          const room = `room_group_${cleanId}`;
          console.log(`[Socket.IO Group] Cart updated in ${room} by ${user?.name}: ${item.name} (${delta > 0 ? '+' : ''}${delta})`);
          io.to(room).emit('group:state_sync', { session });
          io.to(room).emit('group:cart_updated', {
            session,
            action: delta > 0 ? 'add' : 'remove',
            item,
            user,
          });
        }
      } catch (err) {
        console.error('[Socket group:cart_update error]', err);
      }
    });

    socket.on('group:cursor_move', async ({ sessionId, userId, cursor }) => {
      const cleanId = (sessionId || socket.currentGroupId || '').toLowerCase().trim();
      if (!cleanId) return;
      const room = `room_group_${cleanId}`;
      try {
        const { updateParticipantCursor } = await import('./groupOrderService.js');
        updateParticipantCursor(cleanId, userId, cursor);
        socket.to(room).emit('group:remote_cursor', {
          userId,
          cursor,
        });
      } catch (_) {}
    });

    socket.on('group:activity', ({ sessionId, text, user }) => {
      const cleanId = (sessionId || socket.currentGroupId || '').toLowerCase().trim();
      if (!cleanId) return;
      const room = `room_group_${cleanId}`;
      io.to(room).emit('group:activity_broadcast', {
        id: `act-${Date.now()}`,
        text,
        user,
        timestamp: Date.now(),
      });
    });

    socket.on('group:pay_share', async ({ sessionId, participantId, utr }) => {
      const cleanId = (sessionId || socket.currentGroupId || '').toLowerCase().trim();
      if (!cleanId || !participantId) return;
      try {
        const { payParticipantShare } = await import('./groupOrderService.js');
        const result = payParticipantShare(cleanId, participantId, utr);
        if (result) {
          const room = `room_group_${cleanId}`;
          console.log(`[Socket.IO Group] Participant ${result.participant.name} paid share in room ${room}`);
          io.to(room).emit('group:state_sync', { session: result.session });
          io.to(room).emit('group:payment_received', {
            participant: result.participant,
            session: result.session,
          });
        }
      } catch (err) {
        console.error('[Socket group:pay_share error]', err);
      }
    });

    socket.on('group:dispatch_order', async ({ sessionId, utr, pickupTime }) => {
      const cleanId = (sessionId || socket.currentGroupId || '').toLowerCase().trim();
      if (!cleanId) return;
      try {
        const { dispatchGroupOrder } = await import('./groupOrderService.js');
        const { session, order } = dispatchGroupOrder(cleanId, { utr, pickupTime });
        const room = `room_group_${cleanId}`;
        console.log(`[Socket.IO Group] Order #${order.token} dispatched for room ${room}!`);
        io.to(room).emit('group:order_dispatched', {
          order,
          session,
        });
      } catch (err) {
        console.error(`[Socket.IO Group Dispatch Error]`, err);
        socket.emit('group:dispatch_error', { error: err.message });
      }
    });

    /**
     * Disconnection handling
     */
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  return io;
}

/**
 * Accessor for active Socket.IO server instance
 */
export function getIO() {
  return io;
}

/**
 * Emits a newly placed order directly to the target shop's room
 * (and room_all_vendors), causing the Vendor KDS to immediately render the card.
 */
export function notifyNewOrder(order) {
  if (!io) return;
  const targetRoom = getShopRoom(order.shop_name || order.shopName);

  console.log(`[Socket.IO] Emitting 'order:new' to room: ${targetRoom} and room_all_vendors for Order #${order.token || order.id}`);

  // Emit to specific shop's room
  io.to(targetRoom).emit('order:new', {
    order,
    room: targetRoom,
    timestamp: new Date().toISOString(),
  });

  // Emit to all-vendors overview room
  if (targetRoom !== 'room_all_vendors') {
    io.to('room_all_vendors').emit('order:new', {
      order,
      room: 'room_all_vendors',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Emits order status updates (e.g. 'Ready') to:
 * 1. The shop room (for KDS UI update)
 * 2. The specific student's socket ID (for live tracking + HTML5 Push Notification)
 * 3. The specific order tracking room (room_order_{id})
 */
export function notifyOrderStatus(orderId, status, updatedOrder = null) {
  if (!io || !orderId) return;

  let order = updatedOrder;
  if (!order) {
    try {
      const row = db.prepare('SELECT * FROM Orders WHERE id = ?').get(orderId);
      if (row) {
        let parsedItems = [];
        try { parsedItems = JSON.parse(row.items || '[]'); } catch { parsedItems = []; }
        order = {
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
          studentSocketId: row.student_socket_id,
        };
      }
    } catch (err) {
      console.error('[Socket notifyOrderStatus Fetch Error]', err);
    }
  }

  const shopName = order ? (order.shop_name || order.shopName) : null;
  const targetRoom = getShopRoom(shopName);

  console.log(`[Socket.IO] Emitting 'order:status_updated' to room ${targetRoom} for Order #${order?.token || orderId} -> Status: ${status}`);

  // 1. Emit status update to vendor room(s)
  io.to(targetRoom).emit('order:status_updated', {
    orderId,
    status,
    order,
  });
  if (targetRoom !== 'room_all_vendors') {
    io.to('room_all_vendors').emit('order:status_updated', {
      orderId,
      status,
      order,
    });
  }

  // 2. If status is 'Ready', notify the specific student's socket ID and order room!
  if (status && status.toLowerCase() === 'ready') {
    const studentSocketId = order?.studentSocketId || order?.student_socket_id;
    const notificationPayload = {
      orderId,
      status: 'Ready',
      order,
      title: 'Order Ready for Pickup! 🥤✨',
      message: `Token #${order?.token || ''} from ${order?.shopName || order?.shop_name || 'Campus Kitchen'} is ready for pickup!`,
      timestamp: new Date().toISOString(),
    };

    // Emit directly to student's socket ID if available
    if (studentSocketId) {
      console.log(`[Socket.IO] Emitting 'order:ready' directly to student socket: ${studentSocketId}`);
      io.to(studentSocketId).emit('order:ready', notificationPayload);
    }

    // Also emit to order tracking room (catches reconnected students)
    const orderRoom = `room_order_${orderId}`;
    console.log(`[Socket.IO] Emitting 'order:ready' to order room: ${orderRoom}`);
    io.to(orderRoom).emit('order:ready', notificationPayload);

    // Also broadcast on general student order status channel
    io.emit('student:order_ready_broadcast', {
      orderId,
      token: order?.token,
      order,
    });
  }
}

/**
 * Emits real-time stock quantity updates to all connected clients
 * Whenever an order is placed and stock is deducted, or an item sells out.
 */
export function notifyStockUpdated(updatedItems) {
  if (!io || !Array.isArray(updatedItems) || updatedItems.length === 0) return;

  console.log(`[Socket.IO] Emitting 'menu:stock_updated' for ${updatedItems.length} items:`, updatedItems.map(i => `${i.id}: ${i.inStockQuantity}`));

  io.emit('menu:stock_updated', {
    items: updatedItems,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emits real-time trending recommendation updates across campus
 * Whenever orders shift or the trailing 60-min window re-evaluates.
 */
export function notifyTrendingUpdated(trendingItems) {
  if (!io) return;
  console.log(`[Socket.IO] Emitting 'trending:updated' for ${trendingItems?.length || 0} top items`);

  io.emit('trending:updated', {
    trendingItems,
    timestamp: new Date().toISOString(),
  });
}

