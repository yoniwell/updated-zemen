import { prisma } from '../../../database/prisma';
import { Prisma } from '@prisma/client';

export class BranchRepository {
  async findAll() {
    return prisma.branch.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string) {
    return prisma.branch.findUnique({ where: { id } });
  }

  async findByCode(code: string) {
    return prisma.branch.findUnique({ where: { code } });
  }

  async create(data: Prisma.BranchCreateInput) {
    return prisma.branch.create({ data });
  }

  async update(id: string, data: Prisma.BranchUpdateInput) {
    return prisma.branch.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.branch.delete({ where: { id } });
  }
}
