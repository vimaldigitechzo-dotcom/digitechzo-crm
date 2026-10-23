const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function testActivitiesFlow() {
  console.log('Launching Chrome to test Activities flow and session handling...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Step 1: Navigate to login page
    console.log('1. Navigating to http://localhost:5173/login');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

    // Step 2: Click Autofill for Seeded Admin Account
    console.log('2. Clicking Autofill button');
    await page.waitForSelector('button');
    const autofillClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const autofill = btns.find(b => b.innerText.includes('Autofill'));
      if (autofill) {
        autofill.click();
        return true;
      }
      return false;
    });
    console.log('   Autofill clicked:', autofillClicked);

    // Verify form filled
    const emailVal = await page.$eval('#login-email', el => el.value);
    console.log('   Filled email:', emailVal);

    // Step 3: Click Sign In
    console.log('3. Submitting login form');
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });

    // Wait for login request and navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    console.log('   Current URL after login:', page.url());

    // Step 4: Navigate directly to /activities
    console.log('4. Navigating to http://localhost:5173/activities');
    await page.goto('http://localhost:5173/activities', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 4000));

    // Check if error card exists or activities loaded
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasError = pageText.includes('Failed to load activities') || pageText.includes('Your session has expired');
    const hasActivities = pageText.includes('Activities') && (pageText.includes('total events') || pageText.includes('Lead Captured') || pageText.includes('Task Completed'));

    console.log('   Activities Page status:');
    console.log('   - Has error card:', hasError);
    console.log('   - Has live activities content:', hasActivities);

    // Take screenshot of working activities page
    await page.screenshot({ path: 'activities-working-verified.png', fullPage: true });
    console.log('   Screenshot saved as activities-working-verified.png');

    // Step 5: Test session expiration & auto-redirect
    console.log('5. Testing session expiration handling...');
    await page.evaluate(() => {
      // Corrupt session with an invalid token
      localStorage.setItem('digitechzo_auth_session', JSON.stringify({
        user: { id: 'fake', name: 'Tester', email: 'tester@test.com', role: 'ADMIN' },
        accessToken: 'expired-invalid-token-12345',
        refreshToken: 'invalid-refresh-12345'
      }));
    });

    // Reload activities page with invalid session
    console.log('   Reloading /activities with invalid token...');
    await page.goto('http://localhost:5173/activities', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));

    const finalUrl = page.url();
    console.log('   Final URL after invalid token:', finalUrl);
    const finalBodyText = await page.evaluate(() => document.body.innerText);
    const redirectedToLogin = finalUrl.includes('/login');
    const showedExpiredNotice = finalBodyText.includes('Your session has expired');

    console.log('   - Redirected to login:', redirectedToLogin);
    console.log('   - Showed expired notice on login:', showedExpiredNotice);

    await page.screenshot({ path: 'session-expired-redirect-verified.png' });
    console.log('   Screenshot saved as session-expired-redirect-verified.png');

    if (!hasError && hasActivities && (redirectedToLogin || showedExpiredNotice)) {
      console.log('SUCCESS: All activities and session expired handling tests passed perfectly!');
    } else {
      console.log('Partial test results:', { hasError, hasActivities, redirectedToLogin, showedExpiredNotice });
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
}

testActivitiesFlow();
