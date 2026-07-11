import prisma from '../config/database';
import { logger } from '../utils/logger';

const LAST_24_HOURS_MS = 24 * 60 * 60 * 1000;

const getRetentionDays = (name: string, fallback: number): number => {
  const value = Number.parseInt(process.env[name] || '', 10);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
};

let retentionJobStarted = false;

const runRetentionCycle = async (): Promise<void> => {
  const notificationDays = getRetentionDays('NOTIFICATION_RETENTION_DAYS', 180);
  const auditDays = getRetentionDays('AUDIT_LOG_RETENTION_DAYS', 2555);
  const securityDays = getRetentionDays('SECURITY_EVENT_RETENTION_DAYS', 30);
  const sessionDays = getRetentionDays('AUTH_SESSION_RETENTION_DAYS', 90);

  try {
    const [notifications, securityEvents, auditLogs, sessions] = await Promise.all([
      prisma.notificationEvent.deleteMany({
        where: {
          createdAt: { lt: new Date(Date.now() - notificationDays * LAST_24_HOURS_MS) },
        },
      }),
      prisma.securityEventLog.deleteMany({
        where: {
          createdAt: { lt: new Date(Date.now() - securityDays * LAST_24_HOURS_MS) },
        },
      }),
      prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: new Date(Date.now() - auditDays * LAST_24_HOURS_MS) },
        },
      }),
      prisma.authSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { createdAt: { lt: new Date(Date.now() - sessionDays * LAST_24_HOURS_MS) } },
          ],
        },
      }),
    ]);

    logger.info('retention_cycle_completed', {
      notificationsRemoved: notifications.count,
      securityEventsRemoved: securityEvents.count,
      auditLogsRemoved: auditLogs.count,
      sessionsRemoved: sessions.count,
      policyDays: {
        notificationDays,
        securityDays,
        auditDays,
        sessionDays,
      },
    });
  } catch (error) {
    logger.errorWithException('retention_cycle_failed', error);
  }
};

export const startDataRetentionJob = (): void => {
  if (retentionJobStarted) {
    return;
  }

  retentionJobStarted = true;
  void runRetentionCycle();

  const intervalMinutes = Math.max(10, Number.parseInt(process.env.DATA_RETENTION_INTERVAL_MINUTES || '1440', 10) || 1440);
  setInterval(() => {
    void runRetentionCycle();
  }, intervalMinutes * 60 * 1000);
};
