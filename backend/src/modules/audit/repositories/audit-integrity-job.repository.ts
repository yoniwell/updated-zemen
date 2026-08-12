import prisma from '../../../config/database';

export class AuditIntegrityJobRepository {
  async createNotificationEvent(data: {
    status: string;
    title: string;
    recipient: string;
    type: string;
  }): Promise<void> {
    await prisma.notificationEvent.create({
      data,
    });
  }
}

export const auditIntegrityJobRepository = new AuditIntegrityJobRepository();
