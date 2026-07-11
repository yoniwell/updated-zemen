# Environment Drift Check Policy

## Objective
Detect configuration drift before it impacts admin workflows, security posture, or compliance reporting.

## Required Checks
Use `GET /api/admin/settings/environment-drift` and verify:
1. No missing required variables.
2. Drift status is `HEALTHY`.
3. Baseline environment hash is tracked for release comparison.

## Required Variables
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `UPLOAD_DIR`
- `AUDIT_LOG_RETENTION_DAYS`
- `NOTIFICATION_RETENTION_DAYS`
- `DATA_RETENTION_INTERVAL_MINUTES`
- `BACKGROUND_QUEUE_POLL_MS`
- `AUDIT_EXPORT_SIGNING_SECRET`

## Enforcement
1. Run drift check before each deployment.
2. Block production rollout on `DRIFT_DETECTED` unless approved by release owner.
3. Record drift output in deployment notes.
