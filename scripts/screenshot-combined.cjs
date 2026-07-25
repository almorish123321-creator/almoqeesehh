/* Combined: start static server, run Playwright screenshots, shutdown */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = '/home/z/my-project/alehtiat-almorish/website/public';
const PORT = 8765;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.eot': 'application/vnd.ms-fontobject',
  '.download': 'application/javascript',
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/' || urlPath === '') urlPath = '/inquiry.html';
    // Handle weird paths with parens/special chars already decoded
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end('Not Found: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.writeHead(500);
    res.end('Server Error: ' + e.message);
  }
});

async function main() {
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`Static server on http://127.0.0.1:${PORT}/`);

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // 1. Original bot page - empty form
  console.log('Loading bot original page...');
  await page.goto(`http://127.0.0.1:${PORT}/inquiry.html`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/home/z/my-project/download/compare-bot-empty.png', fullPage: true });

  // Filled form (don't submit, just to see the field states)
  await page.fill('#service_code', 'GSL20266838194');
  await page.fill('#national_id', '1122923749');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/home/z/my-project/download/compare-bot-filled.png', fullPage: true });

  // 2. Our production page
  console.log('Loading our production page...');
  await page.goto('https://almoqeesehh.vercel.app/inquiries/slenquiry', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/home/z/my-project/download/compare-ours-empty.png', fullPage: true });

  await page.fill('input[name="service_code"]', 'GSL20266838194');
  await page.fill('input[name="national_id"]', '1122923749');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/home/z/my-project/download/compare-ours-filled.png', fullPage: true });

  // Submit to show results
  try {
    await page.click('button[type="submit"]', { timeout: 8000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/home/z/my-project/download/compare-ours-results.png', fullPage: true });
  } catch (e) {
    console.log('Submit click failed (continuing):', e.message);
  }

  await browser.close();
  console.log('Done.');
  server.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  server.close();
  process.exit(1);
});
