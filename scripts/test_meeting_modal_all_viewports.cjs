const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const TEST_VIEWPORTS = [
  { name: 'small-320x568', width: 320, height: 568 },
  { name: 'small-360x800', width: 360, height: 800 },
  { name: 'standard-375x812', width: 375, height: 812 },
  { name: 'standard-390x844', width: 390, height: 844 },
  { name: 'large-430x932', width: 430, height: 932 },
  { name: 'landscape-667x375', width: 667, height: 375 },
  { name: 'landscape-844x390', width: 844, height: 390 }
];

(async () => {
  const screenshotsDir = path.resolve('mobile-responsive-audit', 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_meet_all_' + Date.now());
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: uniqueDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('Logging in for meeting details verification...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent && b.textContent.includes('Autofill')) b.click();
    });
  });
  await new Promise(r => setTimeout(r, 300));
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));

  const results = [];

  for (const vp of TEST_VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:5173/meetings', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    // Click meeting to open details modal
    const opened = await page.evaluate(() => {
      // Look for title buttons in mobile view or desktop view
      const btns = Array.from(document.querySelectorAll('button'));
      const meetingBtn = btns.find(b => b.textContent && (b.textContent.includes('Product Demo') || b.textContent.includes('Demo') || b.textContent.includes('Discovery')));
      if (meetingBtn) {
        meetingBtn.click();
        return true;
      }
      return false;
    });

    await new Promise(r => setTimeout(r, 800));

    const check = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { modalFound: false };
      const mRect = modal.getBoundingClientRect();
      const clientW = window.innerWidth;
      const clientH = window.innerHeight;

      // Check all elements inside modal
      const overflows = [];
      const children = modal.querySelectorAll('*');
      for (const el of children) {
        const r = el.getBoundingClientRect();
        if (r.right > mRect.right + 2 && r.width > 0 && r.height > 0) {
          overflows.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className || '').toString().slice(0, 60),
            rightDiff: Math.round(r.right - mRect.right)
          });
          if (overflows.length >= 5) break;
        }
      }

      return {
        modalFound: true,
        clientW,
        clientH,
        modalLeft: Math.round(mRect.left),
        modalRight: Math.round(mRect.right),
        modalWidth: Math.round(mRect.width),
        modalHeight: Math.round(mRect.height),
        fitsViewportHorizontally: mRect.right <= clientW && mRect.left >= 0,
        innerOverflowsCount: overflows.length,
        innerOverflows: overflows
      };
    });

    const shotName = `meeting-modal-${vp.name}.png`;
    const shotPath = path.join(screenshotsDir, shotName);
    await page.screenshot({ path: shotPath });

    console.log(`[Meeting Modal][${vp.name}]:`, {
      found: check.modalFound,
      modalW: check.modalWidth,
      clientW: check.clientW,
      fits: check.fitsViewportHorizontally,
      innerOverflows: check.innerOverflowsCount
    });

    results.push({ viewport: vp.name, ...check, screenshot: shotName });
  }

  fs.writeFileSync(
    path.resolve('mobile-responsive-audit', 'meeting_modal_verification.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('Meeting modal verification complete! Saved to mobile-responsive-audit/meeting_modal_verification.json');
  await browser.close();
})();
