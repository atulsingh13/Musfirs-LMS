# Musafir CRM (LMS)

Travel CRM with a React (Vite) frontend and Express + MongoDB backend.

## Structure

- `frontend/` — SPA (React 19 + Vite + TypeScript)
- `backend/` — API (Express 5 + MongoDB + Socket.io)

## Prerequisites

- Node.js 20+
- MongoDB (Atlas or self-hosted)
- Linux servers that generate PDF quotations need Chromium dependencies for Puppeteer

## Local development

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env: MONGODB_URI, JWT_SECRET, FRONTEND_URL=http://localhost:3000
npm install
npm run seed:admin   # optional first-time admin
npm run dev          # http://localhost:5000
```

Health check: `GET http://localhost:5000/api/health`

### Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000/api
npm install
npm run dev          # http://localhost:3000
```

## Production deployment

Deploy as **two services**: static frontend + Node API.

### 1. Backend

Set environment variables (see `backend/.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `PORT` | yes | Host-assigned or `5000` |
| `FRONTEND_URL` | yes | Exact SPA origin, e.g. `https://crm.your-domain.com` |
| `JWT_SECRET` | yes | ≥32 random characters (no default in production) |
| `MONGODB_URI` | yes | Atlas or managed Mongo connection string |
| `MONGODB_DB_NAME` | yes | e.g. `musafir_crm` |
| `COOKIE_SAMESITE` | if cross-site | Default `strict`. Use `none` if SPA and API are on different sites |
| `COOKIE_DOMAIN` | optional | e.g. `.your-domain.com` for subdomain cookies |
| `WEBSITE_*` / Meta / Google keys | as needed | Lead webhooks |

Build and run:

```bash
cd backend
npm ci
npm run build
npm start
# or: npm run start:prod
```

Optional: `npm run seed:admin` once — use a strong `SEED_ADMIN_PASSWORD`.

Ensure the host can run Puppeteer (quotation PDFs). On Debian/Ubuntu install Chromium deps, or set `PUPPETEER_EXECUTABLE_PATH` to a system browser.

### 2. Frontend

`VITE_*` values are baked in at **build** time:

```bash
cd frontend
npm ci
# Set production API URL for this build:
#   Windows PowerShell:  $env:VITE_API_URL="https://api.your-domain.com/api"
#   bash:                export VITE_API_URL=https://api.your-domain.com/api
npm run build
```

Serve `frontend/dist/` with any static host (nginx, Cloudflare Pages, S3+CDN, etc.).

**SPA fallback (required on Render):** React Router paths like `/bookings` must serve `index.html`.

Render does **not** honor Netlify `_redirects`. Do one of these:

1. **Static Site (recommended)** — Dashboard → your frontend → **Redirects/Rewrites** → Add:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: **Rewrite** (not Redirect)
   Then save and redeploy.

2. **Or** Web Service instead of Static Site:
   - Build: `npm ci && npm run build`
   - Start: `npm start` (uses `serve -s dist`, SPA-safe)

3. Blueprint: see root `render.yaml` (`routes` rewrite).

Example nginx snippet:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### 3. CORS & cookies

- Set `FRONTEND_URL` to the live SPA origin (no trailing slash mismatch).
- Prefer same-site hosting (e.g. `app.example.com` + `api.example.com`) with default `COOKIE_SAMESITE=strict`.
- If SPA and API are on unrelated domains, set `COOKIE_SAMESITE=none` (cookies are `Secure` automatically).

### 4. Checklist before go-live

- [ ] Strong `JWT_SECRET` and admin password (not seed defaults)
- [ ] `FRONTEND_URL` and `VITE_API_URL` point at production hosts
- [ ] MongoDB network access allows the API host
- [ ] HTTPS on both SPA and API
- [ ] Health endpoint monitored: `/api/health`
- [ ] Puppeteer/Chromium available if quotations are used

## Scripts

| App | Command | Purpose |
|---|---|---|
| frontend | `npm run build` | Typecheck + production bundle → `dist/` |
| frontend | `npm run preview` | Local preview of `dist/` |
| backend | `npm run build` | Compile TypeScript → `dist/` |
| backend | `npm start` | Run compiled API |
| backend | `npm run seed:admin` | Create/update seed administrator |
