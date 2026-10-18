#!/usr/bin/env node
/**
 * Serves frontend/dist on :8080 and proxies /api → backend :3000 (same-origin cookies for screenshots).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.UI_V2_STATIC_PORT || 8080);
const API_HOST = process.env.UI_V2_API_HOST || '127.0.0.1';
const API_PORT = Number(process.env.UI_V2_API_PORT || 3000);
const DIST = path.resolve(__dirname, '../../frontend/dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
}

function proxyToApi(req, res) {
  const headers = { ...req.headers, host: `${API_HOST}:${API_PORT}` };
  const upstream = http.request(
    {
      hostname: API_HOST,
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers,
    },
    (pres) => {
      res.writeHead(pres.statusCode || 500, pres.headers);
      pres.pipe(res);
    },
  );
  upstream.on('error', (err) => {
    res.statusCode = 502;
    res.end(`API proxy error: ${err.message}`);
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  if (urlPath.startsWith('/api')) {
    return proxyToApi(req, res);
  }

  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  if (!filePath.startsWith(DIST)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      return sendFile(res, filePath);
    }
    const index = path.join(DIST, 'index.html');
    if (fs.existsSync(index)) {
      return sendFile(res, index);
    }
    res.statusCode = 404;
    res.end('Not found');
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`UI v2 static server http://127.0.0.1:${PORT} → API ${API_HOST}:${API_PORT}`);
});
