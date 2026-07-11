import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { logger } from '../utils/logger';

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
    await prisma.$executeRawUnsafe(`
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
    await prisma.$executeRawUnsafe(`
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

    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS operational_alerts_created_at_idx ON operational_alerts ("createdAt")'
    );

    await prisma.$executeRawUnsafe(
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

    await prisma.operationalAlert.create({
      data: {
        id: randomUUID(),
        severity: params.severity,
        source: params.source,
        message: params.message,
        requestId: params.requestId || null,
        details: (params.details || {}) as Prisma.InputJsonValue,
        status: 'OPEN',
      },
    });
  } catch (error) {
    logger.errorWithException('capture_operational_alert_failed', error, {
      source: params.source,
      severity: params.severity,
    });
  }
};

export const getOperationalAlerts = async (): Promise<{
  asOf: string;
  summary: { openCritical: number; openWarning: number; openInfo: number };
  alerts: Array<{ id: string; createdAt: string; severity: string; source: string; message: string; requestId: string | null; status: string }>;
}> => {
  await ensureOperationalAlertsTable();

  const [openCritical, openWarning, openInfo, rows] = await Promise.all([
    prisma.operationalAlert.count({ where: { status: 'OPEN', severity: 'CRITICAL' } }),
    prisma.operationalAlert.count({ where: { status: 'OPEN', severity: 'WARNING' } }),
    prisma.operationalAlert.count({ where: { status: 'OPEN', severity: 'INFO' } }),
    prisma.operationalAlert.findMany({
      select: {
        id: true,
        createdAt: true,
        severity: true,
        source: true,
        message: true,
        requestId: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    }),
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
