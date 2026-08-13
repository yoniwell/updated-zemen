import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';
import { sendResponse } from '../../../common/responses/response.helper';

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  getLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = { ...req.query };
      if (req.user?.role === 'BRANCH_MANAGER' && req.user?.branchId) {
        query.branchId = req.user.branchId;
      }
      const result = await this.auditService.getLogs(query);
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  };

  getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branchId = req.user?.role === 'BRANCH_MANAGER' ? req.user?.branchId || undefined : undefined;
      const result = await this.auditService.getDashboardStats(branchId);
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  };
}
