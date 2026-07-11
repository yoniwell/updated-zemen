CREATE TABLE IF NOT EXISTS security_event_logs (
  id UUID PRIMARY KEY,
  endpoint TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "ipAddress" TEXT,
  details TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS security_event_logs_endpoint_created_at_idx
  ON security_event_logs (endpoint, "createdAt");

CREATE INDEX IF NOT EXISTS security_event_logs_event_type_created_at_idx
  ON security_event_logs ("eventType", "createdAt");

CREATE TABLE IF NOT EXISTS login_abuse_states (
  email TEXT PRIMARY KEY,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "windowStartAt" TIMESTAMP(3),
  "lockoutUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  "tokenId" TEXT PRIMARY KEY,
  "userId" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY ("userId") REFERENCES admin_users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_revoked_at_expires_at_idx
  ON auth_sessions ("userId", "revokedAt", "expiresAt");
