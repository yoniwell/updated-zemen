import { prisma } from '../../../database/prisma';
import { Prisma } from '@prisma/client';

export class ContentRepository {
  // Generic CRUD for CMS entities
  
  async findMany(model: any, args: any = {}) {
    return model.findMany({
      orderBy: { createdAt: 'desc' },
      ...args
    });
  }

  async findById(model: any, id: string) {
    return model.findUnique({ where: { id } });
  }

  async create(model: any, data: any) {
    return model.create({ data });
  }

  async update(model: any, id: string, data: any) {
    return model.update({ where: { id }, data });
  }

  async delete(model: any, id: string) {
    return model.delete({ where: { id } });
  }

  getModel(modelName: string) {
    let prismaModelName = modelName;
    const normalized = modelName.toLowerCase();

    if (normalized === 'faq' || normalized === 'faqs') prismaModelName = 'cmsFaq';
    else if (normalized === 'service' || normalized === 'services') prismaModelName = 'cmsService';
    else if (normalized === 'saving' || normalized === 'savings') prismaModelName = 'cmsSaving';
    else if (normalized === 'announcement' || normalized === 'announcements') prismaModelName = 'cmsAnnouncement';
    else if (normalized === 'loan-product' || normalized === 'loan-products') prismaModelName = 'cmsLoanProduct';
    else if (normalized === 'branch' || normalized === 'branches') prismaModelName = 'branch';

    const model = (prisma as any)[prismaModelName];
    if (!model) {
        throw new Error(`Prisma model for ${modelName} (${prismaModelName}) not found`);
    }
    return model;
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
