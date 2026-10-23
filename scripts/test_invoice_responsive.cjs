const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const screenshotsDir = path.resolve('mobile-responsive-audit', 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_inv_test_' + Date.now());
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: uniqueDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent && b.textContent.includes('Autofill')) b.click();
    });
  });
  await new Promise(r => setTimeout(r, 300));
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));

  await page.goto('http://localhost:5173/invoices', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const viewports = [
    { name: 'small-320x568', width: 320, height: 568 },
    { name: 'standard-390x844', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 500));

    // 1. Check Editor view overflow
    const editorOverflow = await page.evaluate(() => {
      return {
        clientWidth: window.innerWidth,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 1
      };
    });
    console.log(`[Invoice Editor][${vp.name}]`, editorOverflow);
    await page.screenshot({ path: path.join(screenshotsDir, `invoice-editor-${vp.name}.png`) });

    // 2. Click "Preview" tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const previewBtn = btns.find(b => b.textContent && b.textContent.trim() === 'Preview');
      if (previewBtn) previewBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Check Preview view overflow
    const previewOverflow = await page.evaluate(() => {
      return {
        clientWidth: window.innerWidth,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 1
      };
    });
    console.log(`[Invoice Preview][${vp.name}]`, previewOverflow);
    await page.screenshot({ path: path.join(screenshotsDir, `invoice-preview-${vp.name}.png`) });

    // Click back to Editor
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const edBtn = btns.find(b => b.textContent && (b.textContent.includes('Editor') || b.textContent.includes('← Editor')));
      if (edBtn) edBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();
  console.log('Invoice responsiveness test completed!');
})();
