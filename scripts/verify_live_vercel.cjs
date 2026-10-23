const puppeteer = require('puppeteer-core');

async function testLive() {
  console.log('Testing live Vercel deployment: https://digitechzo-crm.vercel.app ...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Visit live login
  await page.goto('https://digitechzo-crm.vercel.app/login', { waitUntil: 'networkidle2' });
  const autofillBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Autofill'));
  });
  if (autofillBtn) await autofillBtn.click();
  await new Promise(r => setTimeout(r, 500));

  const submitBtn = await page.waitForSelector('button[type="submit"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
    submitBtn.click(),
  ]);
  console.log('Logged into live site. URL:', page.url());

  // 2. Visit live /dashboard
  await page.goto('https://digitechzo-crm.vercel.app/dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'vercel_live_dashboard.png' });
  console.log('Saved vercel_live_dashboard.png');

  // 3. Visit live /tasks
  await page.goto('https://digitechzo-crm.vercel.app/tasks', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'vercel_live_tasks.png' });
  console.log('Saved vercel_live_tasks.png');

  await browser.close();
}

testLive();
