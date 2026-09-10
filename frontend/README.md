# Musafir CRM — Frontend

React 19 + Vite + TypeScript SPA.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Dev server: http://localhost:3000

## Environment

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | yes | Backend API base, e.g. `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | no | Socket.io origin; defaults from `VITE_API_URL` |

These are inlined at **build** time. Rebuild after changing them for production.

## Production

```bash
npm ci
# export VITE_API_URL=https://api.your-domain.com/api
npm run build
```

Serve the `dist/` folder with SPA fallback to `index.html`. See the root [README](../README.md) for full deployment notes.
