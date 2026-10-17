const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function captureComplete() {
  const loginRes = await fetch('https://digitechzo-crm-api.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@digitechzo.com', password: 'AdminSecurePassword123!' }),
  });
  const data = (await loginRes.json()).data;
  const session = {
    user: { id: data.user.id, email: data.user.email, name: data.user.name, firstName: 'DigiTechzo', lastName: 'Administrator', role: data.user.role, permissions: data.user.permissions || [] },
    accessToken: data.accessToken, refreshToken: data.refreshToken, expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
  };

  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  
  // Set tall viewport so entire page is captured in natural 320px width
  await page.setViewport({ width: 320, height: 2100 });
  await page.goto('http://localhost:5173');
  await page.evaluate((s) => localStorage.setItem('digitechzo_auth_session', JSON.stringify(s)), session);
  await page.goto('http://localhost:5173/leads/6a778a27-916a-406d-85e6-0665375157e9', { waitUntil: 'networkidle0' });

  // Get accurate main scroll height
  const totalHeight = await page.evaluate(() => {
    const main = document.querySelector('main');
    return main ? main.scrollHeight + 120 : 2100;
  });

  await page.setViewport({ width: 320, height: totalHeight });
  await new Promise((r) => setTimeout(r, 600));

  fs.mkdirSync('mobile-responsive-report/screenshots', { recursive: true });
  await page.screenshot({ path: 'mobile-responsive-report/screenshots/test-entire-page-320px.png' });
  console.log(`Saved screenshot of entire 320px page (height ${totalHeight}px)`);

  await browser.close();
}

captureComplete().catch(console.error);
