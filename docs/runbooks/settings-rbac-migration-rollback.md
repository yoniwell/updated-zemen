# Settings and RBAC Migration/Rollback Runbook

## Scope
Use this runbook for changes to:
- System settings in `system_settings`
- RBAC module overrides (`rbac.modules.*`)
- Feature flags (`feature.*`)

## Pre-Deployment Checklist
1. Export current settings and RBAC state from production.
2. Capture database backup point and migration version.
3. Verify at least one active `SUPER_ADMIN` remains after policy changes.
4. Validate branch-scoped roles still have required branch assignment.

## Migration Steps
1. Apply DB migration:
```bash
cd backend
npm run db:migrate
```
2. Deploy backend.
3. Verify API endpoints:
- `GET /api/admin/settings/system`
- `GET /api/admin/settings/access-control`
- `GET /api/admin/settings/feature-flags`
4. Smoke test critical admin modules (dashboard, queue, reports, audit-log, settings).

## Rollback Steps
1. Revert deployment to previous backend artifact.
2. Restore previous RBAC overrides in `system_settings`:
- Keys with prefix `rbac.modules.`
3. Restore previous feature flags:
- Keys with prefix `feature.`
4. If data migration introduced incompatible schema changes, restore DB backup.

## Post-Change Verification
1. Module authorization tests pass.
2. Login and token refresh flow passes.
3. Admin queues and reports load without permission regressions.
4. Audit logs show expected actions for settings changes.
