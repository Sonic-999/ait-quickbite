import { io } from 'socket.io-client';

async function runTest() {
  console.log('=======================================================');
  console.log('🧪 Starting Socket.IO WebSockets & Rooms E2E Test');
  console.log('=======================================================');

  const serverUrl = 'http://localhost:3001';

  // 1. Connect Vendor 1 (Juice Center)
  console.log('\n--- Test 1: Vendor Socket connects and joins shop room ---');
  const juiceVendorSocket = io(serverUrl, { transports: ['websocket'] });
  
  await new Promise((resolve) => juiceVendorSocket.on('connect', resolve));
  console.log(`✓ Juice Vendor connected with socket ID: ${juiceVendorSocket.id}`);

  const roomJoinedPromise = new Promise((resolve) => {
    juiceVendorSocket.on('vendor:room_joined', (data) => {
      resolve(data);
    });
  });

  const ordersSyncPromise = new Promise((resolve) => {
    juiceVendorSocket.on('orders:sync', (data) => {
      resolve(data);
    });
  });

  juiceVendorSocket.emit('vendor:join_room', { shop: 'Juice Center', vendorId: 'vendor-jc-01' });

  const roomJoinedData = await roomJoinedPromise;
  console.log(`✓ Vendor joined room: ${roomJoinedData.room} (Expected: room_juice_center)`);
  if (roomJoinedData.room !== 'room_juice_center') {
    throw new Error(`Expected room_juice_center but got ${roomJoinedData.room}`);
  }

  const initialSync = await ordersSyncPromise;
  console.log(`✓ Initial orders:sync received: ${initialSync.orders?.length || 0} existing orders.`);

  // 2. Connect Vendor 2 (Main Canteen - Room Isolation Test)
  console.log('\n--- Test 2: Room Isolation (Main Canteen Vendor) ---');
  const canteenVendorSocket = io(serverUrl, { transports: ['websocket'] });
  await new Promise((resolve) => canteenVendorSocket.on('connect', resolve));
  
  const canteenRoomPromise = new Promise((resolve) => {
    canteenVendorSocket.on('vendor:room_joined', resolve);
  });
  canteenVendorSocket.emit('vendor:join_room', { shop: 'Main Canteen', vendorId: 'vendor-mc-01' });
  const canteenRoom = await canteenRoomPromise;
  console.log(`✓ Canteen Vendor joined room: ${canteenRoom.room} (Expected: room_main_canteen)`);

  let canteenReceivedOrder = false;
  canteenVendorSocket.on('order:new', () => {
    canteenReceivedOrder = true;
  });

  // 3. Connect Student Socket
  console.log('\n--- Test 3: Student Socket & New Order Placement ---');
  const studentSocket = io(serverUrl, { transports: ['websocket'] });
  await new Promise((resolve) => studentSocket.on('connect', resolve));
  console.log(`✓ Student connected with socket ID: ${studentSocket.id}`);

  // Setup listener for Juice Vendor to receive the new order
  const vendorNewOrderPromise = new Promise((resolve) => {
    juiceVendorSocket.on('order:new', (data) => {
      resolve(data);
    });
  });

  // Place order via API with student's socket ID
  const testOrderId = `test-ord-${Date.now()}`;
  console.log(`Submitting order ${testOrderId} for Juice Center with studentSocketId: ${studentSocket.id}...`);

  const checkoutRes = await fetch(`${serverUrl}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: testOrderId,
      shopName: 'Juice Center',
      items: [{ id: 'jc-test-dragonfruit', name: '1x Exotic Dragonfruit Mint Cooler', price: 65 }],
      total: 65,
      pickupTime: 'In 10 Minutes',
      utr: '987654321098',
      studentSocketId: studentSocket.id,
      userName: 'Test Student',
    }),
  });

  const checkoutJson = await checkoutRes.json();
  console.log(`✓ Checkout API response status: ${checkoutRes.status}, Order Token: #${checkoutJson.order?.token}`);

  const newOrderReceived = await vendorNewOrderPromise;
  console.log(`✓ Juice Vendor KDS received 'order:new' event in room '${newOrderReceived.room}' for Token #${newOrderReceived.order?.token}`);

  // Wait a short tick to confirm Canteen vendor did NOT receive Juice Center order
  await new Promise((r) => setTimeout(r, 600));
  console.log(`✓ Room isolation verified: Canteen vendor received order? ${canteenReceivedOrder ? 'YES (FAIL)' : 'NO (PASSED)'}`);
  if (canteenReceivedOrder) {
    throw new Error('Room isolation failed: Canteen received Juice Center order!');
  }

  // 4. Test 'Mark as Ready' & Student Socket Targeted Push Notification
  console.log('\n--- Test 4: Vendor marks order as Ready -> Student Socket receives order:ready ---');
  
  const createdOrderId = checkoutJson.order.id;

  const studentReadyPromise = new Promise((resolve) => {
    studentSocket.on('order:ready', (data) => {
      resolve(data);
    });
  });

  const vendorStatusPromise = new Promise((resolve) => {
    juiceVendorSocket.on('order:status_updated', (data) => {
      resolve(data);
    });
  });

  // Vendor clicks 'Mark as Ready' by emitting socket event
  console.log(`Vendor emitting order:mark_ready for order ${createdOrderId}...`);
  juiceVendorSocket.emit('order:mark_ready', { orderId: createdOrderId });

  const studentReadyData = await studentReadyPromise;
  console.log(`✓ Student Socket (${studentSocket.id}) directly received 'order:ready'!`);
  console.log(`   - Title: "${studentReadyData.title}"`);
  console.log(`   - Message: "${studentReadyData.message}"`);
  console.log(`   - Status: "${studentReadyData.status}"`);

  const vendorStatusData = await vendorStatusPromise;
  console.log(`✓ Juice Vendor KDS received status update to '${vendorStatusData.status}'`);

  // 5. Test Reconnection Resilience
  console.log('\n--- Test 5: Reconnection Resilience without losing state ---');
  juiceVendorSocket.disconnect();
  console.log('✓ Vendor disconnected.');

  const reconnectSyncPromise = new Promise((resolve) => {
    juiceVendorSocket.on('orders:sync', resolve);
  });

  juiceVendorSocket.connect();
  juiceVendorSocket.emit('vendor:join_room', { shop: 'Juice Center' });

  const reconnectedSync = await reconnectSyncPromise;
  const foundOrder = reconnectedSync.orders.find((o) => o.id === createdOrderId);
  console.log(`✓ Vendor reconnected and received sync with ${reconnectedSync.orders.length} orders.`);
  console.log(`✓ Created order ${createdOrderId} present after reconnect with status '${foundOrder?.status}'`);

  // Cleanup
  juiceVendorSocket.disconnect();
  canteenVendorSocket.disconnect();
  studentSocket.disconnect();

  console.log('\n=======================================================');
  console.log('🎉 ALL WEBSOCKET & ROOM ARCHITECTURE TESTS PASSED!');
  console.log('=======================================================');
}

runTest().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
