const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_meet_mob_' + Date.now());
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

  await page.goto('http://localhost:5173/meetings', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // On mobile stacked cards, clicking the meeting title opens the details modal
  const clicked = await page.evaluate(() => {
    const titleBtns = Array.from(document.querySelectorAll('.sm\\:hidden button'));
    if (titleBtns.length > 0) {
      titleBtns[0].click();
      return true;
    }
    return false;
  });
  console.log('Opened meeting modal:', clicked);
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: 'meeting_modal_mobile_fixed.png' });
  console.log('Saved meeting_modal_mobile_fixed.png');

  await browser.close();
})();
