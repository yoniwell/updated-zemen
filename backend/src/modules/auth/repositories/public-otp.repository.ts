import prisma from '../../../config/database';

export class PublicOtpRepository {
  async getSetting(key: string) {
    return prisma.systemSetting.findUnique({ where: { key } });
  }

  async upsertSetting(key: string, value: string): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async updateSetting(key: string, value: string): Promise<void> {
    await prisma.systemSetting.update({
      where: { key },
      data: { value },
    });
  }

  async createSetting(key: string, value: string): Promise<void> {
    await prisma.systemSetting.create({
      data: { key, value },
    });
  }

  async deleteSetting(key: string): Promise<void> {
    await prisma.systemSetting.deleteMany({ where: { key } });
  }
}

export const publicOtpRepository = new PublicOtpRepository();
