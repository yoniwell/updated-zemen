export const adminReleaseChecklist = [
  'Backend build and tests are green',
  'Frontend typecheck and lint are green',
  'DB migrations applied and validated',
  'Security controls verified (CSRF/rate-limit/headers)',
  'Audit integrity verification passed',
  'Environment drift check status is HEALTHY',
  'SLO and alert dashboards are operational',
  'Rollback plan reviewed and approved',
] as const;
