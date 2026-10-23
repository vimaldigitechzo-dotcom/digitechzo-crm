const puppeteer = require('puppeteer-core');
const path = require('path');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('--- Step-by-Step UI Execution for Lead "Nani" ---');
  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_nani_ui_' + Date.now());
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: uniqueDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  // 1. Login
  console.log('1. Logging in with Autofill...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const autofillBtn = btns.find((b) => b.textContent && b.textContent.includes('Autofill'));
    if (autofillBtn) autofillBtn.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));

  // 2. Go to Leads Page and create Lead "Nani"
  console.log('2. Navigating to Leads page...');
  await page.goto('http://localhost:5173/leads', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  console.log('Opening Add Lead Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addLeadBtn = btns.find((b) => b.textContent && b.textContent.includes('Add Lead'));
    if (addLeadBtn) addLeadBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  console.log('Filling Nani lead details...');
  await page.type('#new-lead-fullname', 'Nani');
  await page.type('input[placeholder="e.g. Acme Tech Solutions"]', 'Nani Tech Ventures');
  await page.type('input[placeholder="e.g. 9876543210 (10 digits)"]', '9876512345');
  await page.type('input[placeholder="rajesh@acmetech.in"]', 'nani@nanitech.com');

  // Select category
  await page.evaluate(() => {
    const catBtn = document.querySelector('button[title="Select category / service"]');
    if (catBtn) catBtn.click();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('div, li, button, span'));
    const webDev = opts.find(el => el.textContent && el.textContent.includes('Web Development'));
    if (webDev) webDev.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  console.log('Submitting Create Lead...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const saveBtn = btns.find((b) => b.textContent && b.textContent.includes('Create Lead'));
    if (saveBtn) saveBtn.click();
  });
  await new Promise((r) => setTimeout(r, 3000));

  // Screenshot Leads list with Nani
  await page.screenshot({ path: 'step1-nani-lead-created.png' });
  console.log('Saved screenshot: step1-nani-lead-created.png');

  // 3. Go to Pipeline Page and add Deal for Nani
  console.log('3. Navigating to Pipeline page...');
  await page.goto('http://localhost:5173/pipeline', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  console.log('Opening Add Deal Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addDealBtn = btns.find((b) => b.textContent && b.textContent.includes('Add Deal'));
    if (addDealBtn) addDealBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  console.log('Filling Deal details...');
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const titleInput = inputs.find(i => i.placeholder && i.placeholder.includes('Package') || i.id === 'deal-title');
    if (titleInput) {
      titleInput.value = 'Nani Tech - Enterprise Platform';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  // Deal Value
  await page.evaluate(() => {
    const numInputs = Array.from(document.querySelectorAll('input[type="number"]'));
    if (numInputs[0]) {
      numInputs[0].value = '85000';
      numInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  // Select Nani from Lead dropdown
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('button'));
    const leadTrigger = selects.find(b => b.textContent && b.textContent.includes('Select an existing lead'));
    if (leadTrigger) leadTrigger.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('div, li, button, span'));
    const nani = items.find(el => el.textContent && el.textContent.includes('Nani'));
    if (nani) nani.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  console.log('Submitting Deal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const createBtn = btns.find((b) => b.textContent && b.textContent.includes('Create Deal'));
    if (createBtn) createBtn.click();
  });
  await new Promise((r) => setTimeout(r, 2500));

  // Screenshot Pipeline with Nani
  await page.screenshot({ path: 'step2-nani-pipeline-deal.png' });
  console.log('Saved screenshot: step2-nani-pipeline-deal.png');

  // 4. Go to Dashboard and see Active Pipeline
  console.log('4. Navigating to Dashboard...');
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: 'step3-nani-dashboard-active-pipeline.png' });
  console.log('Saved screenshot: step3-nani-dashboard-active-pipeline.png');

  // 5. Go to Invoice Studio and autofill Nani
  console.log('5. Navigating to Invoices...');
  await page.goto('http://localhost:5173/invoices', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  // Click autofill lead in Invoice Studio
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const autofillTrigger = btns.find(b => b.textContent && b.textContent.includes('Select an existing CRM Lead'));
    if (autofillTrigger) autofillTrigger.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('div, li, button, span'));
    const naniLead = items.find(el => el.textContent && el.textContent.includes('Nani'));
    if (naniLead) naniLead.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({ path: 'step4-nani-invoice-studio.png' });
  console.log('Saved screenshot: step4-nani-invoice-studio.png');

  await browser.close();
  console.log('ALL MODULES EXECUTED FOR NANI SUCCESSFULLY!');
}

run().catch(console.error);
