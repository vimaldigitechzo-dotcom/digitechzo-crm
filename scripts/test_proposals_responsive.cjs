const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const VIEWPORTS = [
  { name: '280x640', width: 280, height: 640 },
  { name: '320x568', width: 320, height: 568 },
  { name: '344x882', width: 344, height: 882 },
  { name: '360x800', width: 360, height: 800 },
  { name: '375x667', width: 375, height: 667 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x844', width: 390, height: 844 },
  { name: '393x852', width: 393, height: 852 },
  { name: '402x874', width: 402, height: 874 },
  { name: '430x932', width: 430, height: 932 }
];

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.abort();
      resolve(false);
    });
  });
}

(async () => {
  const screenshotsDir = path.resolve('mobile-responsive-audit', 'proposals-screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const isServerRunning = await checkPort(5173);
  let serverProcess = null;

  if (!isServerRunning) {
    console.log('Dev server not running on 5173. Spawning preview server...');
    const { spawn } = require('child_process');
    serverProcess = spawn('npx', ['vite', 'preview', '--port', '5173'], {
      shell: true,
      stdio: 'inherit'
    });
    await new Promise(r => setTimeout(r, 3000));
  }

  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_prop_test_' + Date.now());
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: uniqueDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  console.log('Authenticating...');
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

  console.log('Navigating to /proposals...');
  await page.goto('http://localhost:5173/proposals', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const results = [];

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 600));

    // Audit visible defects
    const audit = await page.evaluate((vpWidth) => {
      const docElem = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(docElem.scrollWidth, body.scrollWidth);
      const docOverflow = scrollWidth > vpWidth + 1;

      // Find all visible elements
      const elements = Array.from(document.querySelectorAll('*'));
      const defects = [];

      for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
        if (el.closest('[aria-hidden="true"]')) continue;
        if (el.closest('.invisible')) continue;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;

        // Skip horizontal scroll containers themselves or their descendants
        const isOrInsideHScroll = el.closest('.overflow-x-auto') || el.closest('[class*="overflow-x"]');

        if (!isOrInsideHScroll) {
          if (rect.left < -1) {
            defects.push({
              type: 'ELEMENT_OUTSIDE_LEFT',
              tag: el.tagName.toLowerCase(),
              className: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
              text: (el.textContent || '').trim().slice(0, 30),
              detail: `left=${Math.round(rect.left)}, right=${Math.round(rect.right)}, vp=${vpWidth}`
            });
          } else if (rect.right > vpWidth + 1) {
            defects.push({
              type: 'ELEMENT_OUTSIDE_RIGHT',
              tag: el.tagName.toLowerCase(),
              className: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
              text: (el.textContent || '').trim().slice(0, 30),
              detail: `left=${Math.round(rect.left)}, right=${Math.round(rect.right)}, vp=${vpWidth}`
            });
          }
        }

        // Check for severe content overflow on cards
        if (el.matches('.rounded-card') || el.matches('[class*="rounded-card"]')) {
          if (el.scrollWidth > el.clientWidth + 2) {
            defects.push({
              type: 'CARD_CONTENT_OVERFLOW',
              tag: el.tagName.toLowerCase(),
              text: (el.textContent || '').trim().slice(0, 30),
              detail: `scrollWidth=${el.scrollWidth}, clientWidth=${el.clientWidth}`
            });
          }
        }
      }

      return {
        docOverflow,
        scrollWidth,
        vpWidth,
        defectCount: defects.length,
        defects: defects.slice(0, 10)
      };
    }, vp.width);

    await page.screenshot({ path: path.join(screenshotsDir, `proposals-${vp.name}.png`) });

    const status = audit.docOverflow || audit.defectCount > 0 ? 'FAIL' : 'PASS';
    results.push({
      viewport: vp.name,
      width: vp.width,
      height: vp.height,
      status,
      docOverflow: audit.docOverflow,
      scrollWidth: audit.scrollWidth,
      defectCount: audit.defectCount,
      defects: audit.defects
    });

    console.log(`[${vp.name}] Status: ${status} | docOverflow: ${audit.docOverflow} | defects: ${audit.defectCount}`);
    if (audit.defects.length > 0) {
      console.log('   Defects sample:', audit.defects);
    }
  }

  // Also test Proposal Detail Preview Modal at 320x568
  await page.setViewport({ width: 320, height: 568 });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const previewBtn = btns.find(b => b.textContent && b.textContent.includes('Preview'));
    if (previewBtn) previewBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const modalAudit = await page.evaluate(() => {
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return {
      docOverflow: scrollWidth > 320 + 1,
      scrollWidth
    };
  });
  console.log(`[320x568 - Proposal Preview Modal] docOverflow: ${modalAudit.docOverflow} | scrollWidth: ${modalAudit.scrollWidth}`);
  await page.screenshot({ path: path.join(screenshotsDir, 'proposals-320x568-modal.png') });

  await browser.close();
  if (serverProcess) {
    serverProcess.kill();
  }

  console.log('\n--- AUDIT SUMMARY MATRIX ---');
  console.table(results.map(r => ({
    Viewport: r.viewport,
    Status: r.status,
    'Doc Overflow': r.docOverflow,
    'Defect Count': r.defectCount
  })));

  const allPassed = results.every(r => r.status === 'PASS');
  console.log(`\nOVERALL PROPOSALS RESULT: ${allPassed ? 'ALL PASSED (10/10)' : 'SOME FAILED'}`);
})();
