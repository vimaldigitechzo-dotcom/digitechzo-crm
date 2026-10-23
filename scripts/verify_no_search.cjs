const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_team_nosearch_' + Date.now());
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: uniqueDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

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

  await page.goto('http://localhost:5173/team', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  const hasSearchInput = await page.evaluate(() => {
    return !!document.querySelector('input[placeholder*="Search member"]');
  });
  console.log('Has Search Member input:', hasSearchInput);

  await page.screenshot({ path: 'team_no_search_desktop.png' });
  console.log('Saved team_no_search_desktop.png');

  await browser.close();
})();
