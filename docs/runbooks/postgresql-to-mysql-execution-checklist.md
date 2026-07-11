# PostgreSQL to MySQL Execution Checklist (Data-Preserving)

## Purpose
Execute a controlled migration from PostgreSQL to MySQL while preserving data and validating parity before cutover.

## Preconditions
- MySQL 8+ instance is available and reachable.
- PostgreSQL source instance is reachable.
- Prisma MySQL schema baseline has been applied to target MySQL.
- Write traffic freeze window is scheduled (or maintenance mode is enabled).
- Connectivity is verified from the same shell used to run migration commands.

## Environment Setup
Set these variables in backend environment before execution:

- `POSTGRES_MIGRATION_URL`
- `MYSQL_MIGRATION_URL`
- `MIGRATION_CHUNK_SIZE` (recommended: `1000`)
- `MIGRATION_TRUNCATE_TARGET` (`true` only for clean reload)
- `MIGRATION_UPSERT` (`true` for idempotent reruns)
- `MIGRATION_STOP_ON_ERROR` (`true` recommended)
- `MIGRATION_FAIL_ON_MISMATCH` (`true` recommended)

If `MIGRATION_TRUNCATE_TARGET=true`, also set:
- `ALLOW_DESTRUCTIVE_MIGRATION=true`

## Step-by-Step
1. Verify target MySQL connectivity from current shell:
   - `Test-NetConnection -ComputerName localhost -Port 3306`
   - If `TcpTestSucceeded=False`, start local MySQL or point `MYSQL_MIGRATION_URL` to a reachable host before proceeding.
2. Build backend before migration:
   - `npm --prefix backend run build`
3. Apply MySQL baseline schema to target database:
   - `npm --prefix backend run db:apply:mysql-baseline`
4. Verify baseline schema readiness:
   - `npm --prefix backend run db:verify:mysql-baseline`
5. Optional dry-run (no writes):
   - Set `MIGRATION_DRY_RUN=true`
   - `npm --prefix backend run db:migrate:pg-to-mysql`
6. Execute actual copy:
   - Set `MIGRATION_DRY_RUN=false`
   - `npm --prefix backend run db:migrate:pg-to-mysql`
7. Verify row-count parity:
   - `npm --prefix backend run db:verify:pg-mysql-parity`
8. Run full quality checks:
   - `npm --prefix backend run test`
   - `npm --prefix backend run test:smoke`
   - `npm --prefix frontend run lint`
   - `npm --prefix frontend run build`
   - `npm --prefix frontend run test:run`

## Baseline Script Options
- `MYSQL_BASELINE_SQL_PATH`: Optional path to a specific baseline SQL file.
- `MYSQL_BASELINE_MIGRATION_ID`: Optional baseline migration directory name (for example, `20260403200030_mysql_baseline`).
- `MYSQL_BASELINE_FORCE=true`: Force baseline SQL execution even if known tables already exist.

## Failure Handling
- If migration script fails:
  - Fix the reported table/query issue.
  - Re-run migration with `MIGRATION_UPSERT=true`.
- If parity check fails:
  - Re-run migration for mismatched tables only via `MIGRATION_TABLES`.
  - Re-run parity check.
- If cutover smoke fails:
  - Roll back runtime DB connection to PostgreSQL.
  - Keep MySQL data for forensic comparison.

## Scoped Table Rerun Example
Use comma-separated list for targeted retries:

- `MIGRATION_TABLES=membership_applications,loan_applications,documents`

Then run:
- `npm --prefix backend run db:migrate:pg-to-mysql`
- `npm --prefix backend run db:verify:pg-mysql-parity`

## Signoff Criteria
- Migration script exits successfully.
- Parity verification has zero mismatches.
- Backend and frontend quality checks pass.
- Core business flows pass smoke tests (auth, membership, loan, docs, notifications, reports, settings, audit).
