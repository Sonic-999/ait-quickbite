/**
 * Vendor Dashboard Real-Time Logic & Audio Notifications
 * 
 * - Makes a GET request to /api/vendor/orders every 10 seconds via setInterval
 * - Compares array of currently displayed order IDs with newly returned order IDs
 * - Triggers HTML5 Audio notification when a completely new order ID arrives
 * - Dynamically renders pending order cards with prominent Order #, items, UTR, and bold red Due timestamp
 * - Adds an event listener to the 'Mark as Ready' button to send a POST request and move the card to 'Completed'
 */

// 1. Store the IDs of the currently displayed orders in an array
let displayedOrderIds = [];

// Audio notification instance using the specified Mixkit alert sound
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

/**
 * Play audio alert using HTML5 Audio API
 */
export function playNewOrderSound() {
  try {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.play().catch((err) => {
      console.warn('Autoplay may require an initial user click or permission:', err);
    });
  } catch (err) {
    console.error('Audio playback error:', err);
  }
}

/**
 * Render an individual Pending Order Card HTML
 * @param {Object} order - Order details
 * @returns {string} - HTML string for the pending card
 */
export function createPendingOrderCardHTML(order) {
  const orderNumber = order.token ? `#AIT-${order.token}` : `#AIT-42`;
  const dueTime = order.dueTime || order.pickupTime || '2:15 PM';
  const utr = order.utr || '';

  const itemsListHTML = (order.items || [
    { name: '2x Fresh Orange Juice' },
    { name: '1x Samosa' }
  ])
    .map((item) => `<li class="item-entry"><span>${item.name}</span></li>`)
    .join('');

  const utrHTML = utr
    ? `
      <div class="order-utr-badge" style="background:#f9fafb; border:1px solid #e5e7eb; padding:6px 10px; border-radius:6px; font-size:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <span style="color:#4b5563; font-weight:600;">UTR:</span>
        <span style="font-family:monospace; font-weight:700; color:#111827;">${utr}</span>
        <span style="font-size:10px; font-weight:700; background:#dcfce7; color:#15803d; padding:2px 6px; border-radius:4px;">Verified</span>
      </div>
    `
    : '';

  return `
    <article class="order-card" id="card-${order.id}" data-order-id="${order.id}" style="background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:20px; margin-bottom:16px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f3f4f6; padding-bottom:12px; margin-bottom:14px;">
        <div style="font-size:22px; font-weight:900; color:#111827;">${orderNumber}</div>
        <span style="font-size:12px; font-weight:600; background:#f3f4f6; padding:2px 8px; border-radius:4px; color:#374151;">${order.shopName || 'Main Canteen'}</span>
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#9ca3af; margin-bottom:6px;">Items to Prepare:</div>
        <ul style="list-style:none; padding:0; margin:0; font-size:14px; color:#1f2937; line-height:1.6;">
          ${itemsListHTML}
        </ul>
      </div>

      ${utrHTML}

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f3f4f6; padding-top:10px; margin-bottom:14px;">
        <span style="font-size:12px; color:#6b7280;">Pickup Target</span>
        <span style="font-size:15px; font-weight:700; color:#dc2626;">Due: ${dueTime}</span>
      </div>

      <button
        class="mark-ready-btn"
        data-order-id="${order.id}"
        style="width:100%; padding:12px; background:#16a34a; color:#ffffff; font-weight:700; font-size:15px; border:none; border-radius:8px; cursor:pointer; transition:background 0.2s;"
      >
        Mark as Ready
      </button>
    </article>
  `;
}

/**
 * Render an individual Completed/Ready Card HTML
 * @param {Object} order - Order details
 * @returns {string} - HTML string for the completed card
 */
export function createCompletedOrderCardHTML(order) {
  const orderNumber = order.token ? `#AIT-${order.token}` : `#AIT-42`;
  return `
    <article class="order-card completed" id="card-${order.id}" data-order-id="${order.id}" style="background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:18px; margin-bottom:16px; opacity:0.95;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f3f4f6; padding-bottom:10px; margin-bottom:12px;">
        <div style="font-size:18px; font-weight:800; color:#111827;">${orderNumber}</div>
        <span style="font-size:11px; font-weight:700; background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:9999px;">Ready for Pickup</span>
      </div>
      <div style="font-size:13px; color:#4b5563; margin-bottom:8px;">
        ${order.items ? order.items.map((i) => i.name).join(', ') : 'Order prepared'}
      </div>
      <div style="font-size:11px; color:#9ca3af; text-align:right;">
        Customer notified for counter collection
      </div>
    </article>
  `;
}

/**
 * Create a fetchOrders() function that makes a GET request to /api/vendor/orders
 * to get the latest pending orders for a specific shop.
 * @param {string} [shop='JuiceCenter'] - The selected shop name/id (e.g. 'JuiceCenter')
 * @param {Object} [containerElements={}] - Optional DOM element references
 */
export async function fetchOrders(shop = 'JuiceCenter', containerElements = {}) {
  try {
    const queryParam = shop && shop !== 'all' ? `?shop=${encodeURIComponent(shop)}` : '';
    const endpoint = `/api/vendor/orders${queryParam}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: HTTP ${response.status}`);
    }

    const orders = await response.json();

    if (!Array.isArray(orders)) {
      console.warn('Expected array from /api/vendor/orders, received:', orders);
      return;
    }

    // Filter down to pending orders
    const pendingOrders = orders.filter(
      (order) => !order.status || order.status.toLowerCase() !== 'ready'
    );

    // Compare newly returned IDs with previously displayed IDs
    const latestPendingIds = pendingOrders.map((order) => order.id);
    const hasCompletelyNewOrder = pendingOrders.some(
      (order) => !displayedOrderIds.includes(order.id)
    );

    // If a completely new order ID is detected, trigger the notification sound
    if (hasCompletelyNewOrder && displayedOrderIds.length > 0) {
      playNewOrderSound();
    }

    // Update stored IDs of currently displayed orders
    displayedOrderIds = latestPendingIds;

    // Dynamically render the new order cards into the 'Pending Orders' column
    const pendingColumn = containerElements.pendingColumn || document.getElementById('pending-orders-column');
    if (pendingColumn) {
      if (pendingOrders.length === 0) {
        pendingColumn.innerHTML = `
          <div style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:32px; text-align:center; color:#6b7280;">
            <p style="font-weight:600; margin:0;">No pending orders for this shop in queue</p>
          </div>
        `;
      } else {
        pendingColumn.innerHTML = pendingOrders
          .map((order) => createPendingOrderCardHTML(order))
          .join('');

        // Attach event listeners to all 'Mark as Ready' buttons
        attachMarkAsReadyListeners(containerElements);
      }
    }

    // Update 'New Orders' counter badge if present
    const counterBadge = containerElements.counterBadge || document.getElementById('new-orders-counter');
    if (counterBadge) {
      counterBadge.textContent = pendingOrders.length.toString();
    }

    return orders;
  } catch (err) {
    console.error('Error during fetchOrders():', err);
  }
}

/**
 * Add event listener to the 'Mark as Ready' button that sends a POST request
 * to update the order status to 'Ready' and moves the card to the 'Completed' column.
 */
export function attachMarkAsReadyListeners(containerElements = {}) {
  const buttons = document.querySelectorAll('.mark-ready-btn');
  buttons.forEach((button) => {
    // Avoid double binding
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';

    button.addEventListener('click', async (event) => {
      const orderId = event.currentTarget.getAttribute('data-order-id');
      if (!orderId) return;

      const card = document.getElementById(`card-${orderId}`);
      if (card) {
        card.style.opacity = '0.5';
        button.textContent = 'Updating...';
      }

      try {
        // Send a POST request to update the order status to 'Ready'
        const response = await fetch('/api/vendor/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderId,
            status: 'Ready',
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update order to Ready: HTTP ${response.status}`);
        }

        // Move the card to the 'Completed' column
        const completedColumn = containerElements.completedColumn || document.getElementById('completed-orders-column');
        if (card && completedColumn) {
          card.remove();

          // Create completed card
          const orderNumber = card.querySelector('div')?.textContent || `#AIT-${orderId}`;
          const completedCard = document.createElement('div');
          completedCard.innerHTML = createCompletedOrderCardHTML({
            id: orderId,
            token: orderNumber.replace('#AIT-', ''),
            items: [{ name: 'Order marked ready' }],
          });
          completedColumn.prepend(completedCard.firstElementChild);
        }

        // Remove from displayed pending IDs
        displayedOrderIds = displayedOrderIds.filter((id) => id !== orderId);

        // Update counter
        const counterBadge = containerElements.counterBadge || document.getElementById('new-orders-counter');
        if (counterBadge) {
          counterBadge.textContent = displayedOrderIds.length.toString();
        }
      } catch (err) {
        console.error('Failed to mark order as ready:', err);
        if (card) {
          card.style.opacity = '1';
          button.textContent = 'Mark as Ready';
        }
      }
    });
  });
}

/**
 * Initialize WebSockets Room and Dropdown Event Listeners (No HTTP Polling)
 * - Joins vendor to room specific to their shop (e.g. room_juice_center)
 * - Instantly receives order:new events and plays notification chime
 * - Updates immediately when the shop selector dropdown changes
 */
import { socket, joinVendorRoom, playNotificationChime } from './socket.js';

export function initVendorDashboard(containerElements = {}, defaultShop = 'JuiceCenter') {
  let currentShop = defaultShop;

  // Immediate initial sync for the selected shop
  fetchOrders(currentShop, containerElements);

  // Join the WebSockets room for this shop
  joinVendorRoom(currentShop);

  // Hook up real-time socket events
  const onNewOrder = ({ order }) => {
    if (!order) return;
    playNotificationChime();
    displayedOrderIds = [order.id, ...displayedOrderIds];
    const pendingContainer = containerElements.pendingContainer || document.getElementById('pending-orders-column');
    if (pendingContainer) {
      const cardHTML = createPendingOrderCardHTML(order);
      pendingContainer.insertAdjacentHTML('afterbegin', cardHTML);
      setupMarkReadyButtons(containerElements);
    }
    const counterBadge = containerElements.counterBadge || document.getElementById('new-orders-counter');
    if (counterBadge) {
      counterBadge.textContent = displayedOrderIds.length.toString();
    }
  };

  socket.on('order:new', onNewOrder);

  // Hook up shop selector dropdown for immediate room switch & UI update
  const shopSelector = containerElements.shopSelector || document.getElementById('shop-selector-dropdown');
  if (shopSelector) {
    shopSelector.addEventListener('change', (e) => {
      currentShop = e.target.value;
      displayedOrderIds = [];
      joinVendorRoom(currentShop);
      fetchOrders(currentShop, containerElements);
    });
  }

  // Return teardown function for clean unmount
  return () => {
    socket.off('order:new', onNewOrder);
  };
}

