import { randomUUID } from 'crypto';
import { logger } from '../../../common/utils/logger';
import { operationalAlertRepository } from '../repositories/operational-alert.repository';

let isEnsured = false;

const isMySqlDatabase = (): boolean => {
  const url = (process.env.DATABASE_URL || '').toLowerCase();
  return url.startsWith('mysql://') || url.startsWith('mysqls://');
};

const ensureOperationalAlertsTable = async (): Promise<void> => {
  if (isEnsured) {
    return;
  }

  if (isMySqlDatabase()) {
    await operationalAlertRepository.executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS operational_alerts (
        id CHAR(36) PRIMARY KEY,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        severity VARCHAR(16) NOT NULL,
        source VARCHAR(191) NOT NULL,
        message TEXT NOT NULL,
        \`requestId\` VARCHAR(191) NULL,
        details JSON NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
        INDEX operational_alerts_created_at_idx (\`createdAt\`),
        INDEX operational_alerts_status_severity_idx (status, severity)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } else {
    await operationalAlertRepository.executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS operational_alerts (
        id UUID PRIMARY KEY,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        severity TEXT NOT NULL,
        source TEXT NOT NULL,
        message TEXT NOT NULL,
        "requestId" TEXT,
        details JSONB,
        status TEXT NOT NULL DEFAULT 'OPEN'
      )
    `);

    await operationalAlertRepository.executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS operational_alerts_created_at_idx ON operational_alerts ("createdAt")'
    );

    await operationalAlertRepository.executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS operational_alerts_status_severity_idx ON operational_alerts (status, severity)'
    );
  }

  isEnsured = true;
};

export const captureOperationalAlert = async (params: {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  source: string;
  message: string;
  requestId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> => {
  try {
    await ensureOperationalAlertsTable();

    await operationalAlertRepository.createAlert(
      randomUUID(),
      params.severity,
      params.source,
      params.message,
      params.requestId || null,
      params.details || {}
    );
  } catch (error) {
    logger.error({
      err: error,
      source: params.source,
      severity: params.severity,
    }, 'capture_operational_alert_failed');
  }
};

export const getOperationalAlerts = async (): Promise<{
  asOf: string;
  summary: { openCritical: number; openWarning: number; openInfo: number };
  alerts: Array<{ id: string; createdAt: string; severity: string; source: string; message: string; requestId: string | null; status: string }>;
}> => {
  await ensureOperationalAlertsTable();

  const [openCritical, openWarning, openInfo, rows] = await Promise.all([
    operationalAlertRepository.countAlerts('CRITICAL', 'OPEN'),
    operationalAlertRepository.countAlerts('WARNING', 'OPEN'),
    operationalAlertRepository.countAlerts('INFO', 'OPEN'),
    operationalAlertRepository.listRecentAlerts(50),
  ]);

  return {
    asOf: new Date().toISOString(),
    summary: {
      openCritical,
      openWarning,
      openInfo,
    },
    alerts: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      severity: row.severity,
      source: row.source,
      message: row.message,
      requestId: row.requestId,
      status: row.status,
    })),
  };
};
