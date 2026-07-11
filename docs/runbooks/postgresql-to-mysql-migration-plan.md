# PostgreSQL to MySQL Migration Plan

## 1) Objective
Migrate the backend database from PostgreSQL to MySQL across schema, application queries, local development tooling, tests, and operational runbooks with controlled risk and clear rollback points.

This plan is designed for high reliability, but no migration can be guaranteed 100% error-free without staged verification. The goal is near-zero defects through strict quality gates and rollback readiness.

## 2) Scope
In scope:
- Prisma datasource/provider migration from PostgreSQL to MySQL.
- SQL compatibility refactor for all PostgreSQL-specific raw SQL.
- Migration strategy for schema and data.
- Local/dev environment script updates.
- CI, testing, and cutover/rollback procedures.

Out of scope:
- Frontend feature changes not related to DB behavior.
- Product behavior changes unrelated to database compatibility.

## 3) Current-State Findings (From Code Scan)
High-impact coupling to PostgreSQL exists in:
- Prisma provider and migration SQL history.
- Raw SQL in backend routes/services using PostgreSQL-specific syntax.
- Local startup scripts that start a local PostgreSQL cluster.
- Environment configuration currently using postgresql:// connection URL.

Most critical PostgreSQL-only patterns found:
- Data types: JSONB, TIMESTAMPTZ, UUID.
- Syntax: ::jsonb, ::text, ::uuid, ON CONFLICT, RETURNING, ANY($1), INTERVAL literals.
- Query locking/worker pattern: FOR UPDATE SKIP LOCKED.
- Positional placeholders: $1, $2 (MySQL commonly uses ? in raw SQL).

## 4) Migration Strategy
Recommended approach: Prisma-first with staged cutover.

1. Freeze DB-affecting feature work in a dedicated migration branch.
2. Prepare MySQL schema baseline from Prisma.
3. Refactor all PostgreSQL-specific raw SQL to Prisma ORM or MySQL-compatible SQL.
4. Run full test suite + data parity checks.
5. Perform controlled cutover with rollback plan.

Why this strategy:
- Reduces risk from direct SQL dialect differences.
- Keeps schema source-of-truth in Prisma.
- Enables incremental verification and safer rollback.

## 5) Phase Plan

### Phase 0: Safety, Branching, and Baseline (Day 0-1)
Tasks:
- Create branch: db/mysql-migration.
- Capture baseline test and runtime state on PostgreSQL:
  - frontend lint/build/tests
  - backend build/tests
  - health endpoint checks
- Record baseline dataset metrics:
  - row counts per table
  - key uniqueness checks
  - sample reference numbers/status flows
- Backup strategy:
  - full PostgreSQL dump
  - verified restore dry-run to separate DB

Exit gate:
- Baseline report saved.
- Restore drill proven.
- No active DB schema changes pending in other branches.

### Phase 1: Prisma Foundation for MySQL (Day 1)
Tasks:
- Update datasource provider in Prisma schema:
  - provider = "mysql"
- Review Prisma field mappings:
  - UUID string IDs: enforce consistent storage strategy (recommended @db.Char(36) for IDs if strict format required).
  - JSON fields: map to MySQL JSON.
  - DateTime fields: validate timezone handling and precision.
- Decide migration history strategy:
  Option A (recommended for clean MySQL start):
  - Keep PostgreSQL migration files archived as history.
  - Generate new MySQL baseline migration.
  Option B:
  - Maintain dual migration tracks (more complex, higher maintenance risk).

Exit gate:
- Prisma generate succeeds.
- Prisma migrate/db push succeeds against empty MySQL database.
- Prisma client CRUD smoke passes.

### Phase 2: SQL Dialect Refactor (Day 2-4)
Tasks:
- Refactor all raw SQL in backend to MySQL-compatible behavior.
- Prefer Prisma Client APIs where possible to remove dialect risk.
- For unavoidable raw SQL, use MySQL-safe syntax and parameter binding.

Priority 1 files (highest risk):
- backend/src/routes/notification.routes.ts
- backend/src/routes/report.routes.ts
- backend/src/services/background-job-queue.service.ts
- backend/src/routes/content.routes.ts
- backend/src/routes/public-content.routes.ts
- backend/src/routes/audit.routes.ts
- backend/src/services/operational-alert.service.ts
- backend/src/routes/settings.routes.ts

Dialect conversion rules:
- JSONB -> JSON
- TIMESTAMPTZ -> DATETIME(3) or TIMESTAMP(3) (choose one project-wide)
- UUID type -> CHAR(36) or BINARY(16)
- $1, $2 placeholders -> MySQL-compatible binding strategy
- ::type casts -> CAST(... AS ...)
- ON CONFLICT -> INSERT ... ON DUPLICATE KEY UPDATE
- RETURNING -> follow-up SELECT or ORM create return object
- ANY($1) -> IN (...) with safe parameter expansion
- NOW() - INTERVAL '2 hours' -> DATE_SUB(NOW(), INTERVAL 2 HOUR)
- FOR UPDATE SKIP LOCKED -> MySQL 8+ equivalent; validate exact lock behavior in queue worker

Exit gate:
- No PostgreSQL-specific SQL remains in backend runtime paths.
- Worker queue behavior tested for concurrency and retries.

### Phase 3: Local Dev and Environment Migration (Day 4)
Tasks:
- Replace PostgreSQL local startup/shutdown logic:
  - start-local-dev.ps1
  - stop-local-dev.ps1
- Recommended: use MySQL Docker container for consistent onboarding.
- Update environment templates and values:
  - DATABASE_URL from postgresql://... to mysql://...
- Validate admin startup scripts and seed flow.

Exit gate:
- One-command local startup works with MySQL.
- Seed script runs successfully on fresh MySQL instance.

### Phase 4: Data Migration (If Existing Data Must Be Preserved) (Day 4-5)
Tasks:
- Freeze writes during migration window.
- Export PostgreSQL data in dependency order.
- Transform and import into MySQL preserving:
  - IDs
  - foreign keys
  - statuses and timestamps
- Rebuild indexes and verify constraints.

Validation checks:
- Row count parity per table.
- Referential integrity validation.
- Enum/status distribution parity.
- Sampling checks on applications/documents/audit trail.

Exit gate:
- Data parity checklist signed off.
- Key business flows match baseline outputs.

### Phase 5: Verification and Hardening (Day 5-6)
Tasks:
- Execute full automated test matrix:
  - frontend: lint, build, test
  - backend: build, test, integration smoke
- Run API smoke tests for:
  - auth, membership, loan, documents, notifications, reports, content, settings, audit
- Performance and lock behavior checks:
  - queue worker throughput
  - report queries
- Validate logs/alerts and operational dashboards.

Exit gate:
- All tests pass.
- No critical or high defects open.
- p95 latency within accepted threshold.

### Phase 6: Cutover and Rollback Readiness (Day 6)
Tasks:
- Prepare release checklist with go/no-go criteria.
- Backup PostgreSQL one final time.
- Point app to MySQL DATABASE_URL.
- Run post-cutover smoke suite immediately.
- Monitor for 24 hours with elevated logging.

Rollback plan:
- Trigger rollback on critical criteria (auth failure, data inconsistency, queue deadlock, major API regression).
- Repoint app to PostgreSQL.
- Restore from last verified backup if writes occurred during failed cutover.
- Publish incident summary and corrective actions.

## 6) Detailed Implementation Backlog by Area

### A) Prisma and Schema
- backend/prisma/schema.prisma
  - provider switch to mysql
  - validate JSON and DateTime mappings
  - optional ID mapping hardening for UUID strings
- backend/prisma/migrations/*
  - archive PostgreSQL-specific migration lineage
  - create new MySQL baseline migration

### B) Backend SQL Refactor
Convert all PostgreSQL-specific raw SQL in:
- backend/src/routes/notification.routes.ts
- backend/src/routes/report.routes.ts
- backend/src/services/background-job-queue.service.ts
- backend/src/routes/content.routes.ts
- backend/src/routes/public-content.routes.ts
- backend/src/routes/audit.routes.ts
- backend/src/services/operational-alert.service.ts
- backend/src/routes/settings.routes.ts
- backend/src/services/audit-integrity-job.service.ts

### C) Tooling and Scripts
- start-local-dev.ps1
- stop-local-dev.ps1
- backend/.env and environment docs

### D) Documentation Updates
Update references from PostgreSQL to MySQL in:
- .github/copilot-instructions.md
- IMPLEMENTATION_PLAN.md
- PHASE_BREAKDOWN.md
- task.md
- relevant runbooks

## 7) Test Plan (Required for Signoff)

Functional:
- Authentication: register/login/session revoke
- Membership and loan create/update/branch scoping
- Document upload/verify/reject flow
- Notifications, schedules, and SLA monitor
- Reports and analytics endpoints
- Settings and audit dashboards

Data:
- Table counts parity
- FK integrity checks
- Enum/status parity
- Timestamp sanity checks (timezone and precision)

Non-functional:
- Build and type checks clean
- No SQL syntax/runtime errors under MySQL
- Queue worker lock/retry behavior stable

## 8) Risks and Mitigations
Risk: Raw SQL dialect mismatch causes runtime failures.
Mitigation: Replace with Prisma ORM first; keep raw SQL only where necessary.

Risk: Data drift during migration window.
Mitigation: Write freeze + final delta sync + parity checks.

Risk: Lock semantics differ for queue worker.
Mitigation: Explicit concurrency tests for worker pick/ack/retry path.

Risk: Hidden PostgreSQL assumptions in tests.
Mitigation: Run full backend integration tests on MySQL in CI before cutover.

## 9) Recommended Implementation Sequence (Next Step)
1. Implement Phase 1 (Prisma provider + MySQL baseline) in code.
2. Refactor highest-risk SQL files first (notification, report, background queue).
3. Update local dev scripts and env.
4. Run full test matrix.
5. Execute data migration dry-run.
6. Perform controlled cutover.

## 10) Definition of Done
Migration is complete when:
- Application runs entirely on MySQL in dev/test/prod.
- No PostgreSQL-specific syntax remains in active backend code paths.
- Full automated checks pass.
- Data parity validation is approved.
- Cutover/rollback drills are documented and proven.

## 11) Implemented Automation (Option 1)
The following scripts are implemented to support data-preserving migration:

- `npm --prefix backend run db:migrate:pg-to-mysql`
  - Copies data from PostgreSQL to MySQL table-by-table.
  - Supports chunking, table filtering, upsert mode, dry-run, and stop-on-error controls.
- `npm --prefix backend run db:verify:pg-mysql-parity`
  - Compares row counts for all migrated tables and fails on mismatch (configurable).

Recommended execution sequence:
1. Configure `POSTGRES_MIGRATION_URL` and `MYSQL_MIGRATION_URL` in backend environment.
2. Prepare empty/synced MySQL schema from Prisma.
3. Run migration script.
4. Run parity verification script.
5. Execute full backend and frontend test matrix before cutover.

## 12) Current Implementation Status
Completed in this iteration:
- Added migration script: `backend/scripts/migrate-pg-to-mysql.ts`
- Added parity verification script: `backend/scripts/verify-pg-mysql-parity.ts`
- Added npm commands in backend package scripts:
  - `db:migrate:pg-to-mysql`
  - `db:verify:pg-mysql-parity`
- Added migration environment variables to `backend/.env.example`
- Added execution checklist runbook: `docs/runbooks/postgresql-to-mysql-execution-checklist.md`
- Switched Prisma datasource provider to `mysql` in `backend/prisma/schema.prisma`
- Generated MySQL baseline migration SQL from schema:
  - `backend/prisma/migrations/20260403200030_mysql_baseline/migration.sql`
- Removed PostgreSQL-specific raw SQL from:
  - `backend/src/routes/settings.routes.ts`
  - `backend/src/services/audit-integrity-job.service.ts`
  - `backend/src/services/background-job-queue.service.ts`
  - `backend/src/services/operational-alert.service.ts`
  - `backend/src/routes/notification.routes.ts` (runtime CRUD/query paths)
  - `backend/src/routes/report.routes.ts` (runtime CRUD/query paths)
  - `backend/src/routes/content.routes.ts` (runtime CRUD/query paths)
  - `backend/src/routes/public-content.routes.ts` (runtime CRUD/query paths)
  - `backend/src/routes/audit.routes.ts` (runtime CRUD/query paths)
- Added Prisma models for notification operations tables:
  - `NotificationTemplate`
  - `NotificationDeliveryTimeline`
  - `NotificationAcknowledgement`
  - `NotificationNoiseControl`
  - `InquiryRoutingRule`
  - `InquiryNotificationMeta`
- Added Prisma model for report scheduling table:
  - `AdminReportSchedule`
- Added Prisma model for audit export trail table:
  - `ExportAuditRecord`
- Added provider-aware (PostgreSQL/MySQL) lazy table initialization fallback in queue/alerts services to prevent missing-table runtime regressions during transition.
- Added provider-aware (PostgreSQL/MySQL) lazy table initialization fallback in notification routes to prevent missing-table runtime regressions during transition.
- Added provider-aware (PostgreSQL/MySQL) lazy table initialization fallback in report routes for schedule table transition safety.
- Added provider-aware (PostgreSQL/MySQL) lazy table initialization fallback in public-content routes for inquiry-routing transition safety.
- Added provider-aware (PostgreSQL/MySQL) lazy table initialization fallback in audit routes for export trail transition safety.
- Migrated local dev scripts (`start-local-dev.ps1`, `stop-local-dev.ps1`) from embedded PostgreSQL cluster management to MySQL container workflow.

Still pending for full MySQL cutover:
- Apply baseline migration and validate schema deployment on target MySQL environment.
- Agent-shell execution blocker observed on 2026-04-03:
  - `localhost:3306` is not listening from this execution environment.
  - Docker CLI is not available in this execution environment (`docker` command not found), so local MySQL container control cannot be performed here.
  - Run baseline apply/verify from a shell where MySQL is reachable, then continue with pg->mysql data migration and parity checks.
