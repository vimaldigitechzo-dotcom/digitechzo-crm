const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // Login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent && b.textContent.includes('Autofill')) b.click();
    });
  });
  await new Promise(r => setTimeout(r, 400));
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));

  // Go to /customers
  await page.goto('http://localhost:5173/customers', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Click Add Customer button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addBtn = btns.find(b => b.textContent && b.textContent.includes('Add Customer'));
    if (addBtn) addBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Find phone input
  const phoneSelector = 'input[placeholder*="9876543210"]';
  await page.waitForSelector(phoneSelector);

  // Type 7 digits: 2343245
  await page.type(phoneSelector, '2343245');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: 'customer_phone_7_digits.png' });

  // Read message
  const msg7 = await page.evaluate(() => {
    return document.body.innerText;
  });
  console.log('Includes 7/10 entered:', msg7.includes('7/10 entered'));
  console.log('Includes 7/10 digits:', msg7.includes('7/10 digits'));

  // Type remaining 3 digits to make it 10 digits
  await page.type(phoneSelector, '345');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: 'customer_phone_10_digits.png' });

  const msg10 = await page.evaluate(() => {
    return document.body.innerText;
  });
  console.log('Includes Valid 10-digit number:', msg10.includes('Valid 10-digit number'));
  console.log('Includes 10/10 digits:', msg10.includes('10/10 digits'));

  // Try typing 11th digit '9'
  await page.type(phoneSelector, '9');
  await new Promise(r => setTimeout(r, 300));
  const phoneValue = await page.$eval(phoneSelector, el => el.value);
  console.log('Value after typing 11 digits (should be length 10):', phoneValue, 'length:', phoneValue.length);

  await browser.close();
})();
