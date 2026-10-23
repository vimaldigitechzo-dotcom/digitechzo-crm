const puppeteer = require('puppeteer-core');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  
  // Click Autofill
  const autofillBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Autofill'));
  });
  await autofillBtn.click();
  await new Promise(r => setTimeout(r, 500));

  // Click submit
  const submitBtn = await page.waitForSelector('button[type="submit"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
    submitBtn.click(),
  ]);

  // Navigate to team
  await page.goto('http://localhost:5173/team', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Filter or click on Admin member
  await page.evaluate(() => {
    const adminBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Admin');
    if (adminBtn) adminBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Click View Profile on Admin
  await page.evaluate(() => {
    const allButtons = Array.from(document.querySelectorAll('button'));
    const btn = allButtons.find(b => b.innerText.includes('View Profile'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Desktop screenshot
  await page.screenshot({ path: 'team_admin_modal_desktop.png' });
  console.log('Saved team_admin_modal_desktop.png');

  // Mobile screenshot (375x667)
  await page.setViewport({ width: 375, height: 667 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'team_admin_modal_mobile.png' });
  console.log('Saved team_admin_modal_mobile.png');

  // Extra small mobile screenshot (320x568)
  await page.setViewport({ width: 320, height: 568 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'team_admin_modal_small_mobile.png' });
  console.log('Saved team_admin_modal_small_mobile.png');

  await browser.close();
}

test();
