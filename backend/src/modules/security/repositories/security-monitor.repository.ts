import prisma from '../../../config/database';

export class SecurityMonitorRepository {
  async recordEvent(
    endpoint: string,
    eventType: string,
    ipAddress?: string,
    details?: string
  ) {
    return prisma.securityEventLog.create({
      data: {
        endpoint,
        eventType,
        ipAddress,
        details,
      },
    });
  }

  async cleanupEvents(threshold: Date) {
    return prisma.securityEventLog.deleteMany({
      where: {
        createdAt: { lt: threshold },
      },
    });
  }

  async countTotalEventsSince(threshold: Date) {
    return prisma.securityEventLog.count({
      where: { createdAt: { gte: threshold } },
    });
  }

  async countEndpointEventsSince(endpoint: string, threshold: Date) {
    return prisma.securityEventLog.count({
      where: { endpoint, createdAt: { gte: threshold } },
    });
  }

  async countTypeEventsSince(eventType: string, threshold: Date) {
    return prisma.securityEventLog.count({
      where: { eventType, createdAt: { gte: threshold } },
    });
  }

  async listRecentEventsSince(threshold: Date, limit: number) {
    return prisma.securityEventLog.findMany({
      where: { createdAt: { gte: threshold } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const securityMonitorRepository = new SecurityMonitorRepository();
