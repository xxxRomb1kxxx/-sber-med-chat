const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = (process.env.API_URL || '').replace(/\/$/, '');

// Proxy /api/* -> backend (pathFilter сохраняет полный путь)
if (API_URL) {
  app.use(createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    pathFilter: '/api',
    on: {
      error: (err, req, res) => {
        console.error(`[proxy] ${req.method} ${req.url} -> ${err.message}`);
        if (!res.headersSent)
          res.status(502).json({ error: 'Backend unavailable', detail: err.message });
      },
      proxyReq: (proxyReq, req) => {
        console.log(`[proxy] ${req.method} ${req.url} -> ${API_URL}${req.url}`);
      },
    },
  }));
}

// ── Инжект HTML ────────────────────────────────────────────────────────────
function serveIndex(req, res) {
  let html = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
  html = html.replace('"__API_URL__"', API_URL ? '"proxy"' : '""');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(html);
}
app.get('/', serveIndex);
app.get('/index.html', serveIndex);   // на случай прямого обращения

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, api: API_URL || 'not configured' }));

// ── Диагностика бэкенда ────────────────────────────────────────────────────
app.get('/debug', async (req, res) => {
  if (!API_URL) return res.json({ configured: false, hint: 'Set API_URL env var' });

  const probe = async (method, path, body) => {
    const url = new URL(API_URL + path);
    const lib = url.protocol === 'https:' ? https : http;
    const postData = body ? JSON.stringify(body) : null;
    return new Promise(resolve => {
      const opts = {
        hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname, method,
        headers: { 'Content-Type': 'application/json', ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}) },
        timeout: 6000,
      };
      const r = lib.request(opts, rsp => {
        let b = '';
        rsp.on('data', d => b += d);
        rsp.on('end', () => resolve({ status: rsp.statusCode, body: b.slice(0, 300) }));
      });
      r.on('error', e => resolve({ error: e.message }));
      r.on('timeout', () => { r.destroy(); resolve({ error: 'timeout' }); });
      if (postData) r.write(postData);
      r.end();
    });
  };

  const [root, startCase] = await Promise.all([
    probe('GET',  '/api/v1/'),
    probe('POST', '/api/v1/cases/start', { user_id: 'debug', disease_type: 'diabetes', mode: 'training' }),
  ]);

  res.json({ api_url: API_URL, root, startCase });
});

// ── Статика ────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.listen(PORT, () => {
  console.log(`СберМедИИ запущен на порту ${PORT}`);
  if (API_URL) console.log(`Proxy /api/* -> ${API_URL}/api/*`);
  else console.log('API_URL не задан — работает демо-режим');
});
