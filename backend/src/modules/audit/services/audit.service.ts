import { AuditRepository } from '../repositories/audit.repository';
import { AuditQueryDto } from '../dto/audit.dto';
import { Prisma } from '@prisma/client';

export class AuditService {

  constructor(private readonly auditRepository: AuditRepository) {}

  async getLogs(query: AuditQueryDto) {

    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 1000);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;
    if (query.targetType) where.targetType = query.targetType;
    if ((query as any).branchId) {
      where.user = { branchId: (query as any).branchId };
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [logs, total] = await Promise.all([
      this.auditRepository.findAll({ skip, take: limit, where }),
      this.auditRepository.count(where)
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }


  async getDashboardStats(branchId?: string) {
    return this.auditRepository.getDashboardStats(branchId);
  }

}



