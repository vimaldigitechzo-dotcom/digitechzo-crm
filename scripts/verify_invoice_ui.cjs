const puppeteer = require('puppeteer-core');
const path = require('path');
const os = require('os');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_invoice_ui_' + Date.now() + '_' + Math.random().toString(36).substring(7));
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: uniqueDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent && b.textContent.includes('Autofill')) b.click();
    });
  });
  await new Promise(r => setTimeout(r, 200));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => b.textContent && b.textContent.includes('Sign In'));
    if (submitBtn) submitBtn.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 800));

  await page.goto('http://localhost:5173/invoices', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: 'invoice-studio-redesigned.png' });
  console.log('Saved screenshot to invoice-studio-redesigned.png');

  await browser.close();
})();
