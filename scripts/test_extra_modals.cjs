const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = path.resolve('mobile-responsive-audit', 'screenshots');

(async () => {
  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_extra_modals_' + Date.now());
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: uniqueDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
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

  const extraTests = [
    {
      moduleId: 'meetings',
      modalName: 'Schedule Demo Modal',
      route: '/meetings',
      btnText: 'Schedule Demo'
    },
    {
      moduleId: 'tasks',
      modalName: 'Schedule Task Modal',
      route: '/tasks',
      btnText: 'Schedule Task'
    }
  ];

  const viewports = [
    { id: 'small_320x568', width: 320, height: 568 },
    { id: 'std_390x844', width: 390, height: 844 },
    { id: 'land_844x390', width: 844, height: 390 }
  ];

  const results = [];

  for (const t of extraTests) {
    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
      await page.goto(`http://localhost:5173${t.route}`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 800));

      await page.evaluate((btnText) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent && b.textContent.includes(btnText));
        if (btn) btn.click();
      }, t.btnText);

      await new Promise(r => setTimeout(r, 800));

      const modalMetrics = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return { found: false };
        const rect = dialog.getBoundingClientRect();
        const clientW = window.innerWidth;
        const clientH = window.innerHeight;

        let overflowCount = 0;
        const children = dialog.querySelectorAll('*');
        for (const c of children) {
          const cr = c.getBoundingClientRect();
          if (cr.right > rect.right + 2 && cr.width > 0 && cr.height > 0) {
            overflowCount++;
          }
        }

        return {
          found: true,
          clientW,
          clientH,
          modalWidth: Math.round(rect.width),
          modalHeight: Math.round(rect.height),
          modalLeft: Math.round(rect.left),
          modalRight: Math.round(rect.right),
          fitsWithinScreen: rect.right <= clientW && rect.left >= 0,
          innerOverflowCount: overflowCount
        };
      });

      const shotName = `modal-${t.moduleId}-${t.modalName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${vp.id}.png`;
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, shotName) });

      console.log(`[Modal: ${t.modalName}][${vp.id}] - Fits: ${modalMetrics.fitsWithinScreen}, InnerOverflows: ${modalMetrics.innerOverflowCount}, Width: ${modalMetrics.modalWidth}px`);
      results.push({
        modalName: t.modalName,
        module: t.moduleId,
        viewport: vp.id,
        width: vp.width,
        height: vp.height,
        ...modalMetrics,
        screenshot: shotName,
        passed: modalMetrics.found && modalMetrics.fitsWithinScreen && modalMetrics.innerOverflowCount === 0
      });
    }
  }

  // Update master_audit_results.json
  const masterPath = path.resolve('mobile-responsive-audit', 'master_audit_results.json');
  if (fs.existsSync(masterPath)) {
    const data = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    // Filter out the undefined ones and add valid ones
    data.modalTests = data.modalTests.filter(m => m.passed !== false || (m.modalName !== 'Schedule Demo Modal' && m.modalName !== 'Schedule Task Modal'));
    data.modalTests.push(...results);
    fs.writeFileSync(masterPath, JSON.stringify(data, null, 2));
  }

  await browser.close();
  console.log('Extra modal audit complete and master_audit_results.json updated!');
})();
