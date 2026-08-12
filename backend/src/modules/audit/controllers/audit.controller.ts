import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import { sendResponse } from '../../../common/responses/response.helper';

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  getLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.auditService.getLogs(req.query);
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  };

  getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.auditService.getDashboardStats();
      sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  };
}
