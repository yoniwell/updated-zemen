# Zemen SACCO Digital Platform

Monorepo with clear application boundaries:

- `frontend/` - Vite + React + TypeScript public website, portals, and admin UI
- `backend/` - Express + TypeScript + Prisma API

## Project Structure

```text
zemen-digital-trust/
  frontend/
    src/
    public/
    package.json
    vite.config.ts
  backend/
    src/
    prisma/
    package.json
```

## Local Full-Stack Startup (MySQL + Frontend + Backend)

Prerequisites:
- Docker Desktop (or Docker Engine) running
- Node.js + npm installed

Start everything:

```powershell
.\start-local-dev.ps1
```

Stop everything:

```powershell
.\stop-local-dev.ps1
```

The startup script launches a local MySQL container (`zemen-mysql-local`) and starts frontend/backend dev servers.

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

## Run Backend

```bash
cd backend
npm install
npm run dev
```

## Build Checks

```bash
cd frontend
npm run typecheck
npm run lint

cd ../backend
npm run build
```

## Environment

Use these templates:

- `backend/.env.example` for backend/runtime/migration/email configuration
- `frontend/.env.example` for frontend API base URL (`VITE_API_BASE_URL`)

## Deployment (cPanel)

For a full production deployment walkthrough (build, database setup, backend app setup, frontend publish, and validation), see:

- `docs/runbooks/cpanel-deployment-guide.md`
