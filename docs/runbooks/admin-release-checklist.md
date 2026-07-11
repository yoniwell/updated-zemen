# Admin Release Checklist and Staged Rollout Policy

## Stage 0: Pre-Release Validation
1. Backend build and tests pass.
2. Frontend typecheck and lint pass.
3. DB migrations validated in staging.
4. Security controls (CSRF, rate limits, lockout, headers) verified.
5. Audit integrity verification returns success.

## Stage 1: Internal Rollout (10%)
1. Enable new feature flags only for internal admin group.
2. Monitor:
- Error alerts
- SLO score
- Background queue failures
3. Keep rollback ready for 24 hours.

## Stage 2: Branch Manager Rollout (50%)
1. Expand feature flags to branch managers.
2. Validate branch-scoped permissions and data masking.
3. Confirm no spike in policy exceptions.

## Stage 3: Full Rollout (100%)
1. Enable for all target roles.
2. Announce release notes and operational updates.
3. Archive deployment metadata and checklist in release ticket.

## Rollback Triggers
1. Critical alert volume exceeds threshold.
2. SLO status becomes `BREACHED` for more than 30 minutes.
3. Queue failures exceed 10 failed jobs in one hour.
4. Permission regression blocks core workflows.
