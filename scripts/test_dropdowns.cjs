const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_test_drop_' + Date.now());
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: uniqueDir,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent && b.textContent.includes('Autofill')) b.click();
    });
  });
  await new Promise(r => setTimeout(r, 300));
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  await page.goto('http://localhost:5173/customers', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  const hasNativeSelect = await page.evaluate(() => {
    return document.querySelectorAll('select').length;
  });
  console.log('Number of select tags on /customers:', hasNativeSelect);

  const ownerHtml = await page.evaluate(() => {
    const el = document.querySelector('.flex.items-center.gap-1\\.5.text-xs.text-txt-secondary');
    return el ? el.outerHTML : 'NOT_FOUND';
  });
  console.log('Owner HTML:', ownerHtml);

  // Click on the Owner filter
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const ownerBtn = btns.find(b => b.textContent && b.textContent.includes('All Owners'));
    if (ownerBtn) {
      ownerBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked owner button:', clicked);
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: 'test_customers_mobile_dropdown.png' });
  console.log('Saved test_customers_mobile_dropdown.png');

  await browser.close();
})();
