const puppeteer = require('puppeteer-core');

async function testTeamModal() {
  console.log('Testing Member Profile Modal on Team Page...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Step 1: Login
    console.log('1. Logging in as admin...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const autofill = btns.find(b => b.innerText.includes('Autofill'));
      if (autofill) autofill.click();
      const submit = document.querySelector('button[type="submit"]');
      if (submit) submit.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // Step 2: Navigate to /team
    console.log('2. Navigating to http://localhost:5173/team');
    await page.goto('http://localhost:5173/team', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));

    // Step 3: Click "View Profile" button
    console.log('3. Clicking View Profile button...');
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const viewBtn = btns.find(b => b.innerText && b.innerText.includes('View Profile'));
      if (viewBtn) {
        viewBtn.click();
        return true;
      }
      return false;
    });
    console.log('   View Profile clicked:', clicked);
    await new Promise(r => setTimeout(r, 1500));

    // Step 4: Verify modal content and capture screenshot
    console.log('4. Verifying modal content and capturing screenshot...');
    const modalText = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      return modal ? modal.innerText : 'MODAL_NOT_FOUND';
    });
    console.log('   Modal contains DigiTechzo Administrator:', modalText.includes('DigiTechzo Administrator'));
    console.log('   Modal contains ADMIN:', modalText.includes('ADMIN'));
    console.log('   Modal contains Documented RBAC Capabilities:', modalText.includes('Documented RBAC Capabilities'));

    await page.screenshot({ path: 'team-modal-fixed-verified.png' });
    console.log('   Screenshot saved as team-modal-fixed-verified.png');

    // Also test small mobile viewport (360x640)
    console.log('5. Testing on mobile viewport (360x640)...');
    await page.setViewport({ width: 360, height: 640 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'team-modal-mobile-fixed.png' });
    console.log('   Screenshot saved as team-modal-mobile-fixed.png');

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
}

testTeamModal();
