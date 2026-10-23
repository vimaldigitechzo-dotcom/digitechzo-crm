const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_team_verify_' + Date.now());
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: uniqueDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Logging in as Admin...');
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

  console.log('Navigating to Team page...');
  await page.goto('http://localhost:5173/team', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  const teamData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    const members = rows.map(r => {
      const text = r.innerText.replace(/\n+/g, ' | ');
      return text;
    });

    const hasSekar = document.body.innerText.includes('sekar babu new') || document.body.innerText.includes('vimaldigitechzo@gmail.com');
    return {
      rowCount: rows.length,
      members,
      hasSekar
    };
  });

  console.log('Team Page Verification Results:', teamData);

  // Take screenshot of desktop team table
  await page.screenshot({ path: 'team_after_removal_desktop.png' });
  console.log('Saved team_after_removal_desktop.png');

  // Also check mobile view
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: 'team_after_removal_mobile.png' });
  console.log('Saved team_after_removal_mobile.png');

  await browser.close();
})();
