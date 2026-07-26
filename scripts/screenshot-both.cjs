/* Screenshot both the bot's original inquiry.html and our production page for visual comparison */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // 1. Original bot page
  console.log('Loading bot original page...');
  await page.goto('http://127.0.0.1:8765/inquiry.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Empty form
  await page.screenshot({ path: '/home/z/my-project/download/compare-bot-empty.png', fullPage: true });

  // Filled form
  await page.fill('#service_code', 'GSL20266838194');
  await page.fill('#national_id', '1122923749');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/home/z/my-project/download/compare-bot-filled.png', fullPage: true });

  // 2. Our production page
  console.log('Loading our production page...');
  await page.goto('https://almoqeesehh.vercel.app/inquiries/slenquiry', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  await page.screenshot({ path: '/home/z/my-project/download/compare-ours-empty.png', fullPage: true });

  await page.fill('input[name="service_code"]', 'GSL20266838194');
  await page.fill('input[name="national_id"]', '1122923749');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/home/z/my-project/download/compare-ours-filled.png', fullPage: true });

  // Submit to show results
  await page.click('button[type="submit"]', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/home/z/my-project/download/compare-ours-results.png', fullPage: true });

  await browser.close();
  console.log('Done.');
})();
