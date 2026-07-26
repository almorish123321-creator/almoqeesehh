/* Start a stable Node http server to serve the bot's static files */
const http = require('http');
const fs = require('fs');
const path = require('path');

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
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/' || urlPath === '') urlPath = '/inquiry.html';
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      // Try as directory with index.html
      const idx = path.join(filePath, 'index.html');
      if (fs.existsSync(idx)) {
        const stream = fs.createReadStream(idx);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        stream.pipe(res);
        return;
      }
      res.writeHead(404);
      res.end('Not Found');
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

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Bot static server running at http://127.0.0.1:${PORT}/`);
});

// Keep process alive
process.on('SIGINT', () => { server.close(); process.exit(0); });
