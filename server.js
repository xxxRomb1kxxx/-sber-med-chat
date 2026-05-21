const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = (process.env.API_URL || '').replace(/\/$/, '');

app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
  html = html.replace('"__API_URL__"', JSON.stringify(API_URL));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log(`СберМедИИ запущен на порту ${PORT}`));
