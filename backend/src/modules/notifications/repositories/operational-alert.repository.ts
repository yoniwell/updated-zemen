import { Prisma } from '@prisma/client';
import prisma from '../../../config/database';

export class OperationalAlertRepository {
  async executeRawUnsafe(query: string): Promise<void> {
    await prisma.$executeRawUnsafe(query);
  }

  async createAlert(
    id: string,
    severity: string,
    source: string,
    message: string,
    requestId: string | null,
    details: Record<string, unknown>
  ): Promise<void> {
    await prisma.operationalAlert.create({
      data: {
        id,
        severity,
        source,
        message,
        requestId,
        details: details as Prisma.InputJsonValue,
        status: 'OPEN',
      },
    });
  }

  async countAlerts(severity: string, status: string): Promise<number> {
    return prisma.operationalAlert.count({
      where: { status, severity },
    });
  }

  async listRecentAlerts(limit: number) {
    return prisma.operationalAlert.findMany({
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
      take: limit,
    });
  }
}

export const operationalAlertRepository = new OperationalAlertRepository();
