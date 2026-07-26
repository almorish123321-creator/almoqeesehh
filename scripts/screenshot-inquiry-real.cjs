// Screenshot with the actual local record that exists
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1200 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/inquiries/slenquiry', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Fill the form with a real record
  await page.fill('input[name="service_code"]', 'GSL20261085883');
  await page.fill('input[name="national_id"]', '1122923749');
  await page.screenshot({ path: '/tmp/inquiry-filled-real.png', fullPage: true });

  // Submit
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/inquiry-results-real.png', fullPage: true });
  console.log('Real results screenshot saved.');

  await browser.close();
})();
