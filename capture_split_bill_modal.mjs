import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3001';
const ARTIFACT_DIR = 'C:\\Users\\sourabh\\.gemini\\antigravity-ide\\brain\\76b7e87f-c8f6-4ede-adcf-da7c317a8392';

async function captureModal() {
  console.log('🚀 Capturing Split Bill Modal...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    await page.setViewport({ width: 440, height: 950, isMobile: true, hasTouch: true });

    // Open /cart
    await page.goto(`${APP_URL}/cart`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1000));

    // Ensure session is set and cart is populated
    await page.evaluate(() => {
      const mockSession = {
        id: 'AIT-4921',
        shopName: 'Juice Center',
        participants: [
          { id: 'usr-std-01', name: 'Aarav Sharma', avatar: '👨‍🎓', isHost: true, hasPaid: false },
          { id: 'usr-rahul-2', name: 'Rahul Verma', avatar: '🧑‍💻', isHost: false, hasPaid: false },
          { id: 'usr-priya-3', name: 'Priya Patel', avatar: '👩‍🎓', isHost: false, hasPaid: false },
        ],
        cartItems: [
          {
            id: 'jc-bs-orange',
            name: 'Fresh Orange Juice',
            price: 40,
            quantity: 2,
            shopName: 'Juice Center',
            prepTimeMinutes: 3,
            addedBy: { id: 'usr-rahul-2', name: 'Rahul Verma', avatar: '🧑‍💻' },
          },
          {
            id: 'jc-bs-samosa',
            name: 'Crispy Punjabi Samosa (2 pcs)',
            price: 30,
            quantity: 2,
            shopName: 'Juice Center',
            prepTimeMinutes: 4,
            addedBy: { id: 'usr-priya-3', name: 'Priya Patel', avatar: '👩‍🎓' },
          },
          {
            id: 'jc-j-watermelon',
            name: 'Fresh Watermelon Cooler',
            price: 35,
            quantity: 1,
            shopName: 'Juice Center',
            prepTimeMinutes: 3,
            addedBy: { id: 'usr-std-01', name: 'Aarav Sharma (You)', avatar: '👨‍🎓' },
          },
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
              items: [{ name: 'Fresh Watermelon Cooler', price: 35, quantity: 1 }],
            },
            {
              id: 'usr-rahul-2',
              name: 'Rahul Verma',
              avatar: '🧑‍💻',
              isHost: false,
              hasPaid: false,
              exactAmount: 80,
              items: [{ name: 'Fresh Orange Juice', price: 40, quantity: 2 }],
            },
            {
              id: 'usr-priya-3',
              name: 'Priya Patel',
              avatar: '👩‍🎓',
              isHost: false,
              hasPaid: false,
              exactAmount: 60,
              items: [{ name: 'Crispy Punjabi Samosa (2 pcs)', price: 30, quantity: 2 }],
            },
          ],
        },
      };

      sessionStorage.setItem('ait_group_session', JSON.stringify(mockSession));
      localStorage.setItem('ait_quickbite_cart', JSON.stringify(mockSession.cartItems));
    });

    await page.goto(`${APP_URL}/cart`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1500));

    // Wait for the button
    await page.waitForSelector('#btn-group-split-checkout', { timeout: 10000 });
    console.log('Found #btn-group-split-checkout, clicking...');
    await page.click('#btn-group-split-checkout');

    await page.waitForSelector('#group-split-checkout-modal', { timeout: 10000 });
    console.log('Modal visible! Waiting for render...');
    await new Promise((r) => setTimeout(r, 1200));

    // Capture the Split Bill Modal screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'split_bill_upi_modal.png'),
      fullPage: false,
    });
    console.log('📸 Captured split_bill_upi_modal.png successfully!');
  } finally {
    await browser.close();
  }
}

captureModal().catch((err) => {
  console.error('Modal capture failed:', err);
  process.exit(1);
});
