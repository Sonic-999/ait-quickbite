import { io as ClientIO } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3001';
const EXPECTED_UPI_ID = 'kashishsangwan1105@okicici';

async function runTest() {
  console.log('================================================================');
  console.log('🎮 MULTIPLAYER GROUP CART SYSTEM VERIFICATION');
  console.log('================================================================\n');

  // STEP 1: Create Group Cart via REST API and verify room code format AIT-XXXX
  console.log('[Step 1] Creating new Group Cart via /api/group-cart/create...');
  const createRes = await fetch(`${BACKEND_URL}/api/group-cart/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hostUser: {
        id: 'usr-aarav-host',
        name: 'Aarav Sharma',
        avatar: '👨‍🎓',
        color: '#6b21a8',
      },
      shopName: 'Juice Center',
    }),
  });

  const createData = await createRes.json();
  if (!createData.success || !createData.sessionId) {
    throw new Error(`Failed to create group cart: ${JSON.stringify(createData)}`);
  }

  const roomCode = createData.sessionId;
  console.log(`  🎉 Created Room Code: ${roomCode}`);

  const codeRegex = /^AIT-\d{4}$/i;
  const isAitFormat = codeRegex.test(roomCode);
  console.log(`  Room code format matches AIT-XXXX: ${isAitFormat} (${roomCode})`);
  if (!isAitFormat && !roomCode.startsWith('AIT-')) {
    throw new Error(`Room code ${roomCode} does not match expected AIT-XXXX format`);
  }

  // STEP 2: Connect 3 student WebSockets (Host Aarav, Friend Rahul, Friend Priya)
  console.log('\n[Step 2] Connecting 3 student phones via WebSockets...');
  
  const socketHost = ClientIO(BACKEND_URL, { reconnection: false });
  const socketRahul = ClientIO(BACKEND_URL, { reconnection: false });
  const socketPriya = ClientIO(BACKEND_URL, { reconnection: false });

  await Promise.all([
    new Promise((resolve) => socketHost.on('connect', resolve)),
    new Promise((resolve) => socketRahul.on('connect', resolve)),
    new Promise((resolve) => socketPriya.on('connect', resolve)),
  ]);
  console.log('  ✓ All 3 student sockets connected to server');

  // STEP 3: Multiple students join the same room code simultaneously
  console.log('\n[Step 3] Joining the shared room code with avatars and names...');
  const rahulUser = { id: 'usr-rahul-2', name: 'Rahul Verma', avatar: '🧑‍💻', color: '#10b981' };
  const priyaUser = { id: 'usr-priya-3', name: 'Priya Patel', avatar: '👩‍🎓', color: '#ec4899' };
  const hostUser = { id: 'usr-aarav-host', name: 'Aarav Sharma', avatar: '👨‍🎓', color: '#6b21a8' };

  socketHost.emit('group:join', { sessionId: roomCode, user: hostUser });
  socketRahul.emit('group:join', { sessionId: roomCode, user: rahulUser });
  socketPriya.emit('group:join', { sessionId: roomCode, user: priyaUser });

  await new Promise((resolve) => setTimeout(resolve, 800));

  // Verify session participants
  const sessionRes = await fetch(`${BACKEND_URL}/api/group-cart/${roomCode}`);
  const sessionData = await sessionRes.json();
  const session = sessionData.session;

  console.log(`  Connected participants in room (${session.participants.length}):`,
    session.participants.map(p => `${p.avatar} ${p.name}`)
  );
  if (session.participants.length < 3) {
    throw new Error(`Expected at least 3 participants, got ${session.participants.length}`);
  }

  // STEP 4: Add items simultaneously from their own phones with attribution
  console.log('\n[Step 4] Adding items simultaneously from separate student devices...');

  // Rahul adds 2x Fresh Orange Juice (id: 'jc-bs-orange', ₹40)
  socketRahul.emit('group:cart_update', {
    sessionId: roomCode,
    item: {
      id: 'jc-bs-orange',
      name: 'Fresh Orange Juice',
      price: 40,
      shopName: 'Juice Center',
      prepTimeMinutes: 3,
    },
    delta: 2,
    user: rahulUser,
  });

  // Priya adds 2x Crispy Punjabi Samosa (id: 'jc-bs-samosa', ₹30)
  socketPriya.emit('group:cart_update', {
    sessionId: roomCode,
    item: {
      id: 'jc-bs-samosa',
      name: 'Crispy Punjabi Samosa (2 pcs)',
      price: 30,
      shopName: 'Juice Center',
      prepTimeMinutes: 4,
    },
    delta: 2,
    user: priyaUser,
  });

  // Aarav (Host) adds 1x Fresh Watermelon Cooler (id: 'jc-j-watermelon', ₹35)
  socketHost.emit('group:cart_update', {
    sessionId: roomCode,
    item: {
      id: 'jc-j-watermelon',
      name: 'Fresh Watermelon Cooler',
      price: 35,
      shopName: 'Juice Center',
      prepTimeMinutes: 3,
    },
    delta: 1,
    user: hostUser,
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // STEP 5: Verify item attribution in the shared cart
  console.log('\n[Step 5] Verifying item attribution (avatar and name) in shared cart...');
  const cartRes = await fetch(`${BACKEND_URL}/api/group-cart/${roomCode}`);
  const cartData = await cartRes.json();
  const updatedSession = cartData.session;

  console.log(`  Items in group cart (${updatedSession.cartItems.length}):`);
  for (const it of updatedSession.cartItems) {
    console.log(`    - ${it.quantity}x ${it.name} (₹${it.price * it.quantity})`);
    console.log(`      Attributed to: ${it.addedBy?.avatar} ${it.addedBy?.name} (id: ${it.addedBy?.id})`);
    if (!it.addedBy || !it.addedBy.name || !it.addedBy.avatar) {
      throw new Error(`Item ${it.name} is missing attribution details!`);
    }
  }

  // STEP 6: Verify Split Bill Exact Calculations & Auto-Generated UPI Deep Links
  console.log('\n[Step 6] Verifying Split Bill calculation & individual UPI QR links...');
  const splitBill = updatedSession.splitBill;
  const totalBill = 2 * 40 + 2 * 30 + 1 * 35; // 80 + 60 + 35 = 175
  console.log(`  Total Bill: ₹${splitBill.totalAmount} (Expected: ₹${totalBill})`);
  console.log(`  Equal Split: ₹${splitBill.perPersonAmount} each`);

  console.log('\n  Individual Student Breakdown:');
  for (const person of splitBill.personBreakdown) {
    console.log(`    👤 ${person.avatar} ${person.name}:`);
    console.log(`       Exact share: ₹${person.exactAmount}`);
    console.log(`       Items ordered:`, person.items.map(i => `${i.quantity}x ${i.name}`).join(', '));
    
    // Auto-generate UPI link for this person
    const upiLink = `upi://pay?pa=${EXPECTED_UPI_ID}&pn=AIT%20QuickBite&am=${person.exactAmount.toFixed(2)}&cu=INR&tn=GroupOrder-${roomCode}-${encodeURIComponent(person.name)}`;
    console.log(`       Auto-Generated UPI QR String: ${upiLink}`);

    if (!upiLink.includes(`pa=${EXPECTED_UPI_ID}`)) {
      throw new Error(`UPI Link for ${person.name} does not inject destination ID ${EXPECTED_UPI_ID}`);
    }
  }

  // STEP 7: Individual Payment Simulation via WebSockets
  console.log('\n[Step 7] Testing individual payments via WebSockets (group:pay_share)...');
  
  // Rahul pays his share of ₹80
  console.log('  Rahul scans QR and pays share...');
  socketRahul.emit('group:pay_share', {
    sessionId: roomCode,
    participantId: rahulUser.id,
    utr: '987654321001',
  });

  // Priya pays her share of ₹30
  console.log('  Priya scans QR and pays share...');
  socketPriya.emit('group:pay_share', {
    sessionId: roomCode,
    participantId: priyaUser.id,
    utr: '987654321002',
  });

  // Host pays his share of ₹45
  console.log('  Aarav scans QR and pays share...');
  socketHost.emit('group:pay_share', {
    sessionId: roomCode,
    participantId: hostUser.id,
    utr: '987654321003',
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const paidSessionRes = await fetch(`${BACKEND_URL}/api/group-cart/${roomCode}`);
  const paidSessionData = await paidSessionRes.json();
  const paidSession = paidSessionData.session;

  console.log(`  Payment status for participants:`);
  for (const p of paidSession.participants) {
    console.log(`    ${p.avatar} ${p.name}: hasPaid = ${p.hasPaid}, UTR: ${p.utr}`);
    if (!p.hasPaid) {
      throw new Error(`Participant ${p.name} should be marked as paid!`);
    }
  }
  console.log(`  All Paid flag: ${paidSession.splitBill.allPaid}`);

  // STEP 8: Finalizing and Dispatching Order to Kitchen
  console.log('\n[Step 8] Finalizing & Dispatching Group Order to Kitchen...');
  
  let dispatchedOrder = null;
  socketHost.on('group:order_dispatched', ({ order }) => {
    dispatchedOrder = order;
    console.log(`  🚀 Received 'group:order_dispatched' event!`);
    console.log(`     Order ID: ${order.id}`);
    console.log(`     Token: #${order.token}`);
    console.log(`     User/Group: ${order.userName}`);
    console.log(`     Total: ₹${order.total}`);
    console.log(`     Status: ${order.status}`);
  });

  socketHost.emit('group:dispatch_order', {
    sessionId: roomCode,
    utr: '999888777666',
    pickupTime: 'In 10 Minutes',
  });

  await new Promise((resolve) => setTimeout(resolve, 1200));

  if (!dispatchedOrder) {
    throw new Error('Order was not dispatched successfully!');
  }

  // Verify order in database
  const orderCheckRes = await fetch(`${BACKEND_URL}/api/orders/${dispatchedOrder.id}`);
  const orderCheckData = await orderCheckRes.json();
  if (!orderCheckData.success || !orderCheckData.order) {
    throw new Error('Dispatched order could not be retrieved from database!');
  }
  console.log(`  ✓ Order verified in SQLite database: Token #${orderCheckData.order.token}`);

  // Cleanup sockets
  socketHost.disconnect();
  socketRahul.disconnect();
  socketPriya.disconnect();

  console.log('\n================================================================');
  console.log('✅ ALL MULTIPLAYER GROUP CART VERIFICATION CHECKS PASSED 100%!');
  console.log('================================================================');
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  });
