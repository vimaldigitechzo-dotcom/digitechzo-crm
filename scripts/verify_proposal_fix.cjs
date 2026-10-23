const puppeteer = require('puppeteer-core');
const path = require('path');
const os = require('os');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: path.join(os.tmpdir(), 'puppeteer_test_' + Date.now()),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Login
  console.log('1. Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent && b.textContent.includes('Autofill')) b.click();
    });
  });
  await new Promise(r => setTimeout(r, 200));
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 800));

  // 2. Go to proposals
  console.log('2. Opening proposals page...');
  await page.goto('http://localhost:5173/proposals', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  // 3. Open Create Proposal modal
  console.log('3. Clicking Create Proposal button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const createBtn = btns.find(b => b.textContent && b.textContent.includes('Create Proposal'));
    if (createBtn) createBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 4. Fill in Proposal Title
  await page.type('input[placeholder*="Enterprise"]', 'Commercial Proposal - Verified Fix');

  // 5. Select Client
  console.log('4. Selecting client from dropdown...');
  await page.evaluate(() => {
    const triggers = Array.from(document.querySelectorAll('[role="dialog"] button'));
    const clientTrigger = triggers.find(b => b.textContent && b.textContent.includes('Select client or prospect'));
    if (clientTrigger) clientTrigger.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const selectedClient = await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('[role="option"], div[class*="cursor-pointer"]'));
    const clientOpt = options.find(o => o.textContent && (o.textContent.includes('Apex Retail') || o.textContent.includes('Sneha') || o.textContent.includes('Arun')));
    if (clientOpt) {
      const text = clientOpt.textContent.trim();
      clientOpt.click();
      return text;
    }
    // Fallback to first non-empty option
    const firstOpt = options.find(o => o.textContent && !o.textContent.includes('Select client'));
    if (firstOpt) {
      const text = firstOpt.textContent.trim();
      firstOpt.click();
      return text;
    }
    return null;
  });
  console.log('Selected Client:', selectedClient);
  await new Promise(r => setTimeout(r, 400));

  // 6. Submit Proposal
  console.log('5. Submitting proposal form...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[role="dialog"] button'));
    const submitBtn = btns.find(b => b.textContent && b.textContent.trim() === 'Create Proposal');
    if (submitBtn) submitBtn.click();
  });

  await new Promise(r => setTimeout(r, 2500));

  // Check if error appeared or modal closed
  const modalResult = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return { open: false, error: null };
    const errorAlert = modal.querySelector('.text-red-600, .bg-red-50');
    return {
      open: true,
      error: errorAlert ? errorAlert.textContent.trim() : null
    };
  });
  console.log('Modal Result after submit:', modalResult);

  await page.screenshot({ path: 'proposal-created-verified.png' });
  console.log('Saved screenshot to proposal-created-verified.png');

  await browser.close();
})();
