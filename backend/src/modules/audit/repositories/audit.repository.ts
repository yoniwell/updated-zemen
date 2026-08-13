import { prisma } from '../../../database/prisma';
import { Prisma } from '@prisma/client';

export class AuditRepository {
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.AuditLogWhereInput;
    orderBy?: Prisma.AuditLogOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return prisma.auditLog.findMany({
      skip,
      take,
      where,
      orderBy: orderBy || { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, role: true, branch: { select: { id: true, name: true, code: true } } } } }
    });
  }

  async count(where?: Prisma.AuditLogWhereInput) {
    return prisma.auditLog.count({ where });
  }

  async getDashboardStats(branchId?: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const userFilter = branchId ? { user: { branchId } } : {};

    const totalLogs = await prisma.auditLog.count({ where: userFilter });
    const todayLogs = await prisma.auditLog.count({
      where: { ...userFilter, createdAt: { gte: startOfDay } }
    });

    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      where: userFilter,
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 5
    });

    return { totalLogs, todayLogs, topActions: actionCounts };
  }
}
