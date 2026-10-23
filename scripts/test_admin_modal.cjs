const puppeteer = require('puppeteer-core');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  const autofillBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Autofill'));
  });
  await autofillBtn.click();
  await new Promise(r => setTimeout(r, 500));

  const submitBtn = await page.waitForSelector('button[type="submit"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
    submitBtn.click(),
  ]);

  await page.goto('http://localhost:5173/team', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Find the row containing DigiTechzo Administrator and click its View Profile button
  const clickedAdmin = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr'));
    const adminRow = rows.find(r => r.innerText.includes('DigiTechzo Administrator'));
    if (adminRow) {
      const btn = adminRow.querySelector('button');
      if (btn) {
        btn.click();
        return true;
      }
    }
    return false;
  });
  console.log('Clicked admin View Profile:', clickedAdmin);
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({ path: 'team_exact_admin_modal.png' });
  console.log('Saved team_exact_admin_modal.png');

  await browser.close();
}

test();
