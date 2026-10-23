const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const AUDIT_DIR = path.resolve('mobile-responsive-audit');
const SCREENSHOTS_DIR = path.join(AUDIT_DIR, 'screenshots');

const MODULES = [
  { id: 'dashboard', name: 'Dashboard', path: '/dashboard' },
  { id: 'leads', name: 'Leads', path: '/leads' },
  { id: 'pipeline', name: 'Pipeline', path: '/pipeline' },
  { id: 'tasks', name: 'Tasks', path: '/tasks' },
  { id: 'activities', name: 'Activities', path: '/activities' },
  { id: 'meetings', name: 'Meetings', path: '/meetings' },
  { id: 'proposals', name: 'Proposals', path: '/proposals' },
  { id: 'invoices', name: 'Invoices', path: '/invoices' },
  { id: 'customers', name: 'Customers', path: '/customers' },
  { id: 'reports', name: 'Reports', path: '/reports' },
  { id: 'team', name: 'Team', path: '/team' },
  { id: 'settings', name: 'Settings', path: '/settings' }
];

const VIEWPORTS = [
  { id: 'small_320x568', name: 'Small Phone (320x568)', width: 320, height: 568, category: 'Small' },
  { id: 'small_360x800', name: 'Small Phone (360x800)', width: 360, height: 800, category: 'Small' },
  { id: 'std_375x812', name: 'Standard Phone (375x812)', width: 375, height: 812, category: 'Standard' },
  { id: 'std_390x844', name: 'Standard Phone (390x844)', width: 390, height: 844, category: 'Standard' },
  { id: 'large_412x915', name: 'Large Phone (412x915)', width: 412, height: 915, category: 'Large' },
  { id: 'large_430x932', name: 'Large Phone (430x932)', width: 430, height: 932, category: 'Large' },
  { id: 'land_667x375', name: 'Landscape Phone (667x375)', width: 667, height: 375, category: 'Landscape' },
  { id: 'land_844x390', name: 'Landscape Phone (844x390)', width: 844, height: 390, category: 'Landscape' }
];

(async () => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const uniqueDir = path.join(os.tmpdir(), 'puppeteer_master_' + Date.now());
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: uniqueDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('--- Phase 1: Authentication ---');
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

  console.log('Logged in successfully. Starting audit matrix...');

  const auditReportData = {
    executedAt: new Date().toISOString(),
    totalModules: MODULES.length,
    viewportsAudited: VIEWPORTS.length,
    totalTestsExecuted: MODULES.length * VIEWPORTS.length,
    results: [],
    modalTests: []
  };

  // 1. Audit all 12 modules across all viewports
  for (const mod of MODULES) {
    console.log(`\nAuditing Module: ${mod.name}`);
    for (const vp of VIEWPORTS) {
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: true,
        hasTouch: true
      });

      await page.goto(`http://localhost:5173${mod.path}`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 1000));

      const metrics = await page.evaluate(() => {
        const docElem = document.documentElement;
        const body = document.body;
        const clientWidth = window.innerWidth;
        const clientHeight = window.innerHeight;
        const scrollWidth = Math.max(docElem.scrollWidth, body.scrollWidth);
        const scrollHeight = Math.max(docElem.scrollHeight, body.scrollHeight);
        const hasHorizontalOverflow = scrollWidth > clientWidth + 1;

        return {
          clientWidth,
          clientHeight,
          scrollWidth,
          scrollHeight,
          hasHorizontalOverflow,
          overflowDelta: Math.max(0, scrollWidth - clientWidth)
        };
      });

      // Save screenshot for standard mobile (390x844), smallest mobile (320x568), and landscape (844x390)
      let screenshotFile = null;
      if (vp.id === 'std_390x844' || vp.id === 'small_320x568' || vp.id === 'land_844x390') {
        screenshotFile = `${mod.id}-${vp.id}.png`;
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, screenshotFile) });
      }

      const testRecord = {
        moduleId: mod.id,
        moduleName: mod.name,
        path: mod.path,
        viewportId: vp.id,
        viewportName: vp.name,
        category: vp.category,
        width: vp.width,
        height: vp.height,
        clientWidth: metrics.clientWidth,
        scrollWidth: metrics.scrollWidth,
        hasHorizontalOverflow: metrics.hasHorizontalOverflow,
        overflowDelta: metrics.overflowDelta,
        passed: !metrics.hasHorizontalOverflow,
        screenshot: screenshotFile
      };

      auditReportData.results.push(testRecord);
    }
  }

  // 2. Audit Key Modals at Small (320px) and Standard (390px)
  console.log('\n--- Phase 2: Auditing Key Modals & Interactive Overlays ---');
  const modalTestConfigs = [
    {
      moduleId: 'meetings',
      modalName: 'Meeting Details Modal',
      route: '/meetings',
      openSelector: async (p) => {
        return await p.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && (b.textContent.includes('Demo') || b.textContent.includes('Discovery')));
          if (btn) { btn.click(); return true; }
          return false;
        });
      }
    },
    {
      moduleId: 'meetings',
      modalName: 'Schedule Demo Modal',
      route: '/meetings',
      openSelector: async (p) => {
        return await p.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('Schedule Meeting'));
          if (btn) { btn.click(); return true; }
          return false;
        });
      }
    },
    {
      moduleId: 'leads',
      modalName: 'Create Lead Modal',
      route: '/leads',
      openSelector: async (p) => {
        return await p.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('Add Lead'));
          if (btn) { btn.click(); return true; }
          return false;
        });
      }
    },
    {
      moduleId: 'tasks',
      modalName: 'Schedule Task Modal',
      route: '/tasks',
      openSelector: async (p) => {
        return await p.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('Add Task'));
          if (btn) { btn.click(); return true; }
          return false;
        });
      }
    },
    {
      moduleId: 'proposals',
      modalName: 'Create Proposal Modal',
      route: '/proposals',
      openSelector: async (p) => {
        return await p.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('Create Proposal'));
          if (btn) { btn.click(); return true; }
          return false;
        });
      }
    },
    {
      moduleId: 'customers',
      modalName: 'Add Customer Account Modal',
      route: '/customers',
      openSelector: async (p) => {
        return await p.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('Add Customer'));
          if (btn) { btn.click(); return true; }
          return false;
        });
      }
    },
    {
      moduleId: 'team',
      modalName: 'Invite Team Member Modal',
      route: '/team',
      openSelector: async (p) => {
        return await p.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent && b.textContent.includes('Invite Member'));
          if (btn) { btn.click(); return true; }
          return false;
        });
      }
    }
  ];

  const modalViewports = [
    { id: 'small_320x568', width: 320, height: 568 },
    { id: 'std_390x844', width: 390, height: 844 },
    { id: 'land_844x390', width: 844, height: 390 }
  ];

  for (const mConfig of modalTestConfigs) {
    for (const mvp of modalViewports) {
      await page.setViewport({ width: mvp.width, height: mvp.height, isMobile: true, hasTouch: true });
      await page.goto(`http://localhost:5173${mConfig.route}`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 800));

      const opened = await mConfig.openSelector(page);
      await new Promise(r => setTimeout(r, 800));

      const modalMetrics = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return { found: false };
        const rect = dialog.getBoundingClientRect();
        const clientW = window.innerWidth;
        const clientH = window.innerHeight;

        // Check if any child element exceeds the dialog boundary
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

      const shotName = `modal-${mConfig.moduleId}-${mConfig.modalName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${mvp.id}.png`;
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, shotName) });

      auditReportData.modalTests.push({
        modalName: mConfig.modalName,
        module: mConfig.moduleId,
        viewport: mvp.id,
        width: mvp.width,
        height: mvp.height,
        ...modalMetrics,
        screenshot: shotName,
        passed: modalMetrics.found && modalMetrics.fitsWithinScreen && modalMetrics.innerOverflowCount === 0
      });

      console.log(`[Modal: ${mConfig.modalName}][${mvp.id}] - Fits: ${modalMetrics.fitsWithinScreen}, InnerOverflows: ${modalMetrics.innerOverflowCount}`);
    }
  }

  // 3. Write summary data file
  fs.writeFileSync(
    path.join(AUDIT_DIR, 'master_audit_results.json'),
    JSON.stringify(auditReportData, null, 2)
  );

  console.log(`\n======================================================`);
  console.log(`Master Mobile Responsiveness Audit Completed!`);
  console.log(`Total Module Route Checks: ${auditReportData.results.length}`);
  console.log(`Total Modal Checks: ${auditReportData.modalTests.length}`);
  console.log(`All results saved to ${path.join(AUDIT_DIR, 'master_audit_results.json')}`);
  console.log(`======================================================\n`);

  await browser.close();
})();
