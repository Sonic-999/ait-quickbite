import { spawn } from 'child_process';

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9333; // Use a specific port
  
  console.log('1. Starting headless Chrome on port', port);
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + process.env.TEMP + '\\chrome_test_profile_' + Date.now(),
    'http://localhost:5173/?view=order-status'
  ], { stdio: 'ignore' });

  // Wait 2 seconds for Chrome to start CDP server
  await new Promise(r => setTimeout(r, 2000));

  try {
    console.log('2. Querying Chrome CDP endpoints...');
    const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
    const tabs = await listRes.json();
    console.log('Available tabs:', tabs.map(t => ({ title: t.title, url: t.url })));

    const tab = tabs.find(t => t.url.includes('5173')) || tabs[0];
    if (!tab || !tab.webSocketDebuggerUrl) {
      throw new Error('No target tab found with webSocketDebuggerUrl');
    }

    console.log('3. Connecting WebSocket to Chrome CDP tab...');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    let messageId = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
    };

    const send = (method, params = {}) => {
      return new Promise((resolve, reject) => {
        const id = messageId++;
        callbacks.set(id, (res) => {
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result);
        });
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    await new Promise(resolve => { ws.onopen = resolve; });
    console.log('WebSocket connected.');

    // Enable Runtime and Page
    await send('Runtime.enable');
    await send('Page.enable');

    console.log('4. Waiting 3.5 seconds for React to fetch from API and render...');
    await new Promise(r => setTimeout(r, 3500));

    // Evaluate in page
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        return JSON.stringify({
          currentUrl: window.location.href,
          pageTitle: document.title,
          headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText),
        });
      })()`,
      returnByValue: true
    });

    console.log('5. Inspection result:');
    const parsed = JSON.parse(evalRes.result.value);
    console.log('Parsed DOM result:', JSON.stringify(parsed, null, 2));

    // Capture screenshot as verification artifact
    const screenshotRes = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (screenshotRes && screenshotRes.data) {
      const fs = await import('fs');
      const buffer = Buffer.from(screenshotRes.data, 'base64');
      const outputPath = 'C:\\Users\\sourabh\\.gemini\\antigravity-ide\\brain\\39eb598a-9859-414c-b4e1-a2aaa0a33c15\\student_live_tracking_websockets.png';
      fs.writeFileSync(outputPath, buffer);
      console.log('Screenshot saved to:', outputPath);
    }

    ws.close();
  } catch (err) {
    console.error('Error during inspection:', err);
  } finally {
    chromeProcess.kill();
    console.log('Chrome process exited.');
  }
}

run();
