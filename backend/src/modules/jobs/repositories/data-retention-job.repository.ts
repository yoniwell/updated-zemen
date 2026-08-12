import prisma from '../../../config/database';

export class DataRetentionJobRepository {
  async cleanupNotifications(dateThreshold: Date) {
    return prisma.notificationEvent.deleteMany({
      where: {
        createdAt: { lt: dateThreshold },
      },
    });
  }

  async cleanupSecurityEvents(dateThreshold: Date) {
    return prisma.securityEventLog.deleteMany({
      where: {
        createdAt: { lt: dateThreshold },
      },
    });
  }

  async cleanupAuditLogs(dateThreshold: Date) {
    return prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: dateThreshold },
      },
    });
  }

  async cleanupAuthSessions(dateThreshold: Date) {
    return prisma.authSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { createdAt: { lt: dateThreshold } },
        ],
      },
    });
  }
}

export const dataRetentionJobRepository = new DataRetentionJobRepository();
