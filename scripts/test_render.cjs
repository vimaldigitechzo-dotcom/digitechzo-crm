const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function test() {
  console.log('Fetching live auth session from Render...');
  const loginRes = await fetch('https://digitechzo-crm-api.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@digitechzo.com', password: 'AdminSecurePassword123!' }),
  });
  const loginJson = await loginRes.json();
  const data = loginJson.data;

  const session = {
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      firstName: 'DigiTechzo',
      lastName: 'Administrator',
      role: data.user.role,
      permissions: data.user.permissions || [],
      organization: data.user.organization,
    },
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
  };

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 320, height: 568 });

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate((sess) => {
    localStorage.setItem('digitechzo_auth_session', JSON.stringify(sess));
  }, session);

  console.log('Navigating to target lead details page at 320px width...');
  await page.goto('http://localhost:5173/leads/6a778a27-916a-406d-85e6-0665375157e9', {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Check overflow
  const overflow = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
      elementsOver320: Array.from(document.querySelectorAll('*'))
        .filter((el) => el.offsetWidth > window.innerWidth)
        .map((el) => ({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          offsetWidth: el.offsetWidth,
        }))
        .slice(0, 10),
    };
  });

  console.log('Overflow result on 320px:', JSON.stringify(overflow, null, 2));

  fs.mkdirSync('mobile-responsive-report/screenshots', { recursive: true });
  await page.screenshot({ path: 'mobile-responsive-report/screenshots/test-initial-320x568.png', fullPage: true });
  console.log('Screenshot saved to mobile-responsive-report/screenshots/test-initial-320x568.png');

  await browser.close();
}

test().catch(console.error);
