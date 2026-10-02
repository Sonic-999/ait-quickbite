import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\sourabh\\.gemini\\antigravity-ide\\brain\\e5b644e0-f771-4507-9b24-12d13de853a0';

async function captureSkeleton() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 }
  });

  const page = await browser.newPage();
  
  // Intercept /api/menu to delay it so we can snapshot the skeleton screen
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    if (req.url().includes('/api/menu')) {
      // Delay response by 4 seconds
      setTimeout(() => req.continue(), 4000);
    } else {
      req.continue();
    }
  });

  console.log('Navigating with delayed /api/menu...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

  await page.waitForSelector('[aria-busy="true"]');
  await page.evaluate(() => {
    const el = document.querySelector('[aria-busy="true"]');
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, 200);
    }
  });

  await new Promise(r => setTimeout(r, 400));

  const screenshotPath = path.join(ARTIFACT_DIR, 'bento_skeleton_loader_loading_state.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Skeleton loader screenshot saved to:', screenshotPath);

  await browser.close();
}

captureSkeleton().catch(console.error);
