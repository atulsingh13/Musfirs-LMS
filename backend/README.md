# Musafir CRM — Backend

Express 5 + MongoDB API with Socket.io.

## Setup

```bash
cp .env.example .env
npm install
npm run seed:admin   # optional
npm run dev
```

API: http://localhost:5000 — health: `GET /api/health`

## Production

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

Requires `JWT_SECRET` (≥32 chars), `FRONTEND_URL`, and `MONGODB_URI`. See root [README](../README.md).
