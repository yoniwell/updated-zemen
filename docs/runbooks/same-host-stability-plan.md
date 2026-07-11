# Same-Host Stability Plan

## Goal
Keep the backend and admin dashboard working on the same cPanel host, even with MySQL prepared-statement pressure and shared-hosting limits.

This plan focuses on reducing DB pressure, making failure paths non-fatal, and deploying in a strict order so the app can stay usable on the same host.

## Reality Check
A truly zero-error setup cannot be guaranteed on a constrained shared host if MySQL itself is hitting `max_prepared_stmt_count`.

What we can do is:
- reduce the chances of the error,
- stop non-critical jobs from crashing the app,
- keep login and dashboard access usable,
- make the app degrade gracefully when the host is under pressure.

## Root Cause Summary
The current failure pattern is not mainly caused by Prisma being instantiated per request.

The real issues are:
- MySQL prepared-statement exhaustion on the host (`1461`)
- dashboard/auth code paths that read from the DB on every request
- background jobs that also hit the DB repeatedly
- shared-hosting limits that are outside the app code

## What to Change in Code

### 1) Keep Prisma as a singleton
Do not create `new PrismaClient()` inside request handlers.
Use one shared client from `backend/src/config/database.ts`.

### 2) Lower Prisma pressure on MySQL
Use smaller MySQL pool settings in the database URL:
- `connection_limit=1`
- `pool_timeout=30`

Apply the same to:
- `DATABASE_URL`
- `MYSQL_MIGRATION_URL`

### 3) Disable or pause background workers on shared hosting
These jobs should not be allowed to crash the app when the DB is saturated:
- audit integrity verification job
- background export queue worker
- retention jobs if they become noisy

Recommended production toggles:
- `BACKGROUND_QUEUE_ENABLED=false`
- `AUDIT_INTEGRITY_VERIFY_ENABLED=false`
- keep retention intervals large enough to avoid constant churn

### 4) Make login/session writes non-fatal
If refresh-session persistence fails because MySQL is exhausted, login should still succeed.
That means:
- allow login to return token/cookies even if `auth_sessions` write fails
- avoid turning optional persistence into a hard 500

### 5) Make admin auth and module checks degrade gracefully
If the host is saturated and DB reads fail:
- fallback to JWT payload for authentication context when safe
- fallback to built-in module map for authorization when role settings cannot be read

This keeps the dashboard from collapsing just because a lookup failed.

### 6) Reduce unnecessary DB chatter in dashboard routes
Where possible:
- avoid repeated lookups in the same request
- cache static settings in memory for a short TTL
- do not re-read feature flags on every request if they rarely change
- avoid expensive joins unless needed

### 7) Keep only critical DB writes on the hot path
Critical writes:
- login audit
- essential application updates
- real user actions

Non-critical writes that can be softened:
- refresh-session persistence
- background notification events
- audit integrity snapshots
- worker queue bookkeeping

## Recommended Environment Variables
Use these in cPanel:

```env
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://zemensacco.com,https://www.zemensacco.com
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_URL=mysql://user:pass@localhost:3306/dbname?connection_limit=1&pool_timeout=30
MYSQL_MIGRATION_URL=mysql://user:pass@localhost:3306/dbname?connection_limit=1&pool_timeout=30
PRISMA_CONNECTION_LIMIT=1
PRISMA_POOL_TIMEOUT_SECONDS=30
BACKGROUND_QUEUE_ENABLED=false
BACKGROUND_QUEUE_PAUSE_MS=600000
AUDIT_INTEGRITY_VERIFY_ENABLED=false
AUDIT_INTEGRITY_VERIFY_INTERVAL_MINUTES=60
DATA_RETENTION_INTERVAL_MINUTES=1440
NOTIFICATION_RETENTION_DAYS=180
SECURITY_EVENT_RETENTION_DAYS=30
AUTH_SESSION_RETENTION_DAYS=90
COOKIE_SAME_SITE=strict
COOKIE_DOMAIN=.zemensacco.com
ADMIN_INVITE_BASE_URL=https://zemensacco.com/admin/login
UPLOAD_DIR=./uploads
```

## Deployment Order on the Same Host

### Step 1: Upload code
Upload the backend changes first.

### Step 2: Install dependencies with dev packages
Make sure the node environment is activated, then run:

```bash
npm ci --include=dev
```

### Step 3: Build

```bash
npm run build:deploy
```

### Step 4: Stop and start the app
Do a full Stop App -> wait 10 seconds -> Start App.
Do not rely only on a soft restart.

### Step 5: Re-test in this order
1. `/api/health`
2. `/api/auth/login`
3. the admin dashboard pages that were failing before
4. settings, reports, notifications, and CMS routes

## Verification Checklist

### Required checks
- login succeeds
- admin dashboard loads without 500
- settings page opens
- reports page opens
- CMS page opens
- no `PrismaClientUnknownRequestError` in stderr
- no `max_prepared_stmt_count` in stderr
- no background worker crash loop

### Useful smoke tests
```bash
curl -i https://api.zemensacco.com/api/health
curl -i -X POST https://api.zemensacco.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@zemen.com","password":"admin123"}'
```

## If Errors Still Happen

### If you still see MySQL 1461
That means the host is still saturated.
Do these immediately:
- keep `BACKGROUND_QUEUE_ENABLED=false`
- keep `AUDIT_INTEGRITY_VERIFY_ENABLED=false`
- confirm the pool limit is `1`
- restart the app fully
- ask the host to inspect MySQL if possible

### If only some dashboard pages fail
The remaining route likely still does a DB lookup that needs a fallback or caching.
Patch the specific route or middleware, then rebuild.

### If login works but dashboard fails
That usually means:
- login path has been softened successfully
- one of the dashboard route guards still reads DB state too aggressively
- a route handler is doing fresh queries that should be cached or made optional

## Long-Term Clean Solution
If you want the app to be stable on the same host for a long time, the best order is:

1. Keep Prisma singleton usage.
2. Disable noisy background jobs.
3. Add graceful fallbacks for optional DB writes.
4. Add short-lived caching for static settings and role/module config.
5. Use one small connection pool.
6. Move session-heavy or worker-heavy features off the shared host later if traffic grows.

## Recommended Final State
A stable same-host setup should have:
- one Prisma client singleton
- pool limit of 1
- background jobs disabled or heavily throttled
- login and dashboard auth fallbacks
- no critical route depending on optional DB writes
- clear logs that separate app bugs from host-level MySQL saturation

## Conclusion
You can keep this working on the same host, but only by making the app tolerant of host limits.
The app should degrade gracefully when MySQL is under pressure, rather than crashing the entire admin experience.
