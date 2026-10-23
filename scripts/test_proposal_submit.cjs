const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testSubmitProposal() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const autofillBtn = btns.find((b) => b.textContent && b.textContent.includes('Autofill'));
    if (autofillBtn) autofillBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  await page.goto('http://localhost:5173/proposals', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Open modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const createBtn = btns.find(b => b.textContent && b.textContent.includes('Create Proposal'));
    if (createBtn) createBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Log dropdown elements
  const dropdownDetails = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('[role="dialog"] button'));
    return buttons.map(b => b.innerText.trim()).filter(Boolean);
  });
  console.log('Dialog buttons/selects:', dropdownDetails);

  await page.screenshot({ path: 'proposal-modal-inspected.png' });
  console.log('Saved screenshot to proposal-modal-inspected.png');

  await browser.close();
}

testSubmitProposal().catch(console.error);
