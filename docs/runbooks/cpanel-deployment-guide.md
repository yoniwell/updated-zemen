# cPanel Deployment Guide (Frontend + Backend + MySQL)

This guide covers a production deployment of this monorepo to a cPanel host.

## 1) Target Architecture

- Frontend (Vite static build) hosted in cPanel `public_html`.
- Backend (Node.js + Express) hosted via cPanel "Setup Node.js App".
- MySQL database created in cPanel.

Recommended domains:
- Frontend: `https://app.example.com` (or main domain)
- Backend API: `https://api.example.com`

## 2) Prerequisites

- cPanel account with:
  - MySQL Database Wizard access
  - Setup Node.js App access
  - File Manager or SSH/SFTP access
- Node.js version supported by your cPanel host (18+ recommended)

## 3) Create Production Database in cPanel

1. Open cPanel -> MySQL Database Wizard.
2. Create database (example: `cpaneluser_zemen`).
3. Create database user (example: `cpaneluser_zemenapp`).
4. Assign user to database with all privileges.
5. Note these values for backend env:
   - DB host (usually `localhost`)
   - DB name
   - DB user
   - DB password

## 4) Backend Deployment (Node.js App)

### 4.1 Upload backend code

Upload the `backend` directory to your app root, for example:

`/home/<cpanel-user>/apps/zemen-backend`

### 4.2 Create Node app in cPanel

1. cPanel -> Setup Node.js App -> Create Application.
2. Select Node version.
3. Set Application root to your backend folder.
4. Set Application URL to API domain/subdomain.
5. Set Application startup file to `dist/index.js`.

### 4.3 Configure backend environment variables

Use cPanel environment settings or `.env` in backend app root.

Minimum required values:

- `NODE_ENV=production`
- `PORT` (use cPanel assigned/app port behavior)
- `DATABASE_URL=mysql://<db_user>:<db_password>@<db_host>:3306/<db_name>`
- `MYSQL_MIGRATION_URL` same value as `DATABASE_URL`
- Prefer appending `?connection_limit=1&pool_timeout=30` on shared hosting MySQL to avoid prepared statement exhaustion.
- `PRISMA_CONNECTION_LIMIT=1`
- `PRISMA_POOL_TIMEOUT_SECONDS=30`
- `JWT_SECRET=<strong-random-secret>`
- `CORS_ORIGIN=https://app.example.com`
- `COOKIE_SAME_SITE=strict`
- `ADMIN_INVITE_BASE_URL=https://app.example.com/admin/login`
- `UPLOAD_DIR=./uploads`

If frontend is on apex domain and backend is on subdomain, also set:

- `COOKIE_DOMAIN=.example.com`

Optional email settings:

- `EMAIL_ENABLED=true`
- `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`

Operational toggles for constrained shared hosting:

- `BACKGROUND_QUEUE_ENABLED=false` (recommended unless background export queue is required)
- `BACKGROUND_QUEUE_PAUSE_MS=600000`

Gmail automation notes:

1. Enable 2-Step Verification on the Gmail account.
2. Generate an App Password in Google Account security settings.
3. Use that App Password as `EMAIL_PASS` (not your normal Gmail password).
4. Keep `EMAIL_SMTP_HOST=smtp.gmail.com` and `EMAIL_SMTP_PORT=465` unless your provider requires override.

### 4.4 Install, build, and migrate backend

From backend app root:

1. `npm ci`
2. `npm run build:deploy`
3. `npm run db:migrate:deploy`

If this is first deployment and you rely on baseline SQL flow:

1. `npm run db:apply:mysql-baseline`
2. `npm run db:verify:mysql-baseline`
3. `npm run db:migrate:deploy`

Then restart the Node app from cPanel.

### 4.5 Verify backend health

Open:

`https://api.example.com/api/health`

Expected JSON includes `status: "ok"`.

## 5) Frontend Deployment (Static Vite Build)

### 5.1 Build frontend with production API URL

In your local machine (repository root):

1. Create production env file in `frontend`:
   - `VITE_API_BASE_URL=https://api.example.com`
2. Build:
   - `npm --prefix frontend ci`
   - `npm --prefix frontend run build`

Build output is in `frontend/dist`.

### 5.2 Upload frontend build to cPanel

1. Open cPanel File Manager.
2. Upload contents of `frontend/dist` to `public_html` (or app domain document root).
3. Ensure `index.html` is in the root of that document root.

### 5.3 Add SPA fallback `.htaccess`

Create/update `.htaccess` in frontend document root:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

## 6) Post-Deployment Checklist

1. Frontend loads successfully.
2. Admin login works.
3. Backend health endpoint is `ok`.
4. CORS is correct (no browser CORS errors).
5. File upload works and files are written under backend `UPLOAD_DIR`.
6. Key flows pass: auth, membership apply, loan apply, status check, admin queues.

## 7) Common cPanel Issues

- App starts but API returns 500:
  - Check missing env vars (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_INVITE_BASE_URL`).
  - If logs show `max_prepared_stmt_count` (MySQL 1461), reduce Prisma pool pressure:
    - set URL query params `connection_limit=1&pool_timeout=30`
    - set `PRISMA_CONNECTION_LIMIT=1`
    - temporarily set `BACKGROUND_QUEUE_ENABLED=false`
    - stop and start the Node app (full stop/start, not hot reload)
- Prisma migration command fails:
  - Ensure MySQL credentials are valid and database user has full privileges.
- Frontend opens but calls localhost API:
  - Rebuild frontend with `VITE_API_BASE_URL` set to production API domain.
- SPA routes return 404 on refresh:
  - Missing `.htaccess` rewrite rules.

## 8) Rollback Strategy

1. Keep previous frontend build archive.
2. Keep previous backend release folder.
3. Backup database before migration.
4. Roll back by restoring previous frontend files, previous backend build, and database snapshot if required.
