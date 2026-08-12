import { prisma } from '../../../database/prisma';
import { Prisma } from '@prisma/client';

export class UsersRepository {
  async findById(id: string) {
    return prisma.adminUser.findUnique({
      where: { id },
      include: { branch: true },
    });
  }

  async findByEmail(email: string) {
    return prisma.adminUser.findUnique({
      where: { email },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.AdminUserWhereInput;
    orderBy?: Prisma.AdminUserOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return prisma.adminUser.findMany({
      skip,
      take,
      where,
      orderBy: orderBy || { createdAt: 'desc' },
      include: { branch: true },
    });
  }

  async count(where?: Prisma.AdminUserWhereInput) {
    return prisma.adminUser.count({ where });
  }

  async create(data: Prisma.AdminUserCreateInput) {
    return prisma.adminUser.create({
      data,
      include: { branch: true },
    });
  }

  async update(id: string, data: Prisma.AdminUserUpdateInput) {
    return prisma.adminUser.update({
      where: { id },
      data,
      include: { branch: true },
    });
  }

  async delete(id: string) {
    return prisma.adminUser.delete({
      where: { id },
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
