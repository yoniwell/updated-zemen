import { prisma } from '../../../database/prisma';
import { AppError } from '../../../common/errors/AppError';

export class TypesConfigService {
  // Saving Types
  async getAllSavingTypes(includeInactive = false) {
    return prisma.savingTypeConfig.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createSavingType(data: { name: string; isActive?: boolean; minAmount?: number | null; maxAmount?: number | null }) {
    return prisma.savingTypeConfig.create({ data });
  }

  async updateSavingType(id: string, data: { name?: string; isActive?: boolean; minAmount?: number | null; maxAmount?: number | null }) {
    return prisma.savingTypeConfig.update({ where: { id }, data });
  }

  async deleteSavingType(id: string) {
    return prisma.savingTypeConfig.delete({ where: { id } });
  }

  // Loan Types
  async getAllLoanTypes(includeInactive = false) {
    return prisma.loanTypeConfig.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createLoanType(data: {
    name: string;
    isActive?: boolean;
    minAmount?: number | null;
    maxAmount?: number | null;
    minTenure?: number | null;
    maxTenure?: number | null;
  }) {
    return prisma.loanTypeConfig.create({ data });
  }

  async updateLoanType(id: string, data: {
    name?: string;
    isActive?: boolean;
    minAmount?: number | null;
    maxAmount?: number | null;
    minTenure?: number | null;
    maxTenure?: number | null;
  }) {
    return prisma.loanTypeConfig.update({ where: { id }, data });
  }

  async deleteLoanType(id: string) {
    return prisma.loanTypeConfig.delete({ where: { id } });
  }
}
