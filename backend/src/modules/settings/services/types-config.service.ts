import { prisma } from '../../../database/prisma';
import { AppError } from '../../../common/errors/AppError';

export class TypesConfigService {
  // Saving Types
  async getAllSavingTypes(includeInactive = false) {
    return prisma.savingTypeConfig.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ name: 'asc' }, { category: 'asc' }],
    });
  }

  async createSavingType(data: { name: string; category?: string | null; isActive?: boolean; minAmount?: number | null; maxAmount?: number | null; membershipFee?: number | null }) {
    const trimmedName = data.name.trim();
    const category = data.category?.trim() || 'Standard';

    const existing = await prisma.savingTypeConfig.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        category: { equals: category, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw new AppError(`A saving type with name "${trimmedName}" and category "${category}" already exists`, 409);
    }

    return prisma.savingTypeConfig.create({
      data: {
        ...data,
        name: trimmedName,
        category,
      },
    });
  }

  async updateSavingType(id: string, data: { name?: string; category?: string | null; isActive?: boolean; minAmount?: number | null; maxAmount?: number | null; membershipFee?: number | null }) {
    if (data.name || data.category !== undefined) {
      const current = await prisma.savingTypeConfig.findUnique({ where: { id } });
      if (!current) throw new AppError('Saving type not found', 404);
      const targetName = (data.name || current.name).trim();
      const targetCategory = data.category !== undefined ? (data.category?.trim() || 'Standard') : (current.category || 'Standard');

      const duplicate = await prisma.savingTypeConfig.findFirst({
        where: {
          id: { not: id },
          name: { equals: targetName, mode: 'insensitive' },
          category: { equals: targetCategory, mode: 'insensitive' },
        },
      });
      if (duplicate) {
        throw new AppError(`A saving type with name "${targetName}" and category "${targetCategory}" already exists`, 409);
      }
    }

    return prisma.savingTypeConfig.update({ where: { id }, data });
  }

  async deleteSavingType(id: string) {
    return prisma.savingTypeConfig.delete({ where: { id } });
  }

  // Loan Types
  async getAllLoanTypes(includeInactive = false) {
    return prisma.loanTypeConfig.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ name: 'asc' }, { category: 'asc' }],
    });
  }

  async createLoanType(data: {
    name: string;
    category?: string | null;
    isActive?: boolean;
    minAmount?: number | null;
    maxAmount?: number | null;
    minTenure?: number | null;
    maxTenure?: number | null;
  }) {
    const trimmedName = data.name.trim();
    const category = data.category?.trim() || 'Standard';

    const existing = await prisma.loanTypeConfig.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        category: { equals: category, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw new AppError(`A loan type with name "${trimmedName}" and category "${category}" already exists`, 409);
    }

    return prisma.loanTypeConfig.create({
      data: {
        ...data,
        name: trimmedName,
        category,
      },
    });
  }

  async updateLoanType(id: string, data: {
    name?: string;
    category?: string | null;
    isActive?: boolean;
    minAmount?: number | null;
    maxAmount?: number | null;
    minTenure?: number | null;
    maxTenure?: number | null;
  }) {
    if (data.name || data.category !== undefined) {
      const current = await prisma.loanTypeConfig.findUnique({ where: { id } });
      if (!current) throw new AppError('Loan type not found', 404);
      const targetName = (data.name || current.name).trim();
      const targetCategory = data.category !== undefined ? (data.category?.trim() || 'Standard') : (current.category || 'Standard');

      const duplicate = await prisma.loanTypeConfig.findFirst({
        where: {
          id: { not: id },
          name: { equals: targetName, mode: 'insensitive' },
          category: { equals: targetCategory, mode: 'insensitive' },
        },
      });
      if (duplicate) {
        throw new AppError(`A loan type with name "${targetName}" and category "${targetCategory}" already exists`, 409);
      }
    }

    return prisma.loanTypeConfig.update({ where: { id }, data });
  }

  async deleteLoanType(id: string) {
    return prisma.loanTypeConfig.delete({ where: { id } });
  }
}
