# СберМедИИ — Тренажёр для врачей

Веб-интерфейс чата с AI-агентом в стилистике Сбера для симулятора врача.  
Подключается к backend-у на FastAPI ([simulator_for_doctors_FASTAPI](../simulator_for_doctors_FASTAPI-main)).

## 🚀 Быстрый старт

### Вариант 1 — Просто открыть (без backend)
Откройте `public/index.html` в браузере — всё работает в demo-режиме.

### Вариант 2 — С backend (FastAPI)
```bash
# 1. Клонируйте репозиторий
git clone https://github.com/YOUR_USERNAME/sber-med-chat.git
cd sber-med-chat

# 2. Установите зависимости
npm install

# 3. Запустите dev-сервер
npm run dev
```

Откройте http://localhost:3000

### Вариант 3 — Docker
```bash
docker-compose up --build
```

## 🌐 Деплой

### GitHub Pages (бесплатно, без backend)
```bash
npm run deploy
```

### Vercel (рекомендуется)
```bash
npx vercel --prod
```

### VPS / сервер
```bash
npm run build
# загрузите папку dist/ на сервер
```

## 📁 Структура
```
sber-med-chat/
├── public/
│   └── index.html        # Главная страница (standalone)
├── src/
│   ├── api.js            # Клиент к FastAPI backend
│   └── config.js         # Конфигурация
├── .github/
│   └── workflows/
│       └── deploy.yml    # Auto-deploy на GitHub Pages
├── docker-compose.yml
├── nginx.conf
└── package.json
```

## ⚙️ Конфигурация

Создайте `.env` файл:
```env
VITE_API_URL=http://localhost:8000
VITE_API_PREFIX=/api/v1
```

## 🔗 Связанные проекты
- [bot_service](../bot_service-main) — Telegram-бот
- [simulator_for_doctors_FASTAPI](../simulator_for_doctors_FASTAPI-main) — Backend API
