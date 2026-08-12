import { Prisma } from '@prisma/client';
import prisma from '../../../config/database';

export class BackgroundJobQueueRepository {
  async executeRawUnsafe(query: string): Promise<void> {
    await prisma.$executeRawUnsafe(query);
  }

  async enqueueJob(
    type: string,
    payload: Record<string, unknown>,
    runAt: Date,
    createdBy: string | null
  ) {
    return prisma.backgroundJobQueue.create({
      data: {
        type,
        payload: payload as Prisma.InputJsonValue,
        status: 'PENDING',
        attempts: 0,
        maxAttempts: 5,
        runAt,
        createdBy,
      },
      select: { id: true },
    });
  }

  async pickNextJob() {
    return prisma.$transaction(async (tx) => {
      const candidate = await tx.backgroundJobQueue.findFirst({
        where: {
          status: { in: ['PENDING', 'RETRY'] },
          runAt: { lte: new Date() },
        },
        orderBy: [{ runAt: 'asc' }, { createdAt: 'asc' }],
      });

      if (!candidate) {
        return null;
      }

      const claimed = await tx.backgroundJobQueue.updateMany({
        where: {
          id: candidate.id,
          status: { in: ['PENDING', 'RETRY'] },
        },
        data: {
          status: 'RUNNING',
          attempts: { increment: 1 },
        },
      });

      if (claimed.count === 0) {
        return null;
      }

      return tx.backgroundJobQueue.findUnique({ where: { id: candidate.id } });
    });
  }

  async markCompleted(id: string): Promise<void> {
    await prisma.backgroundJobQueue.update({
      where: { id },
      data: {
        status: 'DONE',
        finishedAt: new Date(),
        lastError: null,
      },
    });
  }

  async markFailed(id: string, shouldRetry: boolean, runAt: Date, message: string): Promise<void> {
    await prisma.backgroundJobQueue.update({
      where: { id },
      data: {
        status: shouldRetry ? 'RETRY' : 'FAILED',
        runAt,
        finishedAt: shouldRetry ? null : new Date(),
        lastError: message.slice(0, 1000),
      },
    });
  }

  async countAuditLogs(): Promise<number> {
    return prisma.auditLog.count();
  }

  async createNotificationEvent(data: any): Promise<void> {
    await prisma.notificationEvent.create({ data });
  }

  async listJobs(limit: number) {
    return prisma.backgroundJobQueue.findMany({
      select: {
        id: true,
        type: true,
        status: true,
        attempts: true,
        createdAt: true,
        finishedAt: true,
        lastError: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const backgroundJobQueueRepository = new BackgroundJobQueueRepository();
