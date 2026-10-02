import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3001';
const ARTIFACT_DIR = 'C:\\Users\\sourabh\\.gemini\\antigravity-ide\\brain\\76b7e87f-c8f6-4ede-adcf-da7c317a8392';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function capture() {
  console.log('🚀 Starting UI verification script with Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 440, height: 900, isMobile: true, hasTouch: true });

    // 1. Visit root to set local cart items
    console.log('Setting up initial cart in localStorage...');
    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const initialItems = [
        {
          id: 'jc-bs-orange',
          name: 'Fresh Orange Juice',
          price: 40,
          quantity: 1,
          shopName: 'Juice Center',
          prepTimeMinutes: 3,
          addedBy: { id: 'usr-std-01', name: 'Aarav Sharma (You)', avatar: '👨‍🎓' }
        }
      ];
      localStorage.setItem('ait_quickbite_cart', JSON.stringify(initialItems));
    });

    // 2. Navigate to /cart
    console.log('Navigating to /cart with items...');
    await page.goto(`${APP_URL}/cart`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#btn-share-cart, #btn-share-cart-empty', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 600));

    // Screenshot 1: /cart with Share Cart button prominently displayed
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'cart_page_share_button.png'),
      fullPage: false,
    });
    console.log('📸 Captured cart_page_share_button.png');

    // 3. Click "Share Cart" button
    console.log('Clicking "Share Cart" button to generate room code...');
    const shareBtn = (await page.$('#btn-share-cart')) || (await page.$('#btn-share-cart-empty'));
    if (shareBtn) {
      await shareBtn.click();
    }
    await page.waitForSelector('#btn-copy-room-code, .invite-card', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1000));

    // Screenshot 2: Room code invite modal with AIT-XXXX code
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'group_cart_room_code_modal.png'),
      fullPage: false,
    });
    console.log('📸 Captured group_cart_room_code_modal.png');

    // Close invite modal
    const closeBtn = await page.$('#btn-copy-room-code');
    // Press escape to close modal
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 600));

    // 4. Update the cart in page state to show items added by multiple students
    console.log('Injecting multi-student items and presence into session...');
    await page.evaluate(() => {
      const mockSession = {
        id: 'AIT-4921',
        shopName: 'Juice Center',
        participants: [
          { id: 'usr-std-01', name: 'Aarav Sharma', avatar: '👨‍🎓', isHost: true, hasPaid: false },
          { id: 'usr-rahul-2', name: 'Rahul Verma', avatar: '🧑‍💻', isHost: false, hasPaid: false },
          { id: 'usr-priya-3', name: 'Priya Patel', avatar: '👩‍🎓', isHost: false, hasPaid: false }
        ],
        cartItems: [
          {
            id: 'jc-bs-orange',
            name: 'Fresh Orange Juice',
            price: 40,
            quantity: 2,
            shopName: 'Juice Center',
            prepTimeMinutes: 3,
            addedBy: { id: 'usr-rahul-2', name: 'Rahul Verma', avatar: '🧑‍💻' }
          },
          {
            id: 'jc-bs-samosa',
            name: 'Crispy Punjabi Samosa (2 pcs)',
            price: 30,
            quantity: 2,
            shopName: 'Juice Center',
            prepTimeMinutes: 4,
            addedBy: { id: 'usr-priya-3', name: 'Priya Patel', avatar: '👩‍🎓' }
          },
          {
            id: 'jc-j-watermelon',
            name: 'Fresh Watermelon Cooler',
            price: 35,
            quantity: 1,
            shopName: 'Juice Center',
            prepTimeMinutes: 3,
            addedBy: { id: 'usr-std-01', name: 'Aarav Sharma (You)', avatar: '👨‍🎓' }
          }
        ],
        splitBill: {
          totalAmount: 175,
          perPersonAmount: 59,
          personBreakdown: [
            {
              id: 'usr-std-01',
              name: 'Aarav Sharma',
              avatar: '👨‍🎓',
              isHost: true,
              hasPaid: false,
              exactAmount: 35,
              items: [{ name: 'Fresh Watermelon Cooler', price: 35, quantity: 1 }]
            },
            {
              id: 'usr-rahul-2',
              name: 'Rahul Verma',
              avatar: '🧑‍💻',
              isHost: false,
              hasPaid: false,
              exactAmount: 80,
              items: [{ name: 'Fresh Orange Juice', price: 40, quantity: 2 }]
            },
            {
              id: 'usr-priya-3',
              name: 'Priya Patel',
              avatar: '👩‍🎓',
              isHost: false,
              hasPaid: false,
              exactAmount: 60,
              items: [{ name: 'Crispy Punjabi Samosa (2 pcs)', price: 30, quantity: 2 }]
            }
          ]
        }
      };

      sessionStorage.setItem('ait_group_session', JSON.stringify(mockSession));
      localStorage.setItem('ait_quickbite_cart', JSON.stringify(mockSession.cartItems));
    });

    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Screenshot 3: Cart page with multi-student item attribution chips
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'cart_items_student_attribution.png'),
      fullPage: false,
    });
    console.log('📸 Captured cart_items_student_attribution.png');

    // 5. Open the Split Bill Modal
    console.log('Opening Split Bill modal...');
    const splitBillBtn = await page.$('#btn-group-split-checkout');
    if (splitBillBtn) {
      await splitBillBtn.click();
      await page.waitForSelector('#group-split-checkout-modal, #btn-dispatch-group-order', { timeout: 8000 });
      await new Promise(r => setTimeout(r, 1200));

      // Screenshot 4: Split Bill modal with individual UPI QRs
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'split_bill_upi_modal.png'),
        fullPage: false,
      });
      console.log('📸 Captured split_bill_upi_modal.png');
    } else {
      console.log('⚠️ #btn-group-split-checkout button not found');
    }

    console.log('🎉 All UI snapshots successfully captured!');
  } finally {
    await browser.close();
  }
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
