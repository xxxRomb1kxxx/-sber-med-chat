const express = require('express');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = (process.env.API_URL || '').replace(/\/$/, '');

// Proxy /api/* -> backend без срезания пути, обходит CORS
if (API_URL) {
  app.use(createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    pathFilter: '/api',   // только /api/* — путь не срезается
    on: {
      error: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.status(502).json({ error: 'Backend unavailable', detail: err.message });
      },
    },
  }));
  console.log(`Proxy /api/* -> ${API_URL}/api/*`);
}

// Health check
app.get('/health', (req, res) => res.json({ ok: true, api: API_URL || 'not configured' }));

// Serve index.html — inject API flag (теперь фронт всегда шлёт на /api/...)
app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
  // Сообщаем фронту есть ли бэк (для демо-режима)
  html = html.replace('"__API_URL__"', API_URL ? '"proxy"' : '""');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log(`СберМедИИ на порту ${PORT}`));
