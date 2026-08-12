import { prisma } from '../../../database/prisma';
import { Prisma } from '@prisma/client';

export class SettingsRepository {
  async getSettings(prefix?: string) {
    const where = prefix ? { key: { startsWith: prefix } } : undefined;
    return prisma.systemSetting.findMany({ where });
  }

  async getSetting(key: string) {
    return prisma.systemSetting.findUnique({ where: { key } });
  }

  async setSetting(key: string, value: string) {
    return prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async createAuditLog(data: Omit<Prisma.AuditLogCreateInput, 'user'> & { userId: string }) {
    const { userId, ...rest } = data;
    return prisma.auditLog.create({
      data: {
        ...rest,
        user: { connect: { id: userId } },
      }
    });
  }
}
