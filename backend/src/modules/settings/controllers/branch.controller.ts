import { Request, Response, NextFunction } from 'express';
import { BranchService } from '../services/branch.service';
import { sendResponse } from '../../../common/responses/response.helper';

export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  getAllBranches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.branchService.getAllBranches();
      sendResponse(res, 200, { branches: result });
    } catch (error) {
      next(error);
    }
  };

  createBranch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.branchService.createBranch(req.body);
      sendResponse(res, 201, { branch: result });
    } catch (error) {
      next(error);
    }
  };

  updateBranch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.branchService.updateBranch(req.params.id as string, req.body);
      sendResponse(res, 200, { branch: result });
    } catch (error) {
      next(error);
    }
  };

  deleteBranch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.branchService.deleteBranch(req.params.id as string);
      sendResponse(res, 200, { success: true });
    } catch (error) {
      next(error);
    }
  };
}
