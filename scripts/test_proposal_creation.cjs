const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testProposalModal() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('1. Logging in...');
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

  console.log('2. Navigating to proposals page...');
  await page.goto('http://localhost:5173/proposals', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  console.log('3. Opening Create Proposal modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const createBtn = btns.find(b => b.textContent && (b.textContent.includes('Create Proposal') || b.textContent.includes('New Proposal')));
    if (createBtn) createBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Inspect owner dropdown options
  const dropdownState = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return { modalFound: false };
    return {
      modalFound: true,
      modalText: modal.innerText
    };
  });
  console.log('Modal status:', dropdownState.modalFound);

  // Take screenshot of opened modal
  await page.screenshot({ path: 'proposal-modal-fixed.png' });
  console.log('Screenshot saved to proposal-modal-fixed.png');

  await browser.close();
}

testProposalModal().catch(console.error);
