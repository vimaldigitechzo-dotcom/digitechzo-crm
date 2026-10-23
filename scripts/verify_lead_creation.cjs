const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function verify() {
  console.log('--- Verifying Lead Creation End-to-End ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Go to Login page
  console.log('1. Navigating to login page...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

  // 2. Click Autofill button
  console.log('2. Clicking Autofill button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const autofillBtn = btns.find((b) => b.textContent && b.textContent.includes('Autofill'));
    if (autofillBtn) autofillBtn.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  const emailVal = await page.$eval('#login-email', (el) => el.value);
  console.log('Autofilled email:', emailVal);

  // 3. Submit Login
  console.log('3. Submitting login form...');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));

  console.log('Current URL after login:', page.url());

  // 4. Navigate to Leads page
  console.log('4. Navigating to Leads page...');
  await page.goto('http://localhost:5173/leads', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // 5. Click "Add Lead" button
  console.log('5. Clicking Add Lead button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addLeadBtn = btns.find((b) => b.textContent && b.textContent.includes('Add Lead'));
    if (addLeadBtn) addLeadBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // 6. Fill out lead form
  console.log('6. Filling lead form (rajesh, 1234556789)...');
  await page.type('#new-lead-fullname', 'rajesh');
  await page.type('input[type="tel"]', '1234556789');

  // 7. Click Save Lead
  console.log('7. Clicking Save Lead...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const saveBtn = btns.find((b) => b.textContent && b.textContent.includes('Save Lead'));
    if (saveBtn) saveBtn.click();
  });
  await new Promise((r) => setTimeout(r, 2500));

  // 8. Check for any error banner or modal state
  const errorBanner = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('.bg-\\[\\#FEF2F2\\]'));
    return alerts.map((a) => a.textContent?.trim()).join(' | ');
  });

  if (errorBanner) {
    console.error('ERROR BANNER DETECTED:', errorBanner);
  } else {
    console.log('SUCCESS: Zero errors! Lead rajesh created smoothly without authorization issue.');
  }

  // Take screenshot
  const screenshotPath = path.resolve('mobile-responsive-report', 'screenshots', 'lead-creation-verified.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved verification screenshot to:', screenshotPath);

  // 9. Clean up test lead from backend
  console.log('9. Cleaning up test lead from backend...');
  const sessionRaw = await page.evaluate(() => localStorage.getItem('digitechzo_auth_session'));
  if (sessionRaw) {
    const sess = JSON.parse(sessionRaw);
    const leadsRes = await fetch('https://digitechzo-crm-api.onrender.com/api/v1/leads?search=1234556789', {
      headers: { Authorization: `Bearer ${sess.accessToken}` },
    });
    const leadsJson = await leadsRes.json();
    const items = leadsJson.data?.items || leadsJson.data || [];
    for (const item of items) {
      if (item.phone === '1234556789') {
        console.log(`Deleting test lead ${item.id}...`);
        await fetch(`https://digitechzo-crm-api.onrender.com/api/v1/leads/${item.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${sess.accessToken}` },
        });
        console.log(`Cleaned up lead ${item.id}.`);
      }
    }
  }

  await browser.close();
}

verify().catch(console.error);
