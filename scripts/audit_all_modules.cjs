const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const MODULES = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Leads', path: '/leads' },
  { name: 'Pipeline', path: '/pipeline' },
  { name: 'Tasks', path: '/tasks' },
  { name: 'Activities', path: '/activities' },
  { name: 'Meetings', path: '/meetings' },
  { name: 'Proposals', path: '/proposals' },
  { name: 'Invoices', path: '/invoices' },
  { name: 'Customers', path: '/customers' },
  { name: 'Reports', path: '/reports' },
  { name: 'Team', path: '/team' },
  { name: 'Settings', path: '/settings' }
];

const VIEWPORTS = [
  { name: 'small-320x568', width: 320, height: 568 },
  { name: 'standard-390x844', width: 390, height: 844 },
  { name: 'large-430x932', width: 430, height: 932 },
  { name: 'landscape-844x390', width: 844, height: 390 }
];

(async () => {
  const screenshotsDir = path.resolve('mobile-responsive-audit', 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_audit_' + Date.now());
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: uniqueDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('Logging in to Digitechzo CRM...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

  // Use Autofill button if available
  const autofillClicked = await page.evaluate(() => {
    let found = false;
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent && b.textContent.includes('Autofill')) {
        b.click();
        found = true;
      }
    });
    return found;
  });

  if (!autofillClicked) {
    // Fill credentials manually
    await page.type('input[type="email"], input[name="email"]', 'admin@digitechzo.com');
    await page.type('input[type="password"], input[name="password"]', 'AdminSecurePassword123!');
  }

  await new Promise(r => setTimeout(r, 400));
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  console.log('Login complete. Current URL:', page.url());

  const auditResults = [];

  for (const mod of MODULES) {
    console.log(`\n========================================\nAuditing Module: ${mod.name} (${mod.path})\n========================================`);
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
      await page.goto(`http://localhost:5173${mod.path}`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 1200));

      const overflowDetails = await page.evaluate(() => {
        const docElem = document.documentElement;
        const body = document.body;
        const clientWidth = window.innerWidth;
        const scrollWidth = Math.max(docElem.scrollWidth, body.scrollWidth);
        const hasHorizontalOverflow = scrollWidth > clientWidth + 1; // 1px threshold for subpixel

        // Find overflowing elements
        const overflowingElements = [];
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          // check if element extends past right edge
          if (rect.right > clientWidth + 2 && rect.width > 0 && rect.height > 0) {
            // Check if element or parent has overflow-x hidden/scroll
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              const tag = el.tagName.toLowerCase();
              const cls = typeof el.className === 'string' ? el.className.slice(0, 80) : '';
              overflowingElements.push({
                tag,
                cls,
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                overflowDiff: Math.round(rect.right - clientWidth)
              });
              if (overflowingElements.length >= 8) break;
            }
          }
        }

        return {
          clientWidth,
          scrollWidth,
          hasHorizontalOverflow,
          overflowAmount: Math.max(0, scrollWidth - clientWidth),
          overflowingElements
        };
      });

      const shotName = `${mod.name.toLowerCase()}-${vp.name}.png`;
      const shotPath = path.join(screenshotsDir, shotName);
      await page.screenshot({ path: shotPath, fullPage: false });

      console.log(`[${mod.name}][${vp.name}] - clientW: ${overflowDetails.clientWidth}, scrollW: ${overflowDetails.scrollWidth}, overflow: ${overflowDetails.hasHorizontalOverflow ? `YES (+${overflowDetails.overflowAmount}px)` : 'NO'}`);
      if (overflowDetails.hasHorizontalOverflow && overflowDetails.overflowingElements.length > 0) {
        console.log('   Offending elements sample:', overflowDetails.overflowingElements.slice(0, 3));
      }

      auditResults.push({
        module: mod.name,
        path: mod.path,
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        hasHorizontalOverflow: overflowDetails.hasHorizontalOverflow,
        overflowAmount: overflowDetails.overflowAmount,
        elements: overflowDetails.overflowingElements,
        screenshot: shotName
      });
    }
  }

  fs.writeFileSync(
    path.resolve('mobile-responsive-audit', 'preliminary_audit_results.json'),
    JSON.stringify(auditResults, null, 2)
  );

  console.log('\nAudit scan completed! Results saved to mobile-responsive-audit/preliminary_audit_results.json');
  await browser.close();
})();
