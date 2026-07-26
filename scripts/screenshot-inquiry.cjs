// Use playwright to screenshot the inquiry page for visual verification
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/inquiries/slenquiry', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/inquiry-screenshot.png', fullPage: true });
  console.log('Screenshot saved to /tmp/inquiry-screenshot.png');

  // Also test the search flow
  await page.fill('input[name="service_code"]', 'GSL20266838194');
  await page.fill('input[name="national_id"]', '1122923749');
  await page.screenshot({ path: '/tmp/inquiry-filled.png', fullPage: true });
  console.log('Filled screenshot saved.');

  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/inquiry-results.png', fullPage: true });
  console.log('Results screenshot saved.');

  await browser.close();
})();
