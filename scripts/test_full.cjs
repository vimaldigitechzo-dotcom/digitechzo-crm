const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testFull() {
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

  await page.goto('http://localhost:5173/leads/6a778a27-916a-406d-85e6-0665375157e9', {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Capture full page screenshot
  await page.screenshot({ path: 'mobile-responsive-report/screenshots/test-fullpage-320x568.png', fullPage: true });

  await browser.close();
}

testFull().catch(console.error);
