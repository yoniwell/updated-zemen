import prisma from '../../../config/database';

export class AuditIntegrityRepository {
  async getAuditLogsBatch(skip: number, take: number) {
    return prisma.auditLog.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        userId: true,
        action: true,
        targetType: true,
        targetId: true,
        details: true,
        ipAddress: true,
        createdAt: true,
      },
      skip,
      take,
    });
  }

  async getSystemSettings(keys: string[]) {
    return prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });
  }

  async upsertSystemSetting(key: string, value: string) {
    return prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

export const auditIntegrityRepository = new AuditIntegrityRepository();
