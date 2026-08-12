import prisma from '../../../config/database';

export class FeatureFlagRepository {
  async getSettingsWithPrefix(prefix: string) {
    return prisma.systemSetting.findMany({
      where: {
        key: { startsWith: prefix },
      },
      select: { key: true, value: true },
    });
  }

  async upsertSetting(key: string, value: string) {
    return prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

export const featureFlagRepository = new FeatureFlagRepository();
